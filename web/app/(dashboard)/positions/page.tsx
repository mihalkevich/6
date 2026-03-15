"use client";

import { useState } from "react";
import { api } from "@/lib/api";
import LoadingSpinner from "@/components/LoadingSpinner";

export default function PositionsPage() {
  const [keyword, setKeyword] = useState("");
  const [nmId, setNmId] = useState("");
  const [competitorIds, setCompetitorIds] = useState("");
  const [forecast, setForecast] = useState<any>(null);
  const [competitors, setCompetitors] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState<"forecast" | "competitors">("forecast");

  const handleForecast = async () => {
    if (!keyword || !nmId) return;
    setLoading(true);
    try {
      const res = await api.getForecast(keyword, parseInt(nmId));
      setForecast(res);
    } catch (e: any) {
      alert(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCompetitors = async () => {
    if (!keyword || !competitorIds) return;
    setLoading(true);
    try {
      const ids = competitorIds.split(",").map((s) => parseInt(s.trim())).filter(Boolean);
      const myIds = nmId ? [parseInt(nmId)] : [];
      const res = await api.getCompetitorPositions(keyword, ids, myIds);
      setCompetitors(res);
    } catch (e: any) {
      alert(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Позиции</h1>

      <div className="card">
        <div className="flex gap-2 mb-4">
          <button
            onClick={() => setTab("forecast")}
            className={tab === "forecast" ? "btn-primary" : "btn-secondary"}
          >
            Прогноз
          </button>
          <button
            onClick={() => setTab("competitors")}
            className={tab === "competitors" ? "btn-primary" : "btn-secondary"}
          >
            Конкуренты
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <input
            placeholder="Ключевое слово"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            className="input"
          />
          <input
            placeholder="Ваш артикул"
            value={nmId}
            onChange={(e) => setNmId(e.target.value)}
            className="input"
          />
          {tab === "competitors" && (
            <input
              placeholder="Артикулы конкурентов (через ,)"
              value={competitorIds}
              onChange={(e) => setCompetitorIds(e.target.value)}
              className="input"
            />
          )}
          <button
            onClick={tab === "forecast" ? handleForecast : handleCompetitors}
            disabled={loading}
            className="btn-primary"
          >
            {loading ? "Загрузка..." : "Анализ"}
          </button>
        </div>
      </div>

      {loading && <LoadingSpinner />}

      {/* Forecast */}
      {forecast && tab === "forecast" && !loading && (
        <div className="card">
          <h3 className="font-semibold mb-4">Прогноз позиций: {forecast.keyword}</h3>
          {forecast.trends?.map((t: any, i: number) => (
            <div key={i} className="border rounded-lg p-4 mb-3">
              <div className="flex items-center justify-between mb-2">
                <span className="font-mono">{t.nm_id}</span>
                <span
                  className={`badge ${
                    t.trend === "improving"
                      ? "badge-green"
                      : t.trend === "declining"
                      ? "badge-red"
                      : t.trend === "volatile"
                      ? "badge-yellow"
                      : "badge-blue"
                  }`}
                >
                  {t.trend}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <p className="text-gray-500">Текущая</p>
                  <p className="font-medium">#{t.current_position}</p>
                </div>
                <div>
                  <p className="text-gray-500">Прогноз (7 дн.)</p>
                  <p className="font-medium">#{t.predicted_position}</p>
                </div>
                <div>
                  <p className="text-gray-500">Уверенность</p>
                  <p className="font-medium">{t.confidence}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Competitors */}
      {competitors && tab === "competitors" && !loading && (
        <div className="card">
          <h3 className="font-semibold mb-4">Конкурентный анализ: {competitors.keyword}</h3>
          {competitors.competitors?.map((c: any, i: number) => (
            <div key={i} className="flex items-center justify-between py-2 border-b border-gray-50">
              <span className="font-mono text-sm">{c.nm_id}</span>
              <span className={`font-medium ${c.position <= 10 ? "text-green-600" : c.position <= 50 ? "text-yellow-600" : "text-red-600"}`}>
                #{c.position}
              </span>
              {c.status && (
                <span className={`badge ${c.status === "rose" ? "badge-green" : c.status === "dropped" ? "badge-red" : "badge-blue"}`}>
                  {c.status}
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
