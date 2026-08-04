import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/get-session";
import { getPublicUsers } from "@/lib/auth/users";
import { CacaPalavrasView } from "./CacaPalavrasView";
import { GameShell } from "../GameShell";

export default async function CacaPalavrasPage() {
  const session = await getSession();
  if (!session) redirect("/");

  const otherUser = (await getPublicUsers()).find(
    (u) => u.id !== session.userId
  );

  return (
    <GameShell>
      <CacaPalavrasView otherUserName={otherUser?.name ?? "ela"} />
    </GameShell>
  );
}
