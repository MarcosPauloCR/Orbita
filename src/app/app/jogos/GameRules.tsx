export function GameRules({ items }: { items: string[] }) {
  return (
    <div className="w-full rounded-2xl border border-hairline bg-surface p-3">
      <p className="mb-1.5 text-[10px] uppercase tracking-wide text-ink-muted">
        como jogar
      </p>
      <ul className="flex list-disc flex-col gap-1 pl-4 text-xs text-ink-muted">
        {items.map((item, i) => (
          <li key={i}>{item}</li>
        ))}
      </ul>
    </div>
  );
}
