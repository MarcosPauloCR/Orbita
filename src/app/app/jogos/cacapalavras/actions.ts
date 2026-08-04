"use server";

import { getSession } from "@/lib/auth/get-session";
import { getPublicUsers } from "@/lib/auth/users";
import { createAdminClient } from "@/lib/supabase/admin";
import { ok, fail, type ActionResult } from "@/lib/action-result";
import {
  generatePuzzle,
  WORDSEARCH_THEMES,
  type Difficulty,
} from "@/lib/wordsearch";

type Mode = "coop" | "race";
type Status = "playing" | "finished";

type Row = {
  id: string;
  mode: Mode;
  theme: string;
  difficulty: Difficulty;
  grid_size: number;
  grid: string;
  words: string;
  player_a: string;
  player_b: string;
  found_a: string;
  found_b: string;
  finished_at_a: string | null;
  finished_at_b: string | null;
  accepted: boolean;
  status: Status;
};

const COLUMNS =
  "id, mode, theme, difficulty, grid_size, grid, words, player_a, player_b, found_a, found_b, finished_at_a, finished_at_b, accepted, status";

export type WordSearchGame = {
  id: string;
  mode: Mode;
  theme: string;
  difficulty: Difficulty;
  gridSize: number;
  gridRows: string[];
  words: string[];
  mySide: "a" | "b";
  isCreator: boolean;
  accepted: boolean;
  status: Status;
  myFound: string[];
  otherFoundCount: number;
  myFinished: boolean;
  otherFinished: boolean;
};

function parseCsv(value: string): string[] {
  return value.split(",").filter((v) => v.length > 0);
}

function toGame(row: Row, userId: string): WordSearchGame {
  const mySide: "a" | "b" = row.player_a === userId ? "a" : "b";
  const gridRows: string[] = [];
  for (let i = 0; i < row.grid_size; i++) {
    gridRows.push(row.grid.slice(i * row.grid_size, (i + 1) * row.grid_size));
  }
  const words = parseCsv(row.words);

  if (row.mode === "coop") {
    const found = parseCsv(row.found_a);
    return {
      id: row.id,
      mode: row.mode,
      theme: row.theme,
      difficulty: row.difficulty,
      gridSize: row.grid_size,
      gridRows,
      words,
      mySide,
      isCreator: row.player_a === userId,
      accepted: row.accepted,
      status: row.status,
      myFound: found,
      otherFoundCount: found.length,
      myFinished: row.status === "finished",
      otherFinished: row.status === "finished",
    };
  }

  const myFound = parseCsv(mySide === "a" ? row.found_a : row.found_b);
  const otherFound = parseCsv(mySide === "a" ? row.found_b : row.found_a);
  const myFinishedAt = mySide === "a" ? row.finished_at_a : row.finished_at_b;
  const otherFinishedAt = mySide === "a" ? row.finished_at_b : row.finished_at_a;

  return {
    id: row.id,
    mode: row.mode,
    theme: row.theme,
    difficulty: row.difficulty,
    gridSize: row.grid_size,
    gridRows,
    words,
    mySide,
    isCreator: row.player_a === userId,
    accepted: row.accepted,
    status: row.status,
    myFound,
    otherFoundCount: otherFound.length,
    myFinished: !!myFinishedAt,
    otherFinished: !!otherFinishedAt,
  };
}

export async function getGame(): Promise<WordSearchGame | null> {
  const session = await getSession();
  if (!session) return null;

  const supabase = createAdminClient();
  const { data: row } = await supabase
    .from("wordsearch_games")
    .select(COLUMNS)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!row) return null;
  return toGame(row as Row, session.userId);
}

