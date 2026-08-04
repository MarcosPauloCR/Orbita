"use server";

import { getSession } from "@/lib/auth/get-session";
import { getPublicUsers } from "@/lib/auth/users";
import { createAdminClient } from "@/lib/supabase/admin";
import { ok, fail, type ActionResult } from "@/lib/action-result";

export type DuoCategory = "trivia" | "emoji" | "dare";
type DuoStatus = "awaiting_response" | "awaiting_judgment" | "done";

type Row = {
  id: string;
  category: DuoCategory;
  created_by: string;
  responder: string;
  prompt: string;
  creator_answer: string | null;
  response: string | null;
  judged_correct: boolean | null;
  status: DuoStatus;
  created_at: string;
};

const COLUMNS =
  "id, category, created_by, responder, prompt, creator_answer, response, judged_correct, status, created_at";

export type DuoGame = {
  id: string;
  category: DuoCategory;
  isCreator: boolean;
  prompt: string;
  creatorAnswer: string | null;
  response: string | null;
  judgedCorrect: boolean | null;
  status: DuoStatus;
};

function toGame(row: Row, userId: string): DuoGame {
  const isCreator = row.created_by === userId;
  const responded = row.status !== "awaiting_response";

  return {
    id: row.id,
    category: row.category,
    isCreator,
    prompt: row.prompt,
    creatorAnswer: isCreator || responded ? row.creator_answer : null,
    response: row.response,
    judgedCorrect: row.judged_correct,
    status: row.status,
  };
}

export async function getActive(category: DuoCategory): Promise<DuoGame | null> {
  const session = await getSession();
  if (!session) return null;

  const supabase = createAdminClient();
  const { data: row } = await supabase
    .from("duo_games")
    .select(COLUMNS)
    .eq("category", category)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!row) return null;
  return toGame(row as Row, session.userId);
}

export async function getScore(
  category: DuoCategory
): Promise<{ mine: number; other: number }> {
  const session = await getSession();
  if (!session) return { mine: 0, other: 0 };

  const otherUser = (await getPublicUsers()).find(
    (u) => u.id !== session.userId
  );
  if (!otherUser) return { mine: 0, other: 0 };

  const supabase = createAdminClient();
  const [{ count: mine }, { count: other }] = await Promise.all([
    supabase
      .from("duo_games")
      .select("id", { count: "exact", head: true })
      .eq("category", category)
      .eq("responder", session.userId)
      .eq("judged_correct", true),
    supabase
      .from("duo_games")
      .select("id", { count: "exact", head: true })
      .eq("category", category)
      .eq("responder", otherUser.id)
      .eq("judged_correct", true),
  ]);

  return { mine: mine ?? 0, other: other ?? 0 };
}

export async function startRound(
  category: DuoCategory,
  prompt: string,
  creatorAnswer: string
): Promise<ActionResult<null>> {
  const session = await getSession();
  if (!session) return fail("Sessão expirada.");

  const trimmedPrompt = prompt.trim();
  if (!trimmedPrompt) return fail("Escreva a pergunta/desafio.");
  if (category === "trivia" && !creatorAnswer.trim()) {
    return fail("Escreva sua resposta verdadeira.");
  }

  const otherUser = (await getPublicUsers()).find(
    (u) => u.id !== session.userId
  );
  if (!otherUser) return fail("Não achei o outro usuário.");

  const supabase = createAdminClient();
  const { data: active } = await supabase
    .from("duo_games")
    .select("id")
    .eq("category", category)
    .neq("status", "done")
    .maybeSingle();

  if (active) return fail("Já tem uma rodada em andamento.");

  const { error } = await supabase.from("duo_games").insert({
    category,
    created_by: session.userId,
    responder: otherUser.id,
    prompt: trimmedPrompt,
    creator_answer: category === "trivia" ? creatorAnswer.trim() : null,
  });

  if (error) return fail(`Falha ao criar rodada: ${error.message}`);
  return ok(null);
}

export async function submitResponse(
  id: string,
  response: string
): Promise<ActionResult<null>> {
  const session = await getSession();
  if (!session) return fail("Sessão expirada.");

  const trimmed = response.trim();
  if (!trimmed) return fail("Escreva uma resposta.");

  const supabase = createAdminClient();
  const { data: row, error } = await supabase
    .from("duo_games")
    .select(COLUMNS)
    .eq("id", id)
    .maybeSingle();

  if (error || !row) return fail("Rodada não encontrada.");
  if (row.responder !== session.userId) return fail("Essa rodada não é sua pra responder.");
  if (row.status !== "awaiting_response") return fail("Essa rodada já foi respondida.");

  const nextStatus: DuoStatus = row.category === "dare" ? "done" : "awaiting_judgment";

  const { error: updateError } = await supabase
    .from("duo_games")
    .update({ response: trimmed, status: nextStatus })
    .eq("id", id);

  if (updateError) return fail(`Falha ao responder: ${updateError.message}`);
  return ok(null);
}

export async function judgeRound(
  id: string,
  correct: boolean
): Promise<ActionResult<null>> {
  const session = await getSession();
  if (!session) return fail("Sessão expirada.");

  const supabase = createAdminClient();
  const { data: row, error } = await supabase
    .from("duo_games")
    .select(COLUMNS)
    .eq("id", id)
    .maybeSingle();

  if (error || !row) return fail("Rodada não encontrada.");
  if (row.created_by !== session.userId) return fail("Só quem criou pode avaliar.");
  if (row.status !== "awaiting_judgment") return fail("Essa rodada não está aguardando avaliação.");

  const { error: updateError } = await supabase
    .from("duo_games")
    .update({ judged_correct: correct, status: "done" })
    .eq("id", id);

  if (updateError) return fail(`Falha ao avaliar: ${updateError.message}`);
  return ok(null);
}
