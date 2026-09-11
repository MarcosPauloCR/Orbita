"use client";

import { useEffect, useState } from "react";
import { Phosphor } from "./Phosphor";

type Palette = { background: string; base: string; brightness: number };

// As cores vivem no globals.css (trocam sozinhas entre claro/escuro), mas o
// shader precisa delas como valor resolvido, não como var(--x) — então são
// lidas do :root aqui e relidas quando o tema do sistema muda.
function readPalette(): Palette {
  const styles = getComputedStyle(document.documentElement);
  const read = (name: string, fallback: string) =>
    styles.getPropertyValue(name).trim() || fallback;

  const dark = window.matchMedia("(prefers-color-scheme: dark)").matches;

  return {
    background: read("--canvas", dark ? "#0a0b10" : "#f4f1ea"),
    base: read("--accent", dark ? "#d9c48a" : "#a97e2d"),
    // No tema claro o brilho se perde contra o fundo claro e vira uma
    // mancha lavada; mais fraco ali ele fica como um veio de tinta.
    brightness: dark ? 109 : 55,
  };
}

export function Backdrop() {
  const [palette, setPalette] = useState<Palette | null>(null);

  useEffect(() => {
    setPalette(readPalette());

    const query = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => setPalette(readPalette());
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
  }, []);

  return (
    <div className="pointer-events-none fixed inset-0 overflow-hidden bg-canvas">
      {palette && (
        <Phosphor
          background={palette.background}
          baseColor={palette.base}
          brightness={palette.brightness}
          distance={17}
          turbulence={36}
          speed={57}
          style={{ position: "absolute", inset: 0 }}
        />
      )}
    </div>
  );
}
