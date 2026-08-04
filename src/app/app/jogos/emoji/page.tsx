import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/get-session";
import { getPublicUsers } from "@/lib/auth/users";
import { DuoGameView } from "../duo/DuoGameView";
import { GameShell } from "../GameShell";

export default async function EmojiPage() {
  const session = await getSession();
  if (!session) redirect("/");

  const otherUser = (await getPublicUsers()).find(
    (u) => u.id !== session.userId
  );

  return (
    <GameShell>
      <DuoGameView category="emoji" otherUserName={otherUser?.name ?? "ela"} />
    </GameShell>
  );
}
