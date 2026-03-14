package main

import (
	"encoding/json"
	"fmt"
	"net/http"
	"sort"
	"sync"
	"time"
)

// --- Card Snapshot & Change Monitoring ---

var (
	snapshotMu sync.RWMutex
	// nmID -> list of snapshots, newest last.
	cardSnapshots = map[int64][]cardSnapshot{}
)

type cardSnapshot struct {
	NmID            int64             `json:"nm_id"`
	Title           string            `json:"title"`
	Description     string            `json:"description"`
	Price           float64           `json:"price"`
	SalePrice       float64           `json:"sale_price"`
	PhotoCount      int               `json:"photo_count"`
	Rating          float64           `json:"rating"`
	Feedbacks       int               `json:"feedbacks"`
	Characteristics map[string]string `json:"characteristics,omitempty"`
	CapturedAt      time.Time         `json:"captured_at"`
}

type saveSnapshotRequest struct {
	NmID            int64             `json:"nm_id"`
	Title           string            `json:"title"`
	Description     string            `json:"description,omitempty"`
	Price           float64           `json:"price,omitempty"`
	SalePrice       float64           `json:"sale_price,omitempty"`
	PhotoCount      int               `json:"photo_count,omitempty"`
	Rating          float64           `json:"rating,omitempty"`
	Feedbacks       int               `json:"feedbacks,omitempty"`
	Characteristics map[string]string `json:"characteristics,omitempty"`
}

type fieldChange struct {
	Field    string `json:"field"`
	OldValue string `json:"old_value"`
	NewValue string `json:"new_value"`
}

type snapshotDiff struct {
	NmID      int64         `json:"nm_id"`
	OldDate   time.Time     `json:"old_snapshot_date"`
	NewDate   time.Time     `json:"new_snapshot_date"`
	Changes   []fieldChange `json:"changes"`
	DaysBetween int         `json:"days_between"`
}

func handleSaveSnapshot(w http.ResponseWriter, r *http.Request) {
	var req saveSnapshotRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		httpError(w, "invalid body", http.StatusBadRequest)
		return
	}
	if req.NmID == 0 || req.Title == "" {
		httpError(w, "nm_id and title required", http.StatusBadRequest)
		return
	}

	snap := cardSnapshot{
		NmID:            req.NmID,
		Title:           req.Title,
		Description:     req.Description,
		Price:           req.Price,
		SalePrice:       req.SalePrice,
		PhotoCount:      req.PhotoCount,
		Rating:          req.Rating,
		Feedbacks:       req.Feedbacks,
		Characteristics: req.Characteristics,
		CapturedAt:      time.Now(),
	}

	snapshotMu.Lock()
	cardSnapshots[req.NmID] = append(cardSnapshots[req.NmID], snap)
	// Keep last 50 snapshots per product.
	if len(cardSnapshots[req.NmID]) > 50 {
		cardSnapshots[req.NmID] = cardSnapshots[req.NmID][len(cardSnapshots[req.NmID])-50:]
	}
	snapshotMu.Unlock()

	// Detect changes from previous snapshot.
	snapshotMu.RLock()
	snaps := cardSnapshots[req.NmID]
	snapshotMu.RUnlock()

	var diff *snapshotDiff
	if len(snaps) >= 2 {
		prev := snaps[len(snaps)-2]
		diff = compareSnapshots(prev, snap)
	}

	jsonResponse(w, http.StatusOK, map[string]interface{}{
		"snapshot":    snap,
		"changes":    diff,
		"total_snaps": len(snaps),
	})
}

