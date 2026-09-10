"use server";

import { getSession } from "@/lib/auth/get-session";
import { getPublicUsers } from "@/lib/auth/users";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendPushToUser } from "@/lib/push";
import { autoScheduleCooking } from "@/lib/agenda";
import { ok, fail, type ActionResult } from "@/lib/action-result";
import { MENU_SUGGESTIONS } from "@/lib/menu-suggestions";

export type MenuItemStatus = "pending" | "approved" | "rejected";

export type MenuItem = {
  id: string;
  from_user: string;
  dish: string;
  recipe_url: string | null;
  suggested_by_app: boolean;
  status: MenuItemStatus;
  scheduled_day: string | null;
  made_at: string | null;
  decided_at: string | null;
  created_at: string;
};

const MENU_COLUMNS =
  "id, from_user, dish, recipe_url, suggested_by_app, status, scheduled_day, made_at, decided_at, created_at";

async function notifyOtherUser(exceptUserId: string): Promise<void> {
  const otherUser = (await getPublicUsers()).find((u) => u.id !== exceptUserId);
  if (otherUser) {
    await sendPushToUser(otherUser.id, { title: "Órbita", body: "1 novo item" });
  }
}

export async function getMenuItems(): Promise<MenuItem[]> {
  const session = await getSession();
  if (!session) return [];

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("menu_items")
    .select(MENU_COLUMNS)
    .order("created_at", { ascending: false })
    .limit(100);

  if (error || !data) return [];
  return data as MenuItem[];
}

export async function addMenuItem(
  dish: string,
  recipeUrl: string
): Promise<ActionResult<MenuItem>> {
  const session = await getSession();
  if (!session) return fail("Sessão expirada.");

  const trimmedDish = dish.trim();
  if (!trimmedDish) return fail("Escreva o nome do prato.");

  let cleanUrl: string | null = null;
  const trimmedUrl = recipeUrl.trim();
  if (trimmedUrl) {
    try {
      const parsed = new URL(trimmedUrl);
      if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
        return fail("Link da receita inválido.");
      }
      cleanUrl = trimmedUrl;
    } catch {
      return fail("Link da receita inválido.");
    }
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("menu_items")
    .insert({ from_user: session.userId, dish: trimmedDish, recipe_url: cleanUrl })
    .select(MENU_COLUMNS)
    .single();

  if (error || !data) return fail(`Falha ao adicionar prato: ${error?.message}`);

  await notifyOtherUser(session.userId);

  return ok(data as MenuItem);
}

export async function requestMenuSuggestion(): Promise<ActionResult<MenuItem>> {
  const session = await getSession();
  if (!session) return fail("Sessão expirada.");

  const supabase = createAdminClient();
  const { data: existing } = await supabase.from("menu_items").select("dish");
  const usedDishes = new Set((existing ?? []).map((r) => r.dish.toLowerCase()));

  const available = MENU_SUGGESTIONS.filter(
    (dish) => !usedDishes.has(dish.toLowerCase())
  );
  const pool = available.length > 0 ? available : MENU_SUGGESTIONS;
  const dish = pool[Math.floor(Math.random() * pool.length)];

  const { data, error } = await supabase
    .from("menu_items")
    .insert({ from_user: session.userId, dish, suggested_by_app: true })
    .select(MENU_COLUMNS)
    .single();

  if (error || !data) return fail(`Falha ao sugerir prato: ${error?.message}`);

  await notifyOtherUser(session.userId);

  return ok(data as MenuItem);
}

export async function reviewMenuItem(
  id: string,
  decision: "approved" | "rejected",
  scheduledDay: string | null
): Promise<ActionResult<MenuItem>> {
  const session = await getSession();
  if (!session) return fail("Sessão expirada.");

  if (decision === "approved" && !scheduledDay) {
    return fail("Escolha um dia pra aprovar.");
  }

  const supabase = createAdminClient();
  const { data: row, error: fetchError } = await supabase
    .from("menu_items")
    .select("id, from_user, status")
    .eq("id", id)
    .single();

  if (fetchError || !row) return fail("Prato não encontrado.");
  if (row.from_user === session.userId) {
    return fail("Você não pode avaliar seu próprio prato.");
  }
  if (row.status !== "pending") return fail("Isso já foi avaliado.");

  const { data, error } = await supabase
    .from("menu_items")
    .update({
      status: decision,
      scheduled_day: decision === "approved" ? scheduledDay : null,
      decided_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select(MENU_COLUMNS)
    .single();

  if (error || !data) return fail(`Falha ao salvar avaliação: ${error?.message}`);

  if (decision === "approved" && scheduledDay) {
    await autoScheduleCooking({
      day: scheduledDay,
      createdBy: session.userId,
      menuItemId: id,
    });
  }

  await notifyOtherUser(session.userId);

  return ok(data as MenuItem);
}

export async function markMenuItemMade(id: string): Promise<ActionResult<MenuItem>> {
  const session = await getSession();
  if (!session) return fail("Sessão expirada.");

  const supabase = createAdminClient();
  const { data: row, error: fetchError } = await supabase
    .from("menu_items")
    .select("id, status")
    .eq("id", id)
    .single();

  if (fetchError || !row) return fail("Prato não encontrado.");
  if (row.status !== "approved") return fail("Só pratos aprovados podem ser marcados como feitos.");

  const { data, error } = await supabase
    .from("menu_items")
    .update({ made_at: new Date().toISOString() })
    .eq("id", id)
    .select(MENU_COLUMNS)
    .single();

  if (error || !data) return fail(`Falha ao marcar como feito: ${error?.message}`);
  return ok(data as MenuItem);
}

export async function deleteMenuItem(id: string): Promise<ActionResult<null>> {
  const session = await getSession();
  if (!session) return fail("Sessão expirada.");

  const supabase = createAdminClient();
  const { data: row, error } = await supabase
    .from("menu_items")
    .select("id, from_user")
    .eq("id", id)
    .single();

  if (error || !row) return fail("Prato não encontrado.");
  if (row.from_user !== session.userId) {
    return fail("Você só pode apagar o que você adicionou.");
  }

  await supabase.from("menu_items").delete().eq("id", id);

  return ok(null);
}
