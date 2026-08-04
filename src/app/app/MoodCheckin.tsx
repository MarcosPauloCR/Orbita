"use client";

import { useState } from "react";
import { submitCheckin, type TodayCheckin } from "./actions";

const MOODS: { value: number; icon: string; label: string }[] = [
  { value: 1, icon: "😞", label: "mal" },
  { value: 2, icon: "😕", label: "meh" },
  { value: 3, icon: "😐", label: "normal" },
  { value: 4, icon: "🙂", label: "bem" },
  { value: 5, icon: "😄", label: "ótimo" },
];

function iconFor(mood: number): string {
  return MOODS.find((m) => m.value === mood)?.icon ?? "😐";
}

export function MoodCheckin({
  otherUserName,
  initialMine,
  initialOther,
}: {
  otherUserName: string;
  initialMine: TodayCheckin | null;
  initialOther: TodayCheckin | null;
}) {
  const [mine, setMine] = useState<TodayCheckin | null>(initialMine);
  const [other] = useState<TodayCheckin | null>(initialOther);
  const [mood, setMood] = useState(mine?.mood ?? 0);
  const [note, setNote] = useState(mine?.note ?? "");
  const [isSaving, setIsSaving] = useState(false);
  const [editing, setEditing] = useState(!mine);

  async function handleSave() {
    if (!mood) return;
    setIsSaving(true);
    try {
      const result = await submitCheckin(mood, note);
      if (!result.ok) {
        alert(result.error);
        return;
      }
      setMine({ from_user: "", mood, note: note.trim() || null });
      setEditing(false);
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="w-full">
      <p className="mb-2 text-[10px] uppercase tracking-wide text-ink-muted">
        humor de hoje
      </p>

      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-2xl border border-hairline bg-surface p-3">
          <p className="mb-1 text-[10px] text-ink-muted">você</p>
          {mine && !editing ? (
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="text-left"
            >
              <p className="text-2xl">{iconFor(mine.mood)}</p>
              {mine.note && (
                <p className="mt-1 text-[10px] text-ink-muted">{mine.note}</p>
              )}
            </button>
          ) : (
            <div className="flex flex-col gap-2">
              <div className="flex gap-1">
                {MOODS.map((m) => (
                  <button
                    key={m.value}
                    type="button"
                    onClick={() => setMood(m.value)}
                    className={`rounded-lg px-1.5 py-1 text-lg ${
                      mood === m.value ? "bg-moon" : ""
                    }`}
                    aria-label={m.label}
                  >
                    {m.icon}
                  </button>
                ))}
              </div>
              <input
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="algo rápido (opcional)"
                className="rounded-lg border border-hairline bg-canvas px-2 py-1 text-[11px] text-ink placeholder-ink-muted outline-none"
              />
              <button
                type="button"
                onClick={handleSave}
                disabled={!mood || isSaving}
                className="self-start rounded-full bg-moon px-3 py-1 text-[10px] text-btn-ink disabled:opacity-50"
              >
                {isSaving ? "salvando…" : "salvar"}
              </button>
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-hairline bg-surface p-3">
          <p className="mb-1 text-[10px] text-ink-muted">{otherUserName}</p>
          {other ? (
            <>
              <p className="text-2xl">{iconFor(other.mood)}</p>
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
    </div>
  );
}
