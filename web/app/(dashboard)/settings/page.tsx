"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import LoadingSpinner from "@/components/LoadingSpinner";

export default function SettingsPage() {
  const { user } = useAuth();
  const [keys, setKeys] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [wbToken, setWbToken] = useState("");
  const [adding, setAdding] = useState(false);

  const loadKeys = () => {
    api.getApiKeys()
      .then((res) => setKeys(res.keys || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(loadKeys, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !wbToken) return;
    setAdding(true);
    try {
      await api.addApiKey(name, wbToken);
      setName("");
      setWbToken("");
      loadKeys();
    } catch (e: any) {
      alert(e.message);
    } finally {
      setAdding(false);
    }
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <h1 className="text-2xl font-bold">Настройки</h1>

      {/* Profile */}
      <div className="card">
        <h3 className="font-semibold mb-3">Профиль</h3>
        <p className="text-sm text-gray-500">Email: {user?.email}</p>
      </div>

      {/* API Keys */}
      <div className="card">
        <h3 className="font-semibold mb-4">API-ключи Wildberries</h3>

        {loading ? (
          <LoadingSpinner />
        ) : (
          <>
            {keys.length > 0 && (
              <div className="space-y-2 mb-4">
                {keys.map((k: any) => (
                  <div key={k.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-medium text-sm">{k.name}</p>
                      <p className="text-xs text-gray-400">ID: {k.id}</p>
                    </div>
                    <span className="badge-green">Активен</span>
                  </div>
                ))}
              </div>
            )}

            <form onSubmit={handleAdd} className="space-y-3 border-t pt-4">
              <h4 className="text-sm font-medium">Добавить ключ</h4>
              <input
                placeholder="Название (напр. Основной магазин)"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="input"
                required
              />
              <input
                placeholder="WB API Token"
                value={wbToken}
                onChange={(e) => setWbToken(e.target.value)}
                className="input"
                type="password"
                required
              />
              <button type="submit" disabled={adding} className="btn-primary">
                {adding ? "Добавление..." : "Добавить"}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
