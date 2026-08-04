"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/get-session";
import { SESSION_COOKIE } from "@/lib/auth/session";
import { createAdminClient } from "@/lib/supabase/admin";
import { getPublicUsers } from "@/lib/auth/users";
import {
  sendPushToUser,
  upsertPushSubscription,
  type PushSubscriptionInput,
} from "@/lib/push";
import { ok, fail, type ActionResult } from "@/lib/action-result";
import { getTodayQuestion } from "@/lib/daily-questions";

function utcDayBounds(date = new Date()) {
  const start = new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())
  );
  const end = new Date(start.getTime() + 86400000);
  return { start: start.toISOString(), end: end.toISOString() };
}

function todayDateKey(): string {
  return new Date().toISOString().slice(0, 10);
}

export async function logoutAction() {
  cookies().delete(SESSION_COOKIE);
  redirect("/");
}

export async function sendSignal() {
  const session = await getSession();
  if (!session) {
    redirect("/");
  }

  const supabase = createAdminClient();
  const { error } = await supabase
    .from("signals")
    .insert({ from_user: session.userId, type: "normal" });

  if (error) {
    throw new Error(`Falha ao enviar sinal: ${error.message}`);
  }

  const otherUser = (await getPublicUsers()).find(
    (u) => u.id !== session.userId
  );
  if (otherUser) {
    await sendPushToUser(otherUser.id, { title: "Órbita", body: "1 novo item" });
  }
}

export async function sendSOS(): Promise<ActionResult<null>> {
  const session = await getSession();
  if (!session) return fail("Sessão expirada.");

  const supabase = createAdminClient();
  const { error } = await supabase
    .from("signals")
    .insert({ from_user: session.userId, type: "sos" });

  if (error) return fail(`Falha ao enviar SOS: ${error.message}`);

  const otherUser = (await getPublicUsers()).find(
    (u) => u.id !== session.userId
  );
  if (otherUser) {
    await sendPushToUser(otherUser.id, {
      title: "Órbita",
      body: "1 item urgente",
      urgent: true,
    });
  }

  return ok(null);
}

export async function subscribeToPush(subscription: PushSubscriptionInput) {
  const session = await getSession();
  if (!session) return;
  await upsertPushSubscription(session.userId, subscription);
}

// ---------- Check-in de humor diário ----------

export type TodayCheckin = { from_user: string; mood: number; note: string | null };

export async function getTodayCheckins(): Promise<{
  mine: TodayCheckin | null;
  other: TodayCheckin | null;
}> {
  const session = await getSession();
  if (!session) return { mine: null, other: null };

  const supabase = createAdminClient();
  const { start, end } = utcDayBounds();
  const { data } = await supabase
    .from("checkins")
    .select("from_user, mood, note")
    .gte("created_at", start)
    .lt("created_at", end);

  const mine = data?.find((c) => c.from_user === session.userId) ?? null;
  const other = data?.find((c) => c.from_user !== session.userId) ?? null;
  return { mine, other };
}

export async function submitCheckin(
  mood: number,
  note: string
): Promise<ActionResult<null>> {
  const session = await getSession();
  if (!session) return fail("Sessão expirada.");
  if (!Number.isInteger(mood) || mood < 1 || mood > 5) {
    return fail("Humor inválido.");
  }

  const supabase = createAdminClient();
  const { start, end } = utcDayBounds();
  const trimmedNote = note.trim() || null;

  const { data: existing } = await supabase
    .from("checkins")
    .select("id")
    .eq("from_user", session.userId)
    .gte("created_at", start)
    .lt("created_at", end)
    .maybeSingle();

  const { error } = existing
    ? await supabase
        .from("checkins")
        .update({ mood, note: trimmedNote })
        .eq("id", existing.id)
    : await supabase
        .from("checkins")
        .insert({ from_user: session.userId, mood, note: trimmedNote });

  if (error) return fail(`Falha ao salvar check-in: ${error.message}`);
  return ok(null);
}

// ---------- Pergunta do dia ----------

export type DailyAnswerState = {
  question: string;
  myAnswer: string | null;
  otherAnswered: boolean;
  otherAnswer: string | null;
};

export async function getTodayAnswers(): Promise<DailyAnswerState> {
  const question = getTodayQuestion();
  const session = await getSession();
  if (!session) {
    return { question, myAnswer: null, otherAnswered: false, otherAnswer: null };
  }

  const supabase = createAdminClient();
  const { data } = await supabase
    .from("daily_answers")
    .select("from_user, answer")
    .eq("question_date", todayDateKey());

  const mine = data?.find((r) => r.from_user === session.userId);
  const otherRow = data?.find((r) => r.from_user !== session.userId);
  const bothAnswered = !!mine && !!otherRow;

  return {
    question,
    myAnswer: mine?.answer ?? null,
    otherAnswered: !!otherRow,
    otherAnswer: bothAnswered ? otherRow!.answer : null,
  };
}

export async function submitDailyAnswer(
  answer: string
): Promise<ActionResult<null>> {
  const session = await getSession();
  if (!session) return fail("Sessão expirada.");

  const trimmed = answer.trim();
  if (!trimmed) return fail("Escreva uma resposta.");

  const supabase = createAdminClient();
  const { error } = await supabase.from("daily_answers").upsert(
    {
      from_user: session.userId,
      question_date: todayDateKey(),
      answer: trimmed,
    },
    { onConflict: "from_user,question_date" }
  );

  if (error) return fail(`Falha ao salvar resposta: ${error.message}`);
  return ok(null);
}
