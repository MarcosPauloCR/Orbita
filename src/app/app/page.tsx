import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/get-session";
import { getPublicUsers } from "@/lib/auth/users";
import { createAdminClient } from "@/lib/supabase/admin";
import type { SignalRow } from "@/lib/streaks";
import { SignalDashboard } from "./SignalDashboard";
import { MoodCheckin } from "./MoodCheckin";
import { DailyQuestion } from "./DailyQuestion";
import {
  sendSignal,
  sendSOS,
  getTodayCheckins,
  getMoodHistory,
  getTodayAnswers,
  getCompleteDaysCount,
  getAnniversaries,
} from "./actions";

export default async function AppPage() {
  const session = await getSession();
  if (!session) {
    redirect("/");
  }

  const users = await getPublicUsers();
  const otherUser = users.find((u) => u.id !== session.userId);
  const otherUserName = otherUser?.name ?? "ela";

  const supabase = createAdminClient();
  const { count } = await supabase
    .from("signals")
    .select("id", { count: "exact", head: true });

  const { data: signals } = await supabase
    .from("signals")
    .select("from_user, created_at, type")
    .order("created_at", { ascending: false })
    .limit(1000);

  const [
    checkins,
    moodHistory,
    reflectiveAnswers,
    hypotheticalAnswers,
    completeDaysCount,
    anniversaries,
  ] = await Promise.all([
    getTodayCheckins(),
    getMoodHistory(7),
    getTodayAnswers("reflective"),
    getTodayAnswers("hypothetical"),
    getCompleteDaysCount(),
    getAnniversaries(),
  ]);

  return (
    <div className="flex w-full max-w-sm min-h-0 flex-1 flex-col gap-8 overflow-y-auto pb-4">
      {anniversaries.length > 0 && (
        <div className="flex flex-col gap-1 rounded-2xl border border-hairline bg-surface p-3">
          {anniversaries.map((a, i) => (
            <p key={i} className="text-xs text-ink">
              🎉 hoje faz{" "}
              {a.months % 12 === 0
                ? `${a.months / 12} ano${a.months / 12 > 1 ? "s" : ""}`
                : `${a.months} ${a.months > 1 ? "meses" : "mês"}`}{" "}
              desde {a.label}!
            </p>
          ))}
        </div>
      )}

      <SignalDashboard
        currentUserId={session.userId}
        otherUserName={otherUserName}
        userIds={[session.userId, otherUser?.id ?? ""]}
        totalCount={count ?? 0}
        completeDaysCount={completeDaysCount}
        initialSignals={(signals ?? []) as SignalRow[]}
        sendSignalAction={sendSignal}
        sendSOSAction={sendSOS}
      />
      <MoodCheckin
        currentUserId={session.userId}
        otherUserName={otherUserName}
        initialMine={checkins.mine}
        initialOther={checkins.other}
        initialHistory={moodHistory}
      />
      <DailyQuestion
        title="pergunta do dia"
        category="reflective"
        otherUserName={otherUserName}
        initial={reflectiveAnswers}
      />
      <DailyQuestion
        title="imagina se..."
        category="hypothetical"
        otherUserName={otherUserName}
        initial={hypotheticalAnswers}
      />
    </div>
  );
}
