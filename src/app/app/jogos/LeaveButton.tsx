export function LeaveButton({
  onLeave,
  busy,
}: {
  onLeave: () => void;
  busy: boolean;
}) {
  return (
    <button
      type="button"
      onClick={() => {
        if (confirm("Sair do jogo? Isso encerra a partida pros dois.")) onLeave();
      }}
      disabled={busy}
      className="text-[10px] text-ink-muted underline underline-offset-2 disabled:opacity-50"
    >
      sair do jogo
    </button>
  );
}
