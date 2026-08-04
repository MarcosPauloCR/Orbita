// Pergunta escolhida por data (não sorteada nem salva) — os dois sempre
// veem a mesma pergunta no mesmo dia, calendário civil (dias desde epoch).
export const DAILY_QUESTIONS = [
  "Qual foi o melhor momento do seu dia?",
  "O que você mais sentiu saudade hoje?",
  "Se pudesse reviver um momento nosso, qual seria?",
  "O que te fez sorrir sem eu saber?",
  "Qual é um sonho seu que eu ainda não sei?",
  "O que você mudaria no nosso dia a dia?",
  "Qual cheiro ou som te lembra de mim?",
  "O que você aprendeu essa semana?",
  "Se a gente pudesse viajar amanhã, pra onde iria?",
  "Qual foi a última vez que você riu de verdade?",
  "O que te deixou ansioso(a) hoje?",
  "Qual é a sua lembrança favorita de nós dois?",
  "O que você gostaria de fazer comigo que ainda não fizemos?",
  "Qual foi um momento que você se sentiu orgulhoso(a) de si mesmo(a)?",
  "O que você precisa ouvir de mim hoje?",
  "Qual comida você comeria pelo resto da vida?",
  "O que te dá medo, mesmo que pareça bobo?",
  "Qual é uma coisa boba que te faz feliz?",
  "Se pudesse dar um conselho pra você mesmo(a) de 5 anos atrás, qual seria?",
  "O que você acha que a gente faz bem juntos?",
  "Qual música representa como você está se sentindo hoje?",
  "O que você faria num dia livre, sem compromisso nenhum?",
  "Qual foi a coisa mais gentil que alguém fez por você essa semana?",
  "O que você sente falta da nossa rotina?",
  "Se pudesse morar em qualquer lugar do mundo, onde seria?",
  "O que te deixa mais calmo(a) quando o dia está difícil?",
  "Qual é um hábito seu que você quer melhorar?",
  "O que você admira em mim que talvez eu não saiba?",
  "Qual foi o presente mais especial que você já recebeu?",
  "O que você faria se ganhasse um dia inteiro só pra gente?",
  "Qual é uma memória de infância que ainda te marca?",
  "O que te fez pensar em mim hoje?",
  "Se pudesse aprender uma habilidade nova instantaneamente, qual seria?",
  "O que você espera pra gente daqui a um ano?",
  "Qual é o seu jeito favorito de receber carinho?",
  "O que te deixou grato(a) hoje?",
  "Qual foi um desafio que você superou recentemente?",
  "O que você faria diferente se pudesse recomeçar o dia?",
  "Qual é uma coisa que você quer que a gente experimente juntos?",
  "O que te faz sentir em casa?",
] as const;

export function getTodayQuestion(date: Date = new Date()): string {
  const daysSinceEpoch = Math.floor(date.getTime() / 86400000);
  const index =
    ((daysSinceEpoch % DAILY_QUESTIONS.length) + DAILY_QUESTIONS.length) %
    DAILY_QUESTIONS.length;
  return DAILY_QUESTIONS[index];
}
