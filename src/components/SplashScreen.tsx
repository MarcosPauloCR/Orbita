"use client";

import { useEffect, useState } from "react";

// Só aparece uma vez por abertura real do app (primeiro mount do layout
// autenticado — login, refresh, PWA abrindo do zero). Trocar de aba não
// remonta o layout, então isso não repete a cada navegação.
export function SplashScreen() {
  const [visible, setVisible] = useState(true);
  const [fading, setFading] = useState(false);

  useEffect(() => {
    const fadeTimer = setTimeout(() => setFading(true), 850);
    const removeTimer = setTimeout(() => setVisible(false), 1350);
    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(removeTimer);
    };
  }, []);

  if (!visible) return null;

  return (
    <div
      className={`fixed inset-0 z-[100] flex items-center justify-center transition-opacity duration-500 ease-out ${
        fading ? "pointer-events-none opacity-0" : "opacity-100"
      }`}
      style={{ background: "var(--canvas)" }}
    >
      <span className="animate-fade-in font-display text-3xl tracking-[0.2em] text-ink">
        Órbita
      </span>
    </div>
  );
}
