import type { TrophyIconKind } from "@/components/TrophyIcon";
import type { ActivityType } from "@/app/app/agenda/actions";

export type ActivityTrophy = {
  type: ActivityType;
  count: number;
  name: string;
  challenge: string;
  iconKind: TrophyIconKind;
};

// Desbloqueado sozinho conforme o casal registra itens desse tipo na
// Agenda (com o dia já passado — "planejado" não conta, só o que já
// rolou). Não dá pra detectar "antigo" ou "duvidoso" a partir dos dados
// — o gatilho real é só o tipo de atividade + quantas vezes, o nome
// engraçado é só disfarce por cima.
export const ACTIVITY_TROPHIES: ActivityTrophy[] = [
  {
    type: "dormir",
    count: 1,
    name: "Primeira Noite Agarradinho",
    challenge: "Marquem 'dormir agarradinho' na Agenda",
    iconKind: "sleep",
  },
  {
    type: "dormir",
    count: 5,
    name: "Sono em Órbita",
    challenge: "Durmam agarradinhos 5 vezes",
    iconKind: "sleep",
  },
  {
    type: "dormir",
    count: 15,
    name: "Constelação de Abraços",
    challenge: "Durmam agarradinhos 15 vezes",
    iconKind: "moon-full-halo",
  },
  {
    type: "filme",
    count: 1,
    name: "Sessão de Estreia",
    challenge: "Assistam um filme/série marcado na Agenda",
    iconKind: "movie-reel",
  },
  {
    type: "filme",
    count: 3,
    name: "Maratona Cósmica",
    challenge: "Assistam 3 filmes/séries juntos",
    iconKind: "movie-reel",
  },
  {
    type: "filme",
    count: 10,
    name: "Cinéfilos do Espaço",
    challenge: "Assistam 10 filmes/séries juntos",
    iconKind: "sparkle-cluster",
  },
  {
    type: "cozinhar",
    count: 1,
    name: "Primeira Receita a Dois",
    challenge: "Cozinhem juntos pela primeira vez",
    iconKind: "cooking-pot",
  },
  {
    type: "cozinhar",
    count: 5,
    name: "Chefs em Órbita",
    challenge: "Cozinhem juntos 5 vezes",
    iconKind: "cooking-pot",
  },
  {
    type: "cozinhar",
    count: 15,
    name: "Cozinha Estelar",
    challenge: "Cozinhem juntos 15 vezes",
    iconKind: "saturn",
  },
  {
    type: "sair",
    count: 1,
    name: "Primeira Aventura",
    challenge: "Saiam juntos pela primeira vez",
    iconKind: "compass",
  },
  {
    type: "sair",
    count: 3,
    name: "Fast Food Duvidoso",
    challenge: "Saiam juntos 3 vezes (bônus se for parar num fast food suspeito)",
    iconKind: "shooting-star",
  },
  {
    type: "sair",
    count: 10,
    name: "Exploradores Inseparáveis",
    challenge: "Saiam juntos 10 vezes",
    iconKind: "globe",
  },
];
