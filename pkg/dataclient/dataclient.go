// Package dataclient provides a helper for analytics services to fetch
// pre-collected WB data from the collector service.
package dataclient

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"

	"github.com/wb-analytics/wb-seller-tools/pkg/wbapi"
)

var collectorURL = envOrDefault("COLLECTOR_SERVICE_URL", "http://localhost:8082")

// CollectedData holds all WB data fetched from the collector.
type CollectedData struct {
	Sales  []wbapi.WBSale  `json:"sales"`
	Orders []wbapi.WBOrder `json:"orders"`
	Stocks []wbapi.WBStock `json:"stocks"`
}

// FetchData retrieves sales, orders, and stocks from the collector service.
// It forwards the Authorization header from the original request.
func FetchData(authHeader string) (*CollectedData, error) {
	var data CollectedData
	var salesErr, ordersErr, stocksErr error

	type result struct {
		kind string
		body []byte
		err  error
	}

	ch := make(chan result, 3)

	for _, endpoint := range []string{"sales", "orders", "stocks"} {
		go func(ep string) {
			body, err := fetchEndpoint(collectorURL+"/api/collector/"+ep, authHeader)
			ch <- result{kind: ep, body: body, err: err}
		}(endpoint)
	}

	for i := 0; i < 3; i++ {
		r := <-ch
		switch r.kind {
		case "sales":
			if r.err != nil {
				salesErr = r.err
			} else {
				salesErr = json.Unmarshal(r.body, &data.Sales)
			}
		case "orders":
			if r.err != nil {
				ordersErr = r.err
			} else {
				ordersErr = json.Unmarshal(r.body, &data.Orders)
			}
		case "stocks":
			if r.err != nil {
				stocksErr = r.err
			} else {
				stocksErr = json.Unmarshal(r.body, &data.Stocks)
			}
		}
	}

	if salesErr != nil {
		return &data, fmt.Errorf("fetch sales: %w", salesErr)
	}
	if ordersErr != nil {
		return &data, fmt.Errorf("fetch orders: %w", ordersErr)
	}
	if stocksErr != nil {
		return &data, fmt.Errorf("fetch stocks: %w", stocksErr)
	}

	return &data, nil
}

func fetchEndpoint(url, authHeader string) ([]byte, error) {
	req, err := http.NewRequest("GET", url, nil)
	if err != nil {
		return nil, err
	}
	req.Header.Set("Authorization", authHeader)

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != 200 {
		body, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("collector returned %d: %s", resp.StatusCode, string(body))
	}

	return io.ReadAll(resp.Body)
}

func envOrDefault(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}
