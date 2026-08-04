"use server";

import { randomUUID } from "crypto";
import { getSession } from "@/lib/auth/get-session";
import { createAdminClient } from "@/lib/supabase/admin";
import { ok, fail, type ActionResult } from "@/lib/action-result";

const BUCKET = "updates-media";
const FEED_URL_TTL = 60 * 60; // 1 hora
const REVEAL_URL_TTL = 120; // 2 minutos, só pra dar tempo de carregar a imagem

export type PhotoUpdate = {
  id: string;
  from_user: string;
  disappearing: boolean;
  read_at: string | null;
  created_at: string;
  url: string | null;
};

type UpdateRow = {
  id: string;
  from_user: string;
  content: string | null;
  disappearing: boolean;
  read_at: string | null;
  created_at: string;
};

export async function getPhotos(): Promise<PhotoUpdate[]> {
  const session = await getSession();
  if (!session) return [];

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("updates")
    .select("id, from_user, content, disappearing, read_at, created_at")
    .eq("type", "photo")
    .order("created_at", { ascending: false })
    .limit(100);

  if (error || !data) return [];

  return Promise.all(
    (data as UpdateRow[]).map(async (row) => {
      const isOwn = row.from_user === session.userId;
      const locked = row.disappearing && !isOwn && !row.read_at;

      if (locked || !row.content) {
        return {
          id: row.id,
          from_user: row.from_user,
          disappearing: row.disappearing,
          read_at: row.read_at,
          created_at: row.created_at,
          url: null,
        };
      }

      const { data: signed } = await supabase.storage
        .from(BUCKET)
        .createSignedUrl(row.content, FEED_URL_TTL);

      return {
        id: row.id,
        from_user: row.from_user,
        disappearing: row.disappearing,
        read_at: row.read_at,
        created_at: row.created_at,
        url: signed?.signedUrl ?? null,
      };
    })
  );
}

export async function sharePhoto(
  formData: FormData
): Promise<ActionResult<PhotoUpdate>> {
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

  const disappearing = formData.get("disappearing") === "on";
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
    .insert({
      from_user: session.userId,
      type: "photo",
      content: path,
      disappearing,
    })
    .select("id, from_user, content, disappearing, read_at, created_at")
    .single();

  if (insertError || !row) {
    return fail(`Falha ao salvar foto: ${insertError?.message}`);
  }

  const { data: signed } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(path, FEED_URL_TTL);

  return ok({
    id: row.id,
    from_user: row.from_user,
    disappearing: row.disappearing,
    read_at: row.read_at,
    created_at: row.created_at,
    url: signed?.signedUrl ?? null,
  });
}

export async function markPhotosSeen(ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  const session = await getSession();
  if (!session) return;

  const supabase = createAdminClient();
  await supabase
    .from("updates")
    .update({ read_at: new Date().toISOString() })
    .in("id", ids)
    .neq("from_user", session.userId)
    .is("read_at", null);
}

export async function viewDisappearingPhoto(
  id: string
): Promise<ActionResult<string>> {
  const session = await getSession();
  if (!session) return fail("Sessão expirada.");

  const supabase = createAdminClient();
  const { data: row, error } = await supabase
    .from("updates")
    .select("id, from_user, content, disappearing")
    .eq("id", id)
    .eq("type", "photo")
    .single();

  if (error || !row || !row.content) return fail("Foto não encontrada.");
  if (row.from_user === session.userId) return fail("Essa foto é sua.");

  const { data: signed } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(row.content, REVEAL_URL_TTL);

  await supabase
    .from("updates")
    .update({ read_at: new Date().toISOString() })
    .eq("id", id);

  if (row.disappearing) {
    await supabase.storage.from(BUCKET).remove([row.content]);
    await supabase.from("updates").delete().eq("id", id);
  }

  return ok(signed?.signedUrl ?? "");
}

export async function deletePhoto(id: string): Promise<ActionResult<null>> {
  const session = await getSession();
  if (!session) return fail("Sessão expirada.");

  const supabase = createAdminClient();
  const { data: row, error } = await supabase
    .from("updates")
    .select("id, from_user, content")
    .eq("id", id)
    .eq("type", "photo")
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
