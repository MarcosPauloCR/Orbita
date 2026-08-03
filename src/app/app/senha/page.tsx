import Link from "next/link";
import { ChangePasswordForm } from "./ChangePasswordForm";

export default function ChangePasswordPage() {
  return (
    <div className="flex w-full max-w-sm flex-col gap-6">
      <h1 className="text-center font-display text-2xl text-ink">
        Trocar senha
      </h1>
      <ChangePasswordForm />
      <Link
        href="/app"
        className="text-center text-xs text-ink-muted underline underline-offset-2 hover:text-ink"
      >
        voltar
      </Link>
    </div>
  );
}
