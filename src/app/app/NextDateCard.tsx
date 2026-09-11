"use client";

import Link from "next/link";
import NeonBorder from "@/components/NeonBorder";
import { useThemeVars } from "@/lib/useThemeVars";

export function NextDateCard({ day }: { day: string | null }) {
  const theme = useThemeVars(["--accent"] as const);
  const accentColor = theme["--accent"] || "#a97e2d";

  if (!day) return null;

  const target = new Date(`${day}T00:00:00`);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diffDays = Math.round((target.getTime() - today.getTime()) / 86400000);
  const weekday = target.toLocaleDateString("pt-BR", { weekday: "long" });

  let text: string;
  if (diffDays === 0) text = "hoje é o dia do nosso encontro! 🎉";
  else if (diffDays === 1) text = `amanhã é o encontro (${weekday})`;
  else text = `faltam ${diffDays} dias pro nosso encontro de ${weekday}`;

  return (
    <Link href="/app/agenda" className="card flex items-center gap-3">
      <NeonBorder
        style={{ position: "absolute", inset: 0, pointerEvents: "none" }}
        color={accentColor}
        rounded={34}
        thickness={2}
        borderSize={45}
        glow={0}
        speed={10}
      />
      <span className="text-lg">📅</span>
      <span className="text-xs text-ink">{text}</span>
    </Link>
  );
}
