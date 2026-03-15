"use client";

import { useState } from "react";
import { api } from "@/lib/api";
import LoadingSpinner from "@/components/LoadingSpinner";

export default function KeywordsPage() {
  const [keyword, setKeyword] = useState("");
  const [nmIds, setNmIds] = useState("");
  const [results, setResults] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState<"positions" | "regional">("positions");

  const handleCheck = async () => {
    if (!keyword || !nmIds) return;
    setLoading(true);
    try {
      const ids = nmIds.split(",").map((s) => parseInt(s.trim())).filter(Boolean);
      if (tab === "regional") {
        const res = await api.checkPositionsRegional(keyword, ids);
        setResults(res);
      } else {
        const res = await api.checkPositions(keyword, ids);
        setResults(res);
      }
    } catch (e: any) {
      alert(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Ключевые слова</h1>

      <div className="card">
        <div className="flex gap-2 mb-4">
          <button
            onClick={() => setTab("positions")}
            className={tab === "positions" ? "btn-primary" : "btn-secondary"}
          >
            Позиции
          </button>
          <button
            onClick={() => setTab("regional")}
            className={tab === "regional" ? "btn-primary" : "btn-secondary"}
          >
            По регионам
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <input
            placeholder="Ключевое слово (напр. платье летнее)"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            className="input md:col-span-1"
          />
          <input
            placeholder="Артикулы через запятую"
            value={nmIds}
            onChange={(e) => setNmIds(e.target.value)}
            className="input"
          />
          <button onClick={handleCheck} disabled={loading} className="btn-primary">
            {loading ? "Проверяю..." : "Проверить"}
          </button>
        </div>
      </div>

      {loading && <LoadingSpinner />}

      {results && !loading && (
        <div className="card">
          <h3 className="font-semibold mb-3">Результаты: {results.keyword}</h3>

          {/* Standard positions */}
          {results.positions && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 px-3">Артикул</th>
                    <th className="text-left py-2 px-3">Позиция</th>
                    <th className="text-left py-2 px-3">Страница</th>
                  </tr>
                </thead>
                <tbody>
                  {results.positions.map((p: any, i: number) => (
                    <tr key={i} className="border-b border-gray-50">
                      <td className="py-2 px-3 font-mono">{p.nm_id}</td>
                      <td className="py-2 px-3">
                        <span className={`font-medium ${p.position <= 10 ? "text-green-600" : p.position <= 50 ? "text-yellow-600" : "text-red-600"}`}>
                          {p.found ? `#${p.position}` : "Не найден"}
                        </span>
                      </td>
                      <td className="py-2 px-3">{p.found ? p.page : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Regional results */}
          {results.regions && (
            <div className="space-y-4">
              {results.regions.map((r: any, i: number) => (
                <div key={i} className="border rounded-lg p-4">
                  <h4 className="font-medium mb-2">{r.region}</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                    {r.positions?.map((p: any, j: number) => (
                      <div key={j} className="bg-gray-50 rounded p-2">
                        <span className="text-gray-500">#{p.nm_id}: </span>
                        <span className={`font-medium ${p.found ? "text-green-600" : "text-gray-400"}`}>
                          {p.found ? `#${p.position}` : "—"}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
