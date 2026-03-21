package main

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"time"

	"github.com/wb-analytics/wb-seller-tools/pkg/middleware"
)

// --- Notification Channels: Telegram, Email (stub), Webhook ---

type channelSettings struct {
	UserID      int64            `json:"user_id"`
	Telegram    *telegramConfig  `json:"telegram,omitempty"`
	Email       *emailConfig     `json:"email,omitempty"`
	Webhooks    []webhookConfig  `json:"webhooks,omitempty"`
	Preferences alertPreferences `json:"preferences"`
}

type telegramConfig struct {
	ChatID   string `json:"chat_id"`
	BotToken string `json:"bot_token"`
	Enabled  bool   `json:"enabled"`
}

type emailConfig struct {
	Address   string `json:"address"`
	Frequency string `json:"frequency"`
	Enabled   bool   `json:"enabled"`
}

type webhookConfig struct {
	URL     string            `json:"url"`
	Headers map[string]string `json:"headers,omitempty"`
	Events  []string          `json:"events"`
	Enabled bool              `json:"enabled"`
}

type alertPreferences struct {
	CriticalChannels []string `json:"critical_channels"`
	WarningChannels  []string `json:"warning_channels"`
	InfoChannels     []string `json:"info_channels"`
	QuietHoursStart  int      `json:"quiet_hours_start,omitempty"`
	QuietHoursEnd    int      `json:"quiet_hours_end,omitempty"`
	Cooldown         int      `json:"cooldown_minutes,omitempty"`
}

func handleConfigureChannels(w http.ResponseWriter, r *http.Request) {
	userID, _ := middleware.GetUserID(r.Context())

	var settings channelSettings
	if err := json.NewDecoder(r.Body).Decode(&settings); err != nil {
		httpError(w, "invalid body", http.StatusBadRequest)
		return
	}
	settings.UserID = userID

	settingsJSON, _ := json.Marshal(settings)
	_, err := db.Exec(r.Context(),
		`INSERT INTO notification_channels (user_id, settings_json, updated_at)
		 VALUES ($1, $2, NOW())
		 ON CONFLICT (user_id) DO UPDATE SET settings_json = $2, updated_at = NOW()`,
		userID, settingsJSON,
	)
	if err != nil {
		httpError(w, "database error", http.StatusInternalServerError)
		return
	}

	jsonResponse(w, http.StatusOK, map[string]interface{}{
		"status":   "configured",
		"settings": settings,
	})
}

func handleGetChannels(w http.ResponseWriter, r *http.Request) {
	userID, _ := middleware.GetUserID(r.Context())

	settings := loadChannelSettings(r.Context(), userID)
	jsonResponse(w, http.StatusOK, settings)
}

func loadChannelSettings(ctx context.Context, userID int64) *channelSettings {
	var settingsJSON []byte
	err := db.QueryRow(ctx,
		`SELECT settings_json FROM notification_channels WHERE user_id = $1`, userID,
	).Scan(&settingsJSON)

	if err == nil {
		var s channelSettings
		if json.Unmarshal(settingsJSON, &s) == nil {
			return &s
		}
	}

	return &channelSettings{
		UserID: userID,
		Preferences: alertPreferences{
			CriticalChannels: []string{"telegram", "webhook"},
			WarningChannels:  []string{"telegram"},
			InfoChannels:     []string{},
			Cooldown:         240,
		},
	}
}

// --- Dispatch Alert to Channels ---

type dispatchRequest struct {
	AlertIDs []int64 `json:"alert_ids,omitempty"`
	Latest   int     `json:"latest,omitempty"`
}

type dispatchResult struct {
	AlertID int64  `json:"alert_id"`
	Channel string `json:"channel"`
	Status  string `json:"status"`
	Error   string `json:"error,omitempty"`
}

func handleDispatch(w http.ResponseWriter, r *http.Request) {
	userID, _ := middleware.GetUserID(r.Context())

	var req dispatchRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		httpError(w, "invalid body", http.StatusBadRequest)
		return
	}

	var settingsJSON []byte
	err := db.QueryRow(r.Context(),
		`SELECT settings_json FROM notification_channels WHERE user_id = $1`, userID,
	).Scan(&settingsJSON)
	if err != nil {
		httpError(w, "no channels configured — use POST /api/notifications/channels first", http.StatusBadRequest)
		return
	}

	var settings channelSettings
	json.Unmarshal(settingsJSON, &settings)

	// Load alerts to dispatch from DB
	var toDispatch []alert
	if len(req.AlertIDs) > 0 {
		rows, _ := db.Query(r.Context(),
			`SELECT id, user_id, alert_type, title, message, severity, is_read, created_at
			 FROM alerts WHERE user_id = $1 AND id = ANY($2)`, userID, req.AlertIDs)
		if rows != nil {
			defer rows.Close()
			for rows.Next() {
				var a alert
				rows.Scan(&a.ID, &a.UserID, &a.Type, &a.Title, &a.Message, &a.Severity, &a.IsRead, &a.CreatedAt)
				toDispatch = append(toDispatch, a)
			}
		}
	} else if req.Latest > 0 {
		rows, _ := db.Query(r.Context(),
			`SELECT id, user_id, alert_type, title, message, severity, is_read, created_at
			 FROM alerts WHERE user_id = $1 AND is_read = FALSE
			 ORDER BY created_at DESC LIMIT $2`, userID, req.Latest)
		if rows != nil {
			defer rows.Close()
			for rows.Next() {
				var a alert
				rows.Scan(&a.ID, &a.UserID, &a.Type, &a.Title, &a.Message, &a.Severity, &a.IsRead, &a.CreatedAt)
				toDispatch = append(toDispatch, a)
			}
		}
	}

	var results []dispatchResult
	for _, a := range toDispatch {
		channels := getChannelsForSeverity(&settings, a.Severity)
		if isQuietHours(settings.Preferences) && a.Severity != "critical" {
			results = append(results, dispatchResult{
				AlertID: a.ID, Channel: "all", Status: "skipped", Error: "quiet hours",
			})
			continue
		}

		for _, ch := range channels {
			result := dispatchToChannel(&settings, ch, a)
			results = append(results, result)
		}
	}

	jsonResponse(w, http.StatusOK, map[string]interface{}{
		"dispatched": len(toDispatch),
		"results":    results,
	})
}

