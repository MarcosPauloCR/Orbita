"use server";

import { getSession } from "@/lib/auth/get-session";
import { createAdminClient } from "@/lib/supabase/admin";
import { ok, fail, type ActionResult } from "@/lib/action-result";

export type StoryLine = {
  id: string;
  from_user: string;
  content: string;
  created_at: string;
};

export async function getStory(): Promise<{
  lines: StoryLine[];
  myTurn: boolean;
}> {
  const session = await getSession();
  if (!session) return { lines: [], myTurn: false };

  const supabase = createAdminClient();
  const { data } = await supabase
    .from("story_lines")
    .select("id, from_user, content, created_at")
    .order("created_at", { ascending: true });

  const lines = data ?? [];
  const last = lines[lines.length - 1];
  const myTurn = !last || last.from_user !== session.userId;

  return { lines, myTurn };
}

export async function addLine(content: string): Promise<ActionResult<null>> {
  const session = await getSession();
  if (!session) return fail("Sessão expirada.");

  const trimmed = content.trim();
  if (!trimmed) return fail("Escreva algo pra continuar a história.");
  if (trimmed.length > 500) return fail("Frase muito grande — tente algo mais curto.");

  const supabase = createAdminClient();
  const { data: last } = await supabase
    .from("story_lines")
    .select("from_user")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (last && last.from_user === session.userId) {
    return fail("Espera a vez da outra pessoa continuar.");
  }

  const { error } = await supabase
    .from("story_lines")
    .insert({ from_user: session.userId, content: trimmed });

  if (error) return fail(`Falha ao salvar: ${error.message}`);
  return ok(null);
}
