"use client";

import { useEffect, useRef, useState } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import {
  startRound,
  submitResponse,
  judgeRound,
  getActive,
  getScore,
  type DuoGame,
  type DuoCategory,
} from "./actions";

const CATEGORY_CONFIG: Record<
  DuoCategory,
  {
    channel: string;
    title: string;
    promptPlaceholder: string;
    needsCreatorAnswer: boolean;
    needsJudgment: boolean;
    responseLabel: string;
    answerPlaceholder: string;
  }
> = {
  trivia: {
    channel: "orbita-duo-trivia",
    title: "quanto você me conhece",
    promptPlaceholder: "ex: qual é minha cor favorita?",
    needsCreatorAnswer: true,
    needsJudgment: true,
    responseLabel: "seu palpite",
    answerPlaceholder: "sua resposta verdadeira (fica escondida até ela responder)",
  },
  emoji: {
    channel: "orbita-duo-emoji",
    title: "charadas de emoji",
    promptPlaceholder: "ex: 🚢🧊💔",
    needsCreatorAnswer: false,
    needsJudgment: true,
    responseLabel: "seu palpite",
    answerPlaceholder: "",
  },
  dare: {
    channel: "orbita-duo-dare",
    title: "verdade ou desafio",
    promptPlaceholder: "escreva a pergunta ou o desafio",
    needsCreatorAnswer: false,
    needsJudgment: false,
    responseLabel: "sua resposta",
    answerPlaceholder: "",
  },
};

