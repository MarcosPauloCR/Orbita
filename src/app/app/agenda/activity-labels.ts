import type { ActivityType } from "./actions";

export const ACTIVITY_LABELS: Record<ActivityType, { icon: string; label: string }> = {
  sair: { icon: "🚗", label: "sair" },
  filme: { icon: "🎬", label: "assistir filme" },
  cozinhar: { icon: "🍳", label: "cozinhar" },
  dormir: { icon: "🛌", label: "dormir agarradinho" },
};
