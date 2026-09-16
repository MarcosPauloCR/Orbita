import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/get-session";
import { getPublicUsers } from "@/lib/auth/users";
import { getDiaryEntries } from "./actions";
import { DiarioView } from "./DiarioView";

export default async function DiarioPage() {
  const session = await getSession();
  if (!session) redirect("/");

  const [users, entries] = await Promise.all([getPublicUsers(), getDiaryEntries()]);
  const userNames = Object.fromEntries(users.map((u) => [u.id, u.name]));

  return <DiarioView currentUserId={session.userId} userNames={userNames} entries={entries} />;
}
