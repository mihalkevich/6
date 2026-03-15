"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import MetricCard from "@/components/MetricCard";
import LoadingSpinner from "@/components/LoadingSpinner";

interface DashboardData {
  sales: any;
  stock: any;
  alerts: any;
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [apiKeyId, setApiKeyId] = useState<number | null>(null);
  const [keys, setKeys] = useState<any[]>([]);

  useEffect(() => {
    api.getApiKeys().then((res) => {
      setKeys(res.keys || []);
      if (res.keys?.length > 0) {
        setApiKeyId(res.keys[0].id);
      } else {
        setLoading(false);
      }
    }).catch(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!apiKeyId) return;
    const dateFrom = new Date(Date.now() - 30 * 86400000).toISOString().split("T")[0];

    Promise.allSettled([
      api.getSalesDashboard(apiKeyId, dateFrom),
      api.getStockAnalytics(apiKeyId),
      api.getSmartAlerts(apiKeyId),
    ]).then(([salesRes, stockRes, alertsRes]) => {
      setData({
        sales: salesRes.status === "fulfilled" ? salesRes.value : null,
        stock: stockRes.status === "fulfilled" ? stockRes.value : null,
        alerts: alertsRes.status === "fulfilled" ? alertsRes.value : null,
      });
      setLoading(false);
    });
  }, [apiKeyId]);

  if (loading) return <LoadingSpinner />;

  if (!apiKeyId) {
    return (
      <div className="max-w-lg mx-auto mt-16 text-center">
        <h2 className="text-xl font-semibold mb-4">Добро пожаловать!</h2>
        <p className="text-gray-500 mb-6">
          Для начала работы добавьте API-ключ Wildberries в{" "}
          <a href="/settings" className="text-wb-purple font-medium hover:underline">
            настройках
          </a>
        </p>
      </div>
    );
  }

  const sales = data?.sales;
  const stock = data?.stock;
  const alerts = data?.alerts;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Дашборд</h1>
        {keys.length > 1 && (
          <select
            value={apiKeyId}
            onChange={(e) => setApiKeyId(Number(e.target.value))}
            className="input w-48"
          >
            {keys.map((k: any) => (
              <option key={k.id} value={k.id}>{k.name}</option>
            ))}
          </select>
        )}
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Продажи (30 дн.)"
          value={sales?.total_sales?.toLocaleString("ru-RU") ?? "—"}
          subtitle="шт."
          icon="💰"
        />
        <MetricCard
          title="Выручка"
          value={sales?.total_revenue ? `${(sales.total_revenue / 1000).toFixed(0)}K ₽` : "—"}
          icon="📈"
        />
        <MetricCard
          title="Остатки"
          value={stock?.total_stock?.toLocaleString("ru-RU") ?? "—"}
          subtitle="шт."
          icon="📦"
        />
        <MetricCard
          title="Оповещения"
          value={alerts?.alerts?.length ?? 0}
          subtitle="активных"
          icon="🔔"
        />
      </div>

      {/* Alerts */}
      {alerts?.alerts?.length > 0 && (
        <div className="card">
          <h3 className="font-semibold mb-3">Последние оповещения</h3>
          <div className="space-y-2">
            {alerts.alerts.slice(0, 5).map((alert: any, i: number) => (
              <div
                key={i}
                className={`flex items-start gap-3 p-3 rounded-lg ${
                  alert.severity === "critical"
                    ? "bg-red-50"
                    : alert.severity === "warning"
                    ? "bg-yellow-50"
                    : "bg-blue-50"
                }`}
              >
                <span
                  className={`badge ${
                    alert.severity === "critical"
                      ? "badge-red"
                      : alert.severity === "warning"
                      ? "badge-yellow"
                      : "badge-blue"
                  }`}
                >
                  {alert.severity}
                </span>
                <div>
                  <p className="text-sm font-medium">{alert.title}</p>
                  <p className="text-xs text-gray-500">{alert.message}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Stock Warnings */}
      {stock?.low_stock_products?.length > 0 && (
        <div className="card">
          <h3 className="font-semibold mb-3">Товары с низким остатком</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 px-3 text-gray-500">Артикул</th>
                  <th className="text-left py-2 px-3 text-gray-500">Товар</th>
                  <th className="text-right py-2 px-3 text-gray-500">Остаток</th>
                  <th className="text-right py-2 px-3 text-gray-500">Хватит на</th>
                </tr>
              </thead>
              <tbody>
                {stock.low_stock_products.slice(0, 10).map((p: any, i: number) => (
                  <tr key={i} className="border-b border-gray-50">
                    <td className="py-2 px-3 font-mono text-xs">{p.nm_id}</td>
                    <td className="py-2 px-3">{p.product_name || "—"}</td>
                    <td className="py-2 px-3 text-right">{p.total_stock}</td>
                    <td className="py-2 px-3 text-right">
                      <span className={p.days_left < 7 ? "text-red-600 font-medium" : ""}>
                        {p.days_left} дн.
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
