const API_BASE = process.env.NEXT_PUBLIC_API_URL || "";

class ApiClient {
  private token: string | null = null;

  setToken(token: string | null) {
    this.token = token;
    if (token) {
      localStorage.setItem("token", token);
    } else {
      localStorage.removeItem("token");
    }
  }

  getToken(): string | null {
    if (!this.token && typeof window !== "undefined") {
      this.token = localStorage.getItem("token");
    }
    return this.token;
  }

  async request<T>(path: string, options: RequestInit = {}): Promise<T> {
    const token = this.getToken();
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...(options.headers as Record<string, string>),
    };
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    const res = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers,
    });

    if (res.status === 401) {
      this.setToken(null);
      if (typeof window !== "undefined") {
        window.location.href = "/login";
      }
      throw new Error("Unauthorized");
    }

    if (!res.ok) {
      const body = await res.text();
      throw new Error(body || `HTTP ${res.status}`);
    }

    return res.json();
  }

  get<T>(path: string) {
    return this.request<T>(path);
  }

  post<T>(path: string, body: unknown) {
    return this.request<T>(path, {
      method: "POST",
      body: JSON.stringify(body),
    });
  }

  // Auth
  login(email: string, password: string) {
    return this.post<{ token: string }>("/api/auth/login", { email, password });
  }

  register(email: string, password: string) {
    return this.post<{ token: string }>("/api/auth/register", { email, password });
  }

  getMe() {
    return this.get<{ id: number; email: string }>("/api/me");
  }

  // Collector
  syncData(apiKeyId: number) {
    return this.post<any>("/api/collector/sync", { api_key_id: apiKeyId });
  }

  getCollectorStatus() {
    return this.get<any>("/api/collector/status");
  }

  getSales() {
    return this.get<any[]>("/api/collector/sales");
  }

  getOrders() {
    return this.get<any[]>("/api/collector/orders");
  }

  getStocks() {
    return this.get<any[]>("/api/collector/stocks");
  }

  // Stock Analytics
  getStockAnalytics(apiKeyId: number) {
    return this.post<any>("/api/stock/analytics", { api_key_id: apiKeyId });
  }

  // Sales Analytics
  getSalesDashboard(apiKeyId: number, dateFrom: string) {
    return this.post<any>("/api/sales/dashboard", { api_key_id: apiKeyId, date_from: dateFrom });
  }

  getSalesTrends(apiKeyId: number, dateFrom: string) {
    return this.post<any>("/api/sales/trends", { api_key_id: apiKeyId, date_from: dateFrom });
  }

  // SEO
  checkPositions(keyword: string, nmIds: number[]) {
    return this.post<any>("/api/seo/check", { keyword, nm_ids: nmIds });
  }

  checkPositionsRegional(keyword: string, nmIds: number[]) {
    return this.post<any>("/api/seo/regional", { keyword, nm_ids: nmIds });
  }

  getRegions() {
    return this.get<any>("/api/seo/regions");
  }

  getForecast(keyword: string, nmId: number) {
    return this.post<any>("/api/seo/forecast", { keyword, nm_id: nmId });
  }

  getCardAudit(nmId: number) {
    return this.post<any>("/api/seo/card-audit", { nm_id: nmId });
  }

  generateTitle(productName: string, keywords: string[]) {
    return this.post<any>("/api/seo/generate-title", { product_name: productName, keywords });
  }

  // Competitors
  getCompetitorPositions(keyword: string, nmIds: number[], myNmIds: number[]) {
    return this.post<any>("/api/seo/competitor-positions", { keyword, nm_ids: nmIds, my_nm_ids: myNmIds });
  }

  getCompetitorPricing(keyword: string) {
    return this.post<any>("/api/competitors/pricing", { keyword });
  }

  getCompetitorReviews(keyword: string) {
    return this.post<any>("/api/competitors/reviews", { keyword });
  }

  // Fashion Analytics
  getSizeAnalysis(apiKeyId: number) {
    return this.post<any>("/api/fashion/size-analysis", { api_key_id: apiKeyId });
  }

  getSeasonalAnalysis(apiKeyId: number) {
    return this.post<any>("/api/fashion/seasonal-analysis", { api_key_id: apiKeyId });
  }

  getTrendMonitor(apiKeyId: number) {
    return this.post<any>("/api/fashion/trend-monitor", { api_key_id: apiKeyId });
  }

  getReturnAnalysis(apiKeyId: number) {
    return this.post<any>("/api/fashion/return-analysis", { api_key_id: apiKeyId });
  }

  // Notifications
  getSmartAlerts(apiKeyId: number) {
    return this.post<any>("/api/notifications/smart-alerts", { api_key_id: apiKeyId });
  }

  getChannels() {
    return this.get<any>("/api/notifications/channels");
  }

  configureChannels(config: any) {
    return this.post<any>("/api/notifications/channels", config);
  }

  getRules() {
    return this.get<any>("/api/notifications/rules");
  }

  updateRules(rules: any) {
    return this.post<any>("/api/notifications/rules", rules);
  }

  // API Keys
  getApiKeys() {
    return this.get<{ keys: any[] }>("/api/keys");
  }

  addApiKey(name: string, wbToken: string) {
    return this.post<any>("/api/keys", { name, wb_token: wbToken });
  }
}

export const api = new ApiClient();
