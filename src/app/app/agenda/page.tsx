import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/get-session";
import { getAgendaItems, getAgendaPickerOptions } from "./actions";
import { AgendaView } from "./AgendaView";
import { getWeeklyRecap } from "../actions";
import { WeeklyRecapCard } from "../WeeklyRecapCard";

export default async function AgendaPage() {
  const session = await getSession();
  if (!session) redirect("/");

  const [items, options, weeklyRecap] = await Promise.all([
    getAgendaItems(),
    getAgendaPickerOptions(),
    getWeeklyRecap(),
  ]);

  return (
    <AgendaView
      currentUserId={session.userId}
      initialItems={items}
      initialMovieOptions={options.movies}
      initialCookingOptions={options.cooking}
      footer={<WeeklyRecapCard recap={weeklyRecap} />}
    />
  );
}
