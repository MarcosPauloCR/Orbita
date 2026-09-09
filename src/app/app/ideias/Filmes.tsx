"use client";

import { useEffect, useRef, useState } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import { StarPicker } from "./StarPicker";
import {
  addMovieShare,
  requestMovieSuggestion,
  reviewMovieShare,
  markMovieWatched,
  deleteMovieShare,
  type MovieShare,
} from "./movie-actions";

const MOVIE_CHANNEL = "orbita-movies";

function ReviewForm({
  share,
  onDone,
}: {
  share: MovieShare;
  onDone: (updated: MovieShare) => void;
}) {
  const [rating, setRating] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function decide(decision: "approved" | "rejected") {
    setSubmitting(true);
    try {
      const result = await reviewMovieShare(share.id, decision, rating);
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

function ShareCard({
  share,
  currentUserId,
  onReviewed,
  onWatched,
  onDelete,
}: {
  share: MovieShare;
  currentUserId: string;
  onReviewed: (updated: MovieShare) => void;
  onWatched: (updated: MovieShare) => void;
  onDelete: (id: string) => void;
}) {
  const isMine = share.from_user === currentUserId;
  const [marking, setMarking] = useState(false);

  async function handleWatched() {
    setMarking(true);
    try {
      const result = await markMovieWatched(share.id);
      if (!result.ok) {
        alert(result.error);
        return;
      }
      onWatched(result.data);
    } finally {
      setMarking(false);
    }
  }

  const approved = share.status === "approved";
  return (
    <div className="card flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex flex-col">
          <span className="text-xs text-ink">
            {share.suggested_by_app && "🤖 "}
            {share.title}
          </span>
          {share.link_url && (
            <a
              href={share.link_url}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-0.5 w-fit text-[10px]"
              style={{ color: "var(--accent)" }}
            >
              ver trailer/sinopse ↗
            </a>
          )}
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
          {approved && share.watched_at && <span className="chip w-fit">🎬 já assistido</span>}
          {approved && !share.watched_at && (
            <button
              type="button"
              disabled={marking}
              onClick={handleWatched}
              className="btn-secondary self-start !px-3 !py-1.5 !text-[10px]"
            >
              🎬 marcar como já assistido
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export function Filmes({
  currentUserId,
  initialShares,
}: {
  currentUserId: string;
  initialShares: MovieShare[];
}) {
  const [shares, setShares] = useState<MovieShare[]>(initialShares);
  const [title, setTitle] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isSuggesting, setIsSuggesting] = useState(false);
  const channelRef = useRef<RealtimeChannel | null>(null);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase.channel(MOVIE_CHANNEL);
    channelRef.current = channel;

    channel
      .on("broadcast", { event: "added" }, ({ payload }) => {
        const share = payload as MovieShare;
        if (share.from_user === currentUserId) return;
        setShares((prev) => [share, ...prev]);
      })
      .on("broadcast", { event: "updated" }, ({ payload }) => {
        const share = payload as MovieShare;
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
    if (!title.trim()) return;

    setIsSending(true);
    try {
      const result = await addMovieShare(title, linkUrl);
      if (!result.ok) {
        alert(result.error);
        return;
      }
      setShares((prev) => [result.data, ...prev]);
      channelRef.current?.send({ type: "broadcast", event: "added", payload: result.data });
      setTitle("");
      setLinkUrl("");
    } finally {
      setIsSending(false);
    }
  }

  async function handleSuggest() {
    setIsSuggesting(true);
    try {
      const result = await requestMovieSuggestion();
      if (!result.ok) {
        alert(result.error);
        return;
      }
      setShares((prev) => [result.data, ...prev]);
      channelRef.current?.send({ type: "broadcast", event: "added", payload: result.data });
    } finally {
      setIsSuggesting(false);
    }
  }

  function handleUpdated(updated: MovieShare) {
    setShares((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
    channelRef.current?.send({ type: "broadcast", event: "updated", payload: updated });
  }

  async function handleDelete(id: string) {
    if (!confirm("Apagar esse item?")) return;

    const result = await deleteMovieShare(id);
    if (!result.ok) {
      alert(result.error);
      return;
    }
    setShares((prev) => prev.filter((s) => s.id !== id));
    channelRef.current?.send({ type: "broadcast", event: "deleted", payload: { id } });
  }

  const pending = shares.filter((s) => s.status === "pending");
  const toWatch = shares.filter((s) => s.status === "approved" && !s.watched_at);
  const history = shares.filter((s) => s.status === "rejected" || (s.status === "approved" && s.watched_at));

  return (
    <div className="flex flex-col gap-4">
      <form onSubmit={handleSubmit} className="card-flush flex flex-col gap-2 p-3">
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="nome do filme/série"
          className="input-field"
        />
        <input
          type="url"
          value={linkUrl}
          onChange={(e) => setLinkUrl(e.target.value)}
          placeholder="link de trailer/sinopse (opcional)"
          className="input-field"
        />
        <div className="flex gap-2">
          <button
            type="submit"
            disabled={isSending || !title.trim()}
            className="btn-primary"
          >
            {isSending ? "enviando…" : "adicionar"}
          </button>
          <button
            type="button"
            disabled={isSuggesting}
            onClick={handleSuggest}
            className="btn-secondary"
          >
            {isSuggesting ? "sorteando…" : "🤖 sugestão do app"}
          </button>
        </div>
      </form>

      {shares.length === 0 && (
        <p className="text-center text-xs text-ink-muted">nada por aqui ainda</p>
      )}

      {pending.length > 0 && (
        <div className="flex flex-col gap-2">
          <h3 className="section-label">pendentes</h3>
          {pending.map((share) => (
            <ShareCard
              key={share.id}
              share={share}
              currentUserId={currentUserId}
              onReviewed={handleUpdated}
              onWatched={handleUpdated}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      {toWatch.length > 0 && (
        <div className="flex flex-col gap-2">
          <h3 className="section-label">pra assistir</h3>
          {toWatch.map((share) => (
            <ShareCard
              key={share.id}
              share={share}
              currentUserId={currentUserId}
              onReviewed={handleUpdated}
              onWatched={handleUpdated}
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
              onReviewed={handleUpdated}
              onWatched={handleUpdated}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
}
