"use client";

import { useMemo, useState } from "react";
import { submitCheckin, type TodayCheckin, type MoodHistoryEntry } from "./actions";

const WEEKDAYS = ["D", "S", "T", "Q", "Q", "S", "S"];

function moodEmoji(mood: number): string {
  if (mood <= 2) return "😞";
  if (mood <= 4) return "😕";
  if (mood <= 6) return "😐";
  if (mood <= 8) return "🙂";
  return "😄";
}

function moodLabel(mood: number): string {
  if (mood <= 2) return "muito mal";
  if (mood <= 4) return "mal";
  if (mood <= 6) return "normal";
  if (mood <= 8) return "bem";
  return "ótimo";
}

function moodColor(mood: number): string {
  // frio (azul) -> quente (laranja), conforme a intensidade sobe
  const hue = 220 - ((mood - 1) / 9) * 190;
  return `hsl(${hue}, 70%, 55%)`;
}

function last7Days(): string[] {
  const days: string[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86400000);
    days.push(d.toISOString().slice(0, 10));
  }
  return days;
}

export function MoodCheckin({
  currentUserId,
  otherUserName,
  initialMine,
  initialOther,
  initialHistory,
}: {
  currentUserId: string;
  otherUserName: string;
  initialMine: TodayCheckin | null;
  initialOther: TodayCheckin | null;
  initialHistory: MoodHistoryEntry[];
}) {
  const [mine, setMine] = useState<TodayCheckin | null>(initialMine);
  const [other] = useState<TodayCheckin | null>(initialOther);
  const [mood, setMood] = useState(mine?.mood ?? 5);
  const [note, setNote] = useState(mine?.note ?? "");
  const [isSaving, setIsSaving] = useState(false);
  const [editing, setEditing] = useState(!mine);

  const days = useMemo(last7Days, []);
  const historyByDay = useMemo(() => {
    const map = new Map<string, MoodHistoryEntry[]>();
    for (const entry of initialHistory) {
      if (!map.has(entry.date)) map.set(entry.date, []);
      map.get(entry.date)!.push(entry);
    }
    return map;
  }, [initialHistory]);

  async function handleSave() {
    setIsSaving(true);
    try {
      const result = await submitCheckin(mood, note);
      if (!result.ok) {
        alert(result.error);
        return;
      }
      setMine({ from_user: currentUserId, mood, note: note.trim() || null });
      setEditing(false);
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="w-full">
      <p className="section-label mb-2">humor de hoje</p>

      <div className="grid grid-cols-2 gap-3">
        <div className="card">
          <p className="mb-1 text-[10px] text-ink-muted">você</p>
          {mine && !editing ? (
            <button type="button" onClick={() => setEditing(true)} className="text-left">
              <p className="text-2xl">{moodEmoji(mine.mood)}</p>
              <p className="text-[10px] text-ink-muted">{moodLabel(mine.mood)}</p>
              {mine.note && (
                <p className="mt-1 text-[10px] text-ink-muted">{mine.note}</p>
              )}
            </button>
          ) : (
            <div className="flex flex-col gap-2">
              <p className="text-2xl" style={{ color: moodColor(mood) }}>
                {moodEmoji(mood)}
              </p>
              <input
                type="range"
                min={1}
                max={10}
                value={mood}
                onChange={(e) => setMood(Number(e.target.value))}
                className="w-full accent-current"
                style={{
                  accentColor: moodColor(mood),
                  background: `linear-gradient(to right, hsl(220,70%,55%), hsl(30,70%,55%))`,
                }}
              />
              <p className="text-[10px] text-ink-muted">{moodLabel(mood)}</p>
              <input
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="algo rápido (opcional)"
                className="input-field !px-2.5 !py-1.5 text-[11px]"
              />
              <button
                type="button"
                onClick={handleSave}
                disabled={isSaving}
                className="btn-primary self-start !px-3 !py-1.5 !text-[10px]"
              >
                {isSaving ? "salvando…" : "salvar"}
              </button>
            </div>
          )}
        </div>

        <div className="card">
          <p className="mb-1 text-[10px] text-ink-muted">{otherUserName}</p>
          {other ? (
            <>
              <p className="text-2xl">{moodEmoji(other.mood)}</p>
              <p className="text-[10px] text-ink-muted">{moodLabel(other.mood)}</p>
              {other.note && (
                <p className="mt-1 text-[10px] text-ink-muted">{other.note}</p>
              )}
            </>
          ) : (
            <p className="text-[10px] text-ink-muted">
              ainda não registrou hoje
            </p>
          )}
        </div>
      </div>

      <div className="card mt-3 flex items-end justify-between gap-1">
        {days.map((day) => {
          const entries = historyByDay.get(day) ?? [];
          const mineEntry = entries.find((e) => e.from_user === currentUserId);
          const otherEntry = entries.find((e) => e.from_user !== currentUserId);
          const weekday = WEEKDAYS[new Date(`${day}T00:00:00Z`).getUTCDay()];

          return (
            <div key={day} className="flex flex-1 flex-col items-center gap-1">
              <div className="flex h-12 items-end gap-0.5">
                <div
                  className="w-1.5 rounded-t"
                  style={{
                    height: mineEntry ? `${(mineEntry.mood / 10) * 100}%` : "4%",
                    background: mineEntry ? moodColor(mineEntry.mood) : "var(--hairline)",
                  }}
                />
                <div
                  className="w-1.5 rounded-t"
                  style={{
                    height: otherEntry ? `${(otherEntry.mood / 10) * 100}%` : "4%",
                    background: otherEntry ? moodColor(otherEntry.mood) : "var(--hairline)",
                  }}
                />
              </div>
              <span className="text-[8px] text-ink-muted">{weekday}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
