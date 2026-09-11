"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

function IconSignal({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <path
        d="M12 21s-7.5-4.6-9.7-9.1C.8 8.4 2.4 4.9 5.7 4.2c2-.4 3.8.5 4.9 2 .6.8 1.5.8 2.1 0 1.1-1.5 2.9-2.4 4.9-2 3.3.7 4.9 4.2 3.4 7.7C19.5 16.4 12 21 12 21z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconSparkle({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <path
        d="M12 3.5c.6 3 2 4.4 5 5-3 .6-4.4 2-5 5-.6-3-2-4.4-5-5 3-.6 4.4-2 5-5Z"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
      <path
        d="M5.2 14.6c.35 1.7 1.15 2.5 2.8 2.85-1.65.35-2.45 1.15-2.8 2.85-.35-1.7-1.15-2.5-2.8-2.85 1.65-.35 2.45-1.15 2.8-2.85Z"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconCalendar({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <rect x="3.5" y="5" width="17" height="15" rx="2.5" stroke="currentColor" strokeWidth="1.6" />
      <path d="M3.5 9.5h17" stroke="currentColor" strokeWidth="1.6" />
      <path d="M8 3v3.4M16 3v3.4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <circle cx="8.3" cy="13.2" r="1" fill="currentColor" />
      <circle cx="12" cy="13.2" r="1" fill="currentColor" />
      <circle cx="8.3" cy="16.6" r="1" fill="currentColor" />
    </svg>
  );
}

function IconPhoto({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <rect x="3.2" y="6" width="17.6" height="13" rx="2.2" stroke="currentColor" strokeWidth="1.6" />
      <path d="M7.5 6 9 3.6h6L16.5 6" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      <circle cx="12" cy="12.6" r="3.4" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  );
}

function IconCapsule({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <path d="M6 3.5h12" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M6 20.5h12" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path
        d="M7.5 3.5v3.8c0 1.9 1.2 3.2 1.2 4.7s-1.2 2.8-1.2 4.7v3.8M16.5 3.5v3.8c0 1.9-1.2 3.2-1.2 4.7s1.2 2.8 1.2 4.7v3.8"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconGames({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <rect x="3" y="8" width="18" height="9" rx="4" stroke="currentColor" strokeWidth="1.6" />
      <path d="M7.5 10.7v3.4M5.8 12.4h3.4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="16" cy="11.3" r="0.9" fill="currentColor" />
      <circle cx="18" cy="13.3" r="0.9" fill="currentColor" />
    </svg>
  );
}

const TABS = [
  { href: "/app", label: "Sinal", Icon: IconSignal },
  { href: "/app/ideias", label: "Ideias", Icon: IconSparkle },
  { href: "/app/agenda", label: "Agenda", Icon: IconCalendar },
  { href: "/app/galeria", label: "Galeria", Icon: IconPhoto },
  { href: "/app/capsula", label: "Cápsula", Icon: IconCapsule },
  { href: "/app/jogos", label: "Jogos", Icon: IconGames },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-20 flex justify-center px-3 pb-3">
      <div className="glass flex max-w-sm items-center gap-1 rounded-full px-1.5 py-1.5 shadow-[0_18px_40px_-16px_var(--shadow-color)]">
        {TABS.map((tab) => {
          const active =
            tab.href === "/app" ? pathname === "/app" : pathname.startsWith(tab.href);
          const Icon = tab.Icon;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              aria-label={tab.label}
              className={`flex shrink-0 items-center gap-1.5 rounded-full transition-all duration-300 ease-out ${
                active
                  ? "px-3.5 py-2 text-btn-ink"
                  : "px-2.5 py-2 text-ink-muted hover:text-ink"
              }`}
              style={
                active
                  ? {
                      background: "linear-gradient(135deg, var(--moon-a), var(--moon-b))",
                      boxShadow: "0 8px 20px -8px var(--glow-color)",
                    }
                  : undefined
              }
            >
              <Icon className="h-[18px] w-[18px] shrink-0" />
              {active && (
                <span className="whitespace-nowrap text-[11px] font-medium">{tab.label}</span>
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
