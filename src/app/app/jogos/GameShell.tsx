"use client";

import { createContext, useContext, useEffect, useState } from "react";

export type DeviceMode = "mobile" | "desktop";
const STORAGE_KEY = "orbita-game-device-mode";

const DeviceModeContext = createContext<DeviceMode>("mobile");

/** Cada jogo usa isso pra decidir tamanho de célula/fonte — "desktop"
 * deve renderizar elementos visivelmente maiores, não só um container
 * mais largo em volta do mesmo conteúdo pequeno. */
export function useDeviceMode(): DeviceMode {
  return useContext(DeviceModeContext);
}

export function GameShell({ children }: { children: React.ReactNode }) {
  const [mode, setMode] = useState<DeviceMode | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    setMode(saved === "mobile" || saved === "desktop" ? saved : null);
    setReady(true);
  }, []);

  function choose(next: DeviceMode) {
    localStorage.setItem(STORAGE_KEY, next);
    setMode(next);
  }

  if (!ready) return null;

  if (!mode) {
    return (
      <div className="flex w-full max-w-sm flex-1 flex-col items-center justify-center gap-4">
        <p className="text-center text-sm text-ink-muted">
          como você tá jogando?
        </p>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => choose("mobile")}
            className="rounded-full bg-moon px-5 py-2 text-sm text-btn-ink"
          >
            📱 celular
          </button>
          <button
            type="button"
            onClick={() => choose("desktop")}
            className="rounded-full border border-hairline px-5 py-2 text-sm text-ink"
          >
            💻 computador
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`flex w-full flex-1 flex-col items-center gap-2 ${
        mode === "desktop" ? "max-w-3xl" : "max-w-sm"
      }`}
    >
      <button
        type="button"
        onClick={() => setMode(null)}
        className="self-end text-[10px] text-ink-muted underline underline-offset-2"
      >
        trocar dispositivo
      </button>
      <DeviceModeContext.Provider value={mode}>
        {children}
      </DeviceModeContext.Provider>
    </div>
  );
}
