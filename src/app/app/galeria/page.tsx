import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/get-session";
import { getGalleryPhotos } from "./actions";
import { GalleryView } from "./GalleryView";

export default async function GaleriaPage() {
  const session = await getSession();
  if (!session) redirect("/");

  const photos = await getGalleryPhotos();

  return <GalleryView currentUserId={session.userId} initialPhotos={photos} />;
}
