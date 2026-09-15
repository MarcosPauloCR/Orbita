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
  | "astronaut"
  | "moon-gibbous-waxing"
  | "planet-mercury"
  | "planet-venus"
  | "planet-earth-night"
  | "planet-mars"
  | "planet-jupiter"
  | "planet-jupiter-storm"
  | "planet-uranus"
  | "planet-neptune"
  | "planet-pluto"
  | "planet-europa"
  | "planet-titan"
  | "double-star"
  | "pulsar"
  | "magnetar"
  | "red-giant"
  | "white-dwarf"
  | "supernova"
  | "solar-flare"
  | "solar-eclipse"
  | "corona"
  | "constellation-heart"
  | "orion-belt"
  | "southern-cross"
  | "zodiac-light"
  | "gamma-ray"
  | "cosmic-ray"
  | "meteor"
  | "comet"
  | "milky-way"
  | "nebula-cloud"
  | "pillars"
  | "event-horizon"
  | "wormhole"
  | "warp-grid"
  | "void"
  | "quasar"
  | "grav-lens"
  | "cosmic-web"
  | "cluster"
  | "globular-cluster"
  | "multiverse-bubble"
  | "oort-cloud"
  | "kuiper-belt"
  | "shuttle"
  | "rover"
  | "antenna"
  | "radio-signal"
  | "golden-record"
  | "lunar-lander"
  | "astronaut-couple"
  | "spacewalk"
  | "orbit-path"
  | "space-station"
  | "warp-drive"
  | "gravity-boots"
  | "space-capsule"
  | "mothership"
  | "beacon"
  | "solar-panel"
  | "oxygen-tank"
  | "flag"
  | "heat-shield"
  | "docking"
  | "letter"
  | "cosmic-hug"
  | "alien"
  | "ring-of-fire"
  | "time-capsule"
  | "dark-matter"
  | "infinity"
  | "eternal-orbit";

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

// Atalho pro par <defs><linearGradient>...</linearGradient></defs> que se
// repete em quase todo ícone — reduz o boilerplate dos ~60 novos abaixo.
function Grad({ id, color1, color2 }: { id: string; color1?: string; color2?: string }) {
  return (
    <defs>
      <linearGradient id={id} x1="4" y1="4" x2="20" y2="20" gradientUnits="userSpaceOnUse">
        <GoldStops from={color1} to={color2} />
      </linearGradient>
    </defs>
  );
}

