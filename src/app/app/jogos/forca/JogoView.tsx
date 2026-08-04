"use client";

import { useEffect, useRef, useState } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import { createGame, guessLetter, getGame, type HangmanGame } from "./actions";
import { useDeviceMode } from "../GameShell";
import { GameRules } from "../GameRules";

const MOON_STAGES = ["🌑", "🌒", "🌓", "🌔", "🌕", "🌖", "🌗"];
const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
const CHANNEL = "orbita-hangman";
const LETTER_RE = /[A-ZÀ-Ÿ_]/i;

function countLetters(maskedWord: string): number {
  return maskedWord.split("").filter((ch) => LETTER_RE.test(ch)).length;
}

export function JogoView({
  otherUserName,
  initialGame,
}: {
  otherUserName: string;
  initialGame: HangmanGame | null;
}) {
  const isDesktop = useDeviceMode() === "desktop";
  const [game, setGame] = useState<HangmanGame | null>(initialGame);
  const [wordDraft, setWordDraft] = useState("");
  const [themeDraft, setThemeDraft] = useState("");
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
      const result = await createGame(wordDraft, themeDraft);
      if (!result.ok) {
        alert(result.error);
        return;
      }
      setWordDraft("");
      setThemeDraft("");
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
          {game.theme && (
            <p className="text-[10px] text-ink-muted">tema: {game.theme}</p>
          )}
        </div>
      )}

      {showCreateForm && (
        <GameRules
          items={[
            "Quem cria pensa numa palavra secreta (e pode escolher um tema).",
            "O outro tenta adivinhar uma letra por vez.",
            "Cada letra errada custa uma chance — a lua vai enchendo a cada erro.",
            "Descobrir a palavra antes das chances acabarem = vitória.",
          ]}
        />
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
          <input
            value={themeDraft}
            onChange={(e) => setThemeDraft(e.target.value)}
            placeholder="tema (opcional) — ex: filmes, comida, países..."
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

          <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-[10px] text-ink-muted">
            <span>
              tema: <span className="text-ink">{game.theme ?? "livre"}</span>
            </span>
            <span>
              letras: <span className="text-ink">{countLetters(game.maskedWord)}</span>
            </span>
            <span>
              chances restantes:{" "}
              <span className="text-ink">
                {game.maxWrongGuesses - game.wrongGuesses}
              </span>
            </span>
          </div>

          <p
            className={`break-all text-center font-mono tracking-widest text-ink ${
              isDesktop ? "text-4xl" : "text-2xl"
            }`}
          >
            {game.maskedWord}
          </p>

          {game.isCreator ? (
            <p className="text-xs text-ink-muted">
              aguardando {otherUserName} tentar adivinhar…
            </p>
          ) : (
            <div className={`grid gap-1.5 ${isDesktop ? "grid-cols-9" : "grid-cols-7"}`}>
              {ALPHABET.map((letter) => {
                const tried = game.guessedLetters.includes(letter);
                return (
                  <button
                    key={letter}
                    type="button"
                    onClick={() => handleGuess(letter)}
                    disabled={tried || isGuessing !== null}
                    className={`rounded-lg ${isDesktop ? "py-3 text-base" : "py-1.5 text-xs"} ${
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
