"use client";

import { useEffect, useRef, useState } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import { startGame, makeMove, getGame, type TicTacToeGame } from "./actions";
import { useDeviceMode } from "../GameShell";

const CHANNEL = "orbita-velha";

function statusLabel(game: TicTacToeGame, otherUserName: string): string {
  if (game.status === "draw") return "empate!";
  if (game.status === "won_x" || game.status === "won_o") {
    const winnerSymbol = game.status === "won_x" ? "X" : "O";
    return winnerSymbol === game.mySymbol
      ? "você ganhou! 🎉"
      : `${otherUserName} ganhou`;
  }
  return game.turn === game.mySymbol ? "sua vez" : `vez de ${otherUserName}`;
}

export function VelhaView({ otherUserName }: { otherUserName: string }) {
  const isDesktop = useDeviceMode() === "desktop";
  const [game, setGame] = useState<TicTacToeGame | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [isMoving, setIsMoving] = useState<number | null>(null);
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
    setIsStarting(true);
    try {
      const result = await startGame();
      if (!result.ok) {
        alert(result.error);
        return;
      }
      setGame(await getGame());
      notifyOther();
    } finally {
      setIsStarting(false);
    }
  }

  async function handleMove(index: number) {
    setIsMoving(index);
    try {
      const result = await makeMove(index);
      if (!result.ok) {
        alert(result.error);
        return;
      }
      setGame(result.data);
      notifyOther();
    } finally {
      setIsMoving(null);
    }
  }

  if (!loaded) return null;

  const showStart = !game || game.status !== "playing";

  return (
    <div className="flex w-full flex-col items-center gap-4">
      {game && game.status !== "playing" && (
        <p className="font-display text-lg text-ink">
          {statusLabel(game, otherUserName)}
        </p>
      )}

      {showStart && (
        <button
          type="button"
          onClick={handleStart}
          disabled={isStarting}
          className="rounded-full bg-moon px-4 py-2 text-xs text-btn-ink disabled:opacity-50"
        >
          {isStarting ? "criando…" : "começar jogo da velha"}
        </button>
      )}

      {game && game.status === "playing" && (
        <>
          <p className="text-xs text-ink-muted">{statusLabel(game, otherUserName)}</p>
          <div className="grid grid-cols-3 gap-2">
            {game.board.map((cell, i) => (
              <button
                key={i}
                type="button"
                onClick={() => handleMove(i)}
                disabled={
                  cell !== "-" || game.turn !== game.mySymbol || isMoving !== null
                }
                className={`flex items-center justify-center rounded-xl border border-hairline bg-surface font-display text-ink disabled:opacity-80 ${
                  isDesktop ? "h-24 w-24 text-4xl" : "h-16 w-16 text-2xl"
                }`}
              >
                {cell !== "-" ? cell : ""}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
