"use server";

import { getSession } from "@/lib/auth/get-session";
import { getPublicUsers } from "@/lib/auth/users";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendPushToUser } from "@/lib/push";
import { autoScheduleCooking } from "@/lib/agenda";
import { ok, fail, type ActionResult } from "@/lib/action-result";

export type FoodShareStatus = "pending" | "approved" | "rejected";

export type FoodShare = {
  id: string;
  from_user: string;
  url: string;
  status: FoodShareStatus;
  rating: number | null;
  suggested_date: string | null;
  created_at: string;
  decided_at: string | null;
};

const FOOD_COLUMNS =
  "id, from_user, url, status, rating, suggested_date, created_at, decided_at";

async function notifyOtherUser(exceptUserId: string): Promise<void> {
  const otherUser = (await getPublicUsers()).find((u) => u.id !== exceptUserId);
  if (otherUser) {
    await sendPushToUser(otherUser.id, { title: "Órbita", body: "1 novo item" });
  }
}

export async function getFoodShares(): Promise<FoodShare[]> {
  const session = await getSession();
  if (!session) return [];

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("food_shares")
    .select(FOOD_COLUMNS)
    .order("created_at", { ascending: false })
    .limit(100);

  if (error || !data) return [];
  return data as FoodShare[];
}

export async function shareFoodVideo(
  url: string
): Promise<ActionResult<FoodShare>> {
  const session = await getSession();
  if (!session) return fail("Sessão expirada.");

  const trimmed = url.trim();
  if (!trimmed) return fail("Cole o link do vídeo.");

  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return fail("Link inválido.");
    }
  } catch {
    return fail("Link inválido.");
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("food_shares")
    .insert({ from_user: session.userId, url: trimmed })
    .select(FOOD_COLUMNS)
    .single();

  if (error || !data) return fail(`Falha ao compartilhar: ${error?.message}`);

  await notifyOtherUser(session.userId);

  return ok(data as FoodShare);
}

export async function reviewFoodShare(
  id: string,
  decision: "approved" | "rejected",
  rating: number | null,
  suggestedDate: string | null
): Promise<ActionResult<FoodShare>> {
  const session = await getSession();
  if (!session) return fail("Sessão expirada.");

  if (rating !== null && (!Number.isInteger(rating) || rating < 0 || rating > 10)) {
    return fail("Nota inválida.");
  }

  const supabase = createAdminClient();
  const { data: row, error: fetchError } = await supabase
    .from("food_shares")
    .select("id, from_user, status")
    .eq("id", id)
    .single();

  if (fetchError || !row) return fail("Compartilhamento não encontrado.");
  if (row.from_user === session.userId) {
    return fail("Você não pode avaliar seu próprio compartilhamento.");
  }
  if (row.status !== "pending") return fail("Isso já foi avaliado.");

  const { data, error } = await supabase
    .from("food_shares")
    .update({
      status: decision,
      rating,
      suggested_date: suggestedDate,
      decided_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select(FOOD_COLUMNS)
    .single();

  if (error || !data) return fail(`Falha ao salvar avaliação: ${error?.message}`);

  if (decision === "approved" && suggestedDate) {
    await autoScheduleCooking({
      day: suggestedDate,
      createdBy: session.userId,
      foodShareId: id,
    });
  }

  await notifyOtherUser(session.userId);

  return ok(data as FoodShare);
}

export async function deleteFoodShare(id: string): Promise<ActionResult<null>> {
  const session = await getSession();
  if (!session) return fail("Sessão expirada.");

  const supabase = createAdminClient();
  const { data: row, error } = await supabase
    .from("food_shares")
    .select("id, from_user")
    .eq("id", id)
    .single();

  if (error || !row) return fail("Compartilhamento não encontrado.");
  if (row.from_user !== session.userId) {
    return fail("Você só pode apagar o que você compartilhou.");
  }

  await supabase.from("food_shares").delete().eq("id", id);

  return ok(null);
}
