import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/get-session";
import { getFoodShares } from "./food-actions";
import { getMenuItems } from "./menu-actions";
import { getMovieShares } from "./movie-actions";
import { IdeiasView } from "./IdeiasView";

export default async function IdeiasPage() {
  const session = await getSession();
  if (!session) redirect("/");

  const [foodShares, menuItems, movieShares] = await Promise.all([
    getFoodShares(),
    getMenuItems(),
    getMovieShares(),
  ]);

  return (
    <IdeiasView
      currentUserId={session.userId}
      initialFoodShares={foodShares}
      initialMenuItems={menuItems}
      initialMovieShares={movieShares}
    />
  );
}
