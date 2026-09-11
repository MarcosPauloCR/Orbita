"use server";

import { getSession } from "@/lib/auth/get-session";
import { getPublicUsers } from "@/lib/auth/users";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendPushToUser } from "@/lib/push";
import { ok, fail, type ActionResult } from "@/lib/action-result";

export type ActivityType = "sair" | "filme" | "cozinhar" | "dormir";

export type AgendaItem = {
  id: string;
  day: string;
  meeting_time: string | null;
  activity_type: ActivityType;
  description: string | null;
  movie_share_id: string | null;
  food_share_id: string | null;
  menu_item_id: string | null;
  created_by: string;
  auto_created: boolean;
  is_surprise: boolean;
  recap: string | null;
  created_at: string;
  movie_title: string | null;
  food_title: string | null;
  food_url: string | null;
  menu_dish: string | null;
  menu_recipe_url: string | null;
  // true quando é surpresa de outra pessoa e ainda não chegou a hora —
  // os campos de detalhe acima já vêm nulos nesse caso, não só escondidos
  // na UI.
  locked: boolean;
};

type AgendaRow = {
  id: string;
  day: string;
  meeting_time: string | null;
  activity_type: ActivityType;
  description: string | null;
  movie_share_id: string | null;
  food_share_id: string | null;
  menu_item_id: string | null;
  created_by: string;
  auto_created: boolean;
  is_surprise: boolean;
  recap: string | null;
  created_at: string;
  movie_shares: { title: string } | null;
  food_shares: { title: string | null; url: string } | null;
  menu_items: { dish: string; recipe_url: string | null } | null;
};

const AGENDA_COLUMNS =
  "id, day, meeting_time, activity_type, description, movie_share_id, food_share_id, menu_item_id, created_by, auto_created, is_surprise, recap, created_at, movie_shares(title), food_shares(title, url), menu_items(dish, recipe_url)";

function revealTimeArrived(day: string, meetingTime: string | null): boolean {
  const timePart = meetingTime ? meetingTime.slice(0, 5) : "00:00";
  const revealAt = new Date(`${day}T${timePart}:00`);
  return Date.now() >= revealAt.getTime();
}

function toAgendaItem(row: AgendaRow, viewerUserId: string): AgendaItem {
  const locked =
    row.is_surprise &&
    row.created_by !== viewerUserId &&
    !revealTimeArrived(row.day, row.meeting_time);

  return {
    id: row.id,
    day: row.day,
    meeting_time: row.meeting_time,
    activity_type: row.activity_type,
    description: locked ? null : row.description,
    movie_share_id: locked ? null : row.movie_share_id,
    food_share_id: locked ? null : row.food_share_id,
    menu_item_id: locked ? null : row.menu_item_id,
    created_by: row.created_by,
    auto_created: row.auto_created,
    is_surprise: row.is_surprise,
    recap: row.recap,
    created_at: row.created_at,
    movie_title: locked ? null : row.movie_shares?.title ?? null,
    food_title: locked ? null : row.food_shares?.title ?? null,
    food_url: locked ? null : row.food_shares?.url ?? null,
    menu_dish: locked ? null : row.menu_items?.dish ?? null,
    menu_recipe_url: locked ? null : row.menu_items?.recipe_url ?? null,
    locked,
  };
}

async function notifyOtherUser(exceptUserId: string): Promise<void> {
  const otherUser = (await getPublicUsers()).find((u) => u.id !== exceptUserId);
  if (otherUser) {
    await sendPushToUser(otherUser.id, { title: "Órbita", body: "1 novo item" });
  }
}

export async function getAgendaItems(): Promise<AgendaItem[]> {
  const session = await getSession();
  if (!session) return [];

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("agenda_items")
    .select(AGENDA_COLUMNS)
    .order("day", { ascending: true });

  if (error || !data) return [];
  return (data as unknown as AgendaRow[]).map((row) => toAgendaItem(row, session.userId));
}

// Próximo dia (a partir de hoje) com algo marcado — usado só pra um
// contador tipo "faltam X dias", nunca revela o que está planejado, então
// não precisa se preocupar com modo surpresa aqui.
export async function getNextAgendaDay(): Promise<string | null> {
  const session = await getSession();
  if (!session) return null;

  const supabase = createAdminClient();
  const todayKey = new Date().toISOString().slice(0, 10);
  const { data } = await supabase
    .from("agenda_items")
    .select("day")
    .gte("day", todayKey)
    .order("day", { ascending: true })
    .limit(1);

  return data && data.length > 0 ? data[0].day : null;
}

export type MovieOption = { id: string; title: string; link_url: string | null };
export type CookingOption =
  | { kind: "food"; id: string; title: string | null; url: string; rating: number | null }
  | { kind: "menu"; id: string; dish: string; recipe_url: string | null };

