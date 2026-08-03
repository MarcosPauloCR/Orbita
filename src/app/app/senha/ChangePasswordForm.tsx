"use client";

import { useFormState, useFormStatus } from "react-dom";
import { changePasswordAction, type ChangePasswordState } from "./actions";

const initialState: ChangePasswordState = { error: null, success: false };

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="mt-2 rounded-full bg-moon px-6 py-3 text-sm font-medium text-btn-ink shadow-lg shadow-moon/20 transition hover:brightness-95 disabled:opacity-60"
    >
      {pending ? "Salvando..." : "Salvar nova senha"}
    </button>
  );
}

export function ChangePasswordForm() {
  const [state, formAction] = useFormState(changePasswordAction, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input
        type="password"
        name="currentPassword"
        autoComplete="current-password"
        placeholder="Senha atual"
        className="rounded-xl border border-hairline bg-surface px-4 py-3 text-ink placeholder-ink-muted outline-none focus:border-ink-muted"
      />
      <input
        type="password"
        name="newPassword"
        autoComplete="new-password"
        placeholder="Nova senha"
        className="rounded-xl border border-hairline bg-surface px-4 py-3 text-ink placeholder-ink-muted outline-none focus:border-ink-muted"
      />
      <input
        type="password"
        name="confirmPassword"
        autoComplete="new-password"
        placeholder="Confirmar nova senha"
        className="rounded-xl border border-hairline bg-surface px-4 py-3 text-ink placeholder-ink-muted outline-none focus:border-ink-muted"
      />
      {state.error && <p className="text-sm text-red-600">{state.error}</p>}
      {state.success && (
        <p className="text-sm text-green-600">Senha atualizada com sucesso.</p>
      )}
      <SubmitButton />
    </form>
  );
}