func getChannelsForSeverity(settings *channelSettings, severity string) []string {
	switch severity {
	case "critical":
		return settings.Preferences.CriticalChannels
	case "warning":
		return settings.Preferences.WarningChannels
	case "info":
		return settings.Preferences.InfoChannels
	default:
		return nil
	}
}

func isQuietHours(prefs alertPreferences) bool {
	if prefs.QuietHoursStart == 0 && prefs.QuietHoursEnd == 0 {
		return false
	}
	hour := time.Now().Hour()
	if prefs.QuietHoursStart < prefs.QuietHoursEnd {
		return hour >= prefs.QuietHoursStart && hour < prefs.QuietHoursEnd
	}
	return hour >= prefs.QuietHoursStart || hour < prefs.QuietHoursEnd
}

func dispatchToChannel(settings *channelSettings, channel string, a alert) dispatchResult {
	result := dispatchResult{AlertID: a.ID, Channel: channel}

	switch channel {
	case "telegram":
		if settings.Telegram == nil || !settings.Telegram.Enabled {
			result.Status = "skipped"
			result.Error = "telegram not configured"
			return result
		}
		err := sendTelegram(settings.Telegram, a)
		if err != nil {
			result.Status = "failed"
			result.Error = err.Error()
		} else {
			result.Status = "sent"
		}

	case "webhook":
		sent := false
		for _, wh := range settings.Webhooks {
			if !wh.Enabled {
				continue
			}
			if len(wh.Events) > 0 && !contains(wh.Events, a.Type) {
				continue
			}
			err := sendWebhook(wh, a)
			if err != nil {
				log.Printf("webhook error: %v", err)
			} else {
				sent = true
			}
		}
		if sent {
			result.Status = "sent"
		} else {
			result.Status = "skipped"
			result.Error = "no matching webhooks"
		}

	case "email":
		if settings.Email == nil || !settings.Email.Enabled {
			result.Status = "skipped"
			result.Error = "email not configured"
		} else {
			result.Status = "sent"
			log.Printf("EMAIL stub: to=%s subject=%s", settings.Email.Address, a.Title)
		}

	default:
		result.Status = "skipped"
		result.Error = "unknown channel"
	}

	return result
}

func sendTelegram(cfg *telegramConfig, a alert) error {
	emoji := "ℹ️"
	switch a.Severity {
	case "critical":
		emoji = "🚨"
	case "warning":
		emoji = "⚠️"
	}

	text := fmt.Sprintf("%s *%s*\n\n%s", emoji, a.Title, a.Message)
	payload := map[string]interface{}{
		"chat_id":    cfg.ChatID,
		"text":       text,
		"parse_mode": "Markdown",
	}

	body, _ := json.Marshal(payload)
	url := fmt.Sprintf("https://api.telegram.org/bot%s/sendMessage", cfg.BotToken)

	resp, err := http.Post(url, "application/json", bytes.NewReader(body))
	if err != nil {
		return fmt.Errorf("telegram request failed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("telegram API returned %d", resp.StatusCode)
	}
	return nil
}

func sendWebhook(wh webhookConfig, a alert) error {
	payload := map[string]interface{}{
		"event":     a.Type,
		"severity":  a.Severity,
		"title":     a.Title,
		"message":   a.Message,
		"alert_id":  a.ID,
		"timestamp": a.CreatedAt.Format(time.RFC3339),
	}

	body, _ := json.Marshal(payload)
	req, err := http.NewRequest(http.MethodPost, wh.URL, bytes.NewReader(body))
	if err != nil {
		return err
	}
	req.Header.Set("Content-Type", "application/json")
	for k, v := range wh.Headers {
		req.Header.Set(k, v)
	}

	client := &http.Client{Timeout: 10 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return fmt.Errorf("webhook request failed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode >= 400 {
		return fmt.Errorf("webhook returned %d", resp.StatusCode)
	}
	return nil
}

func handleTestChannel(w http.ResponseWriter, r *http.Request) {
	userID, _ := middleware.GetUserID(r.Context())

	var req struct {
		Channel string `json:"channel"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		httpError(w, "invalid body", http.StatusBadRequest)
		return
	}

	var settingsJSON []byte
	err := db.QueryRow(r.Context(),
		`SELECT settings_json FROM notification_channels WHERE user_id = $1`, userID,
	).Scan(&settingsJSON)
	if err != nil {
		httpError(w, "no channels configured", http.StatusBadRequest)
		return
	}

	var settings channelSettings
	json.Unmarshal(settingsJSON, &settings)

	testAlert := alert{
		ID:        0,
		UserID:    userID,
		Type:      "test",
		Title:     "Тестовое уведомление",
		Message:   "Если вы видите это сообщение — канал настроен правильно!",
		Severity:  "info",
		CreatedAt: time.Now(),
	}

	result := dispatchToChannel(&settings, req.Channel, testAlert)
	jsonResponse(w, http.StatusOK, result)
}

func contains(slice []string, item string) bool {
	for _, s := range slice {
		if s == item {
			return true
		}
	}
	return false
}
