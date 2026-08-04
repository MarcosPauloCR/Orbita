"use client";

import { useEffect, useRef, useState } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import { addLine, getStory, type StoryLine } from "./actions";
import { useDeviceMode } from "../GameShell";

const CHANNEL = "orbita-historia";

export function HistoriaView({
  currentUserId,
  otherUserName,
}: {
  currentUserId: string;
  otherUserName: string;
}) {
  const isDesktop = useDeviceMode() === "desktop";
  const textSize = isDesktop ? "text-base" : "text-sm";
  const [lines, setLines] = useState<StoryLine[]>([]);
  const [myTurn, setMyTurn] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  async function refresh() {
    const { lines, myTurn } = await getStory();
    setLines(lines);
    setMyTurn(myTurn);
  }

  useEffect(() => {
    refresh().then(() => setLoaded(true));

    const supabase = createClient();
    const channel = supabase
      .channel(CHANNEL)
      .on("broadcast", { event: "update" }, () => refresh())
      .subscribe();
    channelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [lines.length]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!draft.trim()) return;

    setBusy(true);
    try {
      const result = await addLine(draft);
      if (!result.ok) {
        alert(result.error);
        return;
      }
      setDraft("");
      await refresh();
      channelRef.current?.send({ type: "broadcast", event: "update", payload: {} });
    } finally {
      setBusy(false);
    }
  }

  if (!loaded) return null;

  return (
    <div className="flex w-full min-h-0 flex-1 flex-col gap-3">
      <p className="text-[10px] uppercase tracking-wide text-ink-muted">
        continue a história
      </p>

      <div
        className={`flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto rounded-2xl border border-hairline bg-surface p-4 ${
          isDesktop ? "max-h-[60vh]" : ""
        }`}
      >
        {lines.length === 0 && (
          <p className="text-xs text-ink-muted">
            ninguém começou ainda — escreva a primeira frase.
          </p>
        )}
        {lines.map((line) => (
          <p key={line.id} className={`${textSize} text-ink`}>
            <span className="text-[10px] text-ink-muted">
              {line.from_user === currentUserId ? "você" : otherUserName}:
            </span>{" "}
            {line.content}
          </p>
        ))}
        <div ref={bottomRef} />
      </div>

      {myTurn ? (
        <form onSubmit={handleSubmit} className="flex gap-2">
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="continue a história..."
            className="flex-1 rounded-full border border-hairline bg-surface px-4 py-2 text-sm text-ink placeholder-ink-muted outline-none focus:border-ink-muted"
          />
          <button
            type="submit"
            disabled={busy || !draft.trim()}
            className="rounded-full bg-moon px-4 py-2 text-sm text-btn-ink disabled:opacity-50"
          >
            {busy ? "…" : "enviar"}
          </button>
        </form>
      ) : (
        <p className="text-center text-xs text-ink-muted">
          aguardando {otherUserName} continuar…
        </p>
      )}
    </div>
  );
}
