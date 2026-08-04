import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/get-session";
import { getPublicUsers } from "@/lib/auth/users";
import { getGame } from "./actions";
import { JogoView } from "./JogoView";
import { GameShell } from "../GameShell";

export default async function ForcaPage() {
  const session = await getSession();
  if (!session) redirect("/");

  const otherUser = (await getPublicUsers()).find(
    (u) => u.id !== session.userId
  );
  const game = await getGame();

  return (
    <GameShell>
      <JogoView otherUserName={otherUser?.name ?? "ela"} initialGame={game} />
    </GameShell>
  );
}
