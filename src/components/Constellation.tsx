"use client";

import { useEffect, useState } from "react";

const STAR_COUNT = 50;
const MOON_SIZE = 132;

// Posições e atrasos pseudo-aleatórios, mas fixos (sem Math.random no render
// pra não gerar mismatch de hidratação entre server e client).
function seededStars(count: number) {
  const stars = [];
  let seed = 1337;
  const next = () => {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
  };
  for (let i = 0; i < count; i++) {
    stars.push({
      top: next() * 55,
      left: next() * 100,
      size: 1 + next() * 1.6,
      delay: next() * 6,
      duration: 3 + next() * 4,
    });
  }
  return stars;
}

const stars = seededStars(STAR_COUNT);

function getMoonPhase(date: Date): number {
  const synodic = 29.530588853;
  const knownNewMoon = Date.UTC(2000, 0, 6, 18, 14);
  const diffDays = (date.getTime() - knownNewMoon) / 86400000;
  let phase = (diffDays % synodic) / synodic;
  if (phase < 0) phase += 1;
  return phase;
}

type MoonState = { offset: number; name: string; illum: number };

const PHASE_NAMES: [number, string][] = [
  [0.02, "Lua Nova"],
  [0.24, "Lua Crescente"],
  [0.26, "Quarto Crescente"],
  [0.49, "Lua Gibosa Crescente"],
  [0.51, "Lua Cheia"],
  [0.74, "Lua Gibosa Minguante"],
  [0.76, "Quarto Minguante"],
  [1, "Lua Minguante"],
];

function phaseName(phase: number): string {
  if (phase > 0.98) return "Lua Nova";
  for (const [limit, name] of PHASE_NAMES) {
    if (phase < limit) return name;
  }
  return "Lua Minguante";
}

export function Constellation() {
  const [moon, setMoon] = useState<MoonState | null>(null);

  useEffect(() => {
    const phase = getMoonPhase(new Date());
    const illum = Math.round(((1 - Math.cos(phase * 2 * Math.PI)) / 2) * 100);
    const R = MOON_SIZE / 2;
    const litFraction = illum / 100;
    const waxing = phase < 0.5;
    const magnitude = 2 * R * litFraction;
    setMoon({
      offset: waxing ? -magnitude : magnitude,
      name: phaseName(phase),
      illum,
    });
  }, []);

  return (
    <div className="pointer-events-none fixed inset-0 overflow-hidden bg-[radial-gradient(ellipse_at_top,_var(--sky-b),_var(--sky-a)_70%)]">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_0%,_transparent_0%,_var(--canvas)_85%)] opacity-70" />

      {stars.map((star, i) => (
        <span
          key={i}
          className="absolute animate-pulse rounded-full bg-star"
          style={{
            top: `${star.top}%`,
            left: `${star.left}%`,
            width: `${star.size}px`,
            height: `${star.size}px`,
            opacity: 0.7,
            animationDelay: `${star.delay}s`,
            animationDuration: `${star.duration}s`,
            boxShadow: star.size > 2 ? `0 0 ${star.size * 3}px var(--star)` : undefined,
          }}
        />
      ))}

      <div
        className="absolute left-1/2 top-[10%] -translate-x-1/2"
        style={{ width: MOON_SIZE, height: MOON_SIZE }}
      >
        <div
          className="absolute rounded-full opacity-25 blur-2xl"
          style={{ inset: -36, background: "radial-gradient(circle, var(--moon-b), transparent 70%)" }}
        />
        <div
          className="absolute overflow-hidden rounded-full"
          style={{ inset: 0, boxShadow: "0 0 60px -10px var(--glow-color)" }}
        >
          <div className="absolute inset-0 rounded-full bg-moon-body ring-1 ring-inset ring-hairline-strong" />
          <div
            className="absolute inset-0 rounded-full opacity-90"
            style={{ background: "linear-gradient(135deg, var(--moon-a), var(--moon-b))" }}
          />
          <div
            className="absolute h-full w-full rounded-full bg-canvas transition-[left] duration-700 ease-out"
            style={{ left: moon ? moon.offset : 0, top: 0 }}
          />
          <div className="absolute h-3 w-3 rounded-full bg-crater" style={{ top: "28%", left: "42%" }} />
          <div className="absolute h-2 w-2 rounded-full bg-crater" style={{ top: "52%", left: "30%" }} />
          <div className="absolute h-2.5 w-2.5 rounded-full bg-crater" style={{ top: "68%", left: "48%" }} />
        </div>
      </div>
    </div>
  );
}
