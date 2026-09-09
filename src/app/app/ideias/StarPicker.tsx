"use client";

export function StarPicker({
  value,
  onChange,
}: {
  value: number | null;
  onChange: (v: number | null) => void;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex flex-wrap gap-1">
        {Array.from({ length: 10 }, (_, i) => i + 1).map((star) => {
          const active = value !== null && star <= value;
          return (
            <button
              key={star}
              type="button"
              onClick={() => onChange(value === star ? null : star)}
              className="text-xl leading-none transition-transform duration-150 hover:scale-110"
              style={{
                color: active ? "var(--accent)" : "var(--star)",
                filter: active ? "drop-shadow(0 0 6px var(--accent-soft))" : undefined,
              }}
            >
              ★
            </button>
          );
        })}
      </div>
      <span className="chip self-start">
        {value !== null ? `nota: ${value}/10` : "sem nota"}
      </span>
    </div>
  );
}
