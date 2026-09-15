"use server";

import { getSession } from "@/lib/auth/get-session";
import { createAdminClient } from "@/lib/supabase/admin";
import { ok, fail, type ActionResult } from "@/lib/action-result";

export type ChallengeCompletion = {
  challenge_id: string;
  completed_by: string;
  completed_at: string;
};

export async function getChallengeCompletions(): Promise<ChallengeCompletion[]> {
  const session = await getSession();
  if (!session) return [];

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("challenge_completions")
    .select("challenge_id, completed_by, completed_at");

  if (error || !data) return [];
  return data;
}

export async function toggleChallengeCompletion(
  challengeId: string,
  completed: boolean
): Promise<ActionResult<null>> {
  const session = await getSession();
  if (!session) return fail("Sessão expirada.");

  const supabase = createAdminClient();

  if (completed) {
    const { error } = await supabase
      .from("challenge_completions")
      .upsert({ challenge_id: challengeId, completed_by: session.userId });
    if (error) return fail(`Falha ao marcar: ${error.message}`);
  } else {
    const { error } = await supabase
      .from("challenge_completions")
      .delete()
      .eq("challenge_id", challengeId);
    if (error) return fail(`Falha ao desmarcar: ${error.message}`);
  }

  return ok(null);
}
