package main

import (
	"encoding/json"
	"net/http"
	"sync"
	"time"

	"github.com/wb-analytics/wb-seller-tools/pkg/middleware"
)

// --- Customizable Alert Rules ---
// Users define rules for when alerts should fire.

var (
	rulesMu    sync.RWMutex
	userRules  = map[int64][]alertRule{} // userID -> rules
)

type alertRule struct {
	ID          int64  `json:"id"`
	Name        string `json:"name"`
	Enabled     bool   `json:"enabled"`
	Category    string `json:"category"`    // position, stock, sales, competitor, return, season, trend
	Condition   string `json:"condition"`   // drops_below, rises_above, changes_by, exceeds
	Threshold   float64 `json:"threshold"`  // the value to compare against
	Severity    string `json:"severity"`    // critical, warning, info
	Channels    []string `json:"channels"`  // telegram, email, webhook
	CooldownMin int    `json:"cooldown_min"` // minutes between re-triggering
}

// Default rules for new users.
var defaultRules = []alertRule{
	{
		ID: 1, Name: "Позиция упала >10 мест", Enabled: true,
		Category: "position", Condition: "drops_below", Threshold: 10,
		Severity: "warning", Channels: []string{"telegram"}, CooldownMin: 240,
	},
	{
		ID: 2, Name: "Позиция упала >30 мест", Enabled: true,
		Category: "position", Condition: "drops_below", Threshold: 30,
		Severity: "critical", Channels: []string{"telegram", "webhook"}, CooldownMin: 60,
	},
	{
		ID: 3, Name: "Остатков <7 дней", Enabled: true,
		Category: "stock", Condition: "drops_below", Threshold: 7,
		Severity: "warning", Channels: []string{"telegram"}, CooldownMin: 480,
	},
	{
		ID: 4, Name: "Остатков <3 дня", Enabled: true,
		Category: "stock", Condition: "drops_below", Threshold: 3,
		Severity: "critical", Channels: []string{"telegram", "webhook"}, CooldownMin: 120,
	},
	{
		ID: 5, Name: "Возврат >30%", Enabled: true,
		Category: "return", Condition: "exceeds", Threshold: 30,
		Severity: "warning", Channels: []string{"telegram"}, CooldownMin: 1440,
	},
	{
		ID: 6, Name: "Продажи упали >30%", Enabled: true,
		Category: "sales", Condition: "drops_below", Threshold: -30,
		Severity: "warning", Channels: []string{"telegram"}, CooldownMin: 1440,
	},
	{
		ID: 7, Name: "Конкурент обогнал", Enabled: true,
		Category: "competitor", Condition: "changes_by", Threshold: 0,
		Severity: "warning", Channels: []string{"telegram"}, CooldownMin: 240,
	},
	{
		ID: 8, Name: "Тренд растёт >50%", Enabled: true,
		Category: "trend", Condition: "rises_above", Threshold: 50,
		Severity: "info", Channels: []string{}, CooldownMin: 1440,
	},
}

func handleGetRules(w http.ResponseWriter, r *http.Request) {
	userID, _ := middleware.GetUserID(r.Context())

	rulesMu.RLock()
	rules, ok := userRules[userID]
	rulesMu.RUnlock()

	if !ok {
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

	// Validate.
	for i, rule := range req.Rules {
		if rule.Name == "" {
			httpError(w, "rule name required", http.StatusBadRequest)
			return
		}
		if rule.ID == 0 {
			req.Rules[i].ID = int64(i + 1)
		}
	}

	rulesMu.Lock()
	userRules[userID] = req.Rules
	rulesMu.Unlock()

	jsonResponse(w, http.StatusOK, map[string]interface{}{
		"status": "updated",
		"rules":  req.Rules,
		"total":  len(req.Rules),
	})
}

// --- Alert Summary / Digest ---

type digestResponse struct {
	Period       string         `json:"period"`
	TotalAlerts  int            `json:"total_alerts"`
	Unread       int            `json:"unread"`
	BySeverity   map[string]int `json:"by_severity"`
	ByType       map[string]int `json:"by_type"`
	TopIssues    []alert        `json:"top_issues"`
}

func handleDigest(w http.ResponseWriter, r *http.Request) {
	userID, _ := middleware.GetUserID(r.Context())

	var req struct {
		Period string `json:"period"` // day, week
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		req.Period = "day"
	}
	if req.Period == "" {
		req.Period = "day"
	}

	mu.RLock()
	userAlerts := alerts[userID]
	mu.RUnlock()

	hours := 24
	if req.Period == "week" {
		hours = 168
	}
	cutoff := time.Now().Add(-time.Duration(hours) * time.Hour)

	digest := digestResponse{
		Period:     req.Period,
		BySeverity: map[string]int{},
		ByType:     map[string]int{},
	}

	for _, a := range userAlerts {
		if a.CreatedAt.Before(cutoff) {
			continue
		}
		digest.TotalAlerts++
		if !a.IsRead {
			digest.Unread++
		}
		digest.BySeverity[a.Severity]++
		digest.ByType[a.Type]++

		// Collect critical/warning as top issues.
		if (a.Severity == "critical" || a.Severity == "warning") && len(digest.TopIssues) < 10 {
			digest.TopIssues = append(digest.TopIssues, a)
		}
	}

	jsonResponse(w, http.StatusOK, digest)
}
