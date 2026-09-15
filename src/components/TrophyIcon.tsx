"use client";

import { useId } from "react";

// Ícones dos marcos de streak (TROPHIES em lib/streaks.ts) — substituem os
// emojis simples por SVG na paleta dourada do app (--moon-a/--moon-b),
// coerente com a lua/botão "pensando em você" e o resto do visual premium.
// As duas últimas raridades (gema, arco-íris) quebram o dourado de
// propósito, como um "salto" visual pros marcos mais raros.
export type TrophyIconKind =
  | "spark"
  | "moon-new"
  | "moon-crescent-waxing"
  | "moon-quarter-waxing"
  | "moon-full"
  | "moon-gibbous-waning"
  | "moon-quarter-waning-orbit"
  | "moon-crescent-waning"
  | "saturn"
  | "meteor-shower"
  | "shooting-star"
  | "satellite"
  | "sparkle-cluster"
  | "nebula-heart"
  | "moon-full-halo"
  | "star-outline"
  | "star-filled"
  | "star-rays"
  | "telescope"
  | "globe"
  | "trophy-cup"
  | "crown"
  | "gem"
  | "rainbow"
  | "sleep"
  | "movie-reel"
  | "cooking-pot"
  | "compass"
  | "rocket"
  | "black-hole"
  | "spiral-galaxy"
  | "aurora"
  | "astronaut";

function GoldStops({ from, to }: { from?: string; to?: string }) {
  return (
    <>
      <stop style={{ stopColor: from ?? "var(--moon-a)" }} />
      <stop offset="1" style={{ stopColor: to ?? "var(--moon-b)" }} />
    </>
  );
}

// Reaproveita a mesma técnica da lua real em Constellation.tsx: um disco
// cheio + um disco "sombra" (cor do fundo) deslocado por cima, recortado
// no círculo — dá qualquer fase lunar sem desenhar cada uma à mão.
function Moon({
  id,
  lit,
  waxing,
  halo,
  color1,
  color2,
}: {
  id: string;
  lit: number;
  waxing: boolean;
  halo?: boolean;
  color1?: string;
  color2?: string;
}) {
  const R = 9;
  const shift = (1 - lit) * 2 * R * (waxing ? 1 : -1);
  return (
    <>
      <defs>
        <linearGradient id={id} x1="4" y1="4" x2="20" y2="20" gradientUnits="userSpaceOnUse">
          <GoldStops from={color1} to={color2} />
        </linearGradient>
        <clipPath id={`${id}-clip`}>
          <circle cx="12" cy="12" r={R} />
        </clipPath>
      </defs>
      {halo && (
        <circle cx="12" cy="12" r={R + 3} style={{ fill: color2 ?? "var(--moon-b)" }} opacity={0.22} />
      )}
      <circle cx="12" cy="12" r={R} fill={`url(#${id})`} />
      <g clipPath={`url(#${id}-clip)`}>
        <circle cx={12 + shift} cy="12" r={R} style={{ fill: "var(--canvas)" }} />
      </g>
    </>
  );
}

