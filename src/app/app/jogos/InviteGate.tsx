import { GameRules } from "./GameRules";
import { useDeviceMode } from "./GameShell";

export function InviteGate({
  isCreator,
  otherUserName,
  rules,
  onAccept,
  busy,
}: {
  isCreator: boolean;
  otherUserName: string;
  rules: string[];
  onAccept: () => void;
  busy: boolean;
}) {
  const isDesktop = useDeviceMode() === "desktop";

  return (
    <div className="flex w-full flex-col items-center gap-4">
      <GameRules items={rules} />
      {isCreator ? (
        <p className={isDesktop ? "text-sm text-ink-muted" : "text-xs text-ink-muted"}>
          convite enviado — aguardando {otherUserName} aceitar…
        </p>
      ) : (
        <div className="flex flex-col items-center gap-2">
          <p className={isDesktop ? "text-base text-ink" : "text-sm text-ink"}>
            {otherUserName} te chamou pra jogar!
          </p>
          <button
            type="button"
            onClick={onAccept}
            disabled={busy}
            className={`rounded-full bg-moon text-btn-ink disabled:opacity-50 ${
              isDesktop ? "px-6 py-3 text-sm" : "px-4 py-2 text-xs"
            }`}
          >
            {busy ? "aceitando…" : "aceitar convite"}
          </button>
        </div>
      )}
    </div>
  );
}
