"use client";

import { useState } from "react";
import {
  submitDailyAnswer,
  type DailyAnswerState,
  type QuestionCategory,
} from "./actions";

export function DailyQuestion({
  title,
  category,
  otherUserName,
  initial,
}: {
  title: string;
  category: QuestionCategory;
  otherUserName: string;
  initial: DailyAnswerState;
}) {
  const [state, setState] = useState(initial);
  const [draft, setDraft] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = draft.trim();
    if (!trimmed) return;

    setIsSaving(true);
    try {
      const result = await submitDailyAnswer(trimmed, category);
      if (!result.ok) {
        alert(result.error);
        return;
      }
      setState((prev) => ({ ...prev, myAnswer: trimmed }));
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="w-full">
      <p className="section-label mb-2">{title}</p>
      <div className="card">
        <p className="text-sm text-ink">{state.question}</p>

        {state.myAnswer === null ? (
          <form onSubmit={handleSubmit} className="mt-3 flex flex-col gap-2">
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              rows={2}
              placeholder="sua resposta..."
              className="input-field resize-none !text-sm"
            />
            <button
              type="submit"
              disabled={isSaving || !draft.trim()}
              className="btn-primary self-start"
            >
              {isSaving ? "enviando…" : "responder"}
            </button>
          </form>
        ) : (
          <div className="mt-3 flex flex-col gap-2">
            <div>
              <p className="text-[10px] text-ink-muted">você respondeu</p>
              <p className="text-sm text-ink">{state.myAnswer}</p>
            </div>

            <div>
              <p className="text-[10px] text-ink-muted">{otherUserName}</p>
              {state.otherAnswer !== null ? (
                <p className="text-sm text-ink">{state.otherAnswer}</p>
              ) : state.otherAnswered ? (
                <p className="text-xs text-ink-muted">respondeu — carregando…</p>
              ) : (
                <p className="text-xs text-ink-muted">
                  ainda não respondeu — a resposta aparece pros dois só depois
                  que ambos responderem
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
