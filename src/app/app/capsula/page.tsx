import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/get-session";
import { getPublicUsers } from "@/lib/auth/users";
import { getCapsules } from "./actions";
import { CapsuleView } from "./CapsuleView";

export default async function CapsulaPage() {
  const session = await getSession();
  if (!session) redirect("/");

  const users = await getPublicUsers();
  const capsules = await getCapsules();

  const userNames = Object.fromEntries(users.map((u) => [u.id, u.name]));

  return (
    <CapsuleView
      currentUserId={session.userId}
      userNames={userNames}
      initialCapsules={capsules}
    />
  );
}
