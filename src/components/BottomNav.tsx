"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/app", label: "Sinal" },
  { href: "/app/chat", label: "Chat" },
  { href: "/app/fotos", label: "Fotos" },
  { href: "/app/capsula", label: "Cápsula" },
  { href: "/app/jogos", label: "Jogos" },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-hairline bg-surface/90 backdrop-blur-sm">
      <div className="mx-auto flex max-w-sm items-center justify-around overflow-x-auto px-1 py-2">
        {TABS.map((tab) => {
          const active =
            tab.href === "/app" ? pathname === "/app" : pathname.startsWith(tab.href);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`shrink-0 rounded-full px-2 py-1.5 text-[10px] transition ${
                active
                  ? "bg-moon text-btn-ink"
                  : "text-ink-muted hover:text-ink"
              }`}
            >
              {tab.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
