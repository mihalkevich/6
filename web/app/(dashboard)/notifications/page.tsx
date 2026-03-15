"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import LoadingSpinner from "@/components/LoadingSpinner";

export default function NotificationsPage() {
  const [channels, setChannels] = useState<any>(null);
  const [rules, setRules] = useState<any>(null);
  const [alerts, setAlerts] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [apiKeyId, setApiKeyId] = useState<number | null>(null);
  const [tab, setTab] = useState<"alerts" | "channels" | "rules">("alerts");

  // Telegram form
  const [tgToken, setTgToken] = useState("");
  const [tgChatId, setTgChatId] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    Promise.allSettled([
      api.getApiKeys(),
      api.getChannels(),
      api.getRules(),
    ]).then(([keysRes, chRes, rulesRes]) => {
      if (keysRes.status === "fulfilled" && keysRes.value.keys?.length > 0) {
        setApiKeyId(keysRes.value.keys[0].id);
      }
      if (chRes.status === "fulfilled") setChannels(chRes.value);
      if (rulesRes.status === "fulfilled") setRules(rulesRes.value);
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    if (!apiKeyId) return;
    api.getSmartAlerts(apiKeyId).then(setAlerts).catch(() => {});
  }, [apiKeyId]);

  const saveTelegram = async () => {
    setSaving(true);
    try {
      await api.configureChannels({
        telegram: { enabled: true, bot_token: tgToken, chat_id: tgChatId },
      });
      const ch = await api.getChannels();
      setChannels(ch);
      alert("Telegram канал сохранён");
    } catch (e: any) {
      alert(e.message);
    } finally {
      setSaving(false);
    }
  };

  const toggleRule = async (ruleId: string, enabled: boolean) => {
    try {
      await api.updateRules({ rules: [{ id: ruleId, enabled }] });
      const r = await api.getRules();
      setRules(r);
    } catch (e: any) {
      alert(e.message);
    }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Уведомления</h1>

      <div className="flex gap-2">
        <button onClick={() => setTab("alerts")} className={tab === "alerts" ? "btn-primary" : "btn-secondary"}>
          Оповещения
        </button>
        <button onClick={() => setTab("channels")} className={tab === "channels" ? "btn-primary" : "btn-secondary"}>
          Каналы
        </button>
        <button onClick={() => setTab("rules")} className={tab === "rules" ? "btn-primary" : "btn-secondary"}>
          Правила
        </button>
      </div>

      {/* Alerts */}
      {tab === "alerts" && (
        <div className="card">
          <h3 className="font-semibold mb-3">Активные оповещения</h3>
          {!alerts?.alerts?.length ? (
            <p className="text-gray-400 text-center py-8">Нет активных оповещений</p>
          ) : (
            <div className="space-y-2">
              {alerts.alerts.map((a: any, i: number) => (
                <div
                  key={i}
                  className={`p-3 rounded-lg flex items-start gap-3 ${
                    a.severity === "critical" ? "bg-red-50" : a.severity === "warning" ? "bg-yellow-50" : "bg-blue-50"
                  }`}
                >
                  <span className={`badge shrink-0 ${a.severity === "critical" ? "badge-red" : a.severity === "warning" ? "badge-yellow" : "badge-blue"}`}>
                    {a.type}
                  </span>
                  <div>
                    <p className="text-sm font-medium">{a.title}</p>
                    <p className="text-xs text-gray-500 mt-1">{a.message}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Channels */}
      {tab === "channels" && (
        <div className="card">
          <h3 className="font-semibold mb-4">Telegram</h3>
          <div className="space-y-3 max-w-md">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Bot Token</label>
              <input value={tgToken} onChange={(e) => setTgToken(e.target.value)} className="input" placeholder="123456:ABC-DEF..." />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Chat ID</label>
              <input value={tgChatId} onChange={(e) => setTgChatId(e.target.value)} className="input" placeholder="-1001234567890" />
            </div>
            <button onClick={saveTelegram} disabled={saving} className="btn-primary">
              {saving ? "Сохранение..." : "Сохранить"}
            </button>
          </div>

          {channels?.telegram?.enabled && (
            <div className="mt-4 p-3 bg-green-50 rounded-lg text-sm text-green-700">
              Telegram подключён
            </div>
          )}
        </div>
      )}

      {/* Rules */}
      {tab === "rules" && (
        <div className="card">
          <h3 className="font-semibold mb-4">Правила оповещений</h3>
          {rules?.rules?.length > 0 ? (
            <div className="space-y-3">
              {rules.rules.map((r: any) => (
                <div key={r.id} className="flex items-center justify-between py-3 border-b border-gray-50">
                  <div>
                    <p className="font-medium text-sm">{r.name}</p>
                    <p className="text-xs text-gray-500">{r.description}</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={r.enabled}
                      onChange={(e) => toggleRule(r.id, e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:bg-wb-purple after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all"></div>
                  </label>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-400 text-center py-8">Правила загружаются...</p>
          )}
        </div>
      )}
    </div>
  );
}
