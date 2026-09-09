import type { Metadata, Viewport } from "next";
import Link from "next/link";
import { getSession } from "@/lib/auth/get-session";
import { Constellation } from "@/components/Constellation";
import { NotificationBridge } from "@/components/NotificationBridge";
import { BottomNav } from "@/components/BottomNav";
import { logoutAction } from "./actions";

export const metadata: Metadata = {
  title: "Órbita",
};

// Trava zoom/pan nas telas reais do app pra parecer um app instalado, não
// uma página de site — a busca disfarçada em "/" fica de fora disso.
export const viewport: Viewport = {
  themeColor: "#111827",
  userScalable: false,
  maximumScale: 1,
  minimumScale: 1,
};

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();

  return (
    <div className="relative h-dvh overflow-hidden overscroll-none">
      <Constellation />
      <div className="relative z-10 flex h-full flex-col">
        <header className="flex items-center justify-between px-5 py-4">
          <div className="flex flex-col leading-none">
            <span className="font-display text-lg tracking-wide text-ink">Órbita</span>
            {session && (
              <span className="mt-0.5 text-[10px] text-ink-muted">
                olá, {session.userName}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <NotificationBridge />
            <div className="glass flex items-center gap-0.5 rounded-full p-1">
              <Link
                href="/app/senha"
                aria-label="senha"
                className="flex h-8 w-8 items-center justify-center rounded-full text-ink-muted transition hover:bg-surface-strong hover:text-ink"
              >
                <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4">
                  <circle cx="12" cy="8" r="3.2" stroke="currentColor" strokeWidth="1.6" />
                  <path
                    d="M5 20c1-3.5 3.8-5.5 7-5.5s6 2 7 5.5"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                  />
                </svg>
              </Link>
              <form action={logoutAction}>
                <button
                  type="submit"
                  aria-label="sair"
                  className="flex h-8 w-8 items-center justify-center rounded-full text-ink-muted transition hover:bg-surface-strong hover:text-ink"
                >
                  <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4">
                    <path
                      d="M9 4H6a1.5 1.5 0 0 0-1.5 1.5v13A1.5 1.5 0 0 0 6 20h3"
                      stroke="currentColor"
                      strokeWidth="1.6"
                      strokeLinecap="round"
                    />
                    <path
                      d="M13 8l4 4-4 4M9 12h8"
                      stroke="currentColor"
                      strokeWidth="1.6"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </button>
              </form>
            </div>
          </div>
        </header>
        <main className="flex min-h-0 flex-1 flex-col items-center justify-center overflow-hidden px-4 pb-24">
          {children}
        </main>
        <BottomNav />
      </div>
    </div>
  );
}
