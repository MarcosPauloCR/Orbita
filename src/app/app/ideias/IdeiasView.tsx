"use client";

import { useState } from "react";
import { FoodVideos } from "./FoodVideos";
import { MenuSemana } from "./MenuSemana";
import { Filmes } from "./Filmes";
import type { FoodShare } from "./food-actions";
import type { MenuItem } from "./menu-actions";
import type { MovieShare } from "./movie-actions";

const CATEGORIES = [
  { key: "food", label: "🎥 vídeos" },
  { key: "menu", label: "🍳 cardápio" },
  { key: "movies", label: "🎬 filmes" },
] as const;

type Category = (typeof CATEGORIES)[number]["key"];

export function IdeiasView({
  currentUserId,
  initialFoodShares,
  initialMenuItems,
  initialMovieShares,
}: {
  currentUserId: string;
  initialFoodShares: FoodShare[];
  initialMenuItems: MenuItem[];
  initialMovieShares: MovieShare[];
}) {
  const [category, setCategory] = useState<Category>("food");

  return (
    <div className="flex w-full max-w-sm flex-1 flex-col min-h-0 overflow-y-auto">
      <div className="mb-3 flex gap-1 border-b border-hairline pb-3">
        {CATEGORIES.map((c) => (
          <button
            key={c.key}
            type="button"
            onClick={() => setCategory(c.key)}
            className={`rounded-full px-3 py-1.5 text-xs transition ${
              category === c.key
                ? "bg-moon text-btn-ink"
                : "border border-hairline text-ink-muted"
            }`}
          >
            {c.label}
          </button>
        ))}
      </div>

      {category === "food" && (
        <FoodVideos currentUserId={currentUserId} initialShares={initialFoodShares} />
      )}
      {category === "menu" && (
        <MenuSemana currentUserId={currentUserId} initialItems={initialMenuItems} />
      )}
      {category === "movies" && (
        <Filmes currentUserId={currentUserId} initialShares={initialMovieShares} />
      )}
    </div>
  );
}
