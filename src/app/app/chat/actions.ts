"use server";

import { randomUUID } from "crypto";
import { getSession } from "@/lib/auth/get-session";
import { createAdminClient } from "@/lib/supabase/admin";
import { ok, fail, type ActionResult } from "@/lib/action-result";

const BUCKET = "updates-media";
const PHOTO_URL_TTL = 60 * 60; // 1 hora

export type ChatMessage = {
  id: string;
  from_user: string;
  content: string | null;
  photo_path: string | null;
  photoUrl: string | null;
  read_at: string | null;
  created_at: string;
};

type MessageRow = {
  id: string;
  from_user: string;
  content: string | null;
  photo_path: string | null;
  read_at: string | null;
  created_at: string;
};

async function withPhotoUrl(row: MessageRow): Promise<ChatMessage> {
  let photoUrl: string | null = null;
  if (row.photo_path) {
    const supabase = createAdminClient();
    const { data } = await supabase.storage
      .from(BUCKET)
      .createSignedUrl(row.photo_path, PHOTO_URL_TTL);
    photoUrl = data?.signedUrl ?? null;
  }

  return {
    id: row.id,
    from_user: row.from_user,
    content: row.content,
    photo_path: row.photo_path,
    photoUrl,
    read_at: row.read_at,
    created_at: row.created_at,
  };
}

export async function getMessages(): Promise<ChatMessage[]> {
  const session = await getSession();
  if (!session) return [];

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("messages")
    .select("id, from_user, content, photo_path, read_at, created_at")
    .order("created_at", { ascending: true })
    .limit(200);

  if (error || !data) return [];
  return Promise.all((data as MessageRow[]).map(withPhotoUrl));
}

export async function sendMessage(
  content: string
): Promise<ActionResult<ChatMessage>> {
  const session = await getSession();
  if (!session) return fail("Sessão expirada.");

  const trimmed = content.trim();
  if (!trimmed) return fail("Mensagem vazia.");

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("messages")
    .insert({ from_user: session.userId, content: trimmed })
    .select("id, from_user, content, photo_path, read_at, created_at")
    .single();

  if (error || !data) return fail(`Falha ao enviar mensagem: ${error?.message}`);
  return ok(await withPhotoUrl(data));
}

export async function sendPhotoMessage(
  formData: FormData
): Promise<ActionResult<ChatMessage>> {
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
  const path = `messages/${session.userId}/${randomUUID()}.${ext}`;

  const supabase = createAdminClient();
  const buffer = Buffer.from(await file.arrayBuffer());

  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(path, buffer, { contentType: file.type });
  if (uploadError) {
    return fail(`Falha ao enviar foto: ${uploadError.message}`);
  }

  const { data, error } = await supabase
    .from("messages")
    .insert({ from_user: session.userId, photo_path: path })
    .select("id, from_user, content, photo_path, read_at, created_at")
    .single();

  if (error || !data) return fail(`Falha ao salvar mensagem: ${error?.message}`);
  return ok(await withPhotoUrl(data));
}

export async function markMessagesRead(ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  const session = await getSession();
  if (!session) return;

  const supabase = createAdminClient();
  await supabase
    .from("messages")
    .update({ read_at: new Date().toISOString() })
    .in("id", ids)
    .neq("from_user", session.userId)
    .is("read_at", null);
}
