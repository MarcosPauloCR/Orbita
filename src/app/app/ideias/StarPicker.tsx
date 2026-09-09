"use client";

export function StarPicker({
  value,
  onChange,
}: {
  value: number | null;
  onChange: (v: number | null) => void;
}) {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex flex-wrap gap-0.5">
        {Array.from({ length: 10 }, (_, i) => i + 1).map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => onChange(value === star ? null : star)}
            className={`text-lg leading-none ${
              value !== null && star <= value ? "text-moon" : "text-star"
            }`}
          >
            ★
          </button>
        ))}
      </div>
      <span className="text-[10px] text-ink-muted">
        {value !== null ? `nota: ${value}/10` : "sem nota"}
      </span>
    </div>
  );
}
