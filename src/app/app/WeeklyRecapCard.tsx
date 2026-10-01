"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import NeonBorder from "@/components/NeonBorder";
import { TrophyIcon } from "@/components/TrophyIcon";
import { useThemeVars } from "@/lib/useThemeVars";
import { CHALLENGES } from "@/lib/challenges";
import { brazilDateKey } from "@/lib/daily-questions";
import { ACTIVITY_LABELS } from "./agenda/activity-labels";
import type { AgendaItem } from "./agenda/actions";
import type { WeeklyRecap } from "./actions";

const WEEKDAYS = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];
const CHALLENGE_BY_ID = new Map(CHALLENGES.map((c) => [c.id, c]));

function weekday(key: string): string {
  return WEEKDAYS[new Date(`${key}T00:00:00Z`).getUTCDay()];
}

function dayMonth(key: string): string {
  return `${key.slice(8, 10)}/${key.slice(5, 7)}`;
}

function agendaLabel(item: AgendaItem): string {
  if (item.locked) return "🎁 surpresa";
  const meta = ACTIVITY_LABELS[item.activity_type];
  const detail = item.movie_title ?? item.menu_dish ?? item.food_title ?? item.description;
  return detail ? `${meta.icon} ${meta.label} · ${detail}` : `${meta.icon} ${meta.label}`;
}

function Section({ text, open, children }: { text: string; open: boolean; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <p className="text-sm text-ink">✦ {text}</p>
      {open && <div className="pb-1 pl-4">{children}</div>}
    </div>
  );
}

export function WeeklyRecapCard({ recap }: { recap: WeeklyRecap }) {
  const theme = useThemeVars(["--accent"] as const);
  const accentColor = theme["--accent"] || "#a97e2d";
  const [open, setOpen] = useState(false);

  const signalDays = recap.days.filter((d) => d.mutual).length;
  const { agendaItems, photos } = recap;
  const challenges = recap.challenges.flatMap((c) => {
    const challenge = CHALLENGE_BY_ID.get(c.id);
    return challenge ? [{ ...challenge, completed_at: c.completed_at }] : [];
  });

  if (
    signalDays === 0 &&
    agendaItems.length === 0 &&
    photos.length === 0 &&
    challenges.length === 0
  ) {
    return null;
  }

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

      {signalDays > 0 && (
        <Section text={`${signalDays}/7 dias com sinal dos dois`} open={open}>
          <div className="flex gap-1">
            {recap.days.map((d) => (
              <span
                key={d.key}
                className={`flex flex-1 flex-col items-center rounded-lg py-1 text-[9px] leading-tight ${
                  d.mutual ? "bg-accent-soft text-ink" : "bg-surface-strong text-ink-muted opacity-60"
                }`}
              >
                <span>{weekday(d.key)}</span>
                <span className="text-[11px]">{Number(d.key.slice(8, 10))}</span>
              </span>
            ))}
          </div>
        </Section>
      )}

      {agendaItems.length > 0 && (
        <Section
          text={`${agendaItems.length} ${agendaItems.length > 1 ? "planos" : "plano"} na agenda`}
          open={open}
        >
          <ul className="flex flex-col gap-1">
            {agendaItems.map((item) => (
              <li key={item.id} className="text-xs text-ink-muted">
                <span className="text-ink">
                  {weekday(item.day)} {dayMonth(item.day)}
                </span>{" "}
                · {agendaLabel(item)}
              </li>
            ))}
          </ul>
        </Section>
      )}

      {photos.length > 0 && (
        <Section
          text={`${photos.length} ${photos.length > 1 ? "fotos novas" : "foto nova"}`}
          open={open}
        >
          <Link href="/app/galeria" className="flex flex-wrap gap-1.5">
            {photos.map((p) => (
              <img key={p.id} src={p.url} alt="" className="h-12 w-12 rounded-lg object-cover" />
            ))}
          </Link>
        </Section>
      )}

      {challenges.length > 0 && (
        <Section
          text={`${challenges.length} ${challenges.length > 1 ? "desafios cumpridos" : "desafio cumprido"}`}
          open={open}
        >
          <ul className="flex flex-col gap-1.5">
            {challenges.map((c) => (
              <li key={c.id} className="flex items-center gap-2">
                <TrophyIcon
                  kind={c.iconKind}
                  className="h-5 w-5 shrink-0"
                  color1={c.color1}
                  color2={c.color2}
                />
                <span className="flex-1 text-xs text-ink">{c.name}</span>
                <span className="shrink-0 text-[10px] text-ink-muted">
                  {dayMonth(brazilDateKey(new Date(c.completed_at)))}
                </span>
              </li>
            ))}
          </ul>
        </Section>
      )}

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="mt-1 self-start text-[10px] text-ink-muted underline underline-offset-2 hover:text-ink"
      >
        {open ? "esconder detalhes" : "ver detalhes"}
      </button>
    </div>
  );
}
