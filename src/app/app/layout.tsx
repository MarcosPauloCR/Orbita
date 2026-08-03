import type { Metadata } from "next";
import Link from "next/link";
import { getSession } from "@/lib/auth/get-session";
import { getPublicUsers } from "@/lib/auth/users";
import { Constellation } from "@/components/Constellation";
import { NotificationBridge } from "@/components/NotificationBridge";
import { BottomNav } from "@/components/BottomNav";
import { PresenceProvider } from "@/lib/presence/PresenceProvider";
import { logoutAction } from "./actions";

export const metadata: Metadata = {
  title: "Órbita",
};

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  const otherUser = session
    ? (await getPublicUsers()).find((u) => u.id !== session.userId)
    : undefined;

  const content = (
    <div className="relative min-h-screen">
      <Constellation />
      <div className="relative z-10 flex min-h-screen flex-col">
        <header className="flex items-center justify-between px-6 py-5">
          <span className="font-display text-lg text-ink">Órbita</span>
          <div className="flex items-center gap-4">
            {session && (
              <span className="text-xs text-ink-muted">
                {session.userName}
              </span>
            )}
            <NotificationBridge />
            <Link
              href="/app/senha"
              className="text-xs text-ink-muted underline underline-offset-2 hover:text-ink"
            >
              senha
            </Link>
            <form action={logoutAction}>
              <button
                type="submit"
                className="text-xs text-ink-muted underline underline-offset-2 hover:text-ink"
              >
                sair
              </button>
            </form>
          </div>
        </header>
        <main className="flex flex-1 flex-col items-center justify-center px-4 pb-24">
          {children}
        </main>
        <BottomNav />
      </div>
    </div>
  );

  if (session && otherUser) {
    return (
      <PresenceProvider currentUserId={session.userId} otherUserId={otherUser.id}>
        {content}
      </PresenceProvider>
    );
  }

  return content;
}
