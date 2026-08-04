"use server";

import { getSession } from "@/lib/auth/get-session";
import { createAdminClient } from "@/lib/supabase/admin";
import { ok, fail, type ActionResult } from "@/lib/action-result";

const LETTER_RE = /[A-ZÀ-Ÿ]/i;

function maskWord(word: string, guessedLetters: string): string {
  const guessed = new Set(guessedLetters.split(""));
  return word
    .toUpperCase()
    .split("")
    .map((ch) => (LETTER_RE.test(ch) ? (guessed.has(ch) ? ch : "_") : ch))
    .join("");
}

export type HangmanGame = {
  id: string;
  createdBy: string;
  isCreator: boolean;
  theme: string | null;
  maskedWord: string;
  guessedLetters: string[];
  wrongGuesses: number;
  maxWrongGuesses: number;
  status: "playing" | "won" | "lost";
  word: string | null;
};

type GameRow = {
  id: string;
  created_by: string;
  word: string;
  theme: string | null;
  guessed_letters: string;
  wrong_guesses: number;
  max_wrong_guesses: number;
  status: "playing" | "won" | "lost";
};

const GAME_COLUMNS =
  "id, created_by, word, theme, guessed_letters, wrong_guesses, max_wrong_guesses, status";

function toGame(row: GameRow, currentUserId: string): HangmanGame {
  const isCreator = row.created_by === currentUserId;
  const revealWord = isCreator || row.status !== "playing";

  return {
    id: row.id,
    createdBy: row.created_by,
    isCreator,
    theme: row.theme,
    maskedWord: maskWord(row.word, row.guessed_letters),
    guessedLetters: row.guessed_letters ? row.guessed_letters.split("") : [],
    wrongGuesses: row.wrong_guesses,
    maxWrongGuesses: row.max_wrong_guesses,
    status: row.status,
    word: revealWord ? row.word.toUpperCase() : null,
  };
}

export async function getGame(): Promise<HangmanGame | null> {
  const session = await getSession();
  if (!session) return null;

  const supabase = createAdminClient();
  const { data: row } = await supabase
    .from("hangman_games")
    .select(GAME_COLUMNS)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!row) return null;
  return toGame(row as GameRow, session.userId);
}

export async function createGame(
  word: string,
  theme: string
): Promise<ActionResult<null>> {
  const session = await getSession();
  if (!session) return fail("Sessão expirada.");

  const trimmed = word.trim();
  if (trimmed.length < 3) return fail("A palavra precisa ter pelo menos 3 letras.");
  if (trimmed.length > 30) return fail("Palavra muito grande.");
  if (!/^[A-ZÀ-Ÿ ]+$/i.test(trimmed)) {
    return fail("Use só letras e espaços (evite números e símbolos).");
  }

  const trimmedTheme = theme.trim().slice(0, 40) || null;

  const supabase = createAdminClient();
  const { data: active } = await supabase
    .from("hangman_games")
    .select("id")
    .eq("status", "playing")
    .maybeSingle();

  if (active) return fail("Já tem um jogo em andamento.");

  const { error } = await supabase
    .from("hangman_games")
    .insert({ created_by: session.userId, word: trimmed, theme: trimmedTheme });

  if (error) return fail(`Falha ao criar jogo: ${error.message}`);
  return ok(null);
}

export async function guessLetter(
  letter: string
): Promise<ActionResult<HangmanGame>> {
  const session = await getSession();
  if (!session) return fail("Sessão expirada.");

  const normalized = letter.trim().toUpperCase();
  if (normalized.length !== 1 || !LETTER_RE.test(normalized)) {
    return fail("Letra inválida.");
  }

  const supabase = createAdminClient();
  const { data: row, error } = await supabase
    .from("hangman_games")
    .select(GAME_COLUMNS)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !row) return fail("Nenhum jogo em andamento.");
  if (row.created_by === session.userId) {
    return fail("Quem cria a palavra não pode tentar adivinhar.");
  }
  if (row.status !== "playing") return fail("Esse jogo já acabou.");

  const guessedSet = new Set(
    row.guessed_letters ? row.guessed_letters.split("") : []
  );
  if (guessedSet.has(normalized)) return fail("Você já tentou essa letra.");
  guessedSet.add(normalized);

  const wordUpper = row.word.toUpperCase();
  const isCorrect = wordUpper.includes(normalized);
  const wrongGuesses = row.wrong_guesses + (isCorrect ? 0 : 1);
  const allRevealed = wordUpper
    .split("")
    .every((ch: string) => !LETTER_RE.test(ch) || guessedSet.has(ch));

  let status: "playing" | "won" | "lost" = "playing";
  if (allRevealed) status = "won";
  else if (wrongGuesses >= row.max_wrong_guesses) status = "lost";

  const guessedLetters = Array.from(guessedSet).join("");
  const { error: updateError } = await supabase
    .from("hangman_games")
    .update({
      guessed_letters: guessedLetters,
      wrong_guesses: wrongGuesses,
      status,
      finished_at: status !== "playing" ? new Date().toISOString() : null,
    })
    .eq("id", row.id);

  if (updateError) {
    return fail(`Falha ao registrar palpite: ${updateError.message}`);
  }

  return ok(
    toGame(
      { ...row, guessed_letters: guessedLetters, wrong_guesses: wrongGuesses, status },
      session.userId
    )
  );
}
