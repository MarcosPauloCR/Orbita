import type { TrophyIconKind } from "@/components/TrophyIcon";
import type { ActivityType } from "@/app/app/agenda/actions";

export type Challenge = {
  id: string;
  name: string;
  iconKind: TrophyIconKind;
  color1: string;
  color2: string;
  // Presente só numa parte dos 100 — a Agenda só rastreia 4 tipos de
  // atividade, então desafios sem equivalente lá (escrever uma carta,
  // aprender uma dança...) continuam manuais. Quando tem matchTitle, só
  // conta se o filme/prato vinculado na Agenda contiver esse texto no
  // nome (comparação sem acento/maiúscula não é feita, é substring puro
  // em minúsculas).
  auto?: {
    activityType: ActivityType;
    matchTitle?: string;
  };
};

// Ciclo de ícones reaproveitados dos troféus de streak — não dá pra
// desenhar 100 SVGs únicos. Ficam de fora os "raros" (coroa, gema,
// arco-íris, troféu), exclusivos da sequência de dias.
const ICON_CYCLE: TrophyIconKind[] = [
  "spark",
  "moon-crescent-waxing",
  "sleep",
  "movie-reel",
  "cooking-pot",
  "compass",
  "satellite",
  "sparkle-cluster",
  "nebula-heart",
  "star-outline",
  "star-filled",
  "meteor-shower",
  "shooting-star",
  "telescope",
  "globe",
  "moon-quarter-waxing",
  "saturn",
  "star-rays",
  "moon-full",
  "moon-gibbous-waning",
];

// Paleta colorida (pedido explícito: nada de dourado aqui, só na
// sequência) — gira entre os 100 desafios junto com o ciclo de ícones.
const COLOR_CYCLE: [string, string][] = [
  ["#22d3ee", "#0ea5e9"],
  ["#f472b6", "#db2777"],
  ["#facc15", "#f59e0b"],
  ["#4ade80", "#16a34a"],
  ["#a78bfa", "#7c3aed"],
  ["#fb923c", "#ea580c"],
  ["#f87171", "#dc2626"],
  ["#2dd4bf", "#0d9488"],
  ["#818cf8", "#4f46e5"],
  ["#e879f9", "#c026d3"],
];

