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

// 100 marcos, um por dia de sequência (1 a 100) — nomes e subtítulos são
// os que o usuário passou como referência (traduzidos do pacote
// "space_*" que ele gostou), não inventados por cima. subtitle vazio
// quando o nome original não tinha um "Nome: subtítulo" pra separar.
// Cor de cada marco monta uma progressão: azul frio (início) → rosa/
// violeta (romance) → dourado/laranja (conquista), com a órbita eterna
// do dia 100 fechando num degradê especial próprio.
export const TROPHIES = [
  { days: 1, name: "Lua Nova", subtitle: "O Início do Nosso Ciclo", icon: "🌑", iconKind: "moon-new", color1: "#a5b4fc", color2: "#4f46e5" },
  { days: 2, name: "Lua Crescente", subtitle: "Primeiro Pensamento", icon: "🌒", iconKind: "moon-crescent-waxing", color1: "#7dd3fc", color2: "#0284c7" },
  { days: 3, name: "Quarto Crescente", subtitle: "Sintonia Alinhada", icon: "🌓", iconKind: "moon-quarter-waxing", color1: "#5eead4", color2: "#0d9488" },
  { days: 4, name: "Lua Convexa", subtitle: "Quase Cheia de Amor", icon: "🌔", iconKind: "moon-gibbous-waxing", color1: "#fde68a", color2: "#d97706" },
  { days: 5, name: "Lua Cheia", subtitle: "Conexão Iluminada", icon: "🌕", iconKind: "moon-full", color1: "#fef08a", color2: "#eab308" },
  { days: 6, name: "Superlua", subtitle: "Pensamento Radiante", icon: "🌕✨", iconKind: "moon-full-halo", color1: "#fef9c3", color2: "#f59e0b" },
  { days: 7, name: "Lua de Sangue", subtitle: "Conexão Intensa", icon: "🌖🩸", iconKind: "moon-full", color1: "#fca5a5", color2: "#b91c1c" },
  { days: 8, name: "Lua Azul", subtitle: "Raro e Especial", icon: "🌕💙", iconKind: "moon-full", color1: "#93c5fd", color2: "#1d4ed8" },
  { days: 9, name: "Mercúrio", subtitle: "Calor Rápido", icon: "🟤🪐", iconKind: "planet-mercury", color1: "#d6b48a", color2: "#92400e" },
  { days: 10, name: "Vênus", subtitle: "Planeta do Amor", icon: "🟡💛", iconKind: "planet-venus", color1: "#fde68a", color2: "#eab308" },
  { days: 11, name: "Terra Noturna", subtitle: "Eu e Você no Mundo", icon: "🌍🌃", iconKind: "planet-earth-night", color1: "#93c5fd", color2: "#1e3a8a" },
  { days: 12, name: "Marte", subtitle: "Chama Viva", icon: "🔴🪐", iconKind: "planet-mars", color1: "#fca5a5", color2: "#b91c1c" },
  { days: 13, name: "Júpiter", subtitle: "Amor Gigante", icon: "🟠🌀", iconKind: "planet-jupiter", color1: "#fdba74", color2: "#c2410c" },
  { days: 14, name: "A Grande Mancha Vermelha", subtitle: "", icon: "🌀👁️", iconKind: "planet-jupiter-storm", color1: "#fdba74", color2: "#9a3412" },
  { days: 15, name: "Saturno", subtitle: "Anel de Compromisso Cósmico", icon: "🪐💫", iconKind: "saturn", color1: "#fbcfe8", color2: "#db2777" },
  { days: 16, name: "Urano", subtitle: "Mistério Gelado", icon: "🩵❄️", iconKind: "planet-uranus", color1: "#a5f3fc", color2: "#0e7490" },
  { days: 17, name: "Netuno", subtitle: "Oceano de Estrelas", icon: "🔵🌊", iconKind: "planet-neptune", color1: "#93c5fd", color2: "#1e40af" },
  { days: 18, name: "Plutão", subtitle: "Pequeno com Grande Coração", icon: "🤎🤍", iconKind: "planet-pluto", color1: "#d6d3d1", color2: "#78716c" },
  { days: 19, name: "Europa", subtitle: "Oceano Oculto", icon: "🧊🪐", iconKind: "planet-europa", color1: "#bae6fd", color2: "#0369a1" },
  { days: 20, name: "Titã", subtitle: "Atmosfera Dourada", icon: "🌫️🪐", iconKind: "planet-titan", color1: "#fde68a", color2: "#b45309" },
  { days: 21, name: "Primeiro Brilho", subtitle: "", icon: "✨", iconKind: "spark", color1: "#fef08a", color2: "#facc15" },
  { days: 22, name: "Estrela Cadente", subtitle: "Desejo Feito", icon: "🌠", iconKind: "shooting-star", color1: "#fdba74", color2: "#ea580c" },
  { days: 23, name: "Estrela Reluzente", subtitle: "Presente na Memória", icon: "🌟", iconKind: "star-filled", color1: "#fef08a", color2: "#ca8a04" },
  { days: 24, name: "Estrela Binária", subtitle: "Girando Juntos", icon: "🌟🌟", iconKind: "double-star", color1: "#f0abfc", color2: "#a21caf" },
  { days: 25, name: "Pulsar", subtitle: "Batimento Sincronizado", icon: "💫⏱️", iconKind: "pulsar", color1: "#93c5fd", color2: "#2563eb" },
  { days: 26, name: "Magnetar", subtitle: "Atração Magnética", icon: "🧲✨", iconKind: "magnetar", color1: "#c4b5fd", color2: "#6d28d9" },
  { days: 27, name: "Gigante Vermelha", subtitle: "Coração Expandido", icon: "🔴💥", iconKind: "red-giant", color1: "#fca5a5", color2: "#b91c1c" },
  { days: 28, name: "Anã Branca", subtitle: "Brilho Eterno", icon: "⚪✨", iconKind: "white-dwarf", color1: "#f8fafc", color2: "#94a3b8" },
  { days: 29, name: "Supernova", subtitle: "Explosão de Carinho", icon: "💥🌌", iconKind: "supernova", color1: "#fdba74", color2: "#dc2626" },
  { days: 30, name: "Aurora Boreal", subtitle: "Dança no Céu", icon: "🟢🌌", iconKind: "aurora", color1: "#4ade80", color2: "#22c55e" },
  { days: 31, name: "Aurora Austral", subtitle: "Luzes do Sul", icon: "🟣🌌", iconKind: "aurora", color1: "#d8b4fe", color2: "#a855f7" },
  { days: 32, name: "Erupção Solar", subtitle: "Saudade Quente", icon: "☀️🔥", iconKind: "solar-flare", color1: "#fdba74", color2: "#ea580c" },
  { days: 33, name: "Eclipse Solar", subtitle: "Encontro Perfeito", icon: "🌑☀️", iconKind: "solar-eclipse", color1: "#fde68a", color2: "#78350f" },
  { days: 34, name: "Eclipse Lunar", subtitle: "Abraço de Sombra", icon: "🌖🌑", iconKind: "moon-gibbous-waning", color1: "#fca5a5", color2: "#7f1d1d" },
  { days: 35, name: "Coroa Solar", subtitle: "Majestade Cósmica", icon: "👑✨", iconKind: "corona", color1: "#fde047", color2: "#b45309" },
  { days: 36, name: "Poeira Estelar", subtitle: "Feitos do Mesmo Material", icon: "🌫️✨", iconKind: "sparkle-cluster", color1: "#fef08a", color2: "#eab308" },
  { days: 37, name: "Constelação do Coração", subtitle: "", icon: "🌌🤍", iconKind: "constellation-heart", color1: "#f9a8d4", color2: "#db2777" },
  { days: 38, name: "Cinturão de Órion", subtitle: "Alinhamento Perfeito", icon: "🌟🌟🌟", iconKind: "orion-belt", color1: "#93c5fd", color2: "#3b82f6" },
  { days: 39, name: "Cruzeiro do Sul", subtitle: "Direção Certa", icon: "✝️✨", iconKind: "southern-cross", color1: "#93c5fd", color2: "#1d4ed8" },
  { days: 40, name: "Luz Zodiacal", subtitle: "", icon: "✨📐", iconKind: "zodiac-light", color1: "#c4b5fd", color2: "#7c3aed" },
  { days: 41, name: "Raio Gama", subtitle: "Energia Pura", icon: "⚡🌌", iconKind: "gamma-ray", color1: "#86efac", color2: "#16a34a" },
  { days: 42, name: "Raio Cósmico", subtitle: "", icon: "☄️⚡", iconKind: "cosmic-ray", color1: "#93c5fd", color2: "#2563eb" },
  { days: 43, name: "Meteoro Cortando o Espaço", subtitle: "", icon: "🪨🔥", iconKind: "meteor", color1: "#fdba74", color2: "#c2410c" },
  { days: 44, name: "Chuva de Meteoros", subtitle: "Pensando sem Parar", icon: "🌠🌠", iconKind: "meteor-shower", color1: "#fdba74", color2: "#c2410c" },
  { days: 45, name: "Cometa de Halley", subtitle: "Ciclo Eterno", icon: "☄️❄️", iconKind: "comet", color1: "#a5f3fc", color2: "#0891b2" },
  { days: 46, name: "Via Láctea", subtitle: "Nosso Bairro no Universo", icon: "🌌", iconKind: "milky-way", color1: "#e9d5ff", color2: "#7c3aed" },
  { days: 47, name: "Andrômeda", subtitle: "Destinados a se Encontrar", icon: "🌀🌌", iconKind: "spiral-galaxy", color1: "#f0abfc", color2: "#a21caf" },
  { days: 48, name: "Galáxia Espiral", subtitle: "Rodopio de Amor", icon: "🌀💫", iconKind: "spiral-galaxy", color1: "#f0abfc", color2: "#c026d3" },
  { days: 49, name: "Nebulosa Colorida", subtitle: "Onde Nascem Ideias", icon: "🪻🌌", iconKind: "nebula-cloud", color1: "#f0abfc", color2: "#7c3aed" },
  { days: 50, name: "Nebulosa do Coração", subtitle: "", icon: "💖🌌", iconKind: "nebula-heart", color1: "#f9a8d4", color2: "#db2777" },
  { days: 51, name: "Pilares da Criação", subtitle: "Amor Monumental", icon: "🏛️✨", iconKind: "pillars", color1: "#fdba74", color2: "#b45309" },
  { days: 52, name: "Buraco Negro", subtitle: "Gravidade Irresistível", icon: "🕳️🌀", iconKind: "black-hole", color1: "#c4b5fd", color2: "#312e81" },
  { days: 53, name: "Horizonte de Eventos", subtitle: "Sem Volta", icon: "⭕🖤", iconKind: "event-horizon", color1: "#c4b5fd", color2: "#4c1d95" },
  { days: 54, name: "Buraco de Minhoca", subtitle: "Atalho até Você", icon: "🌀🚪", iconKind: "wormhole", color1: "#93c5fd", color2: "#4338ca" },
  { days: 55, name: "Distorção do Espaço-Tempo", subtitle: "", icon: "🕸️🪐", iconKind: "warp-grid", color1: "#93c5fd", color2: "#1e40af" },
  { days: 56, name: "Nuvem Interestelar", subtitle: "", icon: "☁️✨", iconKind: "nebula-cloud", color1: "#a5f3fc", color2: "#0e7490" },
  { days: 57, name: "O Vazio Cósmico", subtitle: "Só Nós Dois", icon: "🌌🕳️", iconKind: "void", color1: "#d1d5db", color2: "#374151" },
  { days: 58, name: "Quasar", subtitle: "O Farol Mais Distante", icon: "🔦🌌", iconKind: "quasar", color1: "#fde047", color2: "#eab308" },
  { days: 59, name: "Lente Gravitacional", subtitle: "", icon: "🔍🪐", iconKind: "grav-lens", color1: "#93c5fd", color2: "#1e3a8a" },
  { days: 60, name: "Teia Cósmica", subtitle: "Tudo Interligado", icon: "🕸️🌌", iconKind: "cosmic-web", color1: "#a5b4fc", color2: "#4338ca" },
  { days: 61, name: "Aglomerado de Galáxias", subtitle: "", icon: "🎆🌌", iconKind: "cluster", color1: "#fde047", color2: "#eab308" },
  { days: 62, name: "Aglomerado Globular", subtitle: "", icon: "🔮✨", iconKind: "globular-cluster", color1: "#fef08a", color2: "#ca8a04" },
  { days: 63, name: "Bolha do Multiverso", subtitle: "Juntos em Todas as Vidas", icon: "🫧🪐", iconKind: "multiverse-bubble", color1: "#f0abfc", color2: "#a855f7" },
  { days: 64, name: "Nuvem de Oort", subtitle: "A Fronteira Distante", icon: "❄️☄️", iconKind: "oort-cloud", color1: "#a5f3fc", color2: "#0e7490" },
  { days: 65, name: "Cinturão de Kuiper", subtitle: "", icon: "🪨🧊", iconKind: "kuiper-belt", color1: "#d6d3d1", color2: "#78716c" },
  { days: 66, name: "Foguete de Decolagem", subtitle: "Start na Sequência", icon: "🚀", iconKind: "rocket", color1: "#93c5fd", color2: "#2563eb" },
  { days: 67, name: "Ônibus Espacial", subtitle: "Viagem Segura", icon: "🛸", iconKind: "shuttle", color1: "#e2e8f0", color2: "#64748b" },
  { days: 68, name: "Estação Espacial", subtitle: "Morada nas Estrelas", icon: "🛰️", iconKind: "satellite", color1: "#e2e8f0", color2: "#64748b" },
  { days: 69, name: "Rover Explorador", subtitle: "Buscando Você", icon: "🚜🪐", iconKind: "rover", color1: "#fdba74", color2: "#c2410c" },
  { days: 70, name: "Antena de Sinal", subtitle: "Pensamento Recebido", icon: "📡", iconKind: "antenna", color1: "#93c5fd", color2: "#1d4ed8" },
  { days: 71, name: "Sinal de Rádio Interestelar", subtitle: "", icon: "📶💫", iconKind: "radio-signal", color1: "#86efac", color2: "#16a34a" },
  { days: 72, name: "Sonda Voyager", subtitle: "Mensagem de Amor Eterna", icon: "🛰️💿", iconKind: "satellite", color1: "#e2e8f0", color2: "#475569" },
  { days: 73, name: "Disco de Ouro", subtitle: "Nossa Trilha Sonora", icon: "📀🚀", iconKind: "golden-record", color1: "#fde68a", color2: "#b45309" },
  { days: 74, name: "Telescópio Espacial", subtitle: "Olhos em Você", icon: "🔭🌌", iconKind: "telescope", color1: "#93c5fd", color2: "#1d4ed8" },
  { days: 75, name: "Módulo Lunar", subtitle: "Pouso Seguro", icon: "🛸🌕", iconKind: "lunar-lander", color1: "#e2e8f0", color2: "#64748b" },
  { days: 76, name: "Capacete de Astronauta", subtitle: "", icon: "👨‍🚀", iconKind: "astronaut", color1: "#f1f5f9", color2: "#94a3b8" },
  { days: 77, name: "Casal de Astronautas", subtitle: "Parceria na Missão", icon: "👩‍🚀🧑‍🚀", iconKind: "astronaut-couple", color1: "#f9a8d4", color2: "#db2777" },
  { days: 78, name: "Caminhada no Espaço", subtitle: "Mãos Dadas no Vácuo", icon: "🧑‍🚀🪢", iconKind: "spacewalk", color1: "#93c5fd", color2: "#1d4ed8" },
  { days: 79, name: "Trajetória Orbital", subtitle: "Em Torno de Você", icon: "🪐🔄", iconKind: "orbit-path", color1: "#c4b5fd", color2: "#7c3aed" },
  { days: 80, name: "Cidade Orbital", subtitle: "", icon: "🏙️🛰️", iconKind: "space-station", color1: "#e2e8f0", color2: "#64748b" },
  { days: 81, name: "Velocidade Dobra", subtitle: "Chegando Rápido", icon: "⚡🚀", iconKind: "warp-drive", color1: "#93c5fd", color2: "#2563eb" },
  { days: 82, name: "Botas Gravitacionais", subtitle: "", icon: "🥾🧲", iconKind: "gravity-boots", color1: "#d6d3d1", color2: "#78716c" },
  { days: 83, name: "Cápsula de Retorno", subtitle: "", icon: "💊🚀", iconKind: "space-capsule", color1: "#fca5a5", color2: "#dc2626" },
  { days: 84, name: "Nave Mãe", subtitle: "Proteção Total", icon: "🛸✨", iconKind: "mothership", color1: "#c4b5fd", color2: "#6d28d9" },
  { days: 85, name: "Farol Guia", subtitle: "Localização Fixada", icon: "🚨🛰️", iconKind: "beacon", color1: "#fde047", color2: "#eab308" },
  { days: 86, name: "Painel Solar", subtitle: "Carregando Energias", icon: "🪞☀️", iconKind: "solar-panel", color1: "#93c5fd", color2: "#1e40af" },
  { days: 87, name: "Tanque de Oxigênio", subtitle: "Você é Meu Ar", icon: "🫧🧑‍🚀", iconKind: "oxygen-tank", color1: "#a5f3fc", color2: "#0891b2" },
  { days: 88, name: "Bandeira Fincada", subtitle: "Território Conquistado", icon: "🚩🌕", iconKind: "flag", color1: "#fca5a5", color2: "#dc2626" },
  { days: 89, name: "Escudo Térmico", subtitle: "Superando o Atrito", icon: "🛡️🔥", iconKind: "heat-shield", color1: "#fdba74", color2: "#c2410c" },
  { days: 90, name: "Acoplamento", subtitle: "Conexão Bem-Sucedida", icon: "🔗🚀", iconKind: "docking", color1: "#93c5fd", color2: "#2563eb" },
  { days: 91, name: "Carta Interestelar", subtitle: "Pensei em Você", icon: "💌🛸", iconKind: "letter", color1: "#fda4af", color2: "#e11d48" },
  { days: 92, name: "Bússola Estelar", subtitle: "Norte do Relacionamento", icon: "🧭✨", iconKind: "compass", color1: "#fde047", color2: "#b45309" },
  { days: 93, name: "Abraço no Vácuo", subtitle: "", icon: "🫂🌌", iconKind: "cosmic-hug", color1: "#f9a8d4", color2: "#db2777" },
  { days: 94, name: "Conexão de Outro Mundo", subtitle: "", icon: "👽💚", iconKind: "alien", color1: "#86efac", color2: "#16a34a" },
  { days: 95, name: "Anel de Fogo Cósmico", subtitle: "", icon: "💍🔥", iconKind: "ring-of-fire", color1: "#fdba74", color2: "#c2410c" },
  { days: 96, name: "Cápsula do Tempo", subtitle: "", icon: "⌛🪐", iconKind: "time-capsule", color1: "#fde68a", color2: "#b45309" },
  { days: 97, name: "Matéria Escura", subtitle: "O Invisível que nos Une", icon: "🖤✨", iconKind: "dark-matter", color1: "#c4b5fd", color2: "#312e81" },
  { days: 98, name: "Universo Infinito", subtitle: "100 Dias Pensando em Você", icon: "♾️🌌", iconKind: "infinity", color1: "#fde047", color2: "#eab308" },
  { days: 99, name: "Monarcas do Universo", subtitle: "", icon: "👑🪐", iconKind: "crown", color1: "#d8b4fe", color2: "#7e22ce" },
  // Marco final — ganha o gradiente especial próprio (dourado→rosa→azul)
  // dentro do TrophyIcon, ignora color1/color2; preenchidos só pra manter
  // o formato do array. Subtítulo adaptado (o original vinha com um nome
  // genérico de placeholder no lugar do casal de verdade).
  { days: 100, name: "Órbita Eterna", subtitle: "Vocês Zeraram o Universo", icon: "💍🪐", iconKind: "eternal-orbit", color1: "#fbbf24", color2: "#60a5fa" },
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
