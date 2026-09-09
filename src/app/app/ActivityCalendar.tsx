"use client";

import { useMemo, useState } from "react";
import { groupSignalsByDay, type SignalRow } from "@/lib/streaks";

const WEEKDAYS = ["D", "S", "T", "Q", "Q", "S", "S"];
const MONTH_NAMES = [
  "janeiro", "fevereiro", "março", "abril", "maio", "junho",
  "julho", "agosto", "setembro", "outubro", "novembro", "dezembro",
];

function dateKey(y: number, m: number, d: number): string {
  return `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

export function ActivityCalendar({
  signals,
  userIds,
}: {
  signals: SignalRow[];
  userIds: [string, string];
}) {
  const [cursor, setCursor] = useState(() => {
    const now = new Date();
    return { year: now.getUTCFullYear(), month: now.getUTCMonth() };
  });

  const byDay = useMemo(() => groupSignalsByDay(signals), [signals]);

  const { year, month } = cursor;
  const firstWeekday = new Date(Date.UTC(year, month, 1)).getUTCDay();
  const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const todayKey = useMemo(() => {
    const now = new Date();
    return dateKey(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  }, []);

  const cells: { key: string | null; day: number | null }[] = [];
  for (let i = 0; i < firstWeekday; i++) cells.push({ key: null, day: null });
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ key: dateKey(year, month, d), day: d });
  }

  function iconFor(key: string | null): string {
    if (!key) return "";
    const users = byDay.get(key);
    if (!users || users.size === 0) return "";
    return userIds.every((u) => users.has(u)) ? "🌕" : "🌒";
  }

  function changeMonth(delta: number) {
    setCursor((prev) => {
      let m = prev.month + delta;
      let y = prev.year;
      if (m < 0) {
        m = 11;
        y -= 1;
      } else if (m > 11) {
        m = 0;
        y += 1;
      }
      return { year: y, month: m };
    });
  }

  return (
    <div className="w-full">
      <div className="mb-3 flex items-center justify-between">
        <button
          type="button"
          onClick={() => changeMonth(-1)}
          className="flex h-7 w-7 items-center justify-center rounded-full text-ink-muted transition hover:bg-surface-strong hover:text-ink"
          aria-label="mês anterior"
        >
          ‹
        </button>
        <p className="section-label">
          {MONTH_NAMES[month]} de {year}
        </p>
        <button
          type="button"
          onClick={() => changeMonth(1)}
          className="flex h-7 w-7 items-center justify-center rounded-full text-ink-muted transition hover:bg-surface-strong hover:text-ink"
          aria-label="próximo mês"
        >
          ›
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1">
        {WEEKDAYS.map((w, i) => (
          <div
            key={i}
            className="text-center text-[9px] uppercase tracking-wide text-ink-muted"
          >
            {w}
          </div>
        ))}
        {cells.map((cell, i) => (
          <div
            key={i}
            className={`flex aspect-square items-center justify-center rounded-xl text-[11px] transition ${
              cell.key === todayKey ? "bg-accent-soft" : ""
            } ${cell.day ? "text-ink" : ""}`}
          >
            {cell.day ? (
              <span className="relative flex h-full w-full flex-col items-center justify-center">
                <span>{iconFor(cell.key) || cell.day}</span>
              </span>
            ) : null}
          </div>
        ))}
      </div>

      <div className="mt-3 flex items-center gap-2 text-[9px] text-ink-muted">
        <span className="chip">🌕 os dois mandaram sinal</span>
        <span className="chip">🌒 só um mandou</span>
      </div>
    </div>
  );
}