export function DuoGameView({
  category,
  otherUserName,
  suggestions,
}: {
  category: DuoCategory;
  otherUserName: string;
  suggestions?: string[];
}) {
  const config = CATEGORY_CONFIG[category];
  const [game, setGame] = useState<DuoGame | null>(null);
  const [score, setScore] = useState({ mine: 0, other: 0 });
  const [loaded, setLoaded] = useState(false);
  const [promptDraft, setPromptDraft] = useState("");
  const [answerDraft, setAnswerDraft] = useState("");
  const [responseDraft, setResponseDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const channelRef = useRef<RealtimeChannel | null>(null);

  async function refresh() {
    const [g, s] = await Promise.all([getActive(category), getScore(category)]);
    setGame(g);
    setScore(s);
  }

  useEffect(() => {
    refresh().then(() => setLoaded(true));

    const supabase = createClient();
    const channel = supabase
      .channel(config.channel)
      .on("broadcast", { event: "update" }, () => {
        refresh();
      })
      .subscribe();
    channelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category]);

  function notifyOther() {
    channelRef.current?.send({ type: "broadcast", event: "update", payload: {} });
  }

  async function handleStart(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const result = await startRound(category, promptDraft, answerDraft);
      if (!result.ok) {
        alert(result.error);
        return;
      }
      setPromptDraft("");
      setAnswerDraft("");
      await refresh();
      notifyOther();
    } finally {
      setBusy(false);
    }
  }

  async function handleRespond(e: React.FormEvent) {
    e.preventDefault();
    if (!game) return;
    setBusy(true);
    try {
      const result = await submitResponse(game.id, responseDraft);
      if (!result.ok) {
        alert(result.error);
        return;
      }
      setResponseDraft("");
      await refresh();
      notifyOther();
    } finally {
      setBusy(false);
    }
  }

  async function handleJudge(correct: boolean) {
    if (!game) return;
    setBusy(true);
    try {
      const result = await judgeRound(game.id, correct);
      if (!result.ok) {
        alert(result.error);
        return;
      }
      await refresh();
      notifyOther();
    } finally {
      setBusy(false);
    }
  }

  if (!loaded) return null;

  const showStart = !game || game.status === "done";

  return (
    <div className="flex w-full flex-col gap-4">
      <p className="text-[10px] uppercase tracking-wide text-ink-muted">
        {config.title}
      </p>

      {config.needsJudgment && (
        <p className="text-[10px] text-ink-muted">
          placar: você {score.mine} × {score.other} {otherUserName}
        </p>
      )}

      {game && game.status === "done" && (
        <div className="rounded-2xl border border-hairline bg-surface p-4">
          <p className="text-sm text-ink">{game.prompt}</p>
          {config.needsCreatorAnswer && (
            <p className="mt-1 text-xs text-ink-muted">
              resposta certa: <span className="text-ink">{game.creatorAnswer}</span>
            </p>
          )}
          <p className="mt-1 text-xs text-ink-muted">
            {config.responseLabel}: <span className="text-ink">{game.response}</span>
          </p>
          {config.needsJudgment && (
            <p className="mt-1 text-xs text-ink-muted">
              {game.judgedCorrect ? "✅ acertou" : "❌ errou"}
            </p>
          )}
        </div>
      )}

      {showStart && (
        <form onSubmit={handleStart} className="flex flex-col gap-2">
          {suggestions && suggestions.length > 0 && (
            <button
              type="button"
              onClick={() =>
                setPromptDraft(
                  suggestions[Math.floor(Math.random() * suggestions.length)]
                )
              }
              className="self-start text-[10px] text-ink-muted underline underline-offset-2"
            >
              🎲 sortear
            </button>
          )}
          <input
            value={promptDraft}
            onChange={(e) => setPromptDraft(e.target.value)}
            placeholder={config.promptPlaceholder}
            className="rounded-xl border border-hairline bg-surface px-3 py-2 text-sm text-ink placeholder-ink-muted outline-none focus:border-ink-muted"
          />
          {config.needsCreatorAnswer && (
            <input
              value={answerDraft}
              onChange={(e) => setAnswerDraft(e.target.value)}
              placeholder={config.answerPlaceholder}
              className="rounded-xl border border-hairline bg-surface px-3 py-2 text-sm text-ink placeholder-ink-muted outline-none focus:border-ink-muted"
            />
          )}
          <button
            type="submit"
            disabled={busy || !promptDraft.trim()}
            className="self-start rounded-full bg-moon px-4 py-2 text-xs text-btn-ink disabled:opacity-50"
          >
            {busy ? "enviando…" : `mandar pra ${otherUserName}`}
          </button>
        </form>
      )}

      {game &&
        game.status === "awaiting_response" &&
        (game.isCreator ? (
          <div className="rounded-2xl border border-hairline bg-surface p-4">
            <p className="text-sm text-ink">{game.prompt}</p>
            <p className="mt-2 text-xs text-ink-muted">
              aguardando {otherUserName} responder…
            </p>
          </div>
        ) : (
          <form
            onSubmit={handleRespond}
            className="flex flex-col gap-2 rounded-2xl border border-hairline bg-surface p-4"
          >
            <p className="text-sm text-ink">{game.prompt}</p>
            <input
              value={responseDraft}
              onChange={(e) => setResponseDraft(e.target.value)}
              placeholder={config.responseLabel}
              className="rounded-xl border border-hairline bg-canvas px-3 py-2 text-sm text-ink placeholder-ink-muted outline-none focus:border-ink-muted"
            />
            <button
              type="submit"
              disabled={busy || !responseDraft.trim()}
              className="self-start rounded-full bg-moon px-4 py-2 text-xs text-btn-ink disabled:opacity-50"
            >
              {busy ? "enviando…" : "responder"}
            </button>
          </form>
        ))}

      {game && game.status === "awaiting_judgment" && (
        <div className="rounded-2xl border border-hairline bg-surface p-4">
          <p className="text-sm text-ink">{game.prompt}</p>
          {game.isCreator ? (
            <>
              <p className="mt-1 text-xs text-ink-muted">
                resposta certa: <span className="text-ink">{game.creatorAnswer}</span>
              </p>
              <p className="text-xs text-ink-muted">
                {otherUserName} respondeu:{" "}
                <span className="text-ink">{game.response}</span>
              </p>
              <div className="mt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => handleJudge(true)}
                  disabled={busy}
                  className="rounded-full bg-moon px-3 py-1 text-xs text-btn-ink"
                >
                  acertou
                </button>
                <button
                  type="button"
                  onClick={() => handleJudge(false)}
                  disabled={busy}
                  className="rounded-full border border-hairline px-3 py-1 text-xs text-ink"
                >
                  errou
                </button>
              </div>
            </>
          ) : (
            <p className="mt-2 text-xs text-ink-muted">
              aguardando {otherUserName} avaliar sua resposta…
            </p>
          )}
        </div>
      )}
    </div>
  );
}
