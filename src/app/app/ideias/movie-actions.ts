"use server";

import { getSession } from "@/lib/auth/get-session";
import { getPublicUsers } from "@/lib/auth/users";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendPushToUser } from "@/lib/push";
import { ok, fail, type ActionResult } from "@/lib/action-result";
import { MOVIE_SUGGESTIONS } from "@/lib/movie-suggestions";

export type MovieShareStatus = "pending" | "approved" | "rejected";

export type MovieShare = {
  id: string;
  from_user: string;
  title: string;
  link_url: string | null;
  suggested_by_app: boolean;
  status: MovieShareStatus;
  rating: number | null;
  watched_at: string | null;
  decided_at: string | null;
  created_at: string;
};

const MOVIE_COLUMNS =
  "id, from_user, title, link_url, suggested_by_app, status, rating, watched_at, decided_at, created_at";

async function notifyOtherUser(exceptUserId: string): Promise<void> {
  const otherUser = (await getPublicUsers()).find((u) => u.id !== exceptUserId);
  if (otherUser) {
    await sendPushToUser(otherUser.id, { title: "Órbita", body: "1 novo item" });
  }
}

export async function getMovieShares(): Promise<MovieShare[]> {
  const session = await getSession();
  if (!session) return [];

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("movie_shares")
    .select(MOVIE_COLUMNS)
    .order("created_at", { ascending: false })
    .limit(100);

  if (error || !data) return [];
  return data as MovieShare[];
}

export async function addMovieShare(
  title: string,
  linkUrl: string
): Promise<ActionResult<MovieShare>> {
  const session = await getSession();
  if (!session) return fail("Sessão expirada.");

  const trimmedTitle = title.trim();
  if (!trimmedTitle) return fail("Escreva o nome do filme/série.");

  let cleanUrl: string | null = null;
  const trimmedUrl = linkUrl.trim();
  if (trimmedUrl) {
    try {
      const parsed = new URL(trimmedUrl);
      if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
        return fail("Link inválido.");
      }
      cleanUrl = trimmedUrl;
    } catch {
      return fail("Link inválido.");
    }
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("movie_shares")
    .insert({ from_user: session.userId, title: trimmedTitle, link_url: cleanUrl })
    .select(MOVIE_COLUMNS)
    .single();

  if (error || !data) return fail(`Falha ao adicionar: ${error?.message}`);

  await notifyOtherUser(session.userId);

  return ok(data as MovieShare);
}

export async function requestMovieSuggestion(): Promise<ActionResult<MovieShare>> {
  const session = await getSession();
  if (!session) return fail("Sessão expirada.");

  const supabase = createAdminClient();
  const { data: existing } = await supabase.from("movie_shares").select("title");
  const usedTitles = new Set((existing ?? []).map((r) => r.title.toLowerCase()));

  const available = MOVIE_SUGGESTIONS.filter(
    (title) => !usedTitles.has(title.toLowerCase())
  );
  const pool = available.length > 0 ? available : MOVIE_SUGGESTIONS;
  const title = pool[Math.floor(Math.random() * pool.length)];

  const { data, error } = await supabase
    .from("movie_shares")
    .insert({ from_user: session.userId, title, suggested_by_app: true })
    .select(MOVIE_COLUMNS)
    .single();

  if (error || !data) return fail(`Falha ao sugerir: ${error?.message}`);

  await notifyOtherUser(session.userId);

  return ok(data as MovieShare);
}

export async function reviewMovieShare(
  id: string,
  decision: "approved" | "rejected",
  rating: number | null
): Promise<ActionResult<MovieShare>> {
  const session = await getSession();
  if (!session) return fail("Sessão expirada.");

  if (rating !== null && (!Number.isInteger(rating) || rating < 0 || rating > 10)) {
    return fail("Nota inválida.");
  }

  const supabase = createAdminClient();
  const { data: row, error: fetchError } = await supabase
    .from("movie_shares")
    .select("id, from_user, status")
    .eq("id", id)
    .single();

  if (fetchError || !row) return fail("Item não encontrado.");
  if (row.from_user === session.userId) {
    return fail("Você não pode avaliar o que você mesmo sugeriu.");
  }
  if (row.status !== "pending") return fail("Isso já foi avaliado.");

  const { data, error } = await supabase
    .from("movie_shares")
    .update({
      status: decision,
      rating,
      decided_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select(MOVIE_COLUMNS)
    .single();

  if (error || !data) return fail(`Falha ao salvar avaliação: ${error?.message}`);

  await notifyOtherUser(session.userId);

  return ok(data as MovieShare);
}

export async function markMovieWatched(id: string): Promise<ActionResult<MovieShare>> {
  const session = await getSession();
  if (!session) return fail("Sessão expirada.");

  const supabase = createAdminClient();
  const { data: row, error: fetchError } = await supabase
    .from("movie_shares")
    .select("id, status")
    .eq("id", id)
    .single();

  if (fetchError || !row) return fail("Item não encontrado.");
  if (row.status !== "approved") return fail("Só itens aprovados podem ser marcados como assistidos.");

  const { data, error } = await supabase
    .from("movie_shares")
    .update({ watched_at: new Date().toISOString() })
    .eq("id", id)
    .select(MOVIE_COLUMNS)
    .single();

  if (error || !data) return fail(`Falha ao marcar como assistido: ${error?.message}`);
  return ok(data as MovieShare);
}

export async function deleteMovieShare(id: string): Promise<ActionResult<null>> {
  const session = await getSession();
  if (!session) return fail("Sessão expirada.");

  const supabase = createAdminClient();
  const { data: row, error } = await supabase
    .from("movie_shares")
    .select("id, from_user")
    .eq("id", id)
    .single();

  if (error || !row) return fail("Item não encontrado.");
  if (row.from_user !== session.userId) {
    return fail("Você só pode apagar o que você adicionou.");
  }

  await supabase.from("movie_shares").delete().eq("id", id);

  return ok(null);
}
