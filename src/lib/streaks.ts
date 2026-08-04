export type SignalRow = {
  from_user: string;
  created_at: string;
  type?: "normal" | "sos";
};

export function toUtcDateKey(iso: string): string {
  return new Date(iso).toISOString().slice(0, 10);
}

/** Mapa data -> conjunto de usuários, genérico pra qualquer tabela com
 * from_user + uma data (checkins, daily_answers...). */
export function groupRowsByUtcDate<T>(
  rows: T[],
  getDateField: (row: T) => string,
  getUser: (row: T) => string
): Map<string, Set<string>> {
  const byDate = new Map<string, Set<string>>();
  for (const row of rows) {
    const key = getDateField(row).slice(0, 10);
    if (!byDate.has(key)) byDate.set(key, new Set());
    byDate.get(key)!.add(getUser(row));
  }
  return byDate;
}

export function mutualDatesFrom(
  byDate: Map<string, Set<string>>,
  userIds: [string, string]
): Set<string> {
  const result = new Set<string>();
  byDate.forEach((users, date) => {
    if (userIds.every((u) => users.has(u))) result.add(date);
  });
  return result;
}

/** Mapa data -> conjunto de usuários que mandaram sinal normal naquele dia
 * (UTC). Usado tanto pro streak quanto pro calendário de atividade. */
export function groupSignalsByDay(
  signals: SignalRow[]
): Map<string, Set<string>> {
  const byDate = new Map<string, Set<string>>();
  for (const s of signals) {
    if (s.type === "sos") continue;
    const key = toUtcDateKey(s.created_at);
    if (!byDate.has(key)) byDate.set(key, new Set());
    byDate.get(key)!.add(s.from_user);
  }
  return byDate;
}

/** Conta dias seguidos (até hoje ou ontem) em que os dois usuários mandaram
 * sinal — não zera o streak enquanto o dia de hoje ainda não acabou. */
export function computeMutualStreak(
  signals: SignalRow[],
  userIds: [string, string]
): number {
  const byDate = groupSignalsByDay(signals);

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

/** Maior sequência já alcançada na história toda (não só a atual, que
 * conta a partir de hoje/ontem pra trás). Usado pro selo de recorde. */
export function computeLongestStreak(
  signals: SignalRow[],
  userIds: [string, string]
): number {
  const byDate = groupSignalsByDay(signals);
  const mutualDates = mutualDatesFrom(byDate, userIds);
  const sortedKeys = Array.from(mutualDates).sort();

  let longest = 0;
  let current = 0;
  let prevTime: number | null = null;

  for (const key of sortedKeys) {
    const time = new Date(`${key}T00:00:00Z`).getTime();
    current = prevTime !== null && time - prevTime === 86400000 ? current + 1 : 1;
    longest = Math.max(longest, current);
    prevTime = time;
  }

  return longest;
}

/** Maior número de sinais normais mandados (por qualquer um dos dois) num
 * único dia — usado pro selo de recorde do dia. */
export function bestSignalDayCount(signals: SignalRow[]): number {
  const totals = new Map<string, number>();
  for (const s of signals) {
    if (s.type === "sos") continue;
    const key = toUtcDateKey(s.created_at);
    totals.set(key, (totals.get(key) ?? 0) + 1);
  }
  let best = 0;
  totals.forEach((count) => {
    best = Math.max(best, count);
  });
  return best;
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
