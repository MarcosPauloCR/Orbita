"use client";

import { useEffect, useRef, useState } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import { startGame, flipCard, getGame, type MemoryGame } from "./actions";

const CHANNEL = "orbita-memoria";

export function MemoriaView({ otherUserName }: { otherUserName: string }) {
  const [game, setGame] = useState<MemoryGame | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);
  const channelRef = useRef<RealtimeChannel | null>(null);

  useEffect(() => {
    getGame().then((g) => {
      setGame(g);
      setLoaded(true);
    });

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

  async function handleStart() {
    setBusy(true);
    try {
      const result = await startGame();
      if (!result.ok) {
        alert(result.error);
        return;
      }
      setGame(await getGame());
      notifyOther();
    } finally {
      setBusy(false);
    }
  }

  async function handleFlip(index: number) {
    setBusy(true);
    try {
      const result = await flipCard(index);
      if (!result.ok) {
        alert(result.error);
        return;
      }
      setGame(result.data);
      notifyOther();
    } finally {
      setBusy(false);
    }
  }

  if (!loaded) return null;

  if (!game || game.status === "finished") {
    return (
      <div className="flex w-full flex-col items-center gap-4">
        {game && (
          <p className="font-display text-lg text-ink">
            {game.scoreMine === game.scoreOther
              ? "empate!"
              : game.scoreMine > game.scoreOther
              ? "você ganhou! 🎉"
              : `${otherUserName} ganhou`}
          </p>
        )}
        {game && (
          <p className="text-xs text-ink-muted">
            você {game.scoreMine} × {game.scoreOther} {otherUserName}
          </p>
        )}
        <button
          type="button"
          onClick={handleStart}
          disabled={busy}
          className="rounded-full bg-moon px-4 py-2 text-xs text-btn-ink disabled:opacity-50"
        >
          {busy ? "criando…" : "começar jogo da memória"}
        </button>
      </div>
    );
  }

  return (
    <div className="flex w-full flex-col items-center gap-4">
      <div className="flex items-center gap-4 text-xs text-ink-muted">
        <span>você {game.scoreMine} × {game.scoreOther} {otherUserName}</span>
      </div>
      <p className="text-xs text-ink-muted">
        {game.myTurn ? "sua vez" : `vez de ${otherUserName}`}
      </p>
      <div className="grid grid-cols-4 gap-1.5">
        {game.cards.map((card, i) => (
          <button
            key={i}
            type="button"
            onClick={() => handleFlip(i)}
            disabled={card.matched || !game.myTurn || busy}
            className={`flex h-12 w-12 items-center justify-center rounded-lg border text-xl ${
              card.matched
                ? "border-hairline bg-hairline opacity-50"
                : "border-hairline bg-surface"
            }`}
          >
            {card.symbol ?? ""}
          </button>
        ))}
      </div>
    </div>
  );
}
