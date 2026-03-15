"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth";

const navItems = [
  { href: "/", label: "Дашборд", icon: "📊" },
  { href: "/keywords", label: "Ключевые слова", icon: "🔑" },
  { href: "/positions", label: "Позиции", icon: "📈" },
  { href: "/products", label: "Товары", icon: "👗" },
  { href: "/seasons", label: "Сезоны", icon: "🗓" },
  { href: "/competitors", label: "Конкуренты", icon: "⚔️" },
  { href: "/notifications", label: "Уведомления", icon: "🔔" },
  { href: "/settings", label: "Настройки", icon: "⚙️" },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  return (
    <aside className="w-64 bg-wb-dark text-white min-h-screen flex flex-col fixed left-0 top-0 z-30">
      <div className="p-5 border-b border-white/10">
        <h1 className="text-xl font-bold bg-gradient-to-r from-wb-purple to-wb-pink bg-clip-text text-transparent">
          WB Seller Analytics
        </h1>
        <p className="text-xs text-gray-400 mt-1">Аналитика для продавцов одежды</p>
      </div>

      <nav className="flex-1 py-4">
        {navItems.map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-5 py-2.5 text-sm transition-colors ${
                active
                  ? "bg-wb-purple/20 text-white border-r-2 border-wb-purple"
                  : "text-gray-400 hover:text-white hover:bg-white/5"
              }`}
            >
              <span className="text-base">{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
      </nav>

      {user && (
        <div className="p-4 border-t border-white/10">
          <p className="text-xs text-gray-400 truncate">{user.email}</p>
          <button
            onClick={logout}
            className="text-xs text-gray-500 hover:text-white mt-1 transition-colors"
          >
            Выйти
          </button>
        </div>
      )}
    </aside>
  );
}