export async function startGame(
  mode: Mode,
  theme: string,
  difficulty: Difficulty
): Promise<ActionResult<null>> {
  const session = await getSession();
  if (!session) return fail("Sessão expirada.");

  const pool = WORDSEARCH_THEMES[theme];
  if (!pool) return fail("Tema inválido.");

  const otherUser = (await getPublicUsers()).find(
    (u) => u.id !== session.userId
  );
  if (!otherUser) return fail("Não achei o outro usuário.");

  const supabase = createAdminClient();
  const { data: active } = await supabase
    .from("wordsearch_games")
    .select("id")
    .eq("status", "playing")
    .maybeSingle();

  if (active) return fail("Já tem um jogo em andamento.");

  const puzzle = generatePuzzle(pool, difficulty);

  const { error } = await supabase.from("wordsearch_games").insert({
    mode,
    theme,
    difficulty,
    grid_size: puzzle.size,
    grid: puzzle.grid,
    words: puzzle.words.join(","),
    player_a: session.userId,
    player_b: otherUser.id,
  });

  if (error) return fail(`Falha ao criar jogo: ${error.message}`);
  return ok(null);
}

export async function acceptInvite(): Promise<ActionResult<null>> {
  const session = await getSession();
  if (!session) return fail("Sessão expirada.");

  const supabase = createAdminClient();
  const { data: row, error } = await supabase
    .from("wordsearch_games")
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
    .from("wordsearch_games")
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
    .from("wordsearch_games")
    .select("id")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!row) return ok(null);

  const { error } = await supabase.from("wordsearch_games").delete().eq("id", row.id);
  if (error) return fail(`Falha ao sair: ${error.message}`);
  return ok(null);
}

export async function foundWord(
  word: string
): Promise<ActionResult<WordSearchGame>> {
  const session = await getSession();
  if (!session) return fail("Sessão expirada.");

  const normalized = word.trim().toUpperCase();

  const supabase = createAdminClient();
  const { data: row, error } = await supabase
    .from("wordsearch_games")
    .select(COLUMNS)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !row) return fail("Nenhum jogo em andamento.");
  if (!row.accepted) return fail("Aceite o convite antes de jogar.");
  if (row.status !== "playing") return fail("Esse jogo já acabou.");

  const words = parseCsv(row.words);
  if (!words.includes(normalized)) return fail("Essa palavra não está na lista.");

  const mySide: "a" | "b" = row.player_a === session.userId ? "a" : "b";

  if (row.mode === "coop") {
    const found = parseCsv(row.found_a);
    if (found.includes(normalized)) return fail("Essa palavra já foi encontrada.");
    found.push(normalized);
    const status: Status = found.length === words.length ? "finished" : "playing";
    const foundCsv = found.join(",");

    const { error: updateError } = await supabase
      .from("wordsearch_games")
      .update({ found_a: foundCsv, found_b: foundCsv, status })
      .eq("id", row.id);
    if (updateError) return fail(`Falha ao registrar: ${updateError.message}`);

    return ok(
      toGame({ ...row, found_a: foundCsv, found_b: foundCsv, status }, session.userId)
    );
  }

  const myFound = parseCsv(mySide === "a" ? row.found_a : row.found_b);
  if (myFound.includes(normalized)) return fail("Você já encontrou essa palavra.");
  myFound.push(normalized);

  const justFinished = myFound.length === words.length;
  const otherFinishedAt = mySide === "a" ? row.finished_at_b : row.finished_at_a;
  const bothFinished = justFinished && !!otherFinishedAt;
  const newStatus: Status = bothFinished ? "finished" : row.status;
  const myFoundCsv = myFound.join(",");
  const nowIso = new Date().toISOString();

  const updatedRow: Row = {
    ...row,
    found_a: mySide === "a" ? myFoundCsv : row.found_a,
    found_b: mySide === "b" ? myFoundCsv : row.found_b,
    finished_at_a:
      mySide === "a" && justFinished ? nowIso : row.finished_at_a,
    finished_at_b:
      mySide === "b" && justFinished ? nowIso : row.finished_at_b,
    status: newStatus,
  };

  const { error: updateError } = await supabase
    .from("wordsearch_games")
    .update({
      found_a: updatedRow.found_a,
      found_b: updatedRow.found_b,
      finished_at_a: updatedRow.finished_at_a,
      finished_at_b: updatedRow.finished_at_b,
      status: updatedRow.status,
    })
    .eq("id", row.id);

  if (updateError) return fail(`Falha ao registrar: ${updateError.message}`);
  return ok(toGame(updatedRow, session.userId));
}
