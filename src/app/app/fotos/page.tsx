import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/get-session";
import { getPublicUsers } from "@/lib/auth/users";
import { getPhotos } from "./actions";
import { PhotoFeed } from "./PhotoFeed";

export default async function FotosPage() {
  const session = await getSession();
  if (!session) redirect("/");

  const otherUser = (await getPublicUsers()).find(
    (u) => u.id !== session.userId
  );
  const photos = await getPhotos();

  return (
    <PhotoFeed
      currentUserId={session.userId}
      otherUserId={otherUser?.id ?? ""}
      initialPhotos={photos}
    />
  );
}
