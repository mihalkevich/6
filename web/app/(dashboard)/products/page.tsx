"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import LoadingSpinner from "@/components/LoadingSpinner";

export default function ProductsPage() {
  const [nmId, setNmId] = useState("");
  const [audit, setAudit] = useState<any>(null);
  const [titles, setTitles] = useState<any>(null);
  const [sizeData, setSizeData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [apiKeyId, setApiKeyId] = useState<number | null>(null);
  const [tab, setTab] = useState<"audit" | "sizes">("audit");

  useEffect(() => {
    api.getApiKeys().then((res) => {
      if (res.keys?.length > 0) setApiKeyId(res.keys[0].id);
    }).catch(() => {});
  }, []);

  const handleAudit = async () => {
    if (!nmId) return;
    setLoading(true);
    try {
      const [a, t] = await Promise.all([
        api.getCardAudit(parseInt(nmId)),
        api.generateTitle(nmId, []),
      ]);
      setAudit(a);
      setTitles(t);
    } catch (e: any) {
      alert(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSizes = async () => {
    if (!apiKeyId) return;
    setLoading(true);
    try {
      const res = await api.getSizeAnalysis(apiKeyId);
      setSizeData(res);
    } catch (e: any) {
      alert(e.message);
    } finally {
      setLoading(false);
    }
  };

  const gradeColor = (grade: string) => {
    if (grade === "A") return "text-green-600";
    if (grade === "B") return "text-blue-600";
    if (grade === "C") return "text-yellow-600";
    return "text-red-600";
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Товары</h1>

      <div className="card">
        <div className="flex gap-2 mb-4">
          <button onClick={() => setTab("audit")} className={tab === "audit" ? "btn-primary" : "btn-secondary"}>
            SEO-аудит
          </button>
          <button onClick={() => setTab("sizes")} className={tab === "sizes" ? "btn-primary" : "btn-secondary"}>
            Размерная аналитика
          </button>
        </div>

        {tab === "audit" && (
          <div className="flex gap-3">
            <input placeholder="Артикул WB" value={nmId} onChange={(e) => setNmId(e.target.value)} className="input flex-1" />
            <button onClick={handleAudit} disabled={loading} className="btn-primary">
              {loading ? "..." : "Аудит"}
            </button>
          </div>
        )}

        {tab === "sizes" && (
          <button onClick={handleSizes} disabled={loading || !apiKeyId} className="btn-primary">
            {loading ? "Загрузка..." : "Анализ размеров"}
          </button>
        )}
      </div>

      {loading && <LoadingSpinner />}

      {/* SEO Audit */}
      {audit && tab === "audit" && !loading && (
        <div className="space-y-4">
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold">SEO-оценка карточки</h3>
              <div className="text-center">
                <span className={`text-4xl font-bold ${gradeColor(audit.grade)}`}>{audit.grade}</span>
                <p className="text-sm text-gray-500">{audit.score}/100</p>
              </div>
            </div>

            {/* Score breakdown */}
            <div className="space-y-3">
              {audit.components?.map((c: any, i: number) => (
                <div key={i}>
                  <div className="flex justify-between text-sm mb-1">
                    <span>{c.name}</span>
                    <span className="font-medium">{c.score}/{c.max_score}</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2">
                    <div
                      className="bg-wb-purple h-2 rounded-full transition-all"
                      style={{ width: `${(c.score / c.max_score) * 100}%` }}
                    />
                  </div>
                  {c.issues?.map((issue: string, j: number) => (
                    <p key={j} className="text-xs text-red-500 mt-1">• {issue}</p>
                  ))}
                </div>
              ))}
            </div>
          </div>

          {/* Generated titles */}
          {titles?.titles && (
            <div className="card">
              <h3 className="font-semibold mb-3">Предложения по заголовку</h3>
              <div className="space-y-2">
                {titles.titles.map((t: string, i: number) => (
                  <div key={i} className="bg-gray-50 p-3 rounded-lg text-sm flex justify-between items-center">
                    <span>{t}</span>
                    <button
                      onClick={() => navigator.clipboard.writeText(t)}
                      className="text-wb-purple text-xs hover:underline ml-2 shrink-0"
                    >
                      Копировать
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Size analytics */}
      {sizeData && tab === "sizes" && !loading && (
        <div className="card">
          <h3 className="font-semibold mb-3">Размерная аналитика</h3>
          {sizeData.products?.map((p: any, i: number) => (
            <div key={i} className="border rounded-lg p-4 mb-3">
              <p className="font-medium mb-2">{p.product_name || p.nm_id}</p>
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2">
                {p.sizes?.map((s: any, j: number) => (
                  <div key={j} className={`text-center p-2 rounded ${s.stock === 0 ? "bg-red-50" : s.return_rate > 15 ? "bg-yellow-50" : "bg-green-50"}`}>
                    <p className="font-medium">{s.size}</p>
                    <p className="text-xs text-gray-500">Продажи: {s.sales}</p>
                    <p className="text-xs text-gray-500">Остаток: {s.stock}</p>
                    {s.return_rate > 0 && <p className="text-xs text-red-500">Возвр: {s.return_rate}%</p>}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
