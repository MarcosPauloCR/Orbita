"use server";

import { getSession } from "@/lib/auth/get-session";
import { getPublicUsers } from "@/lib/auth/users";
import { createAdminClient } from "@/lib/supabase/admin";
import { ok, fail, type ActionResult } from "@/lib/action-result";

const LINES = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8],
  [0, 3, 6], [1, 4, 7], [2, 5, 8],
  [0, 4, 8], [2, 4, 6],
];

export type TicTacToeStatus = "playing" | "won_x" | "won_o" | "draw";

export type TicTacToeGame = {
  id: string;
  board: string[];
  turn: "X" | "O";
  mySymbol: "X" | "O";
  status: TicTacToeStatus;
};

type Row = {
  id: string;
  player_x: string;
  player_o: string;
  board: string;
  turn: "X" | "O";
  status: TicTacToeStatus;
};

const COLUMNS = "id, player_x, player_o, board, turn, status";

function toGame(row: Row, userId: string): TicTacToeGame {
  return {
    id: row.id,
    board: row.board.split(""),
    turn: row.turn,
    mySymbol: row.player_x === userId ? "X" : "O",
    status: row.status,
  };
}

export async function getGame(): Promise<TicTacToeGame | null> {
  const session = await getSession();
  if (!session) return null;

  const supabase = createAdminClient();
  const { data: row } = await supabase
    .from("tictactoe_games")
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
    .from("tictactoe_games")
    .select("id")
    .eq("status", "playing")
    .maybeSingle();

  if (active) return fail("Já tem um jogo em andamento.");

  const { error } = await supabase.from("tictactoe_games").insert({
    player_x: session.userId,
    player_o: otherUser.id,
  });

  if (error) return fail(`Falha ao criar jogo: ${error.message}`);
  return ok(null);
}

export async function makeMove(
  index: number
): Promise<ActionResult<TicTacToeGame>> {
  const session = await getSession();
  if (!session) return fail("Sessão expirada.");
  if (!Number.isInteger(index) || index < 0 || index > 8) {
    return fail("Jogada inválida.");
  }

  const supabase = createAdminClient();
  const { data: row, error } = await supabase
    .from("tictactoe_games")
    .select(COLUMNS)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !row) return fail("Nenhum jogo em andamento.");
  if (row.status !== "playing") return fail("Esse jogo já acabou.");

  const mySymbol: "X" | "O" = row.player_x === session.userId ? "X" : "O";
  if (mySymbol !== row.turn) return fail("Não é sua vez.");

  const board = row.board.split("");
  if (board[index] !== "-") return fail("Essa posição já foi jogada.");
  board[index] = mySymbol;

  let status: TicTacToeStatus = "playing";
  for (const [a, b, c] of LINES) {
    if (board[a] !== "-" && board[a] === board[b] && board[b] === board[c]) {
      status = board[a] === "X" ? "won_x" : "won_o";
      break;
    }
  }
  if (status === "playing" && !board.includes("-")) status = "draw";

  const nextTurn: "X" | "O" = mySymbol === "X" ? "O" : "X";
  const newBoard = board.join("");
  const finalTurn = status === "playing" ? nextTurn : row.turn;

  const { error: updateError } = await supabase
    .from("tictactoe_games")
    .update({ board: newBoard, turn: finalTurn, status })
    .eq("id", row.id);

  if (updateError) return fail(`Falha ao jogar: ${updateError.message}`);

  return ok(
    toGame({ ...row, board: newBoard, turn: finalTurn, status }, session.userId)
  );
}
