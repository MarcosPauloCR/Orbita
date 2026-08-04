import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/get-session";
import { getPublicUsers } from "@/lib/auth/users";
import { DARE_PROMPTS } from "@/lib/duo-prompts";
import { DuoGameView } from "../duo/DuoGameView";
import { GameShell } from "../GameShell";

export default async function DesafioPage() {
  const session = await getSession();
  if (!session) redirect("/");

  const otherUser = (await getPublicUsers()).find(
    (u) => u.id !== session.userId
  );

  return (
    <GameShell>
      <DuoGameView
        category="dare"
        otherUserName={otherUser?.name ?? "ela"}
        suggestions={[...DARE_PROMPTS]}
      />
    </GameShell>
  );
}
