"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import LoadingSpinner from "@/components/LoadingSpinner";

const seasonColors: Record<string, string> = {
  winter: "bg-blue-100 text-blue-800",
  spring: "bg-green-100 text-green-800",
  summer: "bg-yellow-100 text-yellow-800",
  autumn: "bg-orange-100 text-orange-800",
};

export default function SeasonsPage() {
  const [data, setData] = useState<any>(null);
  const [forecastData, setForecastData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [apiKeyId, setApiKeyId] = useState<number | null>(null);

  useEffect(() => {
    api.getApiKeys().then((res) => {
      if (res.keys?.length > 0) {
        setApiKeyId(res.keys[0].id);
      } else {
        setLoading(false);
      }
    }).catch(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!apiKeyId) return;
    Promise.allSettled([
      api.getSeasonalAnalysis(apiKeyId),
      api.getTrendMonitor(apiKeyId),
    ]).then(([seasonRes, trendRes]) => {
      if (seasonRes.status === "fulfilled") setData(seasonRes.value);
      if (trendRes.status === "fulfilled") setForecastData(trendRes.value);
      setLoading(false);
    });
  }, [apiKeyId]);

  if (loading) return <LoadingSpinner />;
  if (!apiKeyId) return <p className="text-gray-500 text-center mt-16">Добавьте API-ключ в настройках</p>;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Сезоны и тренды</h1>

      {/* Current season */}
      {data && (
        <div className="card">
          <h3 className="font-semibold mb-3">Сезонный анализ</h3>
          {data.current_season && (
            <div className="flex items-center gap-3 mb-4">
              <span className={`badge text-base px-4 py-1 ${seasonColors[data.current_season] || "badge-purple"}`}>
                {data.current_season}
              </span>
              {data.seasonal_coefficient && (
                <span className="text-sm text-gray-500">
                  Коэффициент: ×{data.seasonal_coefficient}
                </span>
              )}
            </div>
          )}

          {data.alerts?.length > 0 && (
            <div className="space-y-2 mb-4">
              {data.alerts.map((a: string, i: number) => (
                <div key={i} className="bg-yellow-50 text-yellow-800 p-3 rounded-lg text-sm">
                  {a}
                </div>
              ))}
            </div>
          )}

          {data.products?.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 px-3">Товар</th>
                    <th className="text-left py-2 px-3">Сезон</th>
                    <th className="text-right py-2 px-3">Продажи</th>
                    <th className="text-right py-2 px-3">Коэффициент</th>
                  </tr>
                </thead>
                <tbody>
                  {data.products.map((p: any, i: number) => (
                    <tr key={i} className="border-b border-gray-50">
                      <td className="py-2 px-3">{p.product_name || p.nm_id}</td>
                      <td className="py-2 px-3">
                        <span className={`badge ${seasonColors[p.season] || "badge-purple"}`}>
                          {p.season || "—"}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-right">{p.sales}</td>
                      <td className="py-2 px-3 text-right">{p.coefficient}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Trends */}
      {forecastData?.trends?.length > 0 && (
        <div className="card">
          <h3 className="font-semibold mb-3">Модные тренды</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {forecastData.trends.map((t: any, i: number) => (
              <div
                key={i}
                className={`border rounded-lg p-4 ${
                  t.status === "rising" ? "border-green-200 bg-green-50/50" : t.status === "declining" ? "border-red-200 bg-red-50/50" : "border-gray-200"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium">{t.attribute}</span>
                  <span className={`badge ${t.status === "rising" ? "badge-green" : t.status === "declining" ? "badge-red" : "badge-blue"}`}>
                    {t.status === "rising" ? "Растёт" : t.status === "declining" ? "Падает" : "Стабильно"}
                  </span>
                </div>
                <div className="flex items-center gap-2 mt-2 text-sm text-gray-500">
                  <span>Категория: {t.dimension}</span>
                  {t.growth !== undefined && (
                    <span className={t.growth > 0 ? "text-green-600" : "text-red-600"}>
                      {t.growth > 0 ? "+" : ""}{t.growth.toFixed(0)}%
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
