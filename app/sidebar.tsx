"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_GROUPS = [
  {
    label: "見える化",
    items: [
      { href: "/", label: "ダッシュボード", mock: false },
      { href: "/health", label: "健全性チェック", mock: false },
    ],
  },
  {
    label: "管理",
    items: [{ href: "/tasks", label: "課題・進捗", mock: false }],
  },
  {
    label: "実行",
    items: [
      { href: "/actions", label: "アクション実行", mock: false },
      { href: "/release", label: "リリース支援", mock: false },
    ],
  },
  {
    label: "設定",
    items: [{ href: "/profiles", label: "プロファイル", mock: false }],
  },
];

export function Sidebar({ managedRoot }: { managedRoot: string }) {
  const pathname = usePathname();

  return (
    <aside className="sticky top-0 flex h-screen w-60 shrink-0 flex-col border-r border-gray-200 bg-white">
      <div className="px-4 py-5">
        <p className="text-sm font-bold">ProjectCheckTool</p>
        <p
          className="mt-1 truncate font-mono text-[11px] text-gray-400"
          title={managedRoot}
        >
          {managedRoot}
        </p>
      </div>
      <nav className="px-3">
        {NAV_GROUPS.map((group) => (
          <div key={group.label}>
            <p className="px-3 pt-5 pb-1 text-[11px] font-medium text-gray-400">
              {group.label}
            </p>
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const active = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-900 ${
                      active
                        ? "bg-gray-900 font-medium text-white"
                        : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                    }`}
                  >
                    <span className="flex-1">{item.label}</span>
                    {item.mock && (
                      <span
                        className={`text-[10px] ${
                          active ? "text-violet-300" : "text-violet-500"
                        }`}
                      >
                        モック
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>
      <div className="mt-auto border-t border-gray-100 px-4 py-3 text-[11px] text-gray-400">
        ローカル実行 / v1.0.0
      </div>
    </aside>
  );
}
