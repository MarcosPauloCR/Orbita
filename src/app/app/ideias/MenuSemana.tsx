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
    <div className="flex flex-col gap-2 border-t border-hairline pt-2">
      <input
        type="date"
        value={day}
        onChange={(e) => setDay(e.target.value)}
        className="rounded-lg border border-hairline bg-surface px-2 py-1 text-xs text-ink"
      />
      <div className="flex gap-2">
        <button
          type="button"
          disabled={submitting || !day}
          onClick={() => decide("approved")}
          className="rounded-full bg-moon px-3 py-1.5 text-xs text-btn-ink disabled:opacity-50"
        >
          👍 aprovar
        </button>
        <button
          type="button"
          disabled={submitting}
          onClick={() => decide("rejected")}
          className="rounded-full border border-hairline px-3 py-1.5 text-xs text-ink disabled:opacity-50"
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

  return (
    <div className="flex flex-col gap-2 rounded-xl border border-hairline bg-surface p-3">
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
              className="text-[10px] text-ink-muted underline underline-offset-2"
            >
              ver receita
            </a>
          )}
        </div>
        {isMine && (
          <button
            type="button"
            onClick={() => onDelete(item.id)}
            className="text-[10px] text-ink-muted"
          >
            🗑
          </button>
        )}
      </div>

      {item.status === "pending" ? (
        isMine ? (
          <span className="text-xs text-ink-muted">aguardando avaliação</span>
        ) : (
          <ReviewForm item={item} onDone={onReviewed} />
        )
      ) : (
        <div className="flex flex-col gap-1">
          <span className="text-xs text-ink">
            {item.status === "approved" ? "✅ aprovado" : "❌ reprovado"}
          </span>
          {item.scheduled_day && (
            <span className="text-xs text-ink-muted">dia: {formatDay(item.scheduled_day)}</span>
          )}
          {item.status === "approved" && (
            <span className="text-xs text-ink-muted">
              {item.made_at ? "🍳 já feito" : ""}
            </span>
          )}
          {item.status === "approved" && !item.made_at && (
            <button
              type="button"
              disabled={marking}
              onClick={handleMade}
              className="self-start rounded-full border border-hairline px-3 py-1 text-[10px] text-ink disabled:opacity-50"
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
      <form onSubmit={handleSubmit} className="flex flex-col gap-2">
        <input
          type="text"
          value={dish}
          onChange={(e) => setDish(e.target.value)}
          placeholder="nome do prato"
          className="rounded-lg border border-hairline bg-surface px-3 py-2 text-xs text-ink"
        />
        <input
          type="url"
          value={recipeUrl}
          onChange={(e) => setRecipeUrl(e.target.value)}
          placeholder="link da receita (opcional)"
          className="rounded-lg border border-hairline bg-surface px-3 py-2 text-xs text-ink"
        />
        <div className="flex gap-2">
          <button
            type="submit"
            disabled={isSending || !dish.trim()}
            className="rounded-full bg-moon px-4 py-2 text-xs text-btn-ink disabled:opacity-50"
          >
            {isSending ? "enviando…" : "adicionar prato"}
          </button>
          <button
            type="button"
            disabled={isSuggesting}
            onClick={handleSuggest}
            className="rounded-full border border-hairline px-4 py-2 text-xs text-ink disabled:opacity-50"
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
          <h3 className="text-xs font-semibold text-ink-muted">pendentes</h3>
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
          <h3 className="text-xs font-semibold text-ink-muted">agenda da semana</h3>
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
          <h3 className="text-xs font-semibold text-ink-muted">histórico</h3>
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
