"use client";

import { useEffect, useRef, useState } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import { WORDSEARCH_THEMES, type Difficulty } from "@/lib/wordsearch";
import {
  startGame,
  foundWord,
  acceptInvite,
  leaveGame,
  getGame,
  type WordSearchGame,
} from "./actions";
import { useDeviceMode } from "../GameShell";
import { GameRules } from "../GameRules";
import { InviteGate } from "../InviteGate";
import { LeaveButton } from "../LeaveButton";

const CHANNEL = "orbita-cacapalavras";
const THEMES = Object.keys(WORDSEARCH_THEMES);
const RULES = [
  "Escolham modo, tema e dificuldade antes de começar.",
  "Pra marcar uma palavra, toque na primeira letra e depois na última — precisa formar uma reta (horizontal, vertical ou diagonal, conforme a dificuldade).",
  "Cooperativo: os dois veem a mesma grade, quem achar marca pra ambos.",
  "Corrida: cada um joga na própria cópia; no final comparam quem encontrou tudo primeiro.",
];

export function CacaPalavrasView({ otherUserName }: { otherUserName: string }) {
  const deviceMode = useDeviceMode();
  const isDesktop = deviceMode === "desktop";
  const [game, setGame] = useState<WordSearchGame | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [mode, setMode] = useState<"coop" | "race">("coop");
  const [theme, setTheme] = useState(THEMES[0]);
  const [difficulty, setDifficulty] = useState<Difficulty>("easy");
  const [busy, setBusy] = useState(false);
  const [isAccepting, setIsAccepting] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);
  const [selStart, setSelStart] = useState<number | null>(null);
  const [selCells, setSelCells] = useState<number[]>([]);
  const channelRef = useRef<RealtimeChannel | null>(null);

  async function refresh() {
    const g = await getGame();
    setGame(g);
    return g;
  }

  useEffect(() => {
    refresh().then(() => setLoaded(true));

    const supabase = createClient();
    const channel = supabase
      .channel(CHANNEL)
      .on("broadcast", { event: "update" }, () => refresh())
      .subscribe();
    channelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  function notifyOther() {
    channelRef.current?.send({ type: "broadcast", event: "update", payload: {} });
  }

  async function handleStart(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const result = await startGame(mode, theme, difficulty);
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

  async function handleAccept() {
    setIsAccepting(true);
    try {
      const result = await acceptInvite();
      if (!result.ok) {
        alert(result.error);
        return;
      }
      await refresh();
      notifyOther();
    } finally {
      setIsAccepting(false);
    }
  }

  async function handleLeave() {
    setIsLeaving(true);
    try {
      const result = await leaveGame();
      if (!result.ok) {
        alert(result.error);
        return;
      }
      setGame(null);
      notifyOther();
    } finally {
      setIsLeaving(false);
    }
  }

  function cellCoords(index: number, size: number) {
    return { x: index % size, y: Math.floor(index / size) };
  }

  function lineBetween(a: number, b: number, size: number): number[] | null {
    const pa = cellCoords(a, size);
    const pb = cellCoords(b, size);
    const dx = pb.x - pa.x;
    const dy = pb.y - pa.y;
    if (dx === 0 && dy === 0) return [a];
    if (dx !== 0 && dy !== 0 && Math.abs(dx) !== Math.abs(dy)) return null;

    const steps = Math.max(Math.abs(dx), Math.abs(dy));
    const stepX = Math.sign(dx);
    const stepY = Math.sign(dy);
    const cells: number[] = [];
    for (let i = 0; i <= steps; i++) {
      const x = pa.x + stepX * i;
      const y = pa.y + stepY * i;
      cells.push(y * size + x);
    }
    return cells;
  }

  async function handleCellClick(index: number) {
    if (!game) return;

    if (selStart === null) {
      setSelStart(index);
      setSelCells([index]);
      return;
    }

    const line = lineBetween(selStart, index, game.gridSize);
    setSelStart(null);

    if (!line) {
      setSelCells([]);
      return;
    }
    setSelCells(line);

    const letters = line
      .map((i) => game.gridRows[cellCoords(i, game.gridSize).y][cellCoords(i, game.gridSize).x])
      .join("");
    const reversed = letters.split("").reverse().join("");

    const remaining = game.words.filter((w) => !game.myFound.includes(w));
    const match = remaining.find((w) => w === letters || w === reversed);

    setTimeout(() => setSelCells([]), 400);
    if (!match) return;

    const result = await foundWord(match);
    if (!result.ok) {
      alert(result.error);
      return;
    }
    setGame(result.data);
    notifyOther();
  }

  if (!loaded) return null;

  const showStart = !game || game.status === "finished";
  const showInviteGate = !!game && game.status === "playing" && !game.accepted;
  const showBoard = !!game && game.status === "playing" && game.accepted;

  return (
    <div className="flex w-full flex-col items-center gap-4">
      {game && game.status === "finished" && (
        <div className="rounded-2xl border border-hairline bg-surface p-4 text-center">
          <p className="font-display text-lg text-ink">🎉 acharam tudo!</p>
          {game.mode === "race" && (
            <p className="mt-1 text-xs text-ink-muted">
              {game.myFinished
                ? "você terminou"
                : `${otherUserName} terminou`}{" "}
              — comparem quem foi mais rápido!
            </p>
          )}
        </div>
      )}

      {showStart && <GameRules items={RULES} />}

      {showInviteGate && (
        <>
          <InviteGate
            isCreator={game.isCreator}
            otherUserName={otherUserName}
            rules={RULES}
            onAccept={handleAccept}
            busy={isAccepting}
          />
          <LeaveButton onLeave={handleLeave} busy={isLeaving} />
        </>
      )}

      {showStart && (
        <form
          onSubmit={handleStart}
          className={`flex w-full flex-col gap-3 ${isDesktop ? "max-w-sm" : "max-w-xs"}`}
        >
          <p className="text-[10px] uppercase tracking-wide text-ink-muted">
            caça-palavras
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setMode("coop")}
              className={`flex-1 rounded-full px-3 py-1.5 text-xs ${
                mode === "coop" ? "bg-moon text-btn-ink" : "border border-hairline text-ink"
              }`}
            >
              cooperativo
            </button>
            <button
              type="button"
              onClick={() => setMode("race")}
              className={`flex-1 rounded-full px-3 py-1.5 text-xs ${
                mode === "race" ? "bg-moon text-btn-ink" : "border border-hairline text-ink"
              }`}
            >
              corrida
            </button>
          </div>
          <p className="text-[10px] text-ink-muted">
            {mode === "coop"
              ? "os dois veem a mesma grade — quem achar marca pros dois."
              : "cada um joga sua própria cópia; no final comparam o tempo."}
          </p>

          <label className="flex flex-col gap-1 text-xs text-ink-muted">
            tema
            <select
              value={theme}
              onChange={(e) => setTheme(e.target.value)}
              className="rounded-xl border border-hairline bg-surface px-3 py-2 text-sm text-ink outline-none"
            >
              {THEMES.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1 text-xs text-ink-muted">
            dificuldade
            <select
              value={difficulty}
              onChange={(e) => setDifficulty(e.target.value as Difficulty)}
              className="rounded-xl border border-hairline bg-surface px-3 py-2 text-sm text-ink outline-none"
            >
              <option value="easy">fácil (9x9, 6 palavras)</option>
              <option value="medium">médio (11x11, 8 palavras, diagonais)</option>
              <option value="hard">difícil (13x13, 10 palavras, todas direções)</option>
            </select>
          </label>

          <button
            type="submit"
            disabled={busy}
            className="self-start rounded-full bg-moon px-4 py-2 text-xs text-btn-ink disabled:opacity-50"
          >
            {busy ? "criando…" : "começar"}
          </button>
        </form>
      )}

      {showBoard && (
        <div className="flex flex-col items-center gap-3">
          <LeaveButton onLeave={handleLeave} busy={isLeaving} />
          <p className={isDesktop ? "text-sm text-ink-muted" : "text-xs text-ink-muted"}>
            {game.mode === "coop"
              ? `${game.myFound.length} / ${game.words.length} encontradas`
              : `você: ${game.myFound.length} / ${game.words.length} — ${otherUserName}: ${game.otherFoundCount} / ${game.words.length}`}
            {game.mode === "race" && game.myFinished && !game.otherFinished && (
              <span className="block text-ink">
                terminou! aguardando {otherUserName}…
              </span>
            )}
          </p>

          <div
            className="grid gap-0.5"
            style={{ gridTemplateColumns: `repeat(${game.gridSize}, minmax(0, 1fr))` }}
          >
            {game.gridRows.flatMap((row, y) =>
              row.split("").map((letter, x) => {
                const index = y * game.gridSize + x;
                const selected = selCells.includes(index);
                return (
                  <button
                    key={index}
                    type="button"
                    onClick={() => handleCellClick(index)}
                    disabled={game.myFinished}
                    className={`flex items-center justify-center rounded font-mono ${
                      isDesktop
                        ? "h-10 w-10 text-sm"
                        : "h-6 w-6 text-[9px] sm:h-7 sm:w-7 sm:text-[10px]"
                    } ${
                      selected
                        ? "bg-moon text-btn-ink"
                        : "border border-hairline bg-surface text-ink"
                    }`}
                  >
                    {letter}
                  </button>
                );
              })
            )}
          </div>

          <div className="flex flex-wrap justify-center gap-1.5">
            {game.words.map((w) => (
              <span
                key={w}
                className={`rounded-full px-2 py-0.5 text-[10px] ${
                  game.myFound.includes(w)
                    ? "bg-hairline text-ink-muted line-through"
                    : "border border-hairline text-ink"
                }`}
              >
                {w}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
