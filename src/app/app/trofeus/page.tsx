import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/get-session";
import { getPublicUsers } from "@/lib/auth/users";
import { createAdminClient } from "@/lib/supabase/admin";
import { computeLongestStreak, type SignalRow } from "@/lib/streaks";
import { getActivityDoneCounts } from "../agenda/actions";
import { TrofeusView } from "./TrofeusView";

export default async function TrofeusPage() {
  const session = await getSession();
  if (!session) redirect("/");

  const supabase = createAdminClient();
  const [users, signalsRes, activityCounts] = await Promise.all([
    getPublicUsers(),
    supabase
      .from("signals")
      .select("from_user, created_at, type")
      .order("created_at", { ascending: false })
      .limit(1000),
    getActivityDoneCounts(),
  ]);

  const otherUser = users.find((u) => u.id !== session.userId);
  const userIds: [string, string] = [session.userId, otherUser?.id ?? ""];
  const longestStreak = computeLongestStreak((signalsRes.data ?? []) as SignalRow[], userIds);

  return <TrofeusView longestStreak={longestStreak} activityCounts={activityCounts} />;
}
