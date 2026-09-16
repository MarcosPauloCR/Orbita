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

// Segunda trilha, mais lúdica — mesma mecânica (revela só quando os dois
// responderem), pergunta diferente da reflexiva no mesmo dia.
export const DAILY_HYPOTHETICALS = [
  "Se a gente ganhasse na loteria amanhã, o que faria primeiro?",
  "Se pudéssemos teleportar pra qualquer lugar agora, pra onde iríamos?",
  "Se você virasse invisível por um dia, o que faria?",
  "Se a gente trocasse de corpo por um dia, o que você faria no meu?",
  "Se pudesse ter um superpoder só até meia-noite, qual seria?",
  "Se nosso relacionamento fosse um filme, que gênero seria?",
  "Se a gente morasse numa ilha deserta, quem sobreviveria melhor?",
  "Se você pudesse jantar com qualquer pessoa (viva ou não), quem seria?",
  "Se a gente tivesse que abrir um negócio juntos, qual seria?",
  "Se você pudesse reviver um dia da sua vida, qual escolheria?",
  "Se a gente fosse personagens de desenho, quais seríamos?",
  "Se você tivesse que descrever a gente em uma palavra, qual seria?",
  "Se pudesse pausar o tempo por uma hora, o que faria?",
  "Se a gente ganhasse uma viagem surpresa amanhã, pra onde você torceria?",
  "Se você fosse um animal, qual seria e por quê?",
  "Se a gente tivesse uma banda, que tipo de música tocaríamos?",
  "Se pudesse eliminar uma tarefa chata da vida pra sempre, qual seria?",
  "Se a nossa casa pegasse fogo (e todos estivessem a salvo), o que você salvaria?",
  "Se você pudesse saber a resposta de uma pergunta sobre o futuro, qual seria?",
  "Se a gente trocasse de emprego por uma semana, quem se sairia melhor no do outro?",
  "Se pudesse voltar no tempo e assistir a um evento histórico, qual escolheria?",
  "Se a gente fosse abrir um restaurante, que tipo de comida serviríamos?",
  "Se você pudesse ter qualquer talento instantaneamente, qual escolheria?",
  "Se nosso primeiro encontro fosse hoje, o que você faria diferente?",
  "Se a gente pudesse conversar com nós mesmos daqui a 10 anos, o que perguntaria?",
] as const;

// Brasil fica em UTC-3 o ano todo (sem horário de verão desde 2019) — sem
// isso, "o dia virou" era decidido em UTC, trocando a pergunta às 21h daqui
// em vez de à meia-noite. O servidor roda em UTC (Vercel), então o
// deslocamento tem que ser feito à mão, não dá pra confiar no fuso local
// do processo.
const BRAZIL_OFFSET_HOURS = 3;

function toBrazilDate(date: Date): Date {
  return new Date(date.getTime() - BRAZIL_OFFSET_HOURS * 3600000);
}

// Chave "YYYY-MM-DD" do dia civil de Brasília — usada tanto pra escolher a
// pergunta quanto pra chave `question_date` salva no banco (os dois
// precisam virar juntos, ou a resposta de hoje fica presa no dia errado).
export function brazilDateKey(date: Date = new Date()): string {
  return toBrazilDate(date).toISOString().slice(0, 10);
}

function pickQuestion(
  list: readonly string[],
  date: Date,
  salt: number
): string {
  const daysSinceEpoch = Math.floor(toBrazilDate(date).getTime() / 86400000) + salt;
  const index = ((daysSinceEpoch % list.length) + list.length) % list.length;
  return list[index];
}

export function getTodayQuestion(date: Date = new Date()): string {
  return pickQuestion(DAILY_QUESTIONS, date, 0);
}

// salt diferente pra não repetir o mesmo índice relativo da outra lista
export function getTodayHypothetical(date: Date = new Date()): string {
  return pickQuestion(DAILY_HYPOTHETICALS, date, 17);
}