func handleGetSnapshots(w http.ResponseWriter, r *http.Request) {
	var req struct {
		NmID int64 `json:"nm_id"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		httpError(w, "invalid body", http.StatusBadRequest)
		return
	}
	if req.NmID == 0 {
		httpError(w, "nm_id required", http.StatusBadRequest)
		return
	}

	snapshotMu.RLock()
	snaps := cardSnapshots[req.NmID]
	snapshotMu.RUnlock()

	// Build change timeline.
	var timeline []snapshotDiff
	for i := 1; i < len(snaps); i++ {
		diff := compareSnapshots(snaps[i-1], snaps[i])
		if diff != nil && len(diff.Changes) > 0 {
			timeline = append(timeline, *diff)
		}
	}

	jsonResponse(w, http.StatusOK, map[string]interface{}{
		"nm_id":     req.NmID,
		"snapshots": snaps,
		"timeline":  timeline,
		"total":     len(snaps),
	})
}

func handleCompareSnapshots(w http.ResponseWriter, r *http.Request) {
	var req struct {
		NmIDs []int64 `json:"nm_ids"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		httpError(w, "invalid body", http.StatusBadRequest)
		return
	}

	type productChangeSummary struct {
		NmID          int64    `json:"nm_id"`
		LatestTitle   string   `json:"latest_title"`
		SnapshotCount int      `json:"snapshot_count"`
		TotalChanges  int      `json:"total_changes"`
		ChangedFields []string `json:"changed_fields"`
		LastChange    *time.Time `json:"last_change,omitempty"`
	}

	var summaries []productChangeSummary
	snapshotMu.RLock()
	for _, nmID := range req.NmIDs {
		snaps := cardSnapshots[nmID]
		if len(snaps) == 0 {
			continue
		}

		summary := productChangeSummary{
			NmID:          nmID,
			LatestTitle:   snaps[len(snaps)-1].Title,
			SnapshotCount: len(snaps),
		}

		changedFields := map[string]bool{}
		for i := 1; i < len(snaps); i++ {
			diff := compareSnapshots(snaps[i-1], snaps[i])
			if diff != nil {
				summary.TotalChanges += len(diff.Changes)
				for _, c := range diff.Changes {
					changedFields[c.Field] = true
				}
				t := snaps[i].CapturedAt
				summary.LastChange = &t
			}
		}

		for f := range changedFields {
			summary.ChangedFields = append(summary.ChangedFields, f)
		}
		sort.Strings(summary.ChangedFields)

		summaries = append(summaries, summary)
	}
	snapshotMu.RUnlock()

	sort.Slice(summaries, func(i, j int) bool {
		return summaries[i].TotalChanges > summaries[j].TotalChanges
	})

	jsonResponse(w, http.StatusOK, map[string]interface{}{
		"products": summaries,
		"total":    len(summaries),
	})
}

func compareSnapshots(old, new cardSnapshot) *snapshotDiff {
	diff := &snapshotDiff{
		NmID:    new.NmID,
		OldDate: old.CapturedAt,
		NewDate: new.CapturedAt,
		DaysBetween: int(new.CapturedAt.Sub(old.CapturedAt).Hours() / 24),
	}

	if old.Title != new.Title {
		diff.Changes = append(diff.Changes, fieldChange{"title", old.Title, new.Title})
	}
	if old.Description != new.Description && (old.Description != "" || new.Description != "") {
		oldDesc := truncate(old.Description, 100)
		newDesc := truncate(new.Description, 100)
		diff.Changes = append(diff.Changes, fieldChange{"description", oldDesc, newDesc})
	}
	if old.Price != new.Price {
		diff.Changes = append(diff.Changes, fieldChange{
			"price",
			formatFloat(old.Price),
			formatFloat(new.Price),
		})
	}
	if old.SalePrice != new.SalePrice {
		diff.Changes = append(diff.Changes, fieldChange{
			"sale_price",
			formatFloat(old.SalePrice),
			formatFloat(new.SalePrice),
		})
	}
	if old.PhotoCount != new.PhotoCount {
		diff.Changes = append(diff.Changes, fieldChange{
			"photo_count",
			formatInt(old.PhotoCount),
			formatInt(new.PhotoCount),
		})
	}

	// Compare characteristics.
	allChars := map[string]bool{}
	for k := range old.Characteristics {
		allChars[k] = true
	}
	for k := range new.Characteristics {
		allChars[k] = true
	}
	for k := range allChars {
		oldVal := old.Characteristics[k]
		newVal := new.Characteristics[k]
		if oldVal != newVal {
			diff.Changes = append(diff.Changes, fieldChange{
				"char:" + k, oldVal, newVal,
			})
		}
	}

	if len(diff.Changes) == 0 {
		return nil
	}
	return diff
}

func truncate(s string, maxLen int) string {
	runes := []rune(s)
	if len(runes) <= maxLen {
		return s
	}
	return string(runes[:maxLen]) + "..."
}

func formatFloat(v float64) string {
	return fmt.Sprintf("%.2f", v)
}

func formatInt(v int) string {
	return fmt.Sprintf("%d", v)
}
