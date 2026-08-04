"use server";

import { randomUUID } from "crypto";
import { getSession } from "@/lib/auth/get-session";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendPushToUser } from "@/lib/push";
import { ok, fail, type ActionResult } from "@/lib/action-result";

const BUCKET = "updates-media";
const PHOTO_URL_TTL = 60 * 60; // 1 hora

export type Capsule = {
  id: string;
  from_user: string;
  unlock_at: string;
  opened_at: string | null;
  created_at: string;
  message: string | null;
  photoUrl: string | null;
};

type CapsuleRow = {
  id: string;
  from_user: string;
  message: string | null;
  photo_path: string | null;
  unlock_at: string;
  opened_at: string | null;
  created_at: string;
};

async function toCapsule(row: CapsuleRow): Promise<Capsule> {
  const opened = row.opened_at !== null;
  let photoUrl: string | null = null;

  if (opened && row.photo_path) {
    const supabase = createAdminClient();
    const { data } = await supabase.storage
      .from(BUCKET)
      .createSignedUrl(row.photo_path, PHOTO_URL_TTL);
    photoUrl = data?.signedUrl ?? null;
  }

  return {
    id: row.id,
    from_user: row.from_user,
    unlock_at: row.unlock_at,
    opened_at: row.opened_at,
    created_at: row.created_at,
    message: opened ? row.message : null,
    photoUrl,
  };
}

export async function getCapsules(): Promise<Capsule[]> {
  const session = await getSession();
  if (!session) return [];

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("capsules")
    .select(
      "id, from_user, message, photo_path, unlock_at, opened_at, created_at"
    )
    .order("unlock_at", { ascending: true });

  if (error || !data) return [];
  return Promise.all((data as CapsuleRow[]).map(toCapsule));
}

export async function createCapsule(
  formData: FormData
): Promise<ActionResult<null>> {
  const session = await getSession();
  if (!session) return fail("Sessão expirada.");

  const message = String(formData.get("message") ?? "").trim() || null;
  const unlockAtRaw = String(formData.get("unlockAt") ?? "");
  const file = formData.get("photo");

  if (!unlockAtRaw) return fail("Escolha uma data de abertura.");
  const unlockAt = new Date(unlockAtRaw);
  if (Number.isNaN(unlockAt.getTime()) || unlockAt.getTime() <= Date.now()) {
    return fail("A data precisa ser no futuro.");
  }

  const hasPhoto = file instanceof File && file.size > 0;
  if (!message && !hasPhoto) {
    return fail("Escreva uma mensagem ou anexe uma foto.");
  }

  const supabase = createAdminClient();
  let photoPath: string | null = null;

  if (hasPhoto) {
    const photoFile = file as File;
    if (!photoFile.type.startsWith("image/")) {
      return fail("Arquivo precisa ser uma imagem.");
    }
    if (photoFile.size > 8 * 1024 * 1024) {
      return fail("Imagem muito grande (máx. 8MB).");
    }
    const ext = photoFile.name.split(".").pop() || "jpg";
    photoPath = `capsules/${session.userId}/${randomUUID()}.${ext}`;
    const buffer = Buffer.from(await photoFile.arrayBuffer());
    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(photoPath, buffer, { contentType: photoFile.type });
    if (uploadError) {
      return fail(`Falha ao enviar foto: ${uploadError.message}`);
    }
  }

  const { error } = await supabase.from("capsules").insert({
    from_user: session.userId,
    message,
    photo_path: photoPath,
    unlock_at: unlockAt.toISOString(),
  });

  if (error) return fail(`Falha ao criar cápsula: ${error.message}`);
  return ok(null);
}

export async function openCapsule(id: string): Promise<ActionResult<Capsule>> {
  const session = await getSession();
  if (!session) return fail("Sessão expirada.");

  const supabase = createAdminClient();
  const { data: row, error } = await supabase
    .from("capsules")
    .select(
      "id, from_user, message, photo_path, unlock_at, opened_at, created_at"
    )
    .eq("id", id)
    .single();

  if (error || !row) return fail("Cápsula não encontrada.");
  if (new Date(row.unlock_at).getTime() > Date.now()) {
    return fail("Ainda não chegou a hora de abrir essa cápsula.");
  }

  if (!row.opened_at) {
    row.opened_at = new Date().toISOString();
    await supabase
      .from("capsules")
      .update({ opened_at: row.opened_at })
      .eq("id", id);

    if (row.from_user !== session.userId) {
      await sendPushToUser(row.from_user, {
        title: "Órbita",
        body: "1 novo item",
      });
    }
  }

  return ok(await toCapsule(row as CapsuleRow));
}
