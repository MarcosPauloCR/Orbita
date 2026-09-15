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

// Cor de cada marco monta uma progressão (não é aleatória): começa em
// azuis frios (início tímido), passa por rosa/violeta (romance
// esquentando), dourado/laranja (calor, conquista) e fecha nos dois
// únicos que continuam com paleta própria fixa (gema e arco-íris, já
// tratados dentro do TrophyIcon como casos especiais).
export const TROPHIES = [
  { days: 1, name: "Primeiro Sinal", icon: "🌑", iconKind: "spark", color1: "#67e8f9", color2: "#0891b2" },
  { days: 2, name: "Lua Nova", icon: "🌑", iconKind: "moon-new", color1: "#a5b4fc", color2: "#4f46e5" },
  { days: 3, name: "Primeira Lua", icon: "🌒", iconKind: "moon-crescent-waxing", color1: "#7dd3fc", color2: "#0284c7" },
  { days: 5, name: "Quarto Crescente", icon: "🌓", iconKind: "moon-quarter-waxing", color1: "#5eead4", color2: "#0d9488" },
  { days: 7, name: "Lua Cheia", icon: "🌕", iconKind: "moon-full", color1: "#fef08a", color2: "#eab308" },
  { days: 10, name: "Lua Minguante", icon: "🌖", iconKind: "moon-gibbous-waning", color1: "#fdba74", color2: "#ea580c" },
  { days: 14, name: "Duas Semanas em Órbita", icon: "🌗", iconKind: "moon-quarter-waning-orbit", color1: "#c4b5fd", color2: "#7c3aed" },
  { days: 21, name: "Três Semanas", icon: "🌘", iconKind: "moon-crescent-waning", color1: "#fda4af", color2: "#e11d48" },
  { days: 30, name: "Um Mês de Órbita", icon: "🪐", iconKind: "saturn", color1: "#fbcfe8", color2: "#db2777" },
  { days: 45, name: "Chuva de Meteoros", icon: "☄️", iconKind: "meteor-shower", color1: "#fdba74", color2: "#c2410c" },
  { days: 60, name: "Dois Meses", icon: "🚀", iconKind: "rocket", color1: "#93c5fd", color2: "#2563eb" },
  { days: 90, name: "Um Trimestre Girando", icon: "🛰️", iconKind: "satellite", color1: "#e2e8f0", color2: "#64748b" },
  { days: 120, name: "Quatro Meses", icon: "👨‍🚀", iconKind: "astronaut", color1: "#f1f5f9", color2: "#94a3b8" },
  { days: 150, name: "Cinco Meses", icon: "🌀", iconKind: "spiral-galaxy", color1: "#f0abfc", color2: "#a21caf" },
  { days: 180, name: "Meio Ano", icon: "🌙", iconKind: "moon-full-halo", color1: "#fef9c3", color2: "#facc15" },
  { days: 210, name: "Sete Meses", icon: "🌌", iconKind: "aurora", color1: "#4ade80", color2: "#a78bfa" },
  { days: 240, name: "Oito Meses", icon: "🌟", iconKind: "star-filled", color1: "#fef08a", color2: "#ca8a04" },
  { days: 270, name: "Nove Meses", icon: "🕳️", iconKind: "black-hole", color1: "#c4b5fd", color2: "#312e81" },
  { days: 300, name: "Dez Meses", icon: "🔭", iconKind: "telescope", color1: "#93c5fd", color2: "#1d4ed8" },
  { days: 330, name: "Onze Meses", icon: "🌍", iconKind: "globe", color1: "#86efac", color2: "#0891b2" },
  { days: 365, name: "Um Ano de Órbita", icon: "🏆", iconKind: "trophy-cup", color1: "#fde047", color2: "#b45309" },
  { days: 500, name: "Meio Milênio de Dias", icon: "👑", iconKind: "crown", color1: "#d8b4fe", color2: "#7e22ce" },
  // Gema e arco-íris ignoram color1/color2 (o TrophyIcon já tem paleta
  // própria fixa pra esses dois, de propósito) — preenchidos só pra
  // manter o formato do array igual em todas as linhas.
  { days: 730, name: "Dois Anos", icon: "💎", iconKind: "gem", color1: "#eaf6ff", color2: "#8fc9e8" },
  { days: 1000, name: "Mil Sinais de Amor", icon: "🌈", iconKind: "rainbow", color1: "#ff6b6b", color2: "#74c0fc" },
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
