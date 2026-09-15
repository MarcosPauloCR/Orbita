"use client";

import { useState } from "react";
import Link from "next/link";
import { TrophyIcon, type TrophyIconKind } from "@/components/TrophyIcon";
import { TROPHIES } from "@/lib/streaks";
import { ACTIVITY_TROPHIES } from "@/lib/activityTrophies";
import type { ActivityType } from "../agenda/actions";

const CATEGORIES = [
  { key: "sequencia", label: "🌙 sequência" },
  { key: "desafios", label: "🎯 desafios a dois" },
] as const;

type Category = (typeof CATEGORIES)[number]["key"];

function TrophyCard({
  iconKind,
  name,
  detail,
  unlocked,
}: {
  iconKind: TrophyIconKind;
  name: string;
  detail: string;
  unlocked: boolean;
}) {
  return (
    <div className="card flex items-center gap-3">
      <div
        className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full"
        style={{ background: "var(--accent-soft)" }}
      >
        <div style={unlocked ? undefined : { filter: "brightness(0) opacity(0.32)" }}>
          <TrophyIcon kind={iconKind} className="h-7 w-7" />
        </div>
      </div>
      <div className="flex flex-col gap-0.5">
        <span className="text-xs text-ink">{name}</span>
        {unlocked ? (
          <span className="text-[10px] font-medium" style={{ color: "var(--accent)" }}>
            conquistado! 🎉
          </span>
        ) : (
          <span className="text-[10px] text-ink-muted">{detail}</span>
        )}
      </div>
    </div>
  );
}

export function TrofeusView({
  longestStreak,
  activityCounts,
}: {
  longestStreak: number;
  activityCounts: Record<ActivityType, number>;
}) {
  const [category, setCategory] = useState<Category>("sequencia");

  return (
    <div className="flex w-full max-w-sm flex-1 flex-col gap-4 overflow-y-auto overflow-x-hidden min-h-0">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-xl text-ink">Troféus</h1>
        <Link
          href="/app"
          className="text-xs text-ink-muted underline underline-offset-2 hover:text-ink"
        >
          voltar
        </Link>
      </div>

      <div className="glass flex gap-1 rounded-full p-1.5">
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

      {category === "sequencia" && (
        <div className="flex flex-col gap-2 pb-4">
          {TROPHIES.map((trophy) => (
            <TrophyCard
              key={trophy.days}
              iconKind={trophy.iconKind}
              name={trophy.name}
              detail={`chegue a ${trophy.days} dia${trophy.days > 1 ? "s" : ""} seguidos`}
              unlocked={longestStreak >= trophy.days}
            />
          ))}
        </div>
      )}

      {category === "desafios" && (
        <div className="flex flex-col gap-2 pb-4">
          {ACTIVITY_TROPHIES.map((trophy) => {
            const done = activityCounts[trophy.type];
            const unlocked = done >= trophy.count;
            return (
              <TrophyCard
                key={`${trophy.type}-${trophy.count}`}
                iconKind={trophy.iconKind}
                name={trophy.name}
                detail={`${trophy.challenge} (${Math.min(done, trophy.count)}/${trophy.count})`}
                unlocked={unlocked}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
