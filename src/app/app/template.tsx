"use client";

// Templates recriam a instância a cada navegação (diferente de layout,
// que persiste) — é o gancho certo do Next.js pra dar uma entrada suave
// toda vez que troca de aba, sem precisar mexer em cada página.
export default function Template({ children }: { children: React.ReactNode }) {
  return (
    <div className="animate-rise-in flex w-full flex-1 min-h-0 flex-col items-center">
      {children}
    </div>
  );
}