// Só mostra o que ainda não está em nenhum dia da agenda — um vídeo/prato
// aprovado com data (auto-agendado) ou já escolhido manualmente some da
// lista, pra não duplicar o mesmo prato/filme em dois dias sem querer.
export async function getAgendaPickerOptions(): Promise<{
  movies: MovieOption[];
  cooking: CookingOption[];
}> {
  const session = await getSession();
  if (!session) return { movies: [], cooking: [] };

  const supabase = createAdminClient();

  const [linkedRes, moviesRes, foodRes, menuRes] = await Promise.all([
    supabase.from("agenda_items").select("movie_share_id, food_share_id, menu_item_id"),
    supabase
      .from("movie_shares")
      .select("id, title, link_url")
      .eq("status", "approved")
      .is("watched_at", null),
    supabase.from("food_shares").select("id, title, url, rating").eq("status", "approved"),
    supabase
      .from("menu_items")
      .select("id, dish, recipe_url")
      .eq("status", "approved")
      .is("made_at", null),
  ]);

  const linked = linkedRes.data ?? [];
  const usedMovieIds = new Set(linked.map((r) => r.movie_share_id).filter(Boolean));
  const usedFoodIds = new Set(linked.map((r) => r.food_share_id).filter(Boolean));
  const usedMenuIds = new Set(linked.map((r) => r.menu_item_id).filter(Boolean));

  const movies: MovieOption[] = (moviesRes.data ?? [])
    .filter((m) => !usedMovieIds.has(m.id))
    .map((m) => ({ id: m.id, title: m.title, link_url: m.link_url }));

  const cooking: CookingOption[] = [
    ...(foodRes.data ?? [])
      .filter((f) => !usedFoodIds.has(f.id))
      .map((f): CookingOption => ({
        kind: "food",
        id: f.id,
        title: f.title,
        url: f.url,
        rating: f.rating,
      })),
    ...(menuRes.data ?? [])
      .filter((m) => !usedMenuIds.has(m.id))
      .map((m): CookingOption => ({ kind: "menu", id: m.id, dish: m.dish, recipe_url: m.recipe_url })),
  ];

  return { movies, cooking };
}

export async function addAgendaItem(input: {
  day: string;
  meetingTime: string | null;
  activityType: ActivityType;
  isSurprise?: boolean;
  description?: string | null;
  movieShareId?: string | null;
  foodShareId?: string | null;
  menuItemId?: string | null;
}): Promise<ActionResult<AgendaItem>> {
  const session = await getSession();
  if (!session) return fail("Sessão expirada.");
  if (!input.day) return fail("Escolha um dia.");

  const supabase = createAdminClient();

  const insertRow: Record<string, unknown> = {
    day: input.day,
    meeting_time: input.meetingTime || null,
    activity_type: input.activityType,
    created_by: session.userId,
    is_surprise: !!input.isSurprise,
  };

  if (input.activityType === "sair") {
    const description = input.description?.trim();
    if (!description) return fail("Descreva pra onde vão.");
    insertRow.description = description;
  } else if (input.activityType === "filme") {
    if (!input.movieShareId) return fail("Escolha um filme aprovado.");
    const { data: movie } = await supabase
      .from("movie_shares")
      .select("id, status")
      .eq("id", input.movieShareId)
      .maybeSingle();
    if (!movie || movie.status !== "approved") return fail("Filme inválido.");
    insertRow.movie_share_id = input.movieShareId;
  } else if (input.activityType === "cozinhar") {
    if (!input.foodShareId && !input.menuItemId) {
      return fail("Escolha o que vão cozinhar.");
    }
    if (input.foodShareId) {
      const { data: food } = await supabase
        .from("food_shares")
        .select("id, status")
        .eq("id", input.foodShareId)
        .maybeSingle();
      if (!food || food.status !== "approved") return fail("Vídeo inválido.");
      insertRow.food_share_id = input.foodShareId;
    } else {
      const { data: menu } = await supabase
        .from("menu_items")
        .select("id, status")
        .eq("id", input.menuItemId!)
        .maybeSingle();
      if (!menu || menu.status !== "approved") return fail("Prato inválido.");
      insertRow.menu_item_id = input.menuItemId;
    }
  }
  // 'dormir' não precisa de campo extra.

  const { data: inserted, error } = await supabase
    .from("agenda_items")
    .insert(insertRow)
    .select("id")
    .single();

  if (error || !inserted) return fail(`Falha ao adicionar: ${error?.message}`);

  const { data: full, error: fetchError } = await supabase
    .from("agenda_items")
    .select(AGENDA_COLUMNS)
    .eq("id", inserted.id)
    .single();

  if (fetchError || !full) return fail("Item criado, mas falhou ao carregar.");

  await notifyOtherUser(session.userId);

  return ok(toAgendaItem(full as unknown as AgendaRow, session.userId));
}

export async function addAgendaRecap(
  id: string,
  recap: string
): Promise<ActionResult<AgendaItem>> {
  const session = await getSession();
  if (!session) return fail("Sessão expirada.");

  const trimmed = recap.trim();
  if (!trimmed) return fail("Escreva alguma coisa.");

  const supabase = createAdminClient();
  const { data: row, error: fetchError } = await supabase
    .from("agenda_items")
    .select("id, day")
    .eq("id", id)
    .single();

  if (fetchError || !row) return fail("Item não encontrado.");
  if (row.day > new Date().toISOString().slice(0, 10)) {
    return fail("Esse dia ainda não chegou.");
  }

  const { data: full, error } = await supabase
    .from("agenda_items")
    .update({ recap: trimmed })
    .eq("id", id)
    .select(AGENDA_COLUMNS)
    .single();

  if (error || !full) return fail(`Falha ao salvar: ${error?.message}`);

  return ok(toAgendaItem(full as unknown as AgendaRow, session.userId));
}

export async function deleteAgendaItem(id: string): Promise<ActionResult<null>> {
  const session = await getSession();
  if (!session) return fail("Sessão expirada.");

  const supabase = createAdminClient();
  await supabase.from("agenda_items").delete().eq("id", id);

  return ok(null);
}
