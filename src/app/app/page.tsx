import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/get-session";
import { getPublicUsers } from "@/lib/auth/users";
import { createAdminClient } from "@/lib/supabase/admin";
import type { SignalRow } from "@/lib/streaks";
import { SignalDashboard } from "./SignalDashboard";
import { sendSignal } from "./actions";

export default async function AppPage() {
  const session = await getSession();
  if (!session) {
    redirect("/");
  }

  const users = await getPublicUsers();
  const otherUser = users.find((u) => u.id !== session.userId);

  const supabase = createAdminClient();
  const { count } = await supabase
    .from("signals")
    .select("id", { count: "exact", head: true });

  const { data: signals } = await supabase
    .from("signals")
    .select("from_user, created_at")
    .order("created_at", { ascending: false })
    .limit(1000);

  return (
    <SignalDashboard
      currentUserId={session.userId}
      otherUserName={otherUser?.name ?? "ela"}
      userIds={[session.userId, otherUser?.id ?? ""]}
      totalCount={count ?? 0}
      initialSignals={(signals ?? []) as SignalRow[]}
      sendSignalAction={sendSignal}
    />
  );
}
