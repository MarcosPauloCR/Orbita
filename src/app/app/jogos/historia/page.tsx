import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/get-session";
import { getPublicUsers } from "@/lib/auth/users";
import { HistoriaView } from "./HistoriaView";
import { GameShell } from "../GameShell";

export default async function HistoriaPage() {
  const session = await getSession();
  if (!session) redirect("/");

  const otherUser = (await getPublicUsers()).find(
    (u) => u.id !== session.userId
  );

  return (
    <GameShell>
      <HistoriaView
        currentUserId={session.userId}
        otherUserName={otherUser?.name ?? "ela"}
      />
    </GameShell>
  );
}
