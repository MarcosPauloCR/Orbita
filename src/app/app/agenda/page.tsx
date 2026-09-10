import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/get-session";
import { getAgendaItems, getAgendaPickerOptions } from "./actions";
import { AgendaView } from "./AgendaView";

export default async function AgendaPage() {
  const session = await getSession();
  if (!session) redirect("/");

  const [items, options] = await Promise.all([
    getAgendaItems(),
    getAgendaPickerOptions(),
  ]);

  return (
    <AgendaView
      currentUserId={session.userId}
      initialItems={items}
      initialMovieOptions={options.movies}
      initialCookingOptions={options.cooking}
    />
  );
}
