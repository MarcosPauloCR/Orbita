import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/get-session";
import { getPublicUsers } from "@/lib/auth/users";
import { VelhaView } from "./VelhaView";
import { GameShell } from "../GameShell";

export default async function VelhaPage() {
  const session = await getSession();
  if (!session) redirect("/");

  const otherUser = (await getPublicUsers()).find(
    (u) => u.id !== session.userId
  );

  return (
    <GameShell>
      <VelhaView otherUserName={otherUser?.name ?? "ela"} />
    </GameShell>
  );
}
