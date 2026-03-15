"use client";

import { useState } from "react";
import { api } from "@/lib/api";
import LoadingSpinner from "@/components/LoadingSpinner";

export default function CompetitorsPage() {
  const [keyword, setKeyword] = useState("");
  const [pricing, setPricing] = useState<any>(null);
  const [reviews, setReviews] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState<"pricing" | "reviews">("pricing");

  const handleAnalyze = async () => {
    if (!keyword) return;
    setLoading(true);
    try {
      if (tab === "pricing") {
        const res = await api.getCompetitorPricing(keyword);
        setPricing(res);
      } else {
        const res = await api.getCompetitorReviews(keyword);
        setReviews(res);
      }
    } catch (e: any) {
      alert(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Конкуренты</h1>

      <div className="card">
        <div className="flex gap-2 mb-4">
          <button onClick={() => setTab("pricing")} className={tab === "pricing" ? "btn-primary" : "btn-secondary"}>
            Ценовой анализ
          </button>
          <button onClick={() => setTab("reviews")} className={tab === "reviews" ? "btn-primary" : "btn-secondary"}>
            Отзывы
          </button>
        </div>

        <div className="flex gap-3">
          <input placeholder="Ключевое слово для поиска конкурентов" value={keyword} onChange={(e) => setKeyword(e.target.value)} className="input flex-1" />
          <button onClick={handleAnalyze} disabled={loading} className="btn-primary">
            {loading ? "..." : "Анализ"}
          </button>
        </div>
      </div>

      {loading && <LoadingSpinner />}

      {/* Pricing */}
      {pricing && tab === "pricing" && !loading && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="card text-center">
              <p className="text-sm text-gray-500">Мин. цена</p>
              <p className="text-2xl font-bold">{pricing.min_price} ₽</p>
            </div>
            <div className="card text-center">
              <p className="text-sm text-gray-500">Медиана</p>
              <p className="text-2xl font-bold">{pricing.median_price} ₽</p>
            </div>
            <div className="card text-center">
              <p className="text-sm text-gray-500">Средняя</p>
              <p className="text-2xl font-bold">{pricing.avg_price} ₽</p>
            </div>
            <div className="card text-center">
              <p className="text-sm text-gray-500">Макс. цена</p>
              <p className="text-2xl font-bold">{pricing.max_price} ₽</p>
            </div>
          </div>

          {pricing.segments?.length > 0 && (
            <div className="card">
              <h3 className="font-semibold mb-3">Сегменты</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {pricing.segments.map((s: any, i: number) => (
                  <div key={i} className="border rounded-lg p-3">
                    <p className="font-medium">{s.name}</p>
                    <p className="text-sm text-gray-500">{s.range}</p>
                    <p className="text-lg font-bold mt-1">{s.count} товаров</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Reviews */}
      {reviews && tab === "reviews" && !loading && (
        <div className="space-y-4">
          {reviews.market_overview && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="card text-center">
                <p className="text-sm text-gray-500">Средний рейтинг</p>
                <p className="text-2xl font-bold">{reviews.market_overview.avg_rating}</p>
              </div>
              <div className="card text-center">
                <p className="text-sm text-gray-500">Товаров проверено</p>
                <p className="text-2xl font-bold">{reviews.market_overview.total_products}</p>
              </div>
              <div className="card text-center">
                <p className="text-sm text-gray-500">Среднее кол-во отзывов</p>
                <p className="text-2xl font-bold">{reviews.market_overview.avg_feedbacks}</p>
              </div>
            </div>
          )}

          {reviews.opportunities?.length > 0 && (
            <div className="card">
              <h3 className="font-semibold mb-3">Возможности</h3>
              <div className="space-y-2">
                {reviews.opportunities.map((o: string, i: number) => (
                  <div key={i} className="bg-green-50 text-green-800 p-3 rounded-lg text-sm">{o}</div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
