export function PageSkeleton() {
  return (
    <div className="flex w-full max-w-sm flex-1 flex-col gap-4 animate-pulse">
      <div
        className="mx-auto h-24 w-24 rounded-full"
        style={{ background: "var(--surface-strong)" }}
      />
      <div className="grid grid-cols-2 gap-3">
        <div className="card-flush h-20" />
        <div className="card-flush h-20" />
      </div>
      <div className="card-flush h-16" />
      <div className="card-flush h-28" />
      <div className="card-flush h-16" />
    </div>
  );
}
