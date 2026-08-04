"use client";

import { useEffect, useRef, useState } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import { createGame, guessLetter, getGame, type HangmanGame } from "./actions";

const MOON_STAGES = ["🌑", "🌒", "🌓", "🌔", "🌕", "🌖", "🌗"];
const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
const CHANNEL = "orbita-hangman";

export function JogoView({
  otherUserName,
  initialGame,
}: {
  otherUserName: string;
  initialGame: HangmanGame | null;
}) {
  const [game, setGame] = useState<HangmanGame | null>(initialGame);
  const [wordDraft, setWordDraft] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [isGuessing, setIsGuessing] = useState<string | null>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(CHANNEL)
      .on("broadcast", { event: "update" }, () => {
        getGame().then(setGame);
      })
      .subscribe();
    channelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  function notifyOther() {
    channelRef.current?.send({ type: "broadcast", event: "update", payload: {} });
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!wordDraft.trim()) return;

    setIsCreating(true);
    try {
      const result = await createGame(wordDraft);
      if (!result.ok) {
        alert(result.error);
        return;
      }
      setWordDraft("");
      setGame(await getGame());
      notifyOther();
    } finally {
      setIsCreating(false);
    }
  }

  async function handleGuess(letter: string) {
    setIsGuessing(letter);
    try {
      const result = await guessLetter(letter);
      if (!result.ok) {
        alert(result.error);
        return;
      }
      setGame(result.data);
      notifyOther();
    } finally {
      setIsGuessing(null);
    }
  }

  const showCreateForm = !game || game.status !== "playing";

  return (
    <div className="flex w-full min-h-0 flex-1 flex-col gap-6 overflow-y-auto pb-4">
      {game && game.status !== "playing" && (
        <div className="rounded-2xl border border-hairline bg-surface p-4 text-center">
          <p className="font-display text-lg text-ink">
            {game.status === "won" ? "🎉 acertou!" : "😢 não dessa vez"}
          </p>
          <p className="mt-1 text-sm text-ink-muted">
            a palavra era <span className="text-ink">{game.word}</span>
          </p>
        </div>
      )}

      {showCreateForm && (
        <form onSubmit={handleCreate} className="flex flex-col gap-2">
          <p className="text-[10px] uppercase tracking-wide text-ink-muted">
            jogo da forca — pense numa palavra
          </p>
          <input
            value={wordDraft}
            onChange={(e) => setWordDraft(e.target.value)}
            placeholder="sua palavra secreta (sem acentos, se puder)"
            className="rounded-xl border border-hairline bg-surface px-3 py-2 text-sm text-ink placeholder-ink-muted outline-none focus:border-ink-muted"
          />
          <button
            type="submit"
            disabled={isCreating || !wordDraft.trim()}
            className="self-start rounded-full bg-moon px-4 py-2 text-xs text-btn-ink disabled:opacity-50"
          >
            {isCreating ? "criando…" : "começar jogo"}
          </button>
          <p className="text-[10px] text-ink-muted">
            {otherUserName} vai tentar adivinhar — você só acompanha.
          </p>
        </form>
      )}

      {game && game.status === "playing" && (
        <div className="flex flex-col items-center gap-4">
          <p className="text-4xl">
            {MOON_STAGES[Math.min(game.wrongGuesses, MOON_STAGES.length - 1)]}
          </p>
          <p className="text-[10px] text-ink-muted">
            {game.wrongGuesses} / {game.maxWrongGuesses} erros
          </p>

          <p className="break-all text-center font-mono text-2xl tracking-widest text-ink">
            {game.maskedWord}
          </p>

          {game.isCreator ? (
            <p className="text-xs text-ink-muted">
              aguardando {otherUserName} tentar adivinhar…
            </p>
          ) : (
            <div className="grid grid-cols-7 gap-1">
              {ALPHABET.map((letter) => {
                const tried = game.guessedLetters.includes(letter);
                return (
                  <button
                    key={letter}
                    type="button"
                    onClick={() => handleGuess(letter)}
                    disabled={tried || isGuessing !== null}
                    className={`rounded-lg py-1.5 text-xs ${
                      tried
                        ? "bg-hairline text-ink-muted"
                        : "border border-hairline text-ink"
                    } disabled:opacity-50`}
                  >
                    {letter}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
