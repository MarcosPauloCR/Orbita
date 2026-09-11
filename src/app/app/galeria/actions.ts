"use server";

import { randomUUID } from "crypto";
import { getSession } from "@/lib/auth/get-session";
import { getPublicUsers } from "@/lib/auth/users";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendPushToUser } from "@/lib/push";
import { ok, fail, type ActionResult } from "@/lib/action-result";

// Reaproveita a mesma tabela/bucket privado que a antiga aba Fotos usava
// (removida por não estar sendo usada, mas a infraestrutura ficou de
// propósito) — aqui sempre disappearing=false, é uma galeria permanente,
// não um envio que some depois de visto.
const BUCKET = "updates-media";
const FEED_URL_TTL = 60 * 60; // 1 hora

export type GalleryPhoto = {
  id: string;
  from_user: string;
  url: string;
  created_at: string;
};

async function notifyOtherUser(exceptUserId: string): Promise<void> {
  const otherUser = (await getPublicUsers()).find((u) => u.id !== exceptUserId);
  if (otherUser) {
    await sendPushToUser(otherUser.id, { title: "Órbita", body: "1 novo item" });
  }
}

export async function getGalleryPhotos(): Promise<GalleryPhoto[]> {
  const session = await getSession();
  if (!session) return [];

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("updates")
    .select("id, from_user, content, created_at")
    .eq("type", "photo")
    .order("created_at", { ascending: false })
    .limit(100);

  if (error || !data) return [];

  const withUrls = await Promise.all(
    data.map(async (row): Promise<GalleryPhoto | null> => {
      if (!row.content) return null;
      const { data: signed } = await supabase.storage
        .from(BUCKET)
        .createSignedUrl(row.content, FEED_URL_TTL);
      if (!signed?.signedUrl) return null;
      return {
        id: row.id,
        from_user: row.from_user,
        url: signed.signedUrl,
        created_at: row.created_at,
      };
    })
  );

  return withUrls.filter((p): p is GalleryPhoto => p !== null);
}

export async function uploadGalleryPhoto(
  formData: FormData
): Promise<ActionResult<GalleryPhoto>> {
  const session = await getSession();
  if (!session) return fail("Sessão expirada.");

  const file = formData.get("photo");
  if (!(file instanceof File) || file.size === 0) {
    return fail("Selecione uma foto.");
  }
  if (!file.type.startsWith("image/")) {
    return fail("Arquivo precisa ser uma imagem.");
  }
  if (file.size > 8 * 1024 * 1024) {
    return fail("Imagem muito grande (máx. 8MB).");
  }

  const ext = file.name.split(".").pop() || "jpg";
  const path = `${session.userId}/${randomUUID()}.${ext}`;

  const supabase = createAdminClient();
  const buffer = Buffer.from(await file.arrayBuffer());

  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(path, buffer, { contentType: file.type });
  if (uploadError) {
    return fail(`Falha ao enviar foto: ${uploadError.message}`);
  }

  const { data: row, error: insertError } = await supabase
    .from("updates")
    .insert({ from_user: session.userId, type: "photo", content: path, disappearing: false })
    .select("id, from_user, content, created_at")
    .single();

  if (insertError || !row) {
    return fail(`Falha ao salvar foto: ${insertError?.message}`);
  }

  const { data: signed } = await supabase.storage.from(BUCKET).createSignedUrl(path, FEED_URL_TTL);

  await notifyOtherUser(session.userId);

  return ok({
    id: row.id,
    from_user: row.from_user,
    url: signed?.signedUrl ?? "",
    created_at: row.created_at,
  });
}

export async function deleteGalleryPhoto(id: string): Promise<ActionResult<null>> {
  const session = await getSession();
  if (!session) return fail("Sessão expirada.");

  const supabase = createAdminClient();
  const { data: row, error } = await supabase
    .from("updates")
    .select("id, from_user, content")
    .eq("id", id)
    .single();

  if (error || !row) return fail("Foto não encontrada.");
  if (row.from_user !== session.userId) {
    return fail("Você só pode apagar fotos que você enviou.");
  }

  if (row.content) {
    await supabase.storage.from(BUCKET).remove([row.content]);
  }
  await supabase.from("updates").delete().eq("id", id);

  return ok(null);
}