const NAMES = [
  "Dormir agarradinho a noite toda",
  "Assistir um filme antigo (de antes de vocês nascerem)",
  "Cozinhar um prato novo juntos",
  "Pedir um fast food bem duvidoso só pra rir",
  "Fazer uma pizza caseira do zero",
  "Dançar na cozinha sem nenhuma música tocando de verdade",
  "Escrever uma carta um pro outro e trocar",
  "Assistir ao nascer ou pôr do sol juntos",
  "Fazer uma trilha ou caminhada ao ar livre",
  "Jogar um jogo de tabuleiro até o fim",
  "Recriar a primeira mensagem que trocaram",
  "Tirar uma foto tipo polaroid juntos",
  "Fazer um piquenique, mesmo que seja na sala",
  "Começar uma série nova juntos",
  "Terminar uma temporada inteira numa única noite",
  "Provar uma comida de um país que nunca experimentaram",
  "Fazer uma lista de 10 coisas pra fazer juntos esse ano",
  "Ir a um lugar novo na cidade que nenhum dos dois conhece",
  "Cozinhar o prato favorito da infância de um dos dois",
  "Fazer uma noite sem celular, só conversa",
  "Assistir um documentário sobre o espaço",
  "Ver as estrelas juntos numa noite limpa",
  "Fazer uma pergunta que nunca perguntaram um pro outro",
  "Recriar o primeiro encontro de vocês",
  "Cantar uma música juntos, ainda que desafinado",
  "Fazer uma maratona de uma trilogia de filmes",
  "Jogar videogame juntos, mesmo que um não saiba jogar",
  "Fazer uma surpresa pequena sem motivo nenhum",
  "Cozinhar juntos sem seguir nenhuma receita",
  "Assistir de novo o primeiro filme que viram juntos",
  "Fazer uma noite de perguntas e respostas",
  "Assistir 'Interestelar' juntos",
  "Fazer uma competição boba (quem lava louça mais rápido)",
  "Plantar alguma coisa juntos",
  "Ir a um restaurante novo que nenhum dos dois já foi",
  "Fazer uma sessão de fotos boba em casa",
  "Escrever uma 'cápsula do tempo' com previsões pro futuro",
  "Assistir 'La La Land' juntos",
  "Fazer um café da manhã na cama um pro outro",
  "Acordar cedo só pra ver o nascer do sol",
  "Ir a um evento ao ar livre (feira, show, parque)",
  "Fazer uma dança lenta na sala, só os dois",
  "Cozinhar uma sobremesa do zero",
  "Assistir 'O Poderoso Chefão' juntos",
  "Fazer uma lista de músicas que representam a relação",
  "Recontar como foi o dia que se conheceram, cada um do seu jeito",
  "Fazer uma competição de karaokê",
  "Visitar um lugar que marcou a relação de vocês",
  "Fazer uma massagem um no outro",
  "Trocar presentes bobos e baratos, só de surpresa",
  "Assistir uma live ou show online juntos",
  "Fazer uma noite sem plano nenhum, só ver no que dá",
  "Jogar cartas até alguém ganhar 3 rodadas",
  "Cozinhar algo que nenhum dos dois sabe fazer, e arriscar",
  "Contar 3 coisas que admiram um no outro",
  "Fazer uma maratona de desenhos animados da infância",
  "Ir a uma padaria ou café novo pra tomar café da manhã",
  "Rever fotos antigas juntos",
  "Criar uma playlist só de vocês dois",
  "Fazer um desafio de comida picante juntos",
  "Assistir um filme de terror agarradinhos",
  "Passar um dia inteiro sem reclamar de nada",
  "Fazer uma pergunta 'e se...' e responder juntos",
  "Visitar (ou revisitar) o lugar do primeiro beijo",
  "Ler em voz alta um livro, um capítulo cada",
  "Assistir um campeonato ou jogo esportivo juntos",
  "Fazer uma faxina em dupla com música tocando",
  "Criar uma receita própria, inventada pelos dois",
  "Fazer uma noite de spa caseiro",
  "Contar uma lembrança engraçada que só vocês dois entendem",
  "Fazer uma aposta boba (quem perder faz algo pro outro)",
  "Assistir 'Simplesmente Amor' juntos",
  "Fazer uma sessão de verdade ou desafio",
  "Ir ao cinema de verdade, na sala",
  "Fazer uma noite temática (decoração, comida e filme combinando)",
  "Aprender uma palavra nova em outro idioma juntos",
  "Fazer uma corrida boba por algum lugar de casa",
  "Assistir uma competição de culinária e tentar recriar um prato",
  "Recriar a primeira data certinho, do jeito que foi",
  "Escrever 5 motivos de gratidão pelo relacionamento",
  "Montar uma trilha sonora pra um dia comum, tipo filme",
  "Assistir 'Como Eu Era Antes de Você' juntos",
  "Ficar uma hora inteira só conversando, sem tela",
  "Cozinhar o prato de um restaurante que vocês amam",
  "Fazer uma competição de quem conhece melhor o outro",
  "Assistir 'A Culpa é das Estrelas' juntos",
  "Fazer uma surpresa de café da tarde",
  "Ir a uma livraria ou sebo e escolher um livro pro outro",
  "Planejar um sonho juntos (viagem, casa, o que for)",
  "Assistir um stand-up comedy juntos",
  "Aprender um passo de dança novo (tutorial no YouTube)",
  "Cozinhar usando só o que já tem na geladeira",
  "Ver quem lembra mais detalhes de um dia especial",
  "Assistir uma série antiga que já saiu do ar há anos",
  "Fazer uma rodada de gratidão: uma coisa boa do dia, cada um",
  "Visitar um museu, exposição ou galeria juntos",
  "Fazer uma 'batalha' de quem cozinha melhor o mesmo prato",
  "Recriar (com cuidado) uma cena marcante de um filme",
  "Prometer assistir tudo que o outro pedir por uma semana",
  "Deixar uma mensagem na Cápsula do Tempo sobre esse desafio",
];

export const CHALLENGES: Challenge[] = NAMES.map((name, i) => {
  const [color1, color2] = COLOR_CYCLE[i % COLOR_CYCLE.length];
  return {
    id: `challenge_${String(i + 1).padStart(3, "0")}`,
    name,
    iconKind: ICON_CYCLE[i % ICON_CYCLE.length],
    color1,
    color2,
  };
});

function setAuto(name: string, auto: Challenge["auto"]) {
  const challenge = CHALLENGES.find((c) => c.name === name);
  if (challenge) challenge.auto = auto;
}

// Genéricos: qualquer item desse tipo na Agenda (dia já passado) conta —
// só um por tipo, pra não ter vários desafios destravando juntos à toa.
setAuto("Dormir agarradinho a noite toda", { activityType: "dormir" });
setAuto("Cozinhar um prato novo juntos", { activityType: "cozinhar" });
setAuto("Pedir um fast food bem duvidoso só pra rir", { activityType: "sair" });
setAuto("Assistir um filme antigo (de antes de vocês nascerem)", { activityType: "filme" });

// Específicos: só destrava se o filme marcado como assistido na Agenda
// tiver esse nome (o exemplo que o Marcos deu foi exatamente esse).
setAuto("Assistir 'Interestelar' juntos", { activityType: "filme", matchTitle: "interestelar" });
setAuto("Assistir 'La La Land' juntos", { activityType: "filme", matchTitle: "la la land" });
setAuto("Assistir 'O Poderoso Chefão' juntos", {
  activityType: "filme",
  matchTitle: "poderoso chefão",
});
setAuto("Assistir 'Simplesmente Amor' juntos", {
  activityType: "filme",
  matchTitle: "simplesmente amor",
});
setAuto("Assistir 'Como Eu Era Antes de Você' juntos", {
  activityType: "filme",
  matchTitle: "antes de você",
});
setAuto("Assistir 'A Culpa é das Estrelas' juntos", {
  activityType: "filme",
  matchTitle: "culpa é das estrelas",
});
