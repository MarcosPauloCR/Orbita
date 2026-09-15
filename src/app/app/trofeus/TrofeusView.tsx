"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import { TrophyIcon, type TrophyIconKind } from "@/components/TrophyIcon";
import { TROPHIES } from "@/lib/streaks";
import { CHALLENGES } from "@/lib/challenges";
import { toggleChallengeCompletion, type ChallengeCompletion } from "./actions";

const CHALLENGES_CHANNEL = "orbita-desafios";

const CATEGORIES = [
  { key: "sequencia", label: "🌙 sequência" },
  { key: "desafios", label: "🎯 desafios a dois" },
] as const;

type Category = (typeof CATEGORIES)[number]["key"];

function TrophyBadge({ iconKind, unlocked }: { iconKind: TrophyIconKind; unlocked: boolean }) {
  return (
    <div
      className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full"
      style={{ background: "var(--accent-soft)" }}
    >
      <div style={unlocked ? undefined : { filter: "brightness(0) opacity(0.32)" }}>
        <TrophyIcon kind={iconKind} className="h-7 w-7" />
      </div>
    </div>
  );
}

export function TrofeusView({
  currentUserId,
  userNames,
  longestStreak,
  initialCompletions,
}: {
  currentUserId: string;
  userNames: Record<string, string>;
  longestStreak: number;
  initialCompletions: ChallengeCompletion[];
}) {
  const [category, setCategory] = useState<Category>("sequencia");
  const [completions, setCompletions] = useState<ChallengeCompletion[]>(initialCompletions);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase.channel(CHALLENGES_CHANNEL);
    channelRef.current = channel;

    channel
      .on("broadcast", { event: "toggled" }, ({ payload }) => {
        const { challengeId, completion } = payload as {
          challengeId: string;
          completion: ChallengeCompletion | null;
        };
        setCompletions((prev) => {
          const withoutIt = prev.filter((c) => c.challenge_id !== challengeId);
          return completion ? [...withoutIt, completion] : withoutIt;
        });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const completedMap = new Map(completions.map((c) => [c.challenge_id, c]));

  async function handleToggle(challengeId: string, nextCompleted: boolean) {
    setPendingId(challengeId);
    try {
      const result = await toggleChallengeCompletion(challengeId, nextCompleted);
      if (!result.ok) {
        alert(result.error);
        return;
      }
      const completion: ChallengeCompletion | null = nextCompleted
        ? { challenge_id: challengeId, completed_by: currentUserId, completed_at: new Date().toISOString() }
        : null;
      setCompletions((prev) => {
        const withoutIt = prev.filter((c) => c.challenge_id !== challengeId);
        return completion ? [...withoutIt, completion] : withoutIt;
      });
      channelRef.current?.send({
        type: "broadcast",
        event: "toggled",
        payload: { challengeId, completion },
      });
    } finally {
      setPendingId(null);
    }
  }

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
          {TROPHIES.map((trophy) => {
            const unlocked = longestStreak >= trophy.days;
            return (
              <div key={trophy.days} className="card flex items-center gap-3">
                <TrophyBadge iconKind={trophy.iconKind} unlocked={unlocked} />
                <div className="flex flex-col gap-0.5">
                  <span className="text-xs text-ink">{trophy.name}</span>
                  {unlocked ? (
                    <span className="text-[10px] font-medium" style={{ color: "var(--accent)" }}>
                      conquistado! 🎉
                    </span>
                  ) : (
                    <span className="text-[10px] text-ink-muted">
                      chegue a {trophy.days} dia{trophy.days > 1 ? "s" : ""} seguidos
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {category === "desafios" && (
        <div className="flex flex-col gap-2 pb-4">
          <p className="text-center text-[10px] text-ink-muted">
            marquem juntos conforme forem cumprindo
          </p>
          {CHALLENGES.map((challenge) => {
            const completion = completedMap.get(challenge.id);
            const unlocked = !!completion;
            return (
              <div key={challenge.id} className="card flex items-center gap-3">
                <TrophyBadge iconKind={challenge.iconKind} unlocked={unlocked} />
                <div className="flex flex-1 flex-col gap-0.5">
                  <span className="text-xs text-ink">{challenge.name}</span>
                  {unlocked && completion ? (
                    <span className="text-[10px] font-medium" style={{ color: "var(--accent)" }}>
                      feito por {userNames[completion.completed_by] ?? "alguém"} · 🎉
                    </span>
                  ) : (
                    <span className="text-[10px] text-ink-muted">ainda não cumprido</span>
                  )}
                </div>
                <button
                  type="button"
                  disabled={pendingId === challenge.id}
                  onClick={() => handleToggle(challenge.id, !unlocked)}
                  className={unlocked ? "btn-secondary !px-2.5 !py-1.5 !text-[10px]" : "btn-primary !px-2.5 !py-1.5 !text-[10px]"}
                >
                  {unlocked ? "desmarcar" : "marcar"}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
