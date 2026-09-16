"use client";

import Link from "next/link";
import NeonBorder from "@/components/NeonBorder";
import { useThemeVars } from "@/lib/useThemeVars";
import type { WeeklyRecap } from "./actions";

export function WeeklyRecapCard({ recap }: { recap: WeeklyRecap }) {
  const theme = useThemeVars(["--accent"] as const);
  const accentColor = theme["--accent"] || "#a97e2d";

  const lines: string[] = [];
  if (recap.signalDays > 0) {
    lines.push(`${recap.signalDays}/7 dias com sinal dos dois`);
  }
  if (recap.agendaDone > 0) {
    lines.push(`${recap.agendaDone} ${recap.agendaDone > 1 ? "planos" : "plano"} na agenda`);
  }
  if (recap.photosAdded > 0) {
    lines.push(`${recap.photosAdded} ${recap.photosAdded > 1 ? "fotos novas" : "foto nova"}`);
  }
  if (recap.challengesCompleted > 0) {
    lines.push(
      `${recap.challengesCompleted} ${recap.challengesCompleted > 1 ? "desafios cumpridos" : "desafio cumprido"}`
    );
  }

  if (lines.length === 0) return null;

  return (
    <div className="card flex flex-col gap-1.5">
      <NeonBorder
        style={{ position: "absolute", inset: 0, pointerEvents: "none" }}
        color={accentColor}
        rounded={34}
        thickness={2}
        borderSize={45}
        glow={0}
        speed={10}
      />
      <p className="section-label">essa semana vocês</p>
      {lines.map((line, i) => (
        <p key={i} className="text-sm text-ink">
          ✦ {line}
        </p>
      ))}
      <Link
        href="/app/diario"
        className="mt-1 text-[10px] text-ink-muted underline underline-offset-2 hover:text-ink"
      >
        ver diário completo
      </Link>
    </div>
  );
}
