"use server";

import { getSession } from "@/lib/auth/get-session";
import { getPublicUsers } from "@/lib/auth/users";
import { createAdminClient } from "@/lib/supabase/admin";
import { ok, fail, type ActionResult } from "@/lib/action-result";

const SYMBOLS = ["🌑", "🌒", "🌓", "🌔", "🌕", "🌖", "🌗", "🌘"];
const GRID_SIZE = SYMBOLS.length * 2;

type Status = "playing" | "finished";

type Row = {
  id: string;
  player_a: string;
  player_b: string;
  board: string;
  matched: string;
  flipped: string;
  turn: string;
  score_a: number;
  score_b: number;
  accepted: boolean;
  status: Status;
};

const COLUMNS =
  "id, player_a, player_b, board, matched, flipped, turn, score_a, score_b, accepted, status";

function parseCsv(value: string): number[] {
  return value
    .split(",")
    .filter((v) => v.length > 0)
    .map((v) => Number(v));
}

function shuffledBoard(): string {
  const deck = [...SYMBOLS, ...SYMBOLS];
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck.join(",");
}

export type MemoryCard = { symbol: string | null; matched: boolean };

export type MemoryGame = {
  id: string;
  cards: MemoryCard[];
  turn: string;
  myTurn: boolean;
  isCreator: boolean;
  accepted: boolean;
  scoreMine: number;
  scoreOther: number;
  status: Status;
};

function toGame(row: Row, userId: string): MemoryGame {
  const board = row.board.split(",");
  const matched = new Set(parseCsv(row.matched));
  const flipped = new Set(parseCsv(row.flipped));
  const mySide: "a" | "b" = row.player_a === userId ? "a" : "b";

  const cards: MemoryCard[] = board.map((symbol, i) => ({
    symbol: matched.has(i) || flipped.has(i) ? symbol : null,
    matched: matched.has(i),
  }));

  return {
    id: row.id,
    cards,
    turn: row.turn,
    myTurn: row.turn === userId,
    isCreator: row.player_a === userId,
    accepted: row.accepted,
    scoreMine: mySide === "a" ? row.score_a : row.score_b,
    scoreOther: mySide === "a" ? row.score_b : row.score_a,
    status: row.status,
  };
}

export async function getGame(): Promise<MemoryGame | null> {
  const session = await getSession();
  if (!session) return null;

  const supabase = createAdminClient();
  const { data: row } = await supabase
    .from("memory_games")
    .select(COLUMNS)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!row) return null;
  return toGame(row as Row, session.userId);
}

export async function startGame(): Promise<ActionResult<null>> {
  const session = await getSession();
  if (!session) return fail("Sessão expirada.");

  const otherUser = (await getPublicUsers()).find(
    (u) => u.id !== session.userId
  );
  if (!otherUser) return fail("Não achei o outro usuário.");

  const supabase = createAdminClient();
  const { data: active } = await supabase
    .from("memory_games")
    .select("id")
    .eq("status", "playing")
    .maybeSingle();

  if (active) return fail("Já tem um jogo em andamento.");

  const { error } = await supabase.from("memory_games").insert({
    player_a: session.userId,
    player_b: otherUser.id,
    board: shuffledBoard(),
    turn: session.userId,
  });

  if (error) return fail(`Falha ao criar jogo: ${error.message}`);
  return ok(null);
}

export async function acceptInvite(): Promise<ActionResult<null>> {
  const session = await getSession();
  if (!session) return fail("Sessão expirada.");

  const supabase = createAdminClient();
  const { data: row, error } = await supabase
    .from("memory_games")
    .select("id, player_a, accepted")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !row) return fail("Nenhum convite pendente.");
  if (row.player_a === session.userId) {
    return fail("Quem criou o convite não precisa aceitar.");
  }
  if (row.accepted) return ok(null);

  const { error: updateError } = await supabase
    .from("memory_games")
    .update({ accepted: true })
    .eq("id", row.id);

  if (updateError) return fail(`Falha ao aceitar: ${updateError.message}`);
  return ok(null);
}

export async function leaveGame(): Promise<ActionResult<null>> {
  const session = await getSession();
  if (!session) return fail("Sessão expirada.");

  const supabase = createAdminClient();
  const { data: row } = await supabase
    .from("memory_games")
    .select("id")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!row) return ok(null);

  const { error } = await supabase.from("memory_games").delete().eq("id", row.id);
  if (error) return fail(`Falha ao sair: ${error.message}`);
  return ok(null);
}

export async function flipCard(index: number): Promise<ActionResult<MemoryGame>> {
  const session = await getSession();
  if (!session) return fail("Sessão expirada.");
  if (!Number.isInteger(index) || index < 0 || index >= GRID_SIZE) {
    return fail("Carta inválida.");
  }

  const supabase = createAdminClient();
  const { data: row, error } = await supabase
    .from("memory_games")
    .select(COLUMNS)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !row) return fail("Nenhum jogo em andamento.");
  if (!row.accepted) return fail("Aceite o convite antes de jogar.");
  if (row.status !== "playing") return fail("Esse jogo já acabou.");
  if (row.turn !== session.userId) return fail("Não é sua vez.");

  const matchedSet = new Set(parseCsv(row.matched));
  let flipped = parseCsv(row.flipped);

  if (matchedSet.has(index)) return fail("Essa carta já foi encontrada.");

  // uma jogada mal-sucedida anterior fica visível até a próxima pessoa
  // começar a jogar — é nesse momento que ela "vira de volta".
  if (flipped.length === 2) flipped = [];

  if (flipped.includes(index)) return fail("Essa carta já está virada.");
  flipped.push(index);

  const board = row.board.split(",");
  let turn = row.turn;
  let scoreA = row.score_a;
  let scoreB = row.score_b;
  let status: Status = row.status;

  if (flipped.length === 2) {
    const [first, second] = flipped;
    if (board[first] === board[second]) {
      matchedSet.add(first);
      matchedSet.add(second);
      flipped = [];
      if (row.player_a === session.userId) scoreA++;
      else scoreB++;
      if (matchedSet.size === GRID_SIZE) status = "finished";
      // acertou: continua a vez da mesma pessoa
    } else {
      turn = row.player_a === session.userId ? row.player_b : row.player_a;
    }
  }

  const { error: updateError } = await supabase
    .from("memory_games")
    .update({
      matched: Array.from(matchedSet).join(","),
      flipped: flipped.join(","),
      turn,
      score_a: scoreA,
      score_b: scoreB,
      status,
    })
    .eq("id", row.id);

  if (updateError) return fail(`Falha ao virar carta: ${updateError.message}`);

  return ok(
    toGame(
      {
        ...row,
        matched: Array.from(matchedSet).join(","),
        flipped: flipped.join(","),
        turn,
        score_a: scoreA,
        score_b: scoreB,
        status,
      },
      session.userId
    )
  );
}
