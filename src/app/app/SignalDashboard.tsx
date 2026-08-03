"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { createClient } from "@/lib/supabase/client";
import { computeMutualStreak, currentTrophy, type SignalRow } from "@/lib/streaks";

type HistoryGroup = {
  label: string;
  items: { from_user: string; time: string }[];
};

function groupByLocalDay(signals: SignalRow[]): HistoryGroup[] {
  const sorted = [...signals].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);

  const byKey = new Map<string, { from_user: string; time: string }[]>();
  for (const s of sorted) {
    const date = new Date(s.created_at);
    const key = date.toDateString();
    if (!byKey.has(key)) byKey.set(key, []);
    byKey.get(key)!.push({
      from_user: s.from_user,
      time: date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
    });
  }

  const groups: HistoryGroup[] = [];
  byKey.forEach((items, key) => {
    let label: string;
    if (key === today.toDateString()) label = "hoje";
    else if (key === yesterday.toDateString()) label = "ontem";
    else {
      label = new Date(key).toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "long",
      });
    }
    groups.push({ label, items });
  });

  return groups;
}

export function SignalDashboard({
  currentUserId,
  otherUserName,
  userIds,
  totalCount,
  initialSignals,
  sendSignalAction,
}: {
  currentUserId: string;
  otherUserName: string;
  userIds: [string, string];
  totalCount: number;
  initialSignals: SignalRow[];
  sendSignalAction: () => Promise<void>;
}) {
  const [signals, setSignals] = useState<SignalRow[]>(initialSignals);
  const [total, setTotal] = useState(totalCount);
  const [isPending, startTransition] = useTransition();
  const [sent, setSent] = useState(false);
  const [received, setReceived] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel("signals-realtime")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "signals" },
        (payload) => {
          const row = payload.new as SignalRow;
          setSignals((prev) => [row, ...prev]);
          setTotal((prev) => prev + 1);
          if (row.from_user !== currentUserId) {
            setReceived(true);
            setTimeout(() => setReceived(false), 4500);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUserId]);

  function handleClick() {
    startTransition(async () => {
      await sendSignalAction();
      setSent(true);
      setTimeout(() => setSent(false), 2200);
    });
  }

  const streak = useMemo(
    () => computeMutualStreak(signals, userIds),
    [signals, userIds]
  );
  const { current, next } = useMemo(() => currentTrophy(streak), [streak]);
  const groups = useMemo(() => groupByLocalDay(signals), [signals]);

  return (
    <div className="flex w-full max-w-sm flex-1 flex-col items-center gap-6 overflow-y-auto pb-4">
      <div className="flex flex-col items-center gap-4 pt-2">
        <button
          onClick={handleClick}
          disabled={isPending}
          className="flex h-40 w-40 flex-col items-center justify-center rounded-full border border-hairline bg-moon text-center font-display text-lg text-btn-ink shadow-[0_0_50px_-12px] shadow-moon/40 transition duration-300 hover:scale-105 hover:brightness-95 active:scale-95 disabled:opacity-70"
        >
          <span>pensando</span>
          <span>em você</span>
        </button>
        <p className="h-4 text-xs text-ink-muted">
          {isPending ? "enviando…" : sent ? "enviado ✦" : ""}
        </p>
      </div>

      <div className="grid w-full grid-cols-2 gap-2">
        <div className="rounded-2xl border border-hairline bg-surface p-3 text-center">
          <p className="text-2xl">{current?.icon ?? "🌑"}</p>
          <p className="mt-1 text-lg font-semibold text-ink">{streak}</p>
          <p className="text-[10px] uppercase tracking-wide text-ink-muted">
            dias seguidos
          </p>
          <p className="mt-1 text-[10px] text-ink-muted">
            {current ? current.name : "comecem hoje"}
          </p>
          {next && (
            <p className="text-[9px] text-ink-muted">
              faltam {next.days - streak} p/ {next.icon} {next.name}
            </p>
          )}
        </div>
        <div className="rounded-2xl border border-hairline bg-surface p-3 text-center">
          <p className="text-2xl">✦</p>
          <p className="mt-1 text-lg font-semibold text-ink">{total}</p>
          <p className="text-[10px] uppercase tracking-wide text-ink-muted">
            sinais no total
          </p>
        </div>
      </div>

      <div className="w-full">
        <p className="mb-2 text-[10px] uppercase tracking-wide text-ink-muted">
          histórico
        </p>
        <div className="flex flex-col gap-3">
          {groups.length === 0 && (
            <p className="text-xs text-ink-muted">nenhum sinal ainda.</p>
          )}
          {groups.map((group) => (
            <div key={group.label}>
              <p className="mb-1 text-xs font-medium text-ink">
                {group.label}
              </p>
              <div className="flex flex-col gap-1">
                {group.items.map((item, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between rounded-lg border border-hairline bg-surface px-3 py-1.5 text-xs text-ink-muted"
                  >
                    <span>
                      {item.from_user === currentUserId ? "você" : otherUserName}
                    </span>
                    <span className="font-mono">{item.time}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {received && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="animate-fade-in mx-4 rounded-3xl border border-hairline bg-surface px-8 py-7 text-center shadow-2xl">
            <p className="font-display text-2xl text-ink">
              {otherUserName} está pensando em você
            </p>
            <p className="mt-1 text-ink-muted">✦</p>
          </div>
        </div>
      )}
    </div>
  );
}
