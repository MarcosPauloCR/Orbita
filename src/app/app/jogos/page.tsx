import { redirect } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/auth/get-session";
import { GameShell } from "./GameShell";

const GAMES = [
  {
    href: "/app/jogos/forca",
    label: "Jogo da Forca",
    icon: "🌙",
    description: "um pensa numa palavra, o outro adivinha",
    available: true,
  },
  {
    href: "#",
    label: "Caça-palavras",
    icon: "🔭",
    description: "vários temas e dificuldades — em breve",
    available: false,
  },
];

export default async function JogosPage() {
  const session = await getSession();
  if (!session) redirect("/");

  return (
    <GameShell>
      <p className="mb-1 text-[10px] uppercase tracking-wide text-ink-muted">
        jogos
      </p>
      <div className="flex flex-col gap-2">
        {GAMES.map((game) =>
          game.available ? (
            <Link
              key={game.label}
              href={game.href}
              className="flex items-center gap-3 rounded-2xl border border-hairline bg-surface p-4"
            >
              <span className="text-2xl">{game.icon}</span>
              <span>
                <span className="block text-sm text-ink">{game.label}</span>
                <span className="block text-[10px] text-ink-muted">
                  {game.description}
                </span>
              </span>
            </Link>
          ) : (
            <div
              key={game.label}
              className="flex items-center gap-3 rounded-2xl border border-hairline bg-surface p-4 opacity-50"
            >
              <span className="text-2xl">{game.icon}</span>
              <span>
                <span className="block text-sm text-ink">{game.label}</span>
                <span className="block text-[10px] text-ink-muted">
                  {game.description}
                </span>
              </span>
            </div>
          )
        )}
      </div>
    </GameShell>
  );
}
