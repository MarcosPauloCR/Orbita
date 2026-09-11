import type { Metadata, Viewport } from "next";
import { Backdrop } from "@/components/Backdrop";
import { LoginForm } from "./LoginForm";

export const metadata: Metadata = {
  title: "Órbita",
};

// Trava zoom/pan só nas telas reais do app — a busca disfarçada em "/"
// precisa continuar se comportando como um site normal.
export const viewport: Viewport = {
  themeColor: "#111827",
  userScalable: false,
  maximumScale: 1,
  minimumScale: 1,
};

export default function LoginPage() {
  return (
    <main className="relative flex h-dvh items-center justify-center overflow-hidden overscroll-none px-4">
      <Backdrop />
      <div className="relative z-10 w-full max-w-sm">
        <h1 className="mb-8 text-center font-display text-3xl text-ink">
          Órbita
        </h1>
        <LoginForm />
      </div>
    </main>
  );
}
