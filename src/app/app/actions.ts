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
import {
  getTodayQuestion,
  getTodayHypothetical,
  brazilDateKey,
} from "@/lib/daily-questions";
import { groupRowsByUtcDate, mutualDatesFrom } from "@/lib/streaks";

function utcDayBounds(date = new Date()) {
  const start = new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())
  );
  const end = new Date(start.getTime() + 86400000);
  return { start: start.toISOString(), end: end.toISOString() };
}

// A pergunta do dia usa o dia civil de Brasília (ver brazilDateKey) — a
// chave salva no banco precisa virar junto com a pergunta escolhida, ou a
// resposta de hoje fica gravada com a data de ontem.
function todayDateKey(): string {
  return brazilDateKey();
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

export type MoodHistoryEntry = { date: string; from_user: string; mood: number };

export async function getMoodHistory(days = 7): Promise<MoodHistoryEntry[]> {
  const session = await getSession();
  if (!session) return [];

  const supabase = createAdminClient();
  const since = new Date(Date.now() - days * 86400000).toISOString();
  const { data } = await supabase
    .from("checkins")
    .select("from_user, mood, created_at")
    .gte("created_at", since)
    .order("created_at", { ascending: true });

  return (data ?? []).map((row) => ({
    date: row.created_at.slice(0, 10),
    from_user: row.from_user,
    mood: row.mood,
  }));
}

export async function submitCheckin(
  mood: number,
  note: string
): Promise<ActionResult<null>> {
  const session = await getSession();
  if (!session) return fail("Sessão expirada.");
  if (!Number.isInteger(mood) || mood < 1 || mood > 10) {
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

// ---------- Pergunta do dia / imagina se ----------

export type QuestionCategory = "reflective" | "hypothetical";

export type DailyAnswerState = {
  question: string;
  myAnswer: string | null;
  otherAnswered: boolean;
  otherAnswer: string | null;
};

function questionFor(category: QuestionCategory): string {
  return category === "hypothetical" ? getTodayHypothetical() : getTodayQuestion();
}

export async function getTodayAnswers(
  category: QuestionCategory = "reflective"
): Promise<DailyAnswerState> {
  const question = questionFor(category);
  const session = await getSession();
  if (!session) {
    return { question, myAnswer: null, otherAnswered: false, otherAnswer: null };
  }

  const supabase = createAdminClient();
  const { data } = await supabase
    .from("daily_answers")
    .select("from_user, answer")
    .eq("question_date", todayDateKey())
    .eq("category", category);

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
  answer: string,
  category: QuestionCategory = "reflective"
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
      category,
      answer: trimmed,
    },
    { onConflict: "from_user,question_date,category" }
  );

  if (error) return fail(`Falha ao salvar resposta: ${error.message}`);
  return ok(null);
}

// ---------- Dias completos (sinal + humor + pergunta no mesmo dia) ----------

export async function getCompleteDaysCount(): Promise<number> {
  const session = await getSession();
  if (!session) return 0;

  const otherUser = (await getPublicUsers()).find(
    (u) => u.id !== session.userId
  );
  if (!otherUser) return 0;
  const userIds: [string, string] = [session.userId, otherUser.id];

  const supabase = createAdminClient();
  const [signalsRes, checkinsRes, answersRes] = await Promise.all([
    supabase.from("signals").select("from_user, created_at").eq("type", "normal"),
    supabase.from("checkins").select("from_user, created_at"),
    supabase
      .from("daily_answers")
      .select("from_user, question_date")
      .eq("category", "reflective"),
  ]);

  const signalDates = mutualDatesFrom(
    groupRowsByUtcDate(
      signalsRes.data ?? [],
      (r) => r.created_at,
      (r) => r.from_user
    ),
    userIds
  );
  const checkinDates = mutualDatesFrom(
    groupRowsByUtcDate(
      checkinsRes.data ?? [],
      (r) => r.created_at,
      (r) => r.from_user
    ),
    userIds
  );
  const answerDates = mutualDatesFrom(
    groupRowsByUtcDate(
      answersRes.data ?? [],
      (r) => r.question_date,
      (r) => r.from_user
    ),
    userIds
  );

  let count = 0;
  signalDates.forEach((date) => {
    if (checkinDates.has(date) && answerDates.has(date)) count++;
  });
  return count;
}

// ---------- Aniversários automáticos ----------

export type Anniversary = { label: string; months: number };

async function firstCreatedAt(
  supabase: ReturnType<typeof createAdminClient>,
  table: string
): Promise<Date | null> {
  const { data } = await supabase
    .from(table)
    .select("created_at")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  return data ? new Date(data.created_at) : null;
}

function monthsSinceIfAnniversary(first: Date, today: Date): number | null {
  if (first.getUTCDate() !== today.getUTCDate()) return null;
  const months =
    (today.getUTCFullYear() - first.getUTCFullYear()) * 12 +
    (today.getUTCMonth() - first.getUTCMonth());
  return months > 0 ? months : null;
}

export async function getAnniversaries(): Promise<Anniversary[]> {
  const session = await getSession();
  if (!session) return [];

  const supabase = createAdminClient();
  const today = new Date();
  const sources: { table: string; label: string }[] = [
    { table: "signals", label: "o primeiro sinal" },
    { table: "messages", label: "a primeira mensagem" },
    { table: "capsules", label: "a primeira cápsula do tempo" },
  ];

  const results: Anniversary[] = [];
  for (const source of sources) {
    const first = await firstCreatedAt(supabase, source.table);
    if (!first) continue;
    const months = monthsSinceIfAnniversary(first, today);
    if (months !== null) results.push({ label: source.label, months });
  }
  return results;
}
