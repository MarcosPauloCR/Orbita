import type { Metadata } from "next";
import { Constellation } from "@/components/Constellation";
import { LoginForm } from "./LoginForm";

export const metadata: Metadata = {
  title: "Órbita",
};

export default function LoginPage() {
  return (
    <main className="relative flex min-h-screen items-center justify-center px-4">
      <Constellation />
      <div className="relative z-10 w-full max-w-sm">
        <h1 className="mb-8 text-center font-display text-3xl text-ink">
          Órbita
        </h1>
        <LoginForm />
      </div>
    </main>
  );
}
