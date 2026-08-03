import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/get-session";
import { getPublicUsers } from "@/lib/auth/users";
import { ChatView } from "./ChatView";
import { getMessages } from "./actions";

export default async function ChatPage() {
  const session = await getSession();
  if (!session) redirect("/");

  const otherUser = (await getPublicUsers()).find(
    (u) => u.id !== session.userId
  );
  const messages = await getMessages();

  return (
    <ChatView
      currentUserId={session.userId}
      otherUserId={otherUser?.id ?? ""}
      otherUserName={otherUser?.name ?? "ela"}
      initialMessages={messages}
    />
  );
}
