"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  computeMutualStreak,
  computeLongestStreak,
  bestSignalDayCount,
  toUtcDateKey,
  currentTrophy,
  type SignalRow,
} from "@/lib/streaks";
import type { ActionResult } from "@/lib/action-result";
import { ActivityCalendar } from "./ActivityCalendar";
import NeonBorder from "@/components/NeonBorder";

// Resolvido em runtime porque o NeonBorder não entende "var(--x)" — ele só
// sabe ler hex/rgb prontos. --accent já muda sozinho entre claro/escuro no
// globals.css; aqui só refletimos o valor atual.
function useAccentColor(): string {
  const [color, setColor] = useState("#a97e2d");

  useEffect(() => {
    function resolve() {
      const value = getComputedStyle(document.documentElement)
        .getPropertyValue("--accent")
        .trim();
      if (value) setColor(value);
    }
    resolve();

    const query = window.matchMedia("(prefers-color-scheme: dark)");
    query.addEventListener("change", resolve);
    return () => query.removeEventListener("change", resolve);
  }, []);

  return color;
}

type HistoryGroup = {
  label: string;
  items: { from_user: string; time: string; type: "normal" | "sos" }[];
};

function groupByLocalDay(signals: SignalRow[], limit: number): HistoryGroup[] {
  const sorted = [...signals]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, limit);

  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);

  const byKey = new Map<
    string,
    { from_user: string; time: string; type: "normal" | "sos" }[]
  >();
  for (const s of sorted) {
    const date = new Date(s.created_at);
    const key = date.toDateString();
    if (!byKey.has(key)) byKey.set(key, []);
    byKey.get(key)!.push({
      from_user: s.from_user,
      time: date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
      type: s.type ?? "normal",
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
  completeDaysCount,
  initialSignals,
  sendSignalAction,
  sendSOSAction,
}: {
  currentUserId: string;
  otherUserName: string;
  userIds: [string, string];
  totalCount: number;
  completeDaysCount: number;
  initialSignals: SignalRow[];
  sendSignalAction: () => Promise<void>;
  sendSOSAction: () => Promise<ActionResult<null>>;
}) {
  const [signals, setSignals] = useState<SignalRow[]>(initialSignals);
  const [total, setTotal] = useState(totalCount);
  const [isPending, startTransition] = useTransition();
  const [isSendingSOS, setIsSendingSOS] = useState(false);
  const [sent, setSent] = useState(false);
  const [received, setReceived] = useState<"normal" | "sos" | null>(null);
  const accentColor = useAccentColor();

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
          if ((row.type ?? "normal") === "normal") setTotal((prev) => prev + 1);
          if (row.from_user !== currentUserId) {
            setReceived(row.type === "sos" ? "sos" : "normal");
            setTimeout(() => setReceived(null), row.type === "sos" ? 8000 : 4500);
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

  function handleSOS() {
    if (!confirm(`Mandar um SOS pra ${otherUserName} agora?`)) return;
    setIsSendingSOS(true);
    sendSOSAction()
      .then((result) => {
        if (!result.ok) alert(result.error);
      })
      .finally(() => setIsSendingSOS(false));
  }

  const streak = useMemo(
    () => computeMutualStreak(signals, userIds),
    [signals, userIds]
  );
  const { current, next } = useMemo(() => currentTrophy(streak), [streak]);
  const groups = useMemo(() => groupByLocalDay(signals, 5), [signals]);

  const longestStreakEver = useMemo(
    () => computeLongestStreak(signals, userIds),
    [signals, userIds]
  );
  const isStreakRecord = streak > 0 && streak >= longestStreakEver;

  const { isDayRecord, todayCount } = useMemo(() => {
    const todayKey = toUtcDateKey(new Date().toISOString());
    const bestOverall = bestSignalDayCount(signals);
    const todayTotal = signals.filter(
      (s) => (s.type ?? "normal") === "normal" && toUtcDateKey(s.created_at) === todayKey
    ).length;
    const bestExcludingToday =
      todayTotal >= bestOverall ? bestSignalDayCount(
        signals.filter((s) => toUtcDateKey(s.created_at) !== todayKey)
      ) : bestOverall;
    return {
      todayCount: todayTotal,
      isDayRecord: bestExcludingToday > 0 && todayTotal > bestExcludingToday,
    };
  }, [signals]);

  return (
    <div className="flex w-full flex-col items-center gap-6">
      <div className="flex flex-col items-center gap-3 pt-2">
        <button
          onClick={handleClick}
          disabled={isPending}
          className="animate-glow flex h-40 w-40 flex-col items-center justify-center gap-0.5 rounded-full text-center font-display text-lg tracking-wide text-btn-ink transition-all duration-300 hover:scale-[1.04] active:scale-95 disabled:opacity-70"
          style={{
            background: "linear-gradient(135deg, var(--moon-a), var(--moon-b))",
          }}
        >
          <span>pensando</span>
          <span>em você</span>
        </button>
        <p className="h-4 text-xs text-ink-muted">
          {isPending ? "enviando…" : sent ? "enviado ✦" : ""}
        </p>
        <button type="button" onClick={handleSOS} disabled={isSendingSOS} className="btn-danger">
          {isSendingSOS ? "enviando…" : "🆘 preciso de você"}
        </button>
      </div>

      <div className="grid w-full grid-cols-2 gap-3">
        <div className="card text-center">
          <NeonBorder
            style={{ position: "absolute", inset: 0, pointerEvents: "none", overflow: "hidden" }}
            color={accentColor}
            rounded={34}
            thickness={2}
            borderSize={45}
            glow={45}
            speed={10}
          />
          {isStreakRecord && streak > 1 && (
            <span className="absolute right-3 top-3 text-xs" title="seu recorde de sequência">
              🏆
            </span>
          )}
          <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full text-xl" style={{ background: "var(--accent-soft)" }}>
            {current?.icon ?? "🌑"}
          </div>
          <p className="mt-2 font-display text-2xl text-ink">{streak}</p>
          <p className="section-label mt-0.5">dias seguidos</p>
          <p className="mt-1 text-[10px] text-ink-muted">
            {current ? current.name : "comecem hoje"}
          </p>
          {next && (
            <p className="text-[9px] text-ink-muted">
              faltam {next.days - streak} p/ {next.icon} {next.name}
            </p>
          )}
        </div>
        <div className="card text-center">
          <NeonBorder
            style={{ position: "absolute", inset: 0, pointerEvents: "none", overflow: "hidden" }}
            color={accentColor}
            rounded={34}
            thickness={2}
            borderSize={45}
            glow={45}
            speed={10}
          />
          {isDayRecord && (
            <span className="absolute right-3 top-3 text-xs" title="recorde de sinais no dia">
              🏆
            </span>
          )}
          <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full text-xl" style={{ background: "var(--accent-soft)" }}>
            ✦
          </div>
          <p className="mt-2 font-display text-2xl text-ink">{total}</p>
          <p className="section-label mt-0.5">sinais no total</p>
          {isDayRecord && (
            <p className="mt-1 text-[9px] text-ink-muted">
              melhor dia: {todayCount} hoje!
            </p>
          )}
        </div>
      </div>

      <div className="card w-full text-center">
        <NeonBorder
          style={{ position: "absolute", inset: 0, pointerEvents: "none" }}
          color={accentColor}
          rounded={34}
          thickness={2}
          borderSize={45}
          glow={45}
          speed={10}
        />
        <p className="font-display text-2xl text-ink">{completeDaysCount}</p>
        <p className="section-label mt-0.5">
          dias completos (sinal + humor + pergunta)
        </p>
      </div>

      <div className="card-flush w-full p-4">
        <ActivityCalendar signals={signals} userIds={userIds} />
      </div>

      <div className="w-full">
        <p className="section-label mb-2">histórico (últimos 5)</p>
        <div className="flex flex-col gap-3">
          {groups.length === 0 && (
            <p className="text-xs text-ink-muted">nenhum sinal ainda.</p>
          )}
          {groups.map((group) => (
            <div key={group.label}>
              <p className="mb-1 text-xs font-medium text-ink">
                {group.label}
              </p>
              <div className="flex flex-col gap-1.5">
                {group.items.map((item, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between rounded-2xl border border-hairline bg-surface px-3.5 py-2 text-xs text-ink-muted"
                  >
                    <span>
                      {item.type === "sos" ? "🆘 " : ""}
                      {item.from_user === currentUserId ? "você" : otherUserName}
                    </span>
                    <span className="chip font-mono">{item.time}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {received && (
        <div
          className={`fixed inset-0 z-50 flex items-center justify-center backdrop-blur-md ${
            received === "sos" ? "bg-red-950/50" : "bg-black/40"
          }`}
        >
          <div
            className="animate-fade-in glass mx-4 rounded-[2rem] px-8 py-7 text-center"
            style={{ boxShadow: "0 30px 70px -20px var(--shadow-color)" }}
          >
            <p className="font-display text-2xl text-ink">
              {received === "sos"
                ? `🆘 ${otherUserName} precisa de você agora`
                : `${otherUserName} está pensando em você`}
            </p>
            <p className="mt-1 text-ink-muted">✦</p>
          </div>
        </div>
      )}
    </div>
  );
}
