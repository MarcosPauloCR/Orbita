"use client";

import { useState } from "react";
import Link from "next/link";
import type { DiaryEntry } from "./actions";

const ACTIVITY_ICON: Record<string, string> = {
  sair: "🧭",
  filme: "🎬",
  cozinhar: "🍳",
  dormir: "🌙",
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

export function DiarioView({
  currentUserId,
  userNames,
  entries,
}: {
  currentUserId: string;
  userNames: Record<string, string>;
  entries: DiaryEntry[];
}) {
  const [lightbox, setLightbox] = useState<string | null>(null);

  function nameFor(id: string): string {
    return id === currentUserId ? "você" : userNames[id] ?? "alguém";
  }

  return (
    <div className="flex w-full max-w-sm flex-1 flex-col gap-4 overflow-y-auto overflow-x-hidden min-h-0 pb-4">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-xl text-ink">Diário</h1>
        <Link
          href="/app"
          className="text-xs text-ink-muted underline underline-offset-2 hover:text-ink"
        >
          voltar
        </Link>
      </div>

      {entries.length === 0 && (
        <p className="text-center text-xs text-ink-muted">
          ainda sem memórias guardadas — fotos, retrospectivas da agenda, cápsulas abertas e
          perguntas respondidas pelos dois vão aparecer aqui.
        </p>
      )}

      <div className="flex flex-col gap-3">
        {entries.map((entry) => (
          <div key={`${entry.kind}-${entry.id}`} className="card flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-ink-muted">{formatDate(entry.at)}</span>
              <span className="text-sm">
                {entry.kind === "photo" && "📷"}
                {entry.kind === "recap" && (ACTIVITY_ICON[entry.activity_type] ?? "📌")}
                {entry.kind === "capsule" && "✉️"}
                {entry.kind === "answer" && "💬"}
              </span>
            </div>

            {entry.kind === "photo" && (
              <>
                <button
                  type="button"
                  onClick={() => setLightbox(entry.url)}
                  className="overflow-hidden rounded-xl"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={entry.url} alt="" className="h-40 w-full object-cover" />
                </button>
                <p className="text-[10px] text-ink-muted">foto de {nameFor(entry.from_user)}</p>
              </>
            )}

            {entry.kind === "recap" && (
              <>
                {entry.title && <p className="text-xs font-medium text-ink">{entry.title}</p>}
                <p className="text-xs text-ink-muted">{entry.text}</p>
              </>
            )}

            {entry.kind === "capsule" && (
              <>
                {entry.message && <p className="text-xs text-ink">{entry.message}</p>}
                {entry.photoUrl && (
                  <button
                    type="button"
                    onClick={() => setLightbox(entry.photoUrl!)}
                    className="overflow-hidden rounded-xl"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={entry.photoUrl} alt="" className="h-40 w-full object-cover" />
                  </button>
                )}
                <p className="text-[10px] text-ink-muted">cápsula de {nameFor(entry.from_user)}</p>
              </>
            )}

            {entry.kind === "answer" && (
              <>
                <p className="text-xs font-medium text-ink">{entry.question}</p>
                {entry.answers.map((a, i) => (
                  <p key={i} className="text-xs text-ink-muted">
                    <span className="text-ink">{nameFor(a.from_user)}:</span> {a.text}
                  </p>
                ))}
              </>
            )}
          </div>
        ))}
      </div>

      {lightbox && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          onClick={() => setLightbox(null)}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={lightbox} alt="" className="max-h-full max-w-full rounded-2xl object-contain" />
        </div>
      )}
    </div>
  );
}