// Um "planeta" genérico (bola + detalhe opcional) cobre 11 corpos
// celestes diferentes da lista — eles realmente só se diferenciam por
// cor e um detalhe de superfície na vida real também.
function Planet({
  id,
  color1,
  color2,
  ring,
  hazyRing,
  band,
  spot,
  wave,
  crack,
  heart,
  lights,
}: {
  id: string;
  color1?: string;
  color2?: string;
  ring?: boolean;
  hazyRing?: boolean;
  band?: boolean;
  spot?: boolean;
  wave?: boolean;
  crack?: boolean;
  heart?: boolean;
  lights?: boolean;
}) {
  return (
    <>
      <Grad id={id} color1={color1} color2={color2} />
      {(ring || hazyRing) && (
        <ellipse
          cx="12"
          cy="12"
          rx="10"
          ry="3.2"
          stroke={`url(#${id})`}
          strokeWidth={hazyRing ? 1 : 1.3}
          opacity={hazyRing ? 0.35 : 0.7}
          fill="none"
        />
      )}
      <circle cx="12" cy="12" r="7" fill={`url(#${id})`} />
      {band && (
        <path
          d="M5.5 10.5c3 1.4 10 1.4 13 0M5.5 14c3 1.2 10 1.2 13 0"
          style={{ stroke: "var(--canvas)" }}
          strokeWidth="0.9"
          opacity={0.5}
          fill="none"
        />
      )}
      {spot && <ellipse cx="15" cy="13" rx="2" ry="1.3" style={{ fill: "var(--canvas)" }} opacity={0.6} />}
      {wave && (
        <path d="M5.5 12h13M6.5 15h11" style={{ stroke: "var(--canvas)" }} strokeWidth="0.9" opacity={0.5} />
      )}
      {crack && (
        <path
          d="M8 8l3 3-1 3 3 2"
          style={{ stroke: "var(--canvas)" }}
          strokeWidth="0.9"
          fill="none"
          opacity={0.6}
        />
      )}
      {heart && (
        <path
          d="M12 15c-1.6-1.3-3-2.7-3-4.2A2 2 0 0 1 12 9.4a2 2 0 0 1 3 1.4c0 1.5-1.4 2.9-3 4.2z"
          style={{ fill: "var(--canvas)" }}
          opacity={0.8}
        />
      )}
      {lights && (
        <>
          <circle cx="9.5" cy="10" r="0.5" style={{ fill: "var(--canvas)" }} />
          <circle cx="14" cy="13.5" r="0.5" style={{ fill: "var(--canvas)" }} />
          <circle cx="10.5" cy="14.5" r="0.4" style={{ fill: "var(--canvas)" }} />
        </>
      )}
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

    case "moon-gibbous-waxing":
      return <Moon id={id} lit={0.75} waxing color1={color1} color2={color2} />;

    // --- Planetas (Mercúrio a Titã) — um template, um detalhe cada ---
    case "planet-mercury":
      return <Planet id={id} color1={color1} color2={color2} />;
    case "planet-venus":
      return <Planet id={id} color1={color1} color2={color2} />;
    case "planet-earth-night":
      return <Planet id={id} color1={color1} color2={color2} lights />;
    case "planet-mars":
      return <Planet id={id} color1={color1} color2={color2} />;
    case "planet-jupiter":
      return <Planet id={id} color1={color1} color2={color2} band />;
    case "planet-jupiter-storm":
      return <Planet id={id} color1={color1} color2={color2} band spot />;
    case "planet-uranus":
      return <Planet id={id} color1={color1} color2={color2} ring />;
    case "planet-neptune":
      return <Planet id={id} color1={color1} color2={color2} wave />;
    case "planet-pluto":
      return <Planet id={id} color1={color1} color2={color2} heart />;
    case "planet-europa":
      return <Planet id={id} color1={color1} color2={color2} crack />;
    case "planet-titan":
      return <Planet id={id} color1={color1} color2={color2} hazyRing />;

    case "double-star":
      return (
        <>
          <Grad id={id} color1={color1} color2={color2} />
          <circle cx="9" cy="9" r="4.5" fill={`url(#${id})`} />
          <circle cx="15" cy="15" r="4.5" fill={`url(#${id})`} opacity={0.75} />
        </>
      );

    case "pulsar":
      return (
        <>
          <Grad id={id} color1={color1} color2={color2} />
          <circle cx="12" cy="12" r="4" fill={`url(#${id})`} />
          <path
            d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M5 19l2-2M17 7l2-2"
            stroke={`url(#${id})`}
            strokeWidth="1.2"
            strokeLinecap="round"
            opacity={0.8}
          />
        </>
      );

    case "magnetar":
      return (
        <>
          <Grad id={id} color1={color1} color2={color2} />
          <circle cx="12" cy="12" r="4" fill={`url(#${id})`} />
          <path
            d="M12 2c4 3 4 7 0 10M12 2c-4 3-4 7 0 10M12 22c4-3 4-7 0-10M12 22c-4-3-4-7 0-10"
            stroke={`url(#${id})`}
            strokeWidth="1"
            fill="none"
            opacity={0.7}
          />
        </>
      );

    case "red-giant":
      return (
        <>
          <Grad id={id} color1={color1} color2={color2} />
          <circle cx="12" cy="12" r="9" fill={`url(#${id})`} opacity={0.9} />
          <circle cx="12" cy="12" r="9" stroke={`url(#${id})`} strokeWidth="1" opacity={0.4} fill="none" />
        </>
      );

    case "white-dwarf":
      return (
        <>
          <Grad id={id} color1={color1} color2={color2} />
          <circle cx="12" cy="12" r="3.2" fill={`url(#${id})`} />
          <path
            d="M12 4v2.5M12 17.5V20M4 12h2.5M17.5 12H20"
            stroke={`url(#${id})`}
            strokeWidth="1.3"
            strokeLinecap="round"
          />
        </>
      );

    case "supernova":
      return (
        <>
          <Grad id={id} color1={color1} color2={color2} />
          <circle cx="12" cy="12" r="3" fill={`url(#${id})`} />
          <path
            d="M12 1v5M12 18v5M1 12h5M18 12h5M4.5 4.5l3.5 3.5M16 16l3.5 3.5M4.5 19.5 8 16M16 8l3.5-3.5"
            stroke={`url(#${id})`}
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </>
      );

    case "solar-flare":
      return (
        <>
          <Grad id={id} color1={color1} color2={color2} />
          <circle cx="10" cy="14" r="5.5" fill={`url(#${id})`} />
          <path
            d="M14 9c2-1 3-3 2.5-5.5 2 1.5 2.8 3.7 2 5.8-1 .2-3-.3-4.5-.3z"
            fill={`url(#${id})`}
            opacity={0.85}
          />
        </>
      );

    case "solar-eclipse":
      return (
        <>
          <Grad id={id} color1={color1} color2={color2} />
          <circle cx="12" cy="12" r="9" fill={`url(#${id})`} opacity={0.35} />
          <circle cx="12" cy="12" r="7" fill="#050505" />
        </>
      );

    case "corona":
      return (
        <>
          <Grad id={id} color1={color1} color2={color2} />
          <path
            d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M5 19l2-2M17 7l2-2"
            stroke={`url(#${id})`}
            strokeWidth="1.4"
            strokeLinecap="round"
          />
          <circle cx="12" cy="12" r="5.5" fill={`url(#${id})`} />
        </>
      );

    case "constellation-heart":
      return (
        <>
          <Grad id={id} color1={color1} color2={color2} />
          <path
            d="M12 18 6 12l1-4 3 2 2-3 2 3 3-2 1 4z"
            stroke={`url(#${id})`}
            strokeWidth="1"
            fill="none"
            opacity={0.6}
          />
          {[
            [12, 18],
            [6, 12],
            [7, 8],
            [10, 10],
            [12, 7],
            [14, 10],
            [17, 8],
            [18, 12],
          ].map(([cx, cy], i) => (
            <circle key={i} cx={cx} cy={cy} r="1" fill={`url(#${id})`} />
          ))}
        </>
      );

    case "orion-belt":
      return (
        <>
          <Grad id={id} color1={color1} color2={color2} />
          <circle cx="6" cy="16" r="1.6" fill={`url(#${id})`} />
          <circle cx="12" cy="12" r="1.6" fill={`url(#${id})`} />
          <circle cx="18" cy="8" r="1.6" fill={`url(#${id})`} />
          <path d="M6 16 18 8" stroke={`url(#${id})`} strokeWidth="0.8" opacity={0.5} />
        </>
      );

    case "southern-cross":
      return (
        <>
          <Grad id={id} color1={color1} color2={color2} />
          <path d="M12 4v16M5 12h9" stroke={`url(#${id})`} strokeWidth="1" opacity={0.5} />
          <circle cx="12" cy="4" r="1.4" fill={`url(#${id})`} />
          <circle cx="12" cy="18" r="1.4" fill={`url(#${id})`} />
          <circle cx="5" cy="12" r="1.4" fill={`url(#${id})`} />
          <circle cx="14" cy="12" r="1.4" fill={`url(#${id})`} />
        </>
      );

    case "zodiac-light":
      return (
        <>
          <Grad id={id} color1={color1} color2={color2} />
          <path d="M12 3 4 20h16L12 3z" fill={`url(#${id})`} opacity={0.55} />
          <circle cx="12" cy="9" r="0.8" style={{ fill: "var(--canvas)" }} />
          <circle cx="10" cy="14" r="0.6" style={{ fill: "var(--canvas)" }} />
        </>
      );

    case "gamma-ray":
      return (
        <>
          <Grad id={id} color1={color1} color2={color2} />
          <path
            d="M9 2 6 12h4l-2 10 8-13h-4l3-7z"
            fill={`url(#${id})`}
          />
        </>
      );

    case "cosmic-ray":
      return (
        <>
          <Grad id={id} color1={color1} color2={color2} />
          <path d="M5 19 17 7" stroke={`url(#${id})`} strokeWidth="1.6" strokeLinecap="round" />
          <path d="M13 3l1.4 3.6L18 8l-3.6 1.4L13 13l-1.4-3.6L8 8l3.6-1.4L13 3z" fill={`url(#${id})`} />
        </>
      );

    case "meteor":
      return (
        <>
          <Grad id={id} color1={color1} color2={color2} />
          <path d="M12 5 6 15" stroke={`url(#${id})`} strokeWidth="1.3" strokeLinecap="round" opacity={0.5} />
          <circle cx="15" cy="17" r="3.4" fill={`url(#${id})`} />
        </>
      );

    case "comet":
      return (
        <>
          <Grad id={id} color1={color1} color2={color2} />
          <path
            d="M18 6 8 16"
            stroke={`url(#${id})`}
            strokeWidth="3"
            strokeLinecap="round"
            opacity={0.3}
          />
          <circle cx="18" cy="6" r="3" fill={`url(#${id})`} />
        </>
      );

    case "milky-way":
      return (
        <>
          <Grad id={id} color1={color1} color2={color2} />
          <path d="M2 15c4-6 16-6 20 0" stroke={`url(#${id})`} strokeWidth="1.4" fill="none" opacity={0.5} />
          {[3, 6.5, 10, 13.5, 17, 20.5].map((x, i) => (
            <circle key={i} cx={x} cy={15 - Math.abs(x - 11.5) * 0.5} r="0.9" fill={`url(#${id})`} />
          ))}
        </>
      );

    case "nebula-cloud":
      return (
        <>
          <Grad id={id} color1={color1} color2={color2} />
          <path
            d="M5 14c-1-3 1-6 4-6 1-2 3-3 5-2 2-1 5 0 5 3 2 1 2 4-.5 5-1 2-3 3-5 2.5-2 1.5-5 1-6.5-1-2 0-2.7-1-2-1.5z"
            fill={`url(#${id})`}
            opacity={0.85}
          />
          <circle cx="9" cy="11" r="0.6" style={{ fill: "var(--canvas)" }} />
          <circle cx="14" cy="13" r="0.5" style={{ fill: "var(--canvas)" }} />
        </>
      );

    case "pillars":
      return (
        <>
          <Grad id={id} color1={color1} color2={color2} />
          <path d="M6 21 7 9l2-3 2 3-1 12z" fill={`url(#${id})`} />
          <path d="M11 21 12 7l1.5-2.5 1.5 2.5-1 14z" fill={`url(#${id})`} opacity={0.85} />
          <path d="M16 21 17 10l1.5-2 1.5 2-1 11z" fill={`url(#${id})`} opacity={0.7} />
        </>
      );

    case "event-horizon":
      return (
        <>
          <Grad id={id} color1={color1} color2={color2} />
          <circle cx="12" cy="12" r="9" stroke={`url(#${id})`} strokeWidth="1.4" fill="none" />
          <circle cx="12" cy="12" r="4" fill="#050505" />
        </>
      );

    case "wormhole":
      return (
        <>
          <Grad id={id} color1={color1} color2={color2} />
          <ellipse cx="7" cy="12" rx="4" ry="7" stroke={`url(#${id})`} strokeWidth="1.3" fill="none" />
          <ellipse cx="17" cy="12" rx="4" ry="7" stroke={`url(#${id})`} strokeWidth="1.3" fill="none" opacity={0.7} />
          <path d="M9 12h6" stroke={`url(#${id})`} strokeWidth="1" opacity={0.5} />
        </>
      );

    case "warp-grid":
      return (
        <>
          <Grad id={id} color1={color1} color2={color2} />
          <path
            d="M2 8c5 1 15 1 20 0M2 12h20M2 16c5-1 15-1 20 0"
            stroke={`url(#${id})`}
            strokeWidth="1"
            fill="none"
            opacity={0.6}
          />
          <path d="M8 4c1.5 4 1.5 12 0 16M16 4c-1.5 4-1.5 12 0 16" stroke={`url(#${id})`} strokeWidth="1" fill="none" opacity={0.6} />
        </>
      );

    case "void":
      return (
        <>
          <circle cx="12" cy="12" r="8" fill="#050505" />
          <circle cx="12" cy="12" r="8" stroke={color2 ?? "var(--moon-b)"} strokeWidth="0.8" opacity={0.4} fill="none" />
          <circle cx="9" cy="9" r="0.6" fill={color1 ?? "#fff"} />
          <circle cx="15" cy="15" r="0.5" fill={color1 ?? "#fff"} />
        </>
      );

    case "quasar":
      return (
        <>
          <Grad id={id} color1={color1} color2={color2} />
          <path d="M2 2l9 9M22 2l-9 9M2 22l9-9M22 22l-9-9" stroke={`url(#${id})`} strokeWidth="1.4" strokeLinecap="round" opacity={0.6} />
          <circle cx="12" cy="12" r="3.4" fill={`url(#${id})`} />
        </>
      );

    case "grav-lens":
      return (
        <>
          <Grad id={id} color1={color1} color2={color2} />
          <circle cx="12" cy="12" r="3" fill={`url(#${id})`} />
          <path
            d="M3 9c3-2 6-2 9 0M3 15c3 2 6 2 9 0M21 9c-3-2-6-2-9 0M21 15c-3 2-6 2-9 0"
            stroke={`url(#${id})`}
            strokeWidth="1.1"
            fill="none"
            opacity={0.65}
          />
        </>
      );

    case "cosmic-web":
      return (
        <>
          <Grad id={id} color1={color1} color2={color2} />
          <path
            d="M4 5 10 10 4 19M20 5 14 10 20 19M10 10 14 10M4 5 20 5M4 19 20 19"
            stroke={`url(#${id})`}
            strokeWidth="1"
            fill="none"
            opacity={0.6}
          />
          {[
            [4, 5],
            [20, 5],
            [10, 10],
            [14, 10],
            [4, 19],
            [20, 19],
          ].map(([cx, cy], i) => (
            <circle key={i} cx={cx} cy={cy} r="1.2" fill={`url(#${id})`} />
          ))}
        </>
      );

    case "cluster":
      return (
        <>
          <Grad id={id} color1={color1} color2={color2} />
          {[
            [7, 8, 2.6],
            [16, 7, 2],
            [8, 16, 2.2],
            [16, 16, 1.8],
            [12, 11, 1.6],
          ].map(([cx, cy, r], i) => (
            <circle key={i} cx={cx} cy={cy} r={r} fill={`url(#${id})`} opacity={0.9 - i * 0.08} />
          ))}
        </>
      );

    case "globular-cluster":
      return (
        <>
          <Grad id={id} color1={color1} color2={color2} />
          {Array.from({ length: 14 }, (_, i) => {
            const angle = (i / 14) * Math.PI * 2;
            const r = 3 + (i % 3) * 1.8;
            return (
              <circle
                key={i}
                cx={12 + Math.cos(angle) * r}
                cy={12 + Math.sin(angle) * r}
                r="0.9"
                fill={`url(#${id})`}
              />
            );
          })}
          <circle cx="12" cy="12" r="2" fill={`url(#${id})`} />
        </>
      );

    case "multiverse-bubble":
      return (
        <>
          <Grad id={id} color1={color1} color2={color2} />
          <circle cx="9" cy="10" r="6" stroke={`url(#${id})`} strokeWidth="1.2" fill="none" opacity={0.8} />
          <circle cx="15" cy="14" r="6" stroke={`url(#${id})`} strokeWidth="1.2" fill="none" opacity={0.6} />
        </>
      );

    case "oort-cloud":
      return (
        <>
          <Grad id={id} color1={color1} color2={color2} />
          <circle cx="12" cy="12" r="9" stroke={`url(#${id})`} strokeWidth="0.8" fill="none" opacity={0.4} strokeDasharray="1.5 2" />
          <circle cx="12" cy="12" r="2.6" fill={`url(#${id})`} />
        </>
      );

    case "kuiper-belt":
      return (
        <>
          <Grad id={id} color1={color1} color2={color2} />
          <circle cx="12" cy="12" r="3" fill={`url(#${id})`} />
          <circle cx="12" cy="12" r="8.5" stroke={`url(#${id})`} strokeWidth="1.8" fill="none" opacity={0.5} strokeDasharray="1 2.4" />
        </>
      );

    // --- Naves & tecnologia ---
    case "shuttle":
      return (
        <>
          <Grad id={id} color1={color1} color2={color2} />
          <path
            d="M6 14c0-5 3-9 6-9s6 4 6 9-2 3-6 3-6 2-6-3z"
            fill={`url(#${id})`}
          />
          <circle cx="12" cy="10" r="1.8" style={{ fill: "var(--canvas)" }} />
        </>
      );

    case "rover":
      return (
        <>
          <Grad id={id} color1={color1} color2={color2} />
          <rect x="5" y="9" width="14" height="6" rx="1.5" fill={`url(#${id})`} />
          <circle cx="7.5" cy="17" r="2" fill={`url(#${id})`} />
          <circle cx="16.5" cy="17" r="2" fill={`url(#${id})`} />
          <path d="M9 9V6h6v3" stroke={`url(#${id})`} strokeWidth="1.3" fill="none" />
        </>
      );

    case "antenna":
      return (
        <>
          <Grad id={id} color1={color1} color2={color2} />
          <path d="M4 15a8 8 0 0 1 14-6l-9 9a8 8 0 0 1-5-3z" fill={`url(#${id})`} />
          <path d="M14 9 20 3M18 5l2 2" stroke={`url(#${id})`} strokeWidth="1.3" strokeLinecap="round" />
        </>
      );

    case "radio-signal":
      return (
        <>
          <Grad id={id} color1={color1} color2={color2} />
          <circle cx="6" cy="18" r="2" fill={`url(#${id})`} />
          <path
            d="M10 14a8 8 0 0 1 0 0M9 15c2-2 5-2 7 0M7.5 12.5c3.5-3.5 9-3.5 12.5 0"
            stroke={`url(#${id})`}
            strokeWidth="1.3"
            fill="none"
            strokeLinecap="round"
          />
        </>
      );

    // Disco de Ouro — o exemplo que você deu, então caprichei: disco com
    // sulcos concêntricos e furo central, como o registro da Voyager.
    case "golden-record":
      return (
        <>
          <Grad id={id} color1={color1} color2={color2} />
          <circle cx="12" cy="12" r="9" fill={`url(#${id})`} />
          <circle cx="12" cy="12" r="6.5" stroke="var(--canvas)" strokeWidth="0.6" opacity={0.5} fill="none" />
          <circle cx="12" cy="12" r="4.5" stroke="var(--canvas)" strokeWidth="0.6" opacity={0.5} fill="none" />
          <circle cx="12" cy="12" r="1.6" style={{ fill: "var(--canvas)" }} />
        </>
      );

    case "lunar-lander":
      return (
        <>
          <Grad id={id} color1={color1} color2={color2} />
          <path d="M8 14h8l-1.5 4h-5z" fill={`url(#${id})`} />
          <rect x="9" y="8" width="6" height="6" fill={`url(#${id})`} />
          <path d="M8 14 5 20M16 14l3 6M10 14v-2M14 14v-2" stroke={`url(#${id})`} strokeWidth="1.1" strokeLinecap="round" />
        </>
      );

    case "astronaut-couple":
      return (
        <>
          <Grad id={id} color1={color1} color2={color2} />
          <circle cx="9" cy="11" r="6.5" fill={`url(#${id})`} />
          <circle cx="15" cy="13" r="6.5" fill={`url(#${id})`} opacity={0.85} />
          <path d="M5.5 11a3.5 3.5 0 0 1 7 0" style={{ stroke: "var(--canvas)" }} strokeWidth="1" fill="none" />
          <path d="M11.5 13a3.5 3.5 0 0 1 7 0" style={{ stroke: "var(--canvas)" }} strokeWidth="1" fill="none" />
        </>
      );

    case "spacewalk":
      return (
        <>
          <Grad id={id} color1={color1} color2={color2} />
          <circle cx="9" cy="8" r="4.5" fill={`url(#${id})`} />
          <path
            d="M9 12.5c1 3 4 5 8 5.5"
            stroke={`url(#${id})`}
            strokeWidth="1.2"
            fill="none"
            strokeLinecap="round"
            strokeDasharray="1.6 1.6"
          />
          <circle cx="18" cy="18.5" r="1.6" fill={`url(#${id})`} />
        </>
      );

    case "orbit-path":
      return (
        <>
          <Grad id={id} color1={color1} color2={color2} />
          <circle cx="12" cy="12" r="4" fill={`url(#${id})`} />
          <ellipse cx="12" cy="12" rx="9" ry="4.5" stroke={`url(#${id})`} strokeWidth="1.2" fill="none" opacity={0.6} />
          <circle cx="21" cy="12" r="1.4" fill={`url(#${id})`} />
        </>
      );

    case "space-station":
      return (
        <>
          <Grad id={id} color1={color1} color2={color2} />
          <rect x="9" y="9" width="6" height="6" rx="1" fill={`url(#${id})`} />
          <path
            d="M4 12h5M15 12h5M9 9 5 5M15 9l4-4M9 15l-4 4M15 15l4 4"
            stroke={`url(#${id})`}
            strokeWidth="1.2"
            strokeLinecap="round"
          />
        </>
      );

    case "warp-drive":
      return (
        <>
          <Grad id={id} color1={color1} color2={color2} />
          <path d="M14 4c1.5 2.4 2.4 5.5 2.4 8.5S15.5 19.4 14 21.8L10 20c1-2 1.6-4.7 1.6-7.5S11 7 10 4z" fill={`url(#${id})`} />
          <path d="M2 8h5M2 12h6M2 16h5" stroke={`url(#${id})`} strokeWidth="1.3" strokeLinecap="round" opacity={0.7} />
        </>
      );

    case "gravity-boots":
      return (
        <>
          <Grad id={id} color1={color1} color2={color2} />
          <path d="M8 4h5v9l5 3v3H6v-5l2-1z" fill={`url(#${id})`} />
          <path d="M6 19h12" stroke={`url(#${id})`} strokeWidth="1.4" strokeLinecap="round" />
        </>
      );

    case "space-capsule":
      return (
        <>
          <Grad id={id} color1={color1} color2={color2} />
          <path d="M9 3h6l2 8-2 10H9L7 11z" fill={`url(#${id})`} />
          <circle cx="12" cy="10" r="1.8" style={{ fill: "var(--canvas)" }} />
        </>
      );

    case "mothership":
      return (
        <>
          <Grad id={id} color1={color1} color2={color2} />
          <ellipse cx="12" cy="13" rx="10" ry="4" fill={`url(#${id})`} />
          <path d="M8 10a4 4 0 0 1 8 0z" fill={`url(#${id})`} opacity={0.85} />
          <circle cx="12" cy="13" r="1.6" style={{ fill: "var(--canvas)" }} />
        </>
      );

    case "beacon":
      return (
        <>
          <Grad id={id} color1={color1} color2={color2} />
          <path d="M10 20h4l-1-9h-2z" fill={`url(#${id})`} />
          <circle cx="12" cy="8" r="3" fill={`url(#${id})`} />
          <path d="M12 3v1.5M6.5 8H8M16 8h1.5M8 4l1 1M16 4l-1 1" stroke={`url(#${id})`} strokeWidth="1" strokeLinecap="round" opacity={0.7} />
        </>
      );

    case "solar-panel":
      return (
        <>
          <Grad id={id} color1={color1} color2={color2} />
          <rect x="3" y="8" width="18" height="8" rx="1" fill={`url(#${id})`} opacity={0.9} />
          <path
            d="M8 8v8M13 8v8M18 8v8M3 12h18"
            style={{ stroke: "var(--canvas)" }}
            strokeWidth="0.7"
            opacity={0.5}
          />
        </>
      );

    case "oxygen-tank":
      return (
        <>
          <Grad id={id} color1={color1} color2={color2} />
          <rect x="8" y="5" width="8" height="15" rx="4" fill={`url(#${id})`} />
          <rect x="10" y="2" width="4" height="3.5" rx="1" fill={`url(#${id})`} opacity={0.85} />
        </>
      );

    case "flag":
      return (
        <>
          <Grad id={id} color1={color1} color2={color2} />
          <path d="M7 2v20" stroke={`url(#${id})`} strokeWidth="1.4" strokeLinecap="round" />
          <path d="M7 4h11l-3 3.5L18 11H7z" fill={`url(#${id})`} />
        </>
      );

    case "heat-shield":
      return (
        <>
          <Grad id={id} color1={color1} color2={color2} />
          <path d="M12 3c4 1.5 7 2 7 2v7c0 5-3 7.5-7 9-4-1.5-7-4-7-9V5s3-.5 7-2z" fill={`url(#${id})`} />
        </>
      );

    case "docking":
      return (
        <>
          <Grad id={id} color1={color1} color2={color2} />
          <circle cx="8" cy="12" r="5.5" stroke={`url(#${id})`} strokeWidth="1.6" fill="none" />
          <circle cx="16" cy="12" r="5.5" stroke={`url(#${id})`} strokeWidth="1.6" fill="none" opacity={0.75} />
        </>
      );

    // --- Românticos & finais ---
    case "letter":
      return (
        <>
          <Grad id={id} color1={color1} color2={color2} />
          <rect x="3" y="6" width="18" height="13" rx="1.5" fill={`url(#${id})`} />
          <path d="M3.5 7 12 13.5 20.5 7" style={{ stroke: "var(--canvas)" }} strokeWidth="1" fill="none" />
        </>
      );

    case "cosmic-hug":
      return (
        <>
          <Grad id={id} color1={color1} color2={color2} />
          <path d="M4 16c0-6 3-11 8-11" stroke={`url(#${id})`} strokeWidth="2" fill="none" strokeLinecap="round" />
          <path d="M20 16c0-6-3-11-8-11" stroke={`url(#${id})`} strokeWidth="2" fill="none" strokeLinecap="round" opacity={0.75} />
          <circle cx="12" cy="17" r="2.4" fill={`url(#${id})`} />
        </>
      );

    case "alien":
      return (
        <>
          <Grad id={id} color1={color1} color2={color2} />
          <path d="M12 3C7 3 5 8 6 13c.5 3 2.5 6 6 6s5.5-3 6-6c1-5-1-10-6-10z" fill={`url(#${id})`} />
          <ellipse cx="9" cy="12" rx="1.4" ry="2" style={{ fill: "var(--canvas)" }} transform="rotate(-15 9 12)" />
          <ellipse cx="15" cy="12" rx="1.4" ry="2" style={{ fill: "var(--canvas)" }} transform="rotate(15 15 12)" />
        </>
      );

    case "ring-of-fire":
      return (
        <>
          <Grad id={id} color1={color1} color2={color2} />
          <circle cx="12" cy="13" r="6" stroke={`url(#${id})`} strokeWidth="2" fill="none" />
          <path d="M9 5c0-1.5 1-2.5 1-4 1 1 2 2.5 1 4.5-.5 1-2 1-2-.5z" fill={`url(#${id})`} />
          <path d="M14 5.5c0-1.2.8-2 .8-3.3.9.8 1.6 2 .9 3.6-.4.8-1.7.7-1.7-.3z" fill={`url(#${id})`} opacity={0.8} />
        </>
      );

    case "time-capsule":
      return (
        <>
          <Grad id={id} color1={color1} color2={color2} />
          <path d="M6 4h12v4H6zM6 16h12v4H6z" fill={`url(#${id})`} />
          <path d="M8 8c0 3 2 3.5 2 4s-2 1-2 4M16 8c0 3-2 3.5-2 4s2 1 2 4" stroke={`url(#${id})`} strokeWidth="1.2" fill="none" />
        </>
      );

    case "dark-matter":
      return (
        <>
          <Grad id={id} color1={color1} color2={color2} />
          <circle cx="12" cy="12" r="7" fill="#050505" stroke={`url(#${id})`} strokeWidth="1" opacity={0.9} />
          <path
            d="M12 6l1 3 3 1-3 1-1 3-1-3-3-1 3-1 1-3z"
            fill={`url(#${id})`}
          />
        </>
      );

    case "infinity":
      return (
        <>
          <Grad id={id} color1={color1} color2={color2} />
          <path
            d="M7 12c0-2.2 1.8-4 4-4 1.5 0 2.3 1 3 2 .7-1 1.5-2 3-2 2.2 0 4 1.8 4 4s-1.8 4-4 4c-1.5 0-2.3-1-3-2-.7 1-1.5 2-3 2-2.2 0-4-1.8-4-4z"
            stroke={`url(#${id})`}
            strokeWidth="1.6"
            fill="none"
          />
          <circle cx="4" cy="6" r="0.8" fill={`url(#${id})`} />
          <circle cx="20" cy="18" r="0.8" fill={`url(#${id})`} />
        </>
      );

    // Órbita Eterna — o marco final (dia 100), por isso ganha um
    // tratamento à parte, meio arco-íris meio dourado, igual a um selo
    // de "completou tudo".
    case "eternal-orbit":
      return (
        <>
          <defs>
            <linearGradient id={id} x1="2" y1="2" x2="22" y2="22" gradientUnits="userSpaceOnUse">
              <stop offset="0" stopColor="#fbbf24" />
              <stop offset="0.5" stopColor="#f472b6" />
              <stop offset="1" stopColor="#60a5fa" />
            </linearGradient>
          </defs>
          <circle cx="12" cy="12" r="4.2" fill={`url(#${id})`} />
          <ellipse cx="12" cy="12" rx="10" ry="4" stroke={`url(#${id})`} strokeWidth="1.6" fill="none" />
          <ellipse cx="12" cy="12" rx="4" ry="10" stroke={`url(#${id})`} strokeWidth="1.2" fill="none" opacity={0.6} />
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
