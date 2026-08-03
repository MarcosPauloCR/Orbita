export type SignalRow = { from_user: string; created_at: string };

function toUtcDateKey(iso: string): string {
  return new Date(iso).toISOString().slice(0, 10);
}

/** Conta dias seguidos (até hoje ou ontem) em que os dois usuários mandaram
 * sinal — não zera o streak enquanto o dia de hoje ainda não acabou. */
export function computeMutualStreak(
  signals: SignalRow[],
  userIds: [string, string]
): number {
  const byDate = new Map<string, Set<string>>();
  for (const s of signals) {
    const key = toUtcDateKey(s.created_at);
    if (!byDate.has(key)) byDate.set(key, new Set());
    byDate.get(key)!.add(s.from_user);
  }

  const mutualDates = new Set<string>();
  byDate.forEach((users, date) => {
    if (userIds.every((u) => users.has(u))) mutualDates.add(date);
  });

  const cursor = new Date();
  cursor.setUTCHours(0, 0, 0, 0);
  let key = cursor.toISOString().slice(0, 10);

  if (!mutualDates.has(key)) {
    cursor.setUTCDate(cursor.getUTCDate() - 1);
    key = cursor.toISOString().slice(0, 10);
  }

  let streak = 0;
  while (mutualDates.has(key)) {
    streak++;
    cursor.setUTCDate(cursor.getUTCDate() - 1);
    key = cursor.toISOString().slice(0, 10);
  }

  return streak;
}

export const TROPHIES = [
  { days: 1, name: "Primeiro Sinal", icon: "🌑" },
  { days: 2, name: "Lua Nova", icon: "🌑" },
  { days: 3, name: "Primeira Lua", icon: "🌒" },
  { days: 5, name: "Quarto Crescente", icon: "🌓" },
  { days: 7, name: "Lua Cheia", icon: "🌕" },
  { days: 10, name: "Lua Minguante", icon: "🌖" },
  { days: 14, name: "Duas Semanas em Órbita", icon: "🌗" },
  { days: 21, name: "Três Semanas", icon: "🌘" },
  { days: 30, name: "Um Mês de Órbita", icon: "🪐" },
  { days: 45, name: "Chuva de Meteoros", icon: "☄️" },
  { days: 60, name: "Dois Meses", icon: "🌠" },
  { days: 90, name: "Um Trimestre Girando", icon: "🛰️" },
  { days: 120, name: "Quatro Meses", icon: "✨" },
  { days: 150, name: "Cinco Meses", icon: "🌌" },
  { days: 180, name: "Meio Ano", icon: "🌙" },
  { days: 210, name: "Sete Meses", icon: "⭐" },
  { days: 240, name: "Oito Meses", icon: "🌟" },
  { days: 270, name: "Nove Meses", icon: "💫" },
  { days: 300, name: "Dez Meses", icon: "🔭" },
  { days: 330, name: "Onze Meses", icon: "🌍" },
  { days: 365, name: "Um Ano de Órbita", icon: "🏆" },
  { days: 500, name: "Meio Milênio de Dias", icon: "👑" },
  { days: 730, name: "Dois Anos", icon: "💎" },
  { days: 1000, name: "Mil Sinais de Amor", icon: "🌈" },
] as const;

export type Trophy = (typeof TROPHIES)[number];

export function currentTrophy(streakDays: number): {
  current: Trophy | null;
  next: Trophy | null;
} {
  let current: Trophy | null = null;
  let next: Trophy | null = null;

  for (const trophy of TROPHIES) {
    if (streakDays >= trophy.days) {
      current = trophy;
    } else {
      next = trophy;
      break;
    }
  }

  return { current, next };
}