function renderIcon(kind: TrophyIconKind, id: string, color1?: string, color2?: string) {
  switch (kind) {
    case "spark":
      return (
        <>
          <defs>
            <linearGradient id={id} x1="4" y1="4" x2="20" y2="20" gradientUnits="userSpaceOnUse">
              <GoldStops from={color1} to={color2} />
            </linearGradient>
          </defs>
          <path d="M12 3l1.8 6.2L20 11l-6.2 1.8L12 19l-1.8-6.2L4 11l6.2-1.8L12 3z" fill={`url(#${id})`} />
        </>
      );

    case "moon-new":
      return <Moon id={id} lit={0.08} waxing color1={color1} color2={color2} />;
    case "moon-crescent-waxing":
      return <Moon id={id} lit={0.28} waxing color1={color1} color2={color2} />;
    case "moon-quarter-waxing":
      return <Moon id={id} lit={0.5} waxing color1={color1} color2={color2} />;
    case "moon-full":
      return <Moon id={id} lit={1} waxing color1={color1} color2={color2} />;
    case "moon-gibbous-waning":
      return <Moon id={id} lit={0.75} waxing={false} color1={color1} color2={color2} />;
    case "moon-quarter-waning-orbit":
      return (
        <>
          <Moon id={id} lit={0.5} waxing={false} color1={color1} color2={color2} />
          <circle
            cx="12"
            cy="12"
            r="11"
            stroke={color2 ?? "var(--accent)"}
            strokeWidth="0.8"
            strokeDasharray="1.6 1.6"
            opacity={0.55}
          />
        </>
      );
    case "moon-crescent-waning":
      return <Moon id={id} lit={0.22} waxing={false} color1={color1} color2={color2} />;
    case "moon-full-halo":
      return <Moon id={id} lit={1} waxing halo color1={color1} color2={color2} />;

    case "saturn":
      return (
        <>
          <defs>
            <linearGradient id={id} x1="4" y1="4" x2="20" y2="20" gradientUnits="userSpaceOnUse">
              <GoldStops from={color1} to={color2} />
            </linearGradient>
          </defs>
          <ellipse cx="12" cy="13" rx="10" ry="3" stroke={`url(#${id})`} strokeWidth="1.4" />
          <circle cx="12" cy="12" r="6" fill={`url(#${id})`} />
        </>
      );

    case "meteor-shower":
      return (
        <>
          <defs>
            <linearGradient id={id} x1="4" y1="4" x2="20" y2="20" gradientUnits="userSpaceOnUse">
              <GoldStops from={color1} to={color2} />
            </linearGradient>
          </defs>
          <path d="M9.7 14.3 15 9" stroke={`url(#${id})`} strokeWidth="1.4" strokeLinecap="round" opacity={0.6} />
          <path d="M13.5 17.8 18 13.3" stroke={`url(#${id})`} strokeWidth="1.2" strokeLinecap="round" opacity={0.4} />
          <circle cx="8" cy="16" r="2.3" fill={`url(#${id})`} />
          <circle cx="17" cy="9" r="1.4" fill={`url(#${id})`} opacity={0.85} />
        </>
      );

    case "shooting-star":
      return (
        <>
          <defs>
            <linearGradient id={id} x1="4" y1="4" x2="20" y2="20" gradientUnits="userSpaceOnUse">
              <GoldStops from={color1} to={color2} />
            </linearGradient>
          </defs>
          <path d="M6 18 16 8" stroke={`url(#${id})`} strokeWidth="1.4" strokeLinecap="round" opacity={0.5} />
          <path
            d="M17 5.5l1.1 3 3 1.1-3 1.1-1.1 3-1.1-3-3-1.1 3-1.1 1.1-3z"
            fill={`url(#${id})`}
          />
        </>
      );

    case "satellite":
      return (
        <>
          <defs>
            <linearGradient id={id} x1="4" y1="4" x2="20" y2="20" gradientUnits="userSpaceOnUse">
              <GoldStops from={color1} to={color2} />
            </linearGradient>
          </defs>
          <rect
            x="9.5"
            y="9.5"
            width="5"
            height="5"
            rx="1"
            fill={`url(#${id})`}
            transform="rotate(45 12 12)"
          />
          <path
            d="M4.5 8.5l2.6 2.6M19.5 8.5l-2.6 2.6M4.5 15.5l2.6-2.6M19.5 15.5l-2.6-2.6"
            stroke={`url(#${id})`}
            strokeWidth="1.3"
            strokeLinecap="round"
          />
          <path d="M12 9.5V6.5M12 17.5v-3" stroke={`url(#${id})`} strokeWidth="1.2" strokeLinecap="round" />
        </>
      );

    case "sparkle-cluster":
      return (
        <>
          <defs>
            <linearGradient id={id} x1="4" y1="4" x2="20" y2="20" gradientUnits="userSpaceOnUse">
              <GoldStops from={color1} to={color2} />
            </linearGradient>
          </defs>
          <path d="M8 4l1 3 3 1-3 1-1 3-1-3-3-1 3-1 1-3z" fill={`url(#${id})`} />
          <path
            d="M17 10l.8 2.2 2.2.8-2.2.8-.8 2.2-.8-2.2-2.2-.8 2.2-.8.8-2.2z"
            fill={`url(#${id})`}
            opacity={0.85}
          />
          <path
            d="M12 15l.5 1.4 1.4.5-1.4.5-.5 1.4-.5-1.4-1.4-.5 1.4-.5.5-1.4z"
            fill={`url(#${id})`}
            opacity={0.7}
          />
        </>
      );

    case "nebula-heart":
      return (
        <>
          <defs>
            <linearGradient id={id} x1="4" y1="4" x2="20" y2="20" gradientUnits="userSpaceOnUse">
              <GoldStops from={color1} to={color2} />
            </linearGradient>
          </defs>
          <path
            d="M12 19c-3-2.4-6.5-5.4-6.5-9A4 4 0 0 1 12 7.2 4 4 0 0 1 18.5 10c0 3.6-3.5 6.6-6.5 9z"
            fill={`url(#${id})`}
            opacity={0.92}
          />
          <circle cx="9.5" cy="9.8" r="0.6" style={{ fill: "var(--canvas)" }} />
          <circle cx="14.5" cy="10.3" r="0.7" style={{ fill: "var(--canvas)" }} />
          <circle cx="12" cy="13.5" r="0.5" style={{ fill: "var(--canvas)" }} opacity={0.8} />
        </>
      );

    case "star-outline":
      return (
        <>
          <defs>
            <linearGradient id={id} x1="4" y1="4" x2="20" y2="20" gradientUnits="userSpaceOnUse">
              <GoldStops from={color1} to={color2} />
            </linearGradient>
          </defs>
          <path
            d="M12 4l2.2 5.1 5.5.5-4.2 3.6 1.3 5.3L12 15.8 7.2 18.5l1.3-5.3-4.2-3.6 5.5-.5L12 4z"
            stroke={`url(#${id})`}
            strokeWidth="1.3"
            strokeLinejoin="round"
          />
        </>
      );

    case "star-filled":
      return (
        <>
          <defs>
            <linearGradient id={id} x1="4" y1="4" x2="20" y2="20" gradientUnits="userSpaceOnUse">
              <GoldStops from={color1} to={color2} />
            </linearGradient>
          </defs>
          <path
            d="M12 4l2.2 5.1 5.5.5-4.2 3.6 1.3 5.3L12 15.8 7.2 18.5l1.3-5.3-4.2-3.6 5.5-.5L12 4z"
            fill={`url(#${id})`}
          />
        </>
      );

    case "star-rays":
      return (
        <>
          <defs>
            <linearGradient id={id} x1="4" y1="4" x2="20" y2="20" gradientUnits="userSpaceOnUse">
              <GoldStops from={color1} to={color2} />
            </linearGradient>
          </defs>
          <path
            d="M12 4l2.2 5.1 5.5.5-4.2 3.6 1.3 5.3L12 15.8 7.2 18.5l1.3-5.3-4.2-3.6 5.5-.5L12 4z"
            fill={`url(#${id})`}
          />
          <path
            d="M12 1v1.6M12 21.4V23M1 12h1.6M20.4 12H23"
            stroke={`url(#${id})`}
            strokeWidth="1"
            strokeLinecap="round"
            opacity={0.6}
          />
        </>
      );

    case "telescope":
      return (
        <>
          <defs>
            <linearGradient id={id} x1="4" y1="4" x2="20" y2="20" gradientUnits="userSpaceOnUse">
              <GoldStops from={color1} to={color2} />
            </linearGradient>
          </defs>
          <path d="M5 17l11-9 2.5 3-11 9L5 17z" fill={`url(#${id})`} />
          <path
            d="M7 15l-3 3.5M17.5 9.5 19 6"
            stroke={`url(#${id})`}
            strokeWidth="1.3"
            strokeLinecap="round"
          />
          <path d="M4 21l3.5-3.5" stroke={color2 ?? "var(--accent)"} strokeWidth="1.3" strokeLinecap="round" />
        </>
      );

    case "globe":
      return (
        <>
          <defs>
            <linearGradient id={id} x1="4" y1="4" x2="20" y2="20" gradientUnits="userSpaceOnUse">
              <GoldStops from={color1} to={color2} />
            </linearGradient>
          </defs>
          <circle cx="12" cy="12" r="8" fill={`url(#${id})`} />
          <ellipse
            cx="12"
            cy="12"
            rx="8"
            ry="3"
            style={{ stroke: "var(--canvas)" }}
            strokeWidth="0.8"
            opacity={0.5}
            fill="none"
          />
          <path d="M4 12h16" style={{ stroke: "var(--canvas)" }} strokeWidth="0.8" opacity={0.5} />
          <ellipse
            cx="12"
            cy="12"
            rx="3"
            ry="8"
            style={{ stroke: "var(--canvas)" }}
            strokeWidth="0.8"
            opacity={0.4}
            fill="none"
          />
        </>
      );

    case "trophy-cup":
      return (
        <>
          <defs>
            <linearGradient id={id} x1="4" y1="4" x2="20" y2="20" gradientUnits="userSpaceOnUse">
              <GoldStops from={color1} to={color2} />
            </linearGradient>
          </defs>
          <path d="M8 5h8v4a4 4 0 0 1-8 0V5z" fill={`url(#${id})`} />
          <path
            d="M8 6H5.5a2 2 0 0 0 0 4c.5 1 1.4 1.8 2.5 2.3M16 6h2.5a2 2 0 0 1 0 4c-.5 1-1.4 1.8-2.5 2.3"
            stroke={`url(#${id})`}
            strokeWidth="1.2"
            strokeLinecap="round"
            fill="none"
          />
          <path
            d="M12 13v3M9 20h6M10 20l.6-2.6h2.8l.6 2.6"
            stroke={`url(#${id})`}
            strokeWidth="1.3"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
        </>
      );

    case "crown":
      return (
        <>
          <defs>
            <linearGradient id={id} x1="4" y1="4" x2="20" y2="20" gradientUnits="userSpaceOnUse">
              <GoldStops from={color1} to={color2} />
            </linearGradient>
          </defs>
          <path d="M4 17l-1-8 4.5 3L12 6l4.5 6 4.5-3-1 8H4z" fill={`url(#${id})`} />
          <path d="M4 19h16" stroke={`url(#${id})`} strokeWidth="1.4" strokeLinecap="round" />
          <circle cx="12" cy="10.5" r="1" style={{ fill: "var(--canvas)" }} />
        </>
      );

    case "gem":
      return (
        <>
          <defs>
            <linearGradient id={id} x1="4" y1="4" x2="20" y2="20" gradientUnits="userSpaceOnUse">
              <stop stopColor="#eaf6ff" />
              <stop offset="1" stopColor="#8fc9e8" />
            </linearGradient>
          </defs>
          <path d="M7 4h10l4 5-11 11L2 9l5-5z" fill={`url(#${id})`} />
          <path
            d="M7 4l2 5H4.5M17 4l-2 5h4.5M9 9h6l-3 11-3-11z"
            stroke="#ffffff"
            strokeWidth="0.6"
            opacity={0.6}
            strokeLinejoin="round"
            fill="none"
          />
        </>
      );

    case "rainbow":
      return (
        <>
          <path d="M3 17a9 9 0 0 1 18 0" stroke="#ff6b6b" strokeWidth="1.6" fill="none" strokeLinecap="round" />
          <path d="M5 17a7 7 0 0 1 14 0" stroke="#ffd166" strokeWidth="1.6" fill="none" strokeLinecap="round" />
          <path d="M7 17a5 5 0 0 1 10 0" stroke="#8ce99a" strokeWidth="1.6" fill="none" strokeLinecap="round" />
          <path d="M9 17a3 3 0 0 1 6 0" stroke="#74c0fc" strokeWidth="1.6" fill="none" strokeLinecap="round" />
        </>
      );

    case "sleep":
      return (
        <>
          <defs>
            <linearGradient id={id} x1="4" y1="4" x2="20" y2="20" gradientUnits="userSpaceOnUse">
              <GoldStops from={color1} to={color2} />
            </linearGradient>
          </defs>
          <path
            d="M15 5a7 7 0 1 0 6 10.5A7.5 7.5 0 0 1 15 5z"
            fill={`url(#${id})`}
          />
          <path
            d="M15.5 4.5h4l-4 3.5h4"
            stroke={`url(#${id})`}
            strokeWidth="1.1"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
        </>
      );

    case "movie-reel":
      return (
        <>
          <defs>
            <linearGradient id={id} x1="4" y1="4" x2="20" y2="20" gradientUnits="userSpaceOnUse">
              <GoldStops from={color1} to={color2} />
            </linearGradient>
          </defs>
          <rect x="4" y="7" width="16" height="11" rx="2" fill={`url(#${id})`} />
          <path
            d="M8 7 6 4M13 7l-1.5-3M18 7l-1.5-3"
            stroke={`url(#${id})`}
            strokeWidth="1.3"
            strokeLinecap="round"
          />
          <circle cx="12" cy="12.5" r="2.6" style={{ fill: "var(--canvas)" }} />
          <path d="M12 10.5v4M10.3 12.5h3.4" style={{ stroke: "var(--canvas)" }} strokeWidth="1" />
        </>
      );

    case "cooking-pot":
      return (
        <>
          <defs>
            <linearGradient id={id} x1="4" y1="4" x2="20" y2="20" gradientUnits="userSpaceOnUse">
              <GoldStops from={color1} to={color2} />
            </linearGradient>
          </defs>
          <path d="M5 11h14v3a7 7 0 0 1-14 0v-3z" fill={`url(#${id})`} />
          <path
            d="M3.5 11h17M8 11V8.5M16 11V8.5"
            stroke={`url(#${id})`}
            strokeWidth="1.3"
            strokeLinecap="round"
          />
          <path
            d="M9 6c0-1 1-1 1-2M13 6c0-1 1-1 1-2"
            stroke={`url(#${id})`}
            strokeWidth="1"
            strokeLinecap="round"
            opacity={0.7}
          />
        </>
      );

    case "compass":
      return (
        <>
          <defs>
            <linearGradient id={id} x1="4" y1="4" x2="20" y2="20" gradientUnits="userSpaceOnUse">
              <GoldStops from={color1} to={color2} />
            </linearGradient>
          </defs>
          <circle cx="12" cy="12" r="8.5" fill={`url(#${id})`} />
          <path
            d="M14.8 9.2 13 13l-3.8 1.8L11 11l3.8-1.8z"
            style={{ fill: "var(--canvas)" }}
          />
        </>
      );

    case "rocket":
      return (
        <>
          <defs>
            <linearGradient id={id} x1="4" y1="4" x2="20" y2="20" gradientUnits="userSpaceOnUse">
              <GoldStops from={color1} to={color2} />
            </linearGradient>
          </defs>
          <path
            d="M12 2c2.5 2 4 5.5 4 9.5 0 2-.5 3.8-1.3 5.3L12 19l-2.7-2.2C8.5 15.3 8 13.5 8 11.5 8 7.5 9.5 4 12 2z"
            fill={`url(#${id})`}
          />
          <circle cx="12" cy="10" r="1.6" style={{ fill: "var(--canvas)" }} />
          <path d="M8 13l-3 4 4-1M16 13l3 4-4-1" fill={`url(#${id})`} opacity={0.85} />
          <path d="M10.3 18.5 12 22l1.7-3.5" fill={`url(#${id})`} opacity={0.7} />
        </>
      );

    case "black-hole":
      return (
        <>
          <defs>
            <linearGradient id={id} x1="4" y1="4" x2="20" y2="20" gradientUnits="userSpaceOnUse">
              <GoldStops from={color1} to={color2} />
            </linearGradient>
          </defs>
          <ellipse cx="12" cy="12" rx="10" ry="4" stroke={`url(#${id})`} strokeWidth="1.5" opacity={0.9} fill="none" />
          <ellipse
            cx="12"
            cy="12"
            rx="10"
            ry="4"
            stroke={`url(#${id})`}
            strokeWidth="1"
            opacity={0.4}
            fill="none"
            transform="rotate(60 12 12)"
          />
          <circle cx="12" cy="12" r="4.3" fill="#050505" />
        </>
      );

    case "spiral-galaxy":
      return (
        <>
          <defs>
            <linearGradient id={id} x1="4" y1="4" x2="20" y2="20" gradientUnits="userSpaceOnUse">
              <GoldStops from={color1} to={color2} />
            </linearGradient>
          </defs>
          <path
            d="M12 12c3 0 5-2 5-4.5S15 4 12.5 4 8 5.5 8 8"
            stroke={`url(#${id})`}
            strokeWidth="1.4"
            strokeLinecap="round"
            fill="none"
          />
          <path
            d="M12 12c-3.5 0-6 2.3-6 5.2S8.5 20 11.3 20 16 18 16 15"
            stroke={`url(#${id})`}
            strokeWidth="1.4"
            strokeLinecap="round"
            fill="none"
            opacity={0.85}
          />
          <circle cx="12" cy="12" r="1.7" fill={`url(#${id})`} />
        </>
      );

    case "aurora":
      return (
        <>
          <path
            d="M3 15c2-3 4-3 6 0s4 3 6 0 4-3 6 0"
            stroke={color1 ?? "#4ade80"}
            strokeWidth="1.6"
            fill="none"
            strokeLinecap="round"
            opacity={0.9}
          />
          <path
            d="M3 11c2-3 4-3 6 0s4 3 6 0 4-3 6 0"
            stroke={color2 ?? "#a78bfa"}
            strokeWidth="1.6"
            fill="none"
            strokeLinecap="round"
            opacity={0.75}
          />
          <path
            d="M4 19c2-2.5 4-2.5 6 0s4 2.5 6 0 3-2.5 5-2"
            stroke={color1 ?? "#22d3ee"}
            strokeWidth="1.3"
            fill="none"
            strokeLinecap="round"
            opacity={0.5}
          />
        </>
      );

    case "astronaut":
      return (
        <>
          <defs>
            <linearGradient id={id} x1="4" y1="4" x2="20" y2="20" gradientUnits="userSpaceOnUse">
              <GoldStops from={color1} to={color2} />
            </linearGradient>
          </defs>
          <circle cx="12" cy="12" r="8.5" fill={`url(#${id})`} />
          <path
            d="M6.5 12a5.5 5.5 0 0 1 11 0c0 2-1.2 3-3 3H9.5c-1.8 0-3-1-3-3z"
            style={{ fill: "var(--canvas)" }}
          />
          <circle cx="9.7" cy="11" r="0.9" fill={`url(#${id})`} opacity={0.6} />
        </>
      );
  }
}

export function TrophyIcon({
  kind,
  className,
  color1,
  color2,
}: {
  kind: TrophyIconKind;
  className?: string;
  /** Sobrepõe o dourado padrão (--moon-a/--moon-b) — usado pelos desafios
   * a dois, que pediram pra ser coloridos em vez de dourados. */
  color1?: string;
  color2?: string;
}) {
  const rawId = useId();
  const id = `trophy-${rawId.replace(/[^a-zA-Z0-9]/g, "")}`;

  return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      {renderIcon(kind, id, color1, color2)}
    </svg>
  );
}
