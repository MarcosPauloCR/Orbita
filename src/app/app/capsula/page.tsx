import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/get-session";
import { getCapsules } from "./actions";
import { CapsuleView } from "./CapsuleView";

export default async function CapsulaPage() {
  const session = await getSession();
  if (!session) redirect("/");

  const capsules = await getCapsules();

  return <CapsuleView currentUserId={session.userId} initialCapsules={capsules} />;
}
