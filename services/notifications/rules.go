package main

import (
	"encoding/json"
	"net/http"
	"time"

	"github.com/wb-analytics/wb-seller-tools/pkg/middleware"
)

// --- Customizable Alert Rules ---

type alertRule struct {
	ID          int64    `json:"id"`
	Name        string   `json:"name"`
	Enabled     bool     `json:"enabled"`
	Category    string   `json:"category"`
	Condition   string   `json:"condition"`
	Threshold   float64  `json:"threshold"`
	Severity    string   `json:"severity"`
	Channels    []string `json:"channels"`
	CooldownMin int      `json:"cooldown_min"`
}

var defaultRules = []alertRule{
	{ID: 1, Name: "Позиция упала >10 мест", Enabled: true, Category: "position", Condition: "drops_below", Threshold: 10, Severity: "warning", Channels: []string{"telegram"}, CooldownMin: 240},
	{ID: 2, Name: "Позиция упала >30 мест", Enabled: true, Category: "position", Condition: "drops_below", Threshold: 30, Severity: "critical", Channels: []string{"telegram", "webhook"}, CooldownMin: 60},
	{ID: 3, Name: "Остатков <7 дней", Enabled: true, Category: "stock", Condition: "drops_below", Threshold: 7, Severity: "warning", Channels: []string{"telegram"}, CooldownMin: 480},
	{ID: 4, Name: "Остатков <3 дня", Enabled: true, Category: "stock", Condition: "drops_below", Threshold: 3, Severity: "critical", Channels: []string{"telegram", "webhook"}, CooldownMin: 120},
	{ID: 5, Name: "Возврат >30%", Enabled: true, Category: "return", Condition: "exceeds", Threshold: 30, Severity: "warning", Channels: []string{"telegram"}, CooldownMin: 1440},
	{ID: 6, Name: "Продажи упали >30%", Enabled: true, Category: "sales", Condition: "drops_below", Threshold: -30, Severity: "warning", Channels: []string{"telegram"}, CooldownMin: 1440},
	{ID: 7, Name: "Конкурент обогнал", Enabled: true, Category: "competitor", Condition: "changes_by", Threshold: 0, Severity: "warning", Channels: []string{"telegram"}, CooldownMin: 240},
	{ID: 8, Name: "Тренд растёт >50%", Enabled: true, Category: "trend", Condition: "rises_above", Threshold: 50, Severity: "info", Channels: []string{}, CooldownMin: 1440},
}

func handleGetRules(w http.ResponseWriter, r *http.Request) {
	userID, _ := middleware.GetUserID(r.Context())

	var rulesJSON []byte
	err := db.QueryRow(r.Context(),
		`SELECT rules_json FROM notification_rules WHERE user_id = $1`, userID,
	).Scan(&rulesJSON)

	var rules []alertRule
	if err == nil {
		json.Unmarshal(rulesJSON, &rules)
	} else {
		rules = defaultRules
	}

	jsonResponse(w, http.StatusOK, map[string]interface{}{
		"rules": rules,
		"total": len(rules),
	})
}

func handleUpdateRules(w http.ResponseWriter, r *http.Request) {
	userID, _ := middleware.GetUserID(r.Context())

	var req struct {
		Rules []alertRule `json:"rules"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		httpError(w, "invalid body", http.StatusBadRequest)
		return
	}

	for i, rule := range req.Rules {
		if rule.Name == "" {
			httpError(w, "rule name required", http.StatusBadRequest)
			return
		}
		if rule.ID == 0 {
			req.Rules[i].ID = int64(i + 1)
		}
	}

	rulesJSON, _ := json.Marshal(req.Rules)
	_, err := db.Exec(r.Context(),
		`INSERT INTO notification_rules (user_id, rules_json, updated_at)
		 VALUES ($1, $2, NOW())
		 ON CONFLICT (user_id) DO UPDATE SET rules_json = $2, updated_at = NOW()`,
		userID, rulesJSON,
	)
	if err != nil {
		httpError(w, "database error", http.StatusInternalServerError)
		return
	}

	jsonResponse(w, http.StatusOK, map[string]interface{}{
		"status": "updated",
		"rules":  req.Rules,
		"total":  len(req.Rules),
	})
}

// --- Alert Summary / Digest ---

type digestResponse struct {
	Period      string         `json:"period"`
	TotalAlerts int            `json:"total_alerts"`
	Unread      int            `json:"unread"`
	BySeverity  map[string]int `json:"by_severity"`
	ByType      map[string]int `json:"by_type"`
	TopIssues   []alert        `json:"top_issues"`
}

func handleDigest(w http.ResponseWriter, r *http.Request) {
	userID, _ := middleware.GetUserID(r.Context())

	var req struct {
		Period string `json:"period"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		req.Period = "day"
	}
	if req.Period == "" {
		req.Period = "day"
	}

	hours := 24
	if req.Period == "week" {
		hours = 168
	}
	cutoff := time.Now().Add(-time.Duration(hours) * time.Hour)

	rows, err := db.Query(r.Context(),
		`SELECT id, user_id, alert_type, title, message, severity, is_read, created_at
		 FROM alerts WHERE user_id = $1 AND created_at > $2 ORDER BY created_at DESC`,
		userID, cutoff,
	)

	digest := digestResponse{
		Period:     req.Period,
		BySeverity: map[string]int{},
		ByType:     map[string]int{},
	}

	if err == nil {
		defer rows.Close()
		for rows.Next() {
			var a alert
			rows.Scan(&a.ID, &a.UserID, &a.Type, &a.Title, &a.Message, &a.Severity, &a.IsRead, &a.CreatedAt)
			digest.TotalAlerts++
			if !a.IsRead {
				digest.Unread++
			}
			digest.BySeverity[a.Severity]++
			digest.ByType[a.Type]++

			if (a.Severity == "critical" || a.Severity == "warning") && len(digest.TopIssues) < 10 {
				digest.TopIssues = append(digest.TopIssues, a)
			}
		}
	}

	jsonResponse(w, http.StatusOK, digest)
}
