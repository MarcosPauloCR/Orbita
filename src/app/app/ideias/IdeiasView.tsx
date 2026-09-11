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
    <div className="flex w-full max-w-sm flex-1 flex-col min-h-0 overflow-y-auto overflow-x-hidden">
      <div className="glass mb-4 flex gap-1 rounded-full p-1.5">
        {CATEGORIES.map((c) => (
          <button
            key={c.key}
            type="button"
            onClick={() => setCategory(c.key)}
            className={`flex-1 rounded-full px-2 py-2 text-xs font-medium transition-all duration-300 ${
              category === c.key ? "text-btn-ink" : "text-ink-muted hover:text-ink"
            }`}
            style={
              category === c.key
                ? {
                    background: "linear-gradient(135deg, var(--moon-a), var(--moon-b))",
                    boxShadow: "0 8px 18px -8px var(--glow-color)",
                  }
                : undefined
            }
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
