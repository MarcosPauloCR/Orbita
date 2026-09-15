"use server";

import { getSession } from "@/lib/auth/get-session";
import { createAdminClient } from "@/lib/supabase/admin";
import { ok, fail, type ActionResult } from "@/lib/action-result";
import { CHALLENGES } from "@/lib/challenges";
import type { ActivityType } from "../agenda/actions";

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

type AgendaCompletionRow = {
  activity_type: ActivityType;
  movie_shares: { title: string; watched_at: string | null } | null;
  menu_items: { dish: string; made_at: string | null } | null;
  food_shares: { title: string | null } | null;
};

// Só roda pros desafios que têm `auto` definido (lib/challenges.ts) — o
// resto continua exigindo o toggle manual, porque a Agenda não tem como
// provar sozinha que uma carta foi escrita ou uma dança foi aprendida.
export async function getAutoUnlockedChallengeIds(): Promise<string[]> {
  const session = await getSession();
  if (!session) return [];

  const autoChallenges = CHALLENGES.filter((c) => c.auto);
  if (autoChallenges.length === 0) return [];

  const supabase = createAdminClient();
  const todayKey = new Date().toISOString().slice(0, 10);

  const { data } = await supabase
    .from("agenda_items")
    .select(
      "activity_type, day, movie_shares(title, watched_at), menu_items(dish, made_at), food_shares(title)"
    )
    .lte("day", todayKey);

  const rows = (data ?? []) as unknown as AgendaCompletionRow[];
  const unlocked: string[] = [];

  for (const challenge of autoChallenges) {
    const { activityType, matchTitle } = challenge.auto!;

    const done = rows.some((row) => {
      if (row.activity_type !== activityType) return false;

      if (activityType === "filme") {
        const title = row.movie_shares?.title ?? "";
        if (matchTitle && !title.toLowerCase().includes(matchTitle.toLowerCase())) return false;
        // Só conta quando marcado como assistido de verdade (botão já
        // existente na aba Filmes), não só por ter o dia passado.
        return !!row.movie_shares?.watched_at;
      }

      if (activityType === "cozinhar") {
        const title = row.menu_items?.dish ?? row.food_shares?.title ?? "";
        if (matchTitle && !title.toLowerCase().includes(matchTitle.toLowerCase())) return false;
        // Prato do cardápio tem "já feito"; vídeo de comida não tem esse
        // controle, então o dia já ter passado basta.
        return row.menu_items ? !!row.menu_items.made_at : true;
      }

      // sair / dormir: não existe um botão de confirmação separado, o
      // dia já ter passado é a prova de que rolou.
      return true;
    });

    if (done) unlocked.push(challenge.id);
  }

  return unlocked;
}
