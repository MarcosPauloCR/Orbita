"use client";

import { useEffect, useRef, useState } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import {
  addMenuItem,
  requestMenuSuggestion,
  reviewMenuItem,
  markMenuItemMade,
  deleteMenuItem,
  type MenuItem,
} from "./menu-actions";

const MENU_CHANNEL = "orbita-menu";

function formatDay(day: string): string {
  return new Date(day + "T00:00:00").toLocaleDateString("pt-BR", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
  });
}

function ReviewForm({
  item,
  onDone,
}: {
  item: MenuItem;
  onDone: (updated: MenuItem) => void;
}) {
  const [day, setDay] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function decide(decision: "approved" | "rejected") {
    setSubmitting(true);
    try {
      const result = await reviewMenuItem(item.id, decision, decision === "approved" ? day : null);
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
      <input
        type="date"
        value={day}
        onChange={(e) => setDay(e.target.value)}
        className="input-field"
      />
      <div className="flex gap-2">
        <button
          type="button"
          disabled={submitting || !day}
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
      {!day && <span className="text-[10px] text-ink-muted">escolha um dia pra aprovar</span>}
    </div>
  );
}

function ItemCard({
  item,
  currentUserId,
  onReviewed,
  onMade,
  onDelete,
}: {
  item: MenuItem;
  currentUserId: string;
  onReviewed: (updated: MenuItem) => void;
  onMade: (updated: MenuItem) => void;
  onDelete: (id: string) => void;
}) {
  const isMine = item.from_user === currentUserId;
  const [marking, setMarking] = useState(false);

  async function handleMade() {
    setMarking(true);
    try {
      const result = await markMenuItemMade(item.id);
      if (!result.ok) {
        alert(result.error);
        return;
      }
      onMade(result.data);
    } finally {
      setMarking(false);
    }
  }

  const approved = item.status === "approved";
  return (
    <div className="card flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex flex-col">
          <span className="text-xs text-ink">
            {item.suggested_by_app && "🤖 "}
            {item.dish}
          </span>
          {item.recipe_url && (
            <a
              href={item.recipe_url}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-0.5 w-fit text-[10px]"
              style={{ color: "var(--accent)" }}
            >
              ver receita ↗
            </a>
          )}
        </div>
        {isMine && (
          <button
            type="button"
            onClick={() => onDelete(item.id)}
            className="flex h-7 w-7 items-center justify-center rounded-full text-ink-muted transition hover:bg-danger-soft hover:text-danger"
          >
            🗑
          </button>
        )}
      </div>

      {item.status === "pending" ? (
        isMine ? (
          <span className="chip w-fit">aguardando avaliação</span>
        ) : (
          <ReviewForm item={item} onDone={onReviewed} />
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
          {item.scheduled_day && (
            <span className="text-xs text-ink-muted">dia: {formatDay(item.scheduled_day)}</span>
          )}
          {approved && item.made_at && <span className="chip w-fit">🍳 já feito</span>}
          {approved && !item.made_at && (
            <button
              type="button"
              disabled={marking}
              onClick={handleMade}
              className="btn-secondary self-start !px-3 !py-1.5 !text-[10px]"
            >
              🍳 marcar como já feito
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export function MenuSemana({
  currentUserId,
  initialItems,
}: {
  currentUserId: string;
  initialItems: MenuItem[];
}) {
  const [items, setItems] = useState<MenuItem[]>(initialItems);
  const [dish, setDish] = useState("");
  const [recipeUrl, setRecipeUrl] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isSuggesting, setIsSuggesting] = useState(false);
  const channelRef = useRef<RealtimeChannel | null>(null);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase.channel(MENU_CHANNEL);
    channelRef.current = channel;

    channel
      .on("broadcast", { event: "added" }, ({ payload }) => {
        const item = payload as MenuItem;
        if (item.from_user === currentUserId) return;
        setItems((prev) => [item, ...prev]);
      })
      .on("broadcast", { event: "updated" }, ({ payload }) => {
        const item = payload as MenuItem;
        setItems((prev) => prev.map((i) => (i.id === item.id ? item : i)));
      })
      .on("broadcast", { event: "deleted" }, ({ payload }) => {
        const { id } = payload as { id: string };
        setItems((prev) => prev.filter((i) => i.id !== id));
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUserId]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!dish.trim()) return;

    setIsSending(true);
    try {
      const result = await addMenuItem(dish, recipeUrl);
      if (!result.ok) {
        alert(result.error);
        return;
      }
      setItems((prev) => [result.data, ...prev]);
      channelRef.current?.send({ type: "broadcast", event: "added", payload: result.data });
      setDish("");
      setRecipeUrl("");
    } finally {
      setIsSending(false);
    }
  }

  async function handleSuggest() {
    setIsSuggesting(true);
    try {
      const result = await requestMenuSuggestion();
      if (!result.ok) {
        alert(result.error);
        return;
      }
      setItems((prev) => [result.data, ...prev]);
      channelRef.current?.send({ type: "broadcast", event: "added", payload: result.data });
    } finally {
      setIsSuggesting(false);
    }
  }

  function handleUpdated(updated: MenuItem) {
    setItems((prev) => prev.map((i) => (i.id === updated.id ? updated : i)));
    channelRef.current?.send({ type: "broadcast", event: "updated", payload: updated });
  }

  async function handleDelete(id: string) {
    if (!confirm("Apagar esse prato?")) return;

    const result = await deleteMenuItem(id);
    if (!result.ok) {
      alert(result.error);
      return;
    }
    setItems((prev) => prev.filter((i) => i.id !== id));
    channelRef.current?.send({ type: "broadcast", event: "deleted", payload: { id } });
  }

  const pending = items.filter((i) => i.status === "pending");
  const agenda = items.filter((i) => i.status === "approved" && !i.made_at);
  const history = items.filter((i) => i.status === "rejected" || (i.status === "approved" && i.made_at));

  return (
    <div className="flex flex-col gap-4">
      <form onSubmit={handleSubmit} className="card-flush flex flex-col gap-2 p-3">
        <input
          type="text"
          value={dish}
          onChange={(e) => setDish(e.target.value)}
          placeholder="nome do prato"
          className="input-field"
        />
        <input
          type="url"
          value={recipeUrl}
          onChange={(e) => setRecipeUrl(e.target.value)}
          placeholder="link da receita (opcional)"
          className="input-field"
        />
        <div className="flex gap-2">
          <button
            type="submit"
            disabled={isSending || !dish.trim()}
            className="btn-primary"
          >
            {isSending ? "enviando…" : "adicionar prato"}
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

      {items.length === 0 && (
        <p className="text-center text-xs text-ink-muted">nenhum prato ainda</p>
      )}

      {pending.length > 0 && (
        <div className="flex flex-col gap-2">
          <h3 className="section-label">pendentes</h3>
          {pending.map((item) => (
            <ItemCard
              key={item.id}
              item={item}
              currentUserId={currentUserId}
              onReviewed={handleUpdated}
              onMade={handleUpdated}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      {agenda.length > 0 && (
        <div className="flex flex-col gap-2">
          <h3 className="section-label">agenda da semana</h3>
          {agenda.map((item) => (
            <ItemCard
              key={item.id}
              item={item}
              currentUserId={currentUserId}
              onReviewed={handleUpdated}
              onMade={handleUpdated}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      {history.length > 0 && (
        <div className="flex flex-col gap-2">
          <h3 className="section-label">histórico</h3>
          {history.map((item) => (
            <ItemCard
              key={item.id}
              item={item}
              currentUserId={currentUserId}
              onReviewed={handleUpdated}
              onMade={handleUpdated}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
}
