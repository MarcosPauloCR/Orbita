"use server";

import { getSession } from "@/lib/auth/get-session";
import { createAdminClient } from "@/lib/supabase/admin";
import { getTodayQuestion, getTodayHypothetical } from "@/lib/daily-questions";
import type { ActivityType } from "../agenda/actions";
import type { QuestionCategory } from "../actions";

const BUCKET = "updates-media";
const URL_TTL = 60 * 60; // 1 hora

export type DiaryEntry =
  | { kind: "photo"; id: string; at: string; from_user: string; url: string }
  | {
      kind: "recap";
      id: string;
      at: string;
      activity_type: ActivityType;
      title: string | null;
      text: string;
    }
  | {
      kind: "capsule";
      id: string;
      at: string;
      from_user: string;
      message: string | null;
      photoUrl: string | null;
    }
  | {
      kind: "answer";
      id: string;
      at: string;
      category: QuestionCategory;
      question: string;
      answers: { from_user: string; text: string }[];
    };

function questionForDate(category: QuestionCategory, questionDate: string): string {
  const date = new Date(`${questionDate}T12:00:00Z`);
  return category === "hypothetical" ? getTodayHypothetical(date) : getTodayQuestion(date);
}

export async function getDiaryEntries(): Promise<DiaryEntry[]> {
  const session = await getSession();
  if (!session) return [];

  const supabase = createAdminClient();

  const [photosRes, recapsRes, capsulesRes, answersRes] = await Promise.all([
    supabase
      .from("updates")
      .select("id, from_user, content, created_at")
      .eq("type", "photo")
      .order("created_at", { ascending: false })
      .limit(200),
    supabase
      .from("agenda_items")
      .select(
        "id, day, activity_type, description, recap, movie_shares(title), food_shares(title), menu_items(dish)"
      )
      .not("recap", "is", null),
    supabase
      .from("capsules")
      .select("id, from_user, message, photo_path, opened_at")
      .not("opened_at", "is", null),
    supabase
      .from("daily_answers")
      .select("from_user, question_date, category, answer")
      .order("question_date", { ascending: true }),
  ]);

  const entries: DiaryEntry[] = [];

  for (const row of photosRes.data ?? []) {
    if (!row.content) continue;
    const { data: signed } = await supabase.storage
      .from(BUCKET)
      .createSignedUrl(row.content, URL_TTL);
    if (!signed?.signedUrl) continue;
    entries.push({
      kind: "photo",
      id: row.id,
      at: row.created_at,
      from_user: row.from_user,
      url: signed.signedUrl,
    });
  }

  type RecapRow = {
    id: string;
    day: string;
    activity_type: ActivityType;
    description: string | null;
    recap: string;
    movie_shares: { title: string } | null;
    food_shares: { title: string | null } | null;
    menu_items: { dish: string } | null;
  };

  for (const row of (recapsRes.data ?? []) as unknown as RecapRow[]) {
    const title =
      row.movie_shares?.title ?? row.food_shares?.title ?? row.menu_items?.dish ?? row.description;
    entries.push({
      kind: "recap",
      id: row.id,
      at: `${row.day}T12:00:00Z`,
      activity_type: row.activity_type,
      title: title ?? null,
      text: row.recap,
    });
  }

  for (const row of capsulesRes.data ?? []) {
    let photoUrl: string | null = null;
    if (row.photo_path) {
      const { data: signed } = await supabase.storage
        .from(BUCKET)
        .createSignedUrl(row.photo_path, URL_TTL);
      photoUrl = signed?.signedUrl ?? null;
    }
    entries.push({
      kind: "capsule",
      id: row.id,
      at: row.opened_at!,
      from_user: row.from_user,
      message: row.message,
      photoUrl,
    });
  }

  const answerGroups = new Map<
    string,
    { category: QuestionCategory; question_date: string; answers: { from_user: string; text: string }[] }
  >();
  for (const row of answersRes.data ?? []) {
    const category = row.category as QuestionCategory;
    const key = `${row.question_date}-${category}`;
    if (!answerGroups.has(key)) {
      answerGroups.set(key, { category, question_date: row.question_date, answers: [] });
    }
    answerGroups.get(key)!.answers.push({ from_user: row.from_user, text: row.answer });
  }
  answerGroups.forEach((group, key) => {
    const uniqueUsers = new Set(group.answers.map((a) => a.from_user));
    if (uniqueUsers.size < 2) return;
    entries.push({
      kind: "answer",
      id: key,
      at: `${group.question_date}T12:00:00Z`,
      category: group.category,
      question: questionForDate(group.category, group.question_date),
      answers: group.answers,
    });
  });

  entries.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
  return entries.slice(0, 300);
}
