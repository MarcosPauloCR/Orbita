"use client";

import { useEffect, useRef, useState } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import { StarPicker } from "./StarPicker";
import {
  shareFoodVideo,
  reviewFoodShare,
  deleteFoodShare,
  type FoodShare,
} from "./food-actions";

const FOOD_CHANNEL = "orbita-food";

function ReviewForm({
  share,
  onDone,
}: {
  share: FoodShare;
  onDone: (updated: FoodShare) => void;
}) {
  const [rating, setRating] = useState<number | null>(null);
  const [suggestEnabled, setSuggestEnabled] = useState(false);
  const [date, setDate] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function decide(decision: "approved" | "rejected") {
    setSubmitting(true);
    try {
      const suggestedDate = suggestEnabled && date ? date : null;
      const result = await reviewFoodShare(share.id, decision, rating, suggestedDate);
      if (!result.ok) {
        alert(result.error);
        return;
      }
      onDone(result.data);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col gap-3 border-t border-hairline pt-3">
      <StarPicker value={rating} onChange={setRating} />
      <label className="flex items-center gap-2 text-xs text-ink-muted">
        <input
          type="checkbox"
          className="h-3.5 w-3.5 accent-[var(--accent)]"
          checked={suggestEnabled}
          onChange={(e) => setSuggestEnabled(e.target.checked)}
        />
        sugerir uma data pra fazer
      </label>
      {suggestEnabled && (
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="input-field"
        />
      )}
      <div className="flex gap-2">
        <button
          type="button"
          disabled={submitting}
          onClick={() => decide("approved")}
          className="btn-primary"
        >
          👍 aprovar
        </button>
        <button
          type="button"
          disabled={submitting}
          onClick={() => decide("rejected")}
          className="btn-secondary"
        >
          👎 reprovar
        </button>
      </div>
    </div>
  );
}

function StatusBadge({ share }: { share: FoodShare }) {
  const approved = share.status === "approved";
  return (
    <div className="flex flex-col gap-1.5">
      <span
        className="inline-flex w-fit items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-medium"
        style={{
          color: approved ? "var(--accent)" : "var(--danger)",
          background: approved ? "var(--accent-soft)" : "var(--danger-soft)",
        }}
      >
        {approved ? "✅ aprovado" : "❌ reprovado"}
      </span>
      {share.rating !== null && (
        <span className="text-xs text-ink-muted">nota: {share.rating}/10</span>
      )}
      {share.suggested_date && (
        <span className="text-xs text-ink-muted">
          data sugerida:{" "}
          {new Date(share.suggested_date + "T00:00:00").toLocaleDateString("pt-BR")}
        </span>
      )}
    </div>
  );
}

function ShareCard({
  share,
  currentUserId,
  onReviewed,
  onDelete,
}: {
  share: FoodShare;
  currentUserId: string;
  onReviewed: (updated: FoodShare) => void;
  onDelete: (id: string) => void;
}) {
  const isMine = share.from_user === currentUserId;

  return (
    <div className="card flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 flex-col">
          <span className="truncate text-xs text-ink">{share.title || "vídeo sem nome"}</span>
          <a
            href={share.url}
            target="_blank"
            rel="noopener noreferrer"
            className="w-fit text-[10px]"
            style={{ color: "var(--accent)" }}
          >
            ▶️ abrir vídeo
          </a>
        </div>
        {isMine && (
          <button
            type="button"
            onClick={() => onDelete(share.id)}
            className="flex h-7 w-7 items-center justify-center rounded-full text-ink-muted transition hover:bg-danger-soft hover:text-danger"
          >
            🗑
          </button>
        )}
      </div>

      {share.status === "pending" ? (
        isMine ? (
          <span className="chip w-fit">aguardando avaliação</span>
        ) : (
          <ReviewForm share={share} onDone={onReviewed} />
        )
      ) : (
        <StatusBadge share={share} />
      )}
    </div>
  );
}

export function FoodVideos({
  currentUserId,
  initialShares,
}: {
  currentUserId: string;
  initialShares: FoodShare[];
}) {
  const [shares, setShares] = useState<FoodShare[]>(initialShares);
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [isSending, setIsSending] = useState(false);
  const channelRef = useRef<RealtimeChannel | null>(null);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase.channel(FOOD_CHANNEL);
    channelRef.current = channel;

    channel
      .on("broadcast", { event: "shared" }, ({ payload }) => {
        const share = payload as FoodShare;
        if (share.from_user === currentUserId) return;
        setShares((prev) => [share, ...prev]);
      })
      .on("broadcast", { event: "reviewed" }, ({ payload }) => {
        const share = payload as FoodShare;
        setShares((prev) => prev.map((s) => (s.id === share.id ? share : s)));
      })
      .on("broadcast", { event: "deleted" }, ({ payload }) => {
        const { id } = payload as { id: string };
        setShares((prev) => prev.filter((s) => s.id !== id));
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUserId]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!title.trim() || !url.trim()) return;

    setIsSending(true);
    try {
      const result = await shareFoodVideo(title, url);
      if (!result.ok) {
        alert(result.error);
        return;
      }
      setShares((prev) => [result.data, ...prev]);
      channelRef.current?.send({ type: "broadcast", event: "shared", payload: result.data });
      setTitle("");
      setUrl("");
    } finally {
      setIsSending(false);
    }
  }

  function handleReviewed(updated: FoodShare) {
    setShares((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
    channelRef.current?.send({ type: "broadcast", event: "reviewed", payload: updated });
  }

  async function handleDelete(id: string) {
    if (!confirm("Apagar esse compartilhamento?")) return;

    const result = await deleteFoodShare(id);
    if (!result.ok) {
      alert(result.error);
      return;
    }
    setShares((prev) => prev.filter((s) => s.id !== id));
    channelRef.current?.send({ type: "broadcast", event: "deleted", payload: { id } });
  }

  const pending = shares.filter((s) => s.status === "pending");
  const history = shares.filter((s) => s.status !== "pending");

  return (
    <div className="flex flex-col gap-4">
      <form onSubmit={handleSubmit} className="card-flush flex flex-col gap-2 p-3">
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="nome do prato (ex: brigadeiro gourmet)"
          className="input-field"
        />
        <input
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="cole o link do vídeo"
          className="input-field"
        />
        <button
          type="submit"
          disabled={isSending || !title.trim() || !url.trim()}
          className="btn-primary self-start"
        >
          {isSending ? "enviando…" : "🍽️ compartilhar vídeo"}
        </button>
      </form>

      {shares.length === 0 && (
        <p className="text-center text-xs text-ink-muted">
          nenhum vídeo compartilhado ainda
        </p>
      )}

      {pending.length > 0 && (
        <div className="flex flex-col gap-2">
          <h3 className="section-label">pendentes</h3>
          {pending.map((share) => (
            <ShareCard
              key={share.id}
              share={share}
              currentUserId={currentUserId}
              onReviewed={handleReviewed}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      {history.length > 0 && (
        <div className="flex flex-col gap-2">
          <h3 className="section-label">histórico</h3>
          {history.map((share) => (
            <ShareCard
              key={share.id}
              share={share}
              currentUserId={currentUserId}
              onReviewed={handleReviewed}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
}
