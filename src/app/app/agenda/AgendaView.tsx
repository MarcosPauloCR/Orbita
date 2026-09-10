"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import {
  addAgendaItem,
  addAgendaRecap,
  deleteAgendaItem,
  getAgendaItems,
  getAgendaPickerOptions,
  type AgendaItem,
  type ActivityType,
  type MovieOption,
  type CookingOption,
} from "./actions";

const AGENDA_CHANNEL = "orbita-agenda";

const WEEKDAYS = ["D", "S", "T", "Q", "Q", "S", "S"];
const MONTH_NAMES = [
  "janeiro", "fevereiro", "março", "abril", "maio", "junho",
  "julho", "agosto", "setembro", "outubro", "novembro", "dezembro",
];

const ACTIVITY_LABELS: Record<ActivityType, { icon: string; label: string }> = {
  sair: { icon: "🚗", label: "sair" },
  filme: { icon: "🎬", label: "assistir filme" },
  cozinhar: { icon: "🍳", label: "cozinhar" },
  dormir: { icon: "🛌", label: "dormir agarradinho" },
};

function dateKey(y: number, m: number, d: number): string {
  return `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

function todayKey(): string {
  const now = new Date();
  return dateKey(now.getFullYear(), now.getMonth(), now.getDate());
}

function formatDayHeading(key: string): string {
  const formatted = new Date(`${key}T00:00:00`).toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
  });
  return formatted.charAt(0).toUpperCase() + formatted.slice(1);
}

// Segunda-feira da semana que contém `date`.
function startOfWeek(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

type FormPreset = {
  activityType: ActivityType;
  movieShareId?: string;
  foodShareId?: string;
  menuItemId?: string;
};

function RecapBox({
  itemId,
  onSaved,
}: {
  itemId: string;
  onSaved: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [saving, setSaving] = useState(false);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="chip w-fit"
      >
        💭 como foi?
      </button>
    );
  }

  async function handleSave() {
    setSaving(true);
    try {
      const result = await addAgendaRecap(itemId, text);
      if (!result.ok) {
        alert(result.error);
        return;
      }
      onSaved();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-1.5">
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={2}
        placeholder="como foi?"
        className="input-field resize-none !text-xs"
      />
      <button
        type="button"
        disabled={saving || !text.trim()}
        onClick={handleSave}
        className="btn-secondary self-start !px-3 !py-1.5 !text-[10px]"
      >
        {saving ? "salvando…" : "salvar"}
      </button>
    </div>
  );
}

function AgendaItemCard({
  item,
  onDelete,
  onRecapSaved,
}: {
  item: AgendaItem;
  onDelete: (id: string) => void;
  onRecapSaved: () => void;
}) {
  const isPast = item.day < todayKey();

  if (item.locked) {
    return (
      <div className="card flex items-center gap-2">
        <span className="text-xs text-ink">
          🎁 surpresa — revela {item.meeting_time ? `às ${item.meeting_time.slice(0, 5)}` : "no dia"}
        </span>
      </div>
    );
  }

  const meta = ACTIVITY_LABELS[item.activity_type];

  return (
    <div className="card flex flex-col gap-2">
      <div className="flex items-start justify-between gap-2">
        <div className="flex flex-col gap-1">
          <span className="text-xs text-ink">
            {meta.icon} {meta.label}
            {item.meeting_time && (
              <span className="text-ink-muted"> · {item.meeting_time.slice(0, 5)}</span>
            )}
            {item.is_surprise && <span className="text-ink-muted"> · 🎁</span>}
          </span>
          {item.activity_type === "sair" && item.description && (
            <span className="text-xs text-ink-muted">{item.description}</span>
          )}
          {item.activity_type === "filme" && item.movie_title && (
            <span className="text-xs text-ink-muted">{item.movie_title}</span>
          )}
          {item.activity_type === "cozinhar" && item.menu_dish && (
            <span className="text-xs text-ink-muted">
              {item.menu_dish}
              {item.menu_recipe_url && (
                <>
                  {" · "}
                  <a
                    href={item.menu_recipe_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ color: "var(--accent)" }}
                  >
                    receita ↗
                  </a>
                </>
              )}
            </span>
          )}
          {item.activity_type === "cozinhar" && item.food_url && (
            <a
              href={item.food_url}
              target="_blank"
              rel="noopener noreferrer"
              className="w-fit text-xs"
              style={{ color: "var(--accent)" }}
            >
              ▶️ abrir vídeo
            </a>
          )}
          {item.auto_created && <span className="chip w-fit">agendado automático</span>}
        </div>
        <button
          type="button"
          onClick={() => onDelete(item.id)}
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-ink-muted transition hover:bg-danger-soft hover:text-danger"
        >
          🗑
        </button>
      </div>

      {isPast &&
        (item.recap ? (
          <p className="text-xs text-ink-muted">📝 {item.recap}</p>
        ) : (
          <RecapBox itemId={item.id} onSaved={onRecapSaved} />
        ))}
    </div>
  );
}

function AddAgendaForm({
  day,
  movieOptions,
  cookingOptions,
  preset,
  onAdded,
}: {
  day: string;
  movieOptions: MovieOption[];
  cookingOptions: CookingOption[];
  preset?: FormPreset | null;
  onAdded: () => void;
}) {
  const [activityType, setActivityType] = useState<ActivityType | null>(
    preset?.activityType ?? null
  );
  const [meetingTime, setMeetingTime] = useState("");
  const [description, setDescription] = useState("");
  const [movieShareId, setMovieShareId] = useState(preset?.movieShareId ?? "");
  const [cookingChoice, setCookingChoice] = useState(
    preset?.foodShareId
      ? `food:${preset.foodShareId}`
      : preset?.menuItemId
      ? `menu:${preset.menuItemId}`
      : ""
  );
  const [isSurprise, setIsSurprise] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit() {
    if (!activityType) return;
    setSubmitting(true);
    try {
      const [kind, id] = cookingChoice.split(":");
      const result = await addAgendaItem({
        day,
        meetingTime: meetingTime || null,
        activityType,
        isSurprise,
        description: activityType === "sair" ? description : null,
        movieShareId: activityType === "filme" ? movieShareId || null : null,
        foodShareId: activityType === "cozinhar" && kind === "food" ? id : null,
        menuItemId: activityType === "cozinhar" && kind === "menu" ? id : null,
      });
      if (!result.ok) {
        alert(result.error);
        return;
      }
      onAdded();
    } finally {
      setSubmitting(false);
    }
  }

  const canSubmit =
    activityType === "sair"
      ? description.trim().length > 0
      : activityType === "filme"
      ? !!movieShareId
      : activityType === "cozinhar"
      ? !!cookingChoice
      : activityType === "dormir";

  return (
    <div className="card-flush flex flex-col gap-3 p-3">
      <div className="flex flex-col gap-1">
        <span className="text-[10px] text-ink-muted">hora do encontro (opcional)</span>
        <input
          type="time"
          value={meetingTime}
          onChange={(e) => setMeetingTime(e.target.value)}
          className="input-field"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <span className="text-[10px] text-ink-muted">o que vamos fazer</span>
        <div className="flex flex-wrap gap-2">
          {(Object.keys(ACTIVITY_LABELS) as ActivityType[]).map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => setActivityType(type)}
              className={`rounded-full px-3 py-1.5 text-xs transition ${
                activityType === type ? "text-btn-ink" : "border border-hairline text-ink-muted"
              }`}
              style={
                activityType === type
                  ? { background: "linear-gradient(135deg, var(--moon-a), var(--moon-b))" }
                  : undefined
              }
            >
              {ACTIVITY_LABELS[type].icon} {ACTIVITY_LABELS[type].label}
            </button>
          ))}
        </div>
      </div>

      {activityType === "sair" && (
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={2}
          placeholder="pra onde vamos?"
          className="input-field resize-none"
        />
      )}

      {activityType === "filme" &&
        (movieOptions.length === 0 ? (
          <p className="text-xs text-ink-muted">
            nenhum filme aprovado disponível ainda — aprova um na aba Ideias primeiro.
          </p>
        ) : (
          <div className="flex flex-col gap-1.5">
            {movieOptions.map((m) => (
              <label
                key={m.id}
                className="flex items-center gap-2 rounded-xl border border-hairline bg-surface-strong px-3 py-2 text-xs text-ink"
              >
                <input
                  type="radio"
                  name="movie"
                  checked={movieShareId === m.id}
                  onChange={() => setMovieShareId(m.id)}
                />
                🎬 {m.title}
              </label>
            ))}
          </div>
        ))}

      {activityType === "cozinhar" &&
        (cookingOptions.length === 0 ? (
          <p className="text-xs text-ink-muted">
            nenhum vídeo ou prato aprovado disponível ainda — aprova um na aba Ideias primeiro.
          </p>
        ) : (
          <div className="flex flex-col gap-1.5">
            {cookingOptions.map((c) => {
              const value = `${c.kind}:${c.id}`;
              return (
                <label
                  key={value}
                  className="flex items-center gap-2 rounded-xl border border-hairline bg-surface-strong px-3 py-2 text-xs text-ink"
                >
                  <input
                    type="radio"
                    name="cooking"
                    checked={cookingChoice === value}
                    onChange={() => setCookingChoice(value)}
                  />
                  {c.kind === "menu" ? `🍳 ${c.dish}` : "🎥 vídeo compartilhado"}
                </label>
              );
            })}
          </div>
        ))}

      {activityType && (
        <label className="flex items-center gap-2 text-xs text-ink-muted">
          <input
            type="checkbox"
            className="h-3.5 w-3.5 accent-[var(--accent)]"
            checked={isSurprise}
            onChange={(e) => setIsSurprise(e.target.checked)}
          />
          🎁 guardar em segredo (só revela na hora)
        </label>
      )}

      <button
        type="button"
        disabled={!canSubmit || submitting}
        onClick={handleSubmit}
        className="btn-primary self-start"
      >
        {submitting ? "adicionando…" : "adicionar ao roteiro"}
      </button>
    </div>
  );
}

export function AgendaView({
  currentUserId,
  initialItems,
  initialMovieOptions,
  initialCookingOptions,
}: {
  currentUserId: string;
  initialItems: AgendaItem[];
  initialMovieOptions: MovieOption[];
  initialCookingOptions: CookingOption[];
}) {
  const [items, setItems] = useState<AgendaItem[]>(initialItems);
  const [movieOptions, setMovieOptions] = useState<MovieOption[]>(initialMovieOptions);
  const [cookingOptions, setCookingOptions] = useState<CookingOption[]>(initialCookingOptions);
  const [cursor, setCursor] = useState(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() };
  });
  const [selectedDay, setSelectedDay] = useState<string>(todayKey());
  const [showForm, setShowForm] = useState(false);
  const [formPreset, setFormPreset] = useState<FormPreset | null>(null);
  const [nudgeDismissed, setNudgeDismissed] = useState(false);
  const channelRef = useRef<RealtimeChannel | null>(null);

  async function refreshAgenda() {
    const [freshItems, freshOptions] = await Promise.all([
      getAgendaItems(),
      getAgendaPickerOptions(),
    ]);
    setItems(freshItems);
    setMovieOptions(freshOptions.movies);
    setCookingOptions(freshOptions.cooking);
  }

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase.channel(AGENDA_CHANNEL);
    channelRef.current = channel;

    // Só um sinal de "algo mudou" — nunca manda o conteúdo em si pelo
    // broadcast, porque itens em modo surpresa não podem vazar os detalhes
    // pra quem não pode ver ainda. Quem recebe sempre busca de novo, já
    // filtrado certinho pra essa sessão.
    channel.on("broadcast", { event: "changed" }, () => refreshAgenda()).subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const itemsByDay = useMemo(() => {
    const map = new Map<string, AgendaItem[]>();
    for (const item of items) {
      if (!map.has(item.day)) map.set(item.day, []);
      map.get(item.day)!.push(item);
    }
    return map;
  }, [items]);

  const weekSuggestion = useMemo(() => {
    const now = new Date();
    const dow = now.getDay();
    if (dow !== 5 && dow !== 6 && dow !== 0) return null;

    const monday = startOfWeek(now);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    const mondayKey = dateKey(monday.getFullYear(), monday.getMonth(), monday.getDate());
    const sundayKey = dateKey(sunday.getFullYear(), sunday.getMonth(), sunday.getDate());

    const hasThisWeek = items.some((i) => i.day >= mondayKey && i.day <= sundayKey);
    if (hasThisWeek) return null;

    const candidates: { preset: FormPreset; label: string }[] = [
      ...movieOptions.map((m) => ({
        preset: { activityType: "filme" as const, movieShareId: m.id },
        label: `🎬 assistir "${m.title}"`,
      })),
      ...cookingOptions.map((c) => ({
        preset:
          c.kind === "menu"
            ? { activityType: "cozinhar" as const, menuItemId: c.id }
            : { activityType: "cozinhar" as const, foodShareId: c.id },
        label: c.kind === "menu" ? `🍳 cozinhar "${c.dish}"` : "🍳 cozinhar o vídeo compartilhado",
      })),
    ];

    if (candidates.length === 0) return { preset: null, label: null };
    return candidates[Math.floor(Math.random() * candidates.length)];
  }, [items, movieOptions, cookingOptions]);

  function applySuggestion(preset: FormPreset) {
    const now = new Date();
    const monday = startOfWeek(now);
    const saturday = new Date(monday);
    saturday.setDate(monday.getDate() + 5);
    setSelectedDay(dateKey(saturday.getFullYear(), saturday.getMonth(), saturday.getDate()));
    setFormPreset(preset);
    setShowForm(true);
    setNudgeDismissed(true);
  }

  const { year, month } = cursor;
  const firstWeekday = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const cells: { key: string | null; day: number | null }[] = [];
  for (let i = 0; i < firstWeekday; i++) cells.push({ key: null, day: null });
  for (let d = 1; d <= daysInMonth; d++) cells.push({ key: dateKey(year, month, d), day: d });

  function changeMonth(delta: number) {
    setCursor((prev) => {
      let m = prev.month + delta;
      let y = prev.year;
      if (m < 0) {
        m = 11;
        y -= 1;
      } else if (m > 11) {
        m = 0;
        y += 1;
      }
      return { year: y, month: m };
    });
  }

  async function handleAdded() {
    await refreshAgenda();
    channelRef.current?.send({ type: "broadcast", event: "changed", payload: {} });
    setShowForm(false);
    setFormPreset(null);
  }

  async function handleDelete(id: string) {
    if (!confirm("Remover esse item do roteiro?")) return;

    const result = await deleteAgendaItem(id);
    if (!result.ok) {
      alert(result.error);
      return;
    }
    await refreshAgenda();
    channelRef.current?.send({ type: "broadcast", event: "changed", payload: {} });
  }

  function openForm() {
    setFormPreset(null);
    setShowForm((v) => !v);
  }

  const selectedItems = itemsByDay.get(selectedDay) ?? [];

  return (
    <div className="flex w-full max-w-sm flex-1 flex-col gap-4 overflow-y-auto min-h-0">
      {weekSuggestion && !nudgeDismissed && (
        <div className="card flex flex-col gap-2">
          <p className="text-xs text-ink">🤖 essa semana ainda tá sem nada marcado!</p>
          {weekSuggestion.label ? (
            <>
              <p className="text-xs text-ink-muted">sugestão pro sábado: {weekSuggestion.label}</p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => applySuggestion(weekSuggestion.preset!)}
                  className="btn-primary !px-3 !py-1.5 !text-[10px]"
                >
                  usar essa sugestão
                </button>
                <button
                  type="button"
                  onClick={() => setNudgeDismissed(true)}
                  className="btn-secondary !px-3 !py-1.5 !text-[10px]"
                >
                  dispensar
                </button>
              </div>
            </>
          ) : (
            <p className="text-xs text-ink-muted">
              aprova um filme ou prato na aba Ideias pra eu poder sugerir algo.
            </p>
          )}
        </div>
      )}

      <div className="card-flush p-4">
        <div className="mb-3 flex items-center justify-between">
          <button
            type="button"
            onClick={() => changeMonth(-1)}
            className="flex h-7 w-7 items-center justify-center rounded-full text-ink-muted transition hover:bg-surface-strong hover:text-ink"
            aria-label="mês anterior"
          >
            ‹
          </button>
          <p className="section-label">
            {MONTH_NAMES[month]} de {year}
          </p>
          <button
            type="button"
            onClick={() => changeMonth(1)}
            className="flex h-7 w-7 items-center justify-center rounded-full text-ink-muted transition hover:bg-surface-strong hover:text-ink"
            aria-label="próximo mês"
          >
            ›
          </button>
        </div>

        <div className="grid grid-cols-7 gap-1">
          {WEEKDAYS.map((w, i) => (
            <div key={i} className="text-center text-[9px] uppercase tracking-wide text-ink-muted">
              {w}
            </div>
          ))}
          {cells.map((cell, i) => {
            const hasPlan = cell.key ? itemsByDay.has(cell.key) : false;
            const isSelected = cell.key === selectedDay;
            const isToday = cell.key === todayKey();

            return (
              <button
                key={i}
                type="button"
                disabled={!cell.day}
                onClick={() => cell.key && setSelectedDay(cell.key)}
                className={`flex aspect-square items-center justify-center rounded-xl text-[11px] transition ${
                  !cell.day
                    ? ""
                    : isSelected
                    ? "text-btn-ink"
                    : hasPlan
                    ? "bg-accent-soft text-ink"
                    : isToday
                    ? "bg-surface-strong text-ink"
                    : "text-ink-muted"
                }`}
                style={
                  isSelected
                    ? { background: "linear-gradient(135deg, var(--moon-a), var(--moon-b))" }
                    : undefined
                }
              >
                {cell.day ?? ""}
              </button>
            );
          })}
        </div>

        <div className="mt-3 flex items-center gap-2">
          <span className="chip">🟡 já tem plano</span>
        </div>
      </div>

      <div className="flex flex-col gap-3 pb-4">
        <div className="flex items-center justify-between gap-2">
          <h3 className="section-label">{formatDayHeading(selectedDay)}</h3>
          <button
            type="button"
            onClick={openForm}
            className="btn-secondary !px-3 !py-1.5 !text-[10px]"
          >
            {showForm ? "cancelar" : "+ adicionar"}
          </button>
        </div>

        {selectedItems.length === 0 && !showForm && (
          <p className="text-center text-xs text-ink-muted">nada planejado ainda pra esse dia</p>
        )}

        {selectedItems.map((item) => (
          <AgendaItemCard
            key={item.id}
            item={item}
            onDelete={handleDelete}
            onRecapSaved={refreshAgenda}
          />
        ))}

        {showForm && (
          <AddAgendaForm
            key={selectedDay}
            day={selectedDay}
            movieOptions={movieOptions}
            cookingOptions={cookingOptions}
            preset={formPreset}
            onAdded={handleAdded}
          />
        )}
      </div>
    </div>
  );
}
