import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/get-session";
import { getPublicUsers } from "@/lib/auth/users";
import { NavalView } from "./NavalView";
import { GameShell } from "../GameShell";

export default async function NavalPage() {
  const session = await getSession();
  if (!session) redirect("/");

  const otherUser = (await getPublicUsers()).find(
    (u) => u.id !== session.userId
  );

  return (
    <GameShell>
      <NavalView otherUserName={otherUser?.name ?? "ela"} />
    </GameShell>
  );
}
