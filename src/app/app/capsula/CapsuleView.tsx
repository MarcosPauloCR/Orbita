"use client";

import { useEffect, useMemo, useState } from "react";
import { createCapsule, getCapsules, openCapsule, type Capsule } from "./actions";

function nowLocalInputValue(): string {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
}

function formatCountdown(unlockAt: string, now: number): string {
  const diff = new Date(unlockAt).getTime() - now;
  if (diff <= 0) return "pronta pra abrir";
  const days = Math.floor(diff / 86400000);
  const hours = Math.floor((diff % 86400000) / 3600000);
  const minutes = Math.floor((diff % 3600000) / 60000);
  if (days > 0) return `abre em ${days}d ${hours}h`;
  if (hours > 0) return `abre em ${hours}h ${minutes}min`;
  return `abre em ${minutes}min`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function CapsuleView({
  currentUserId,
  userNames,
  initialCapsules,
}: {
  currentUserId: string;
  userNames: Record<string, string>;
  initialCapsules: Capsule[];
}) {
  const [capsules, setCapsules] = useState<Capsule[]>(initialCapsules);
  const [isSending, setIsSending] = useState(false);
  const [openingId, setOpeningId] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(interval);
  }, []);

  const minDate = useMemo(nowLocalInputValue, []);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);

    setIsSending(true);
    try {
      const result = await createCapsule(formData);
      if (!result.ok) {
        alert(result.error);
        return;
      }
      form.reset();
      setCapsules(await getCapsules());
    } finally {
      setIsSending(false);
    }
  }

  async function handleOpen(id: string) {
    setOpeningId(id);
    try {
      const result = await openCapsule(id);
      if (!result.ok) {
        alert(result.error);
        return;
      }
      setCapsules((prev) => prev.map((c) => (c.id === id ? result.data : c)));
    } finally {
      setOpeningId(null);
    }
  }

  return (
    <div className="flex w-full max-w-sm min-h-0 flex-1 flex-col gap-6 overflow-y-auto pb-4">
      <form
        onSubmit={handleSubmit}
        className="flex flex-col gap-2 border-b border-hairline pb-4"
      >
        <textarea
          name="message"
          placeholder="Escreva algo pro futuro..."
          rows={3}
          className="resize-none rounded-xl border border-hairline bg-surface px-3 py-2 text-sm text-ink placeholder-ink-muted outline-none focus:border-ink-muted"
        />
        <input
          type="file"
          name="photo"
          accept="image/*"
          className="text-xs text-ink-muted file:mr-3 file:rounded-full file:border-0 file:bg-moon file:px-3 file:py-1.5 file:text-xs file:text-btn-ink"
        />
        <label className="flex flex-col gap-1 text-xs text-ink-muted">
          abre em
          <input
            type="datetime-local"
            name="unlockAt"
            min={minDate}
            required
            className="rounded-xl border border-hairline bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-ink-muted"
          />
        </label>
        <button
          type="submit"
          disabled={isSending}
          className="self-start rounded-full bg-moon px-4 py-2 text-xs text-btn-ink disabled:opacity-50"
        >
          {isSending ? "criando…" : "criar cápsula"}
        </button>
        <p className="text-[10px] text-ink-muted">
          depois de criada, ninguém consegue abrir antes da data — nem apagar.
        </p>
      </form>

      <div className="flex flex-col gap-3">
        {capsules.length === 0 && (
          <p className="text-xs text-ink-muted">nenhuma cápsula ainda.</p>
        )}
        {capsules.map((capsule) => {
          const isMine = capsule.from_user === currentUserId;
          const isOpened = capsule.opened_at !== null;
          const isLocked = !isOpened && new Date(capsule.unlock_at).getTime() > now;

          return (
            <div
              key={capsule.id}
              className="rounded-2xl border border-hairline bg-surface p-4"
            >
              <p className="mb-1 text-[10px] uppercase tracking-wide text-ink-muted">
                {isMine ? "você enviou" : "pra você"}
              </p>

              {isLocked && (
                <p className="text-sm text-ink-muted">
                  🔒 {formatCountdown(capsule.unlock_at, now)}
                </p>
              )}

              {!isLocked && !isOpened && (
                <button
                  onClick={() => handleOpen(capsule.id)}
                  disabled={openingId === capsule.id}
                  className="rounded-full bg-moon px-4 py-1.5 text-xs text-btn-ink disabled:opacity-50"
                >
                  {openingId === capsule.id ? "abrindo…" : "🎁 abrir"}
                </button>
              )}

              {isOpened && (
                <div className="flex flex-col gap-2">
                  {capsule.photoUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={capsule.photoUrl}
                      alt=""
                      className="max-h-64 w-full rounded-xl object-cover"
                    />
                  )}
                  {capsule.message && (
                    <p className="text-sm text-ink">{capsule.message}</p>
                  )}
                  <p className="text-[10px] text-ink-muted">
                    aberta por{" "}
                    {capsule.opened_by === currentUserId
                      ? "você"
                      : userNames[capsule.opened_by ?? ""] ?? "alguém"}{" "}
                    em {formatDate(capsule.opened_at!)}
                  </p>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
