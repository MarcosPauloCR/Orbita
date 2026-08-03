"use client";

import { useFormState, useFormStatus } from "react-dom";
import { loginAction, type LoginState } from "./actions";

const initialState: LoginState = { error: null };

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="mt-2 rounded-full bg-moon px-6 py-3 text-sm font-medium text-btn-ink shadow-lg shadow-moon/20 transition hover:brightness-95 disabled:opacity-60"
    >
      {pending ? "Entrando..." : "Entrar"}
    </button>
  );
}

export function LoginForm() {
  const [state, formAction] = useFormState(loginAction, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input
        type="text"
        name="username"
        autoFocus
        autoComplete="username"
        placeholder="Usuário"
        className="rounded-xl border border-hairline bg-surface px-4 py-3 text-ink placeholder-ink-muted outline-none focus:border-ink-muted"
      />
      <input
        type="password"
        name="password"
        autoComplete="current-password"
        placeholder="Senha"
        className="rounded-xl border border-hairline bg-surface px-4 py-3 text-ink placeholder-ink-muted outline-none focus:border-ink-muted"
      />
      {state.error && <p className="text-sm text-red-600">{state.error}</p>}
      <SubmitButton />
    </form>
  );
}
