"use client";

import { useEffect, useRef, useState } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import {
  startGame,
  placeShips,
  fireShot,
  getGame,
  type BattleshipGame,
} from "./actions";
import { useDeviceMode } from "../GameShell";

const CHANNEL = "orbita-naval";
const SHIP_COUNT = 3;

export function NavalView({ otherUserName }: { otherUserName: string }) {
  const isDesktop = useDeviceMode() === "desktop";
  const cellSize = isDesktop ? "h-16 w-16 text-2xl" : "h-12 w-12 text-lg";
  const [game, setGame] = useState<BattleshipGame | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [selecting, setSelecting] = useState<number[]>([]);
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
      setSelecting([]);
      setGame(await getGame());
      notifyOther();
    } finally {
      setBusy(false);
    }
  }

  function toggleSelect(cell: number) {
    setSelecting((prev) => {
      if (prev.includes(cell)) return prev.filter((c) => c !== cell);
      if (prev.length >= SHIP_COUNT) return prev;
      return [...prev, cell];
    });
  }

  async function handleConfirmShips() {
    setBusy(true);
    try {
      const result = await placeShips(selecting);
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

  async function handleFire(cell: number) {
    setBusy(true);
    try {
      const result = await fireShot(cell);
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

  if (!game || game.status === "won_a" || game.status === "won_b") {
    return (
      <div className="flex w-full flex-col items-center gap-4">
        {game && (
          <p className="font-display text-lg text-ink">
            {(game.status === "won_a") === (game.mySide === "a")
              ? "você venceu! 🎉"
              : `${otherUserName} venceu`}
          </p>
        )}
        <button
          type="button"
          onClick={handleStart}
          disabled={busy}
          className="rounded-full bg-moon px-4 py-2 text-xs text-btn-ink disabled:opacity-50"
        >
          {busy ? "criando…" : "começar batalha naval"}
        </button>
      </div>
    );
  }

  if (game.status === "setup") {
    if (!game.myShipsPlaced) {
      return (
        <div className="flex w-full flex-col items-center gap-3">
          <p className="text-xs text-ink-muted">
            escolha {SHIP_COUNT} posições pros seus navios ({selecting.length}/{SHIP_COUNT})
          </p>
          <div className="grid grid-cols-4 gap-1.5">
            {Array.from({ length: 16 }, (_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => toggleSelect(i)}
                className={`${cellSize} rounded-lg border ${
                  selecting.includes(i)
                    ? "border-moon bg-moon"
                    : "border-hairline bg-surface"
                }`}
              />
            ))}
          </div>
          <button
            type="button"
            onClick={handleConfirmShips}
            disabled={selecting.length !== SHIP_COUNT || busy}
            className="rounded-full bg-moon px-4 py-2 text-xs text-btn-ink disabled:opacity-50"
          >
            {busy ? "confirmando…" : "confirmar navios"}
          </button>
        </div>
      );
    }
    return (
      <p className="text-xs text-ink-muted">
        aguardando {otherUserName} posicionar os navios…
      </p>
    );
  }

  return (
    <div className="flex w-full flex-col items-center gap-6">
      <p className="text-xs text-ink-muted">
        {game.turn === game.mySide ? "sua vez de atirar" : `vez de ${otherUserName}`}
      </p>

      <div className="flex flex-col items-center gap-1">
        <p className="text-[10px] uppercase tracking-wide text-ink-muted">
          água inimiga (clique pra atirar)
        </p>
        <div className="grid grid-cols-4 gap-1.5">
          {game.opponentBoard.map((cell, i) => (
            <button
              key={i}
              type="button"
              onClick={() => handleFire(i)}
              disabled={cell.fired || game.turn !== game.mySide || busy}
              className={`${cellSize} rounded-lg border ${
                cell.hit
                  ? "border-red-400 bg-red-400/20"
                  : cell.fired
                  ? "border-hairline bg-hairline"
                  : "border-hairline bg-surface"
              }`}
            >
              {cell.hit ? "🔥" : cell.fired ? "•" : ""}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col items-center gap-1">
        <p className="text-[10px] uppercase tracking-wide text-ink-muted">
          seu mar
        </p>
        <div className="grid grid-cols-4 gap-1.5">
          {game.myBoard.map((cell, i) => (
            <div
              key={i}
              className={`flex ${cellSize} items-center justify-center rounded-lg border ${
                cell.hit
                  ? "border-red-400 bg-red-400/20"
                  : cell.ship
                  ? "border-hairline bg-moon/30"
                  : "border-hairline bg-surface"
              }`}
            >
              {cell.hit ? "🔥" : cell.ship ? "🚢" : ""}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
