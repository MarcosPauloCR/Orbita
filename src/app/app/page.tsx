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
  getTodayAnswers,
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

  const [checkins, answers] = await Promise.all([
    getTodayCheckins(),
    getTodayAnswers(),
  ]);

  return (
    <div className="flex w-full max-w-sm min-h-0 flex-1 flex-col gap-8 overflow-y-auto pb-4">
      <SignalDashboard
        currentUserId={session.userId}
        otherUserName={otherUserName}
        userIds={[session.userId, otherUser?.id ?? ""]}
        totalCount={count ?? 0}
        initialSignals={(signals ?? []) as SignalRow[]}
        sendSignalAction={sendSignal}
        sendSOSAction={sendSOS}
      />
      <MoodCheckin
        otherUserName={otherUserName}
        initialMine={checkins.mine}
        initialOther={checkins.other}
      />
      <DailyQuestion otherUserName={otherUserName} initial={answers} />
    </div>
  );
}
