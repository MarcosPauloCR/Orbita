import { NextResponse } from "next/server";

// Fallback pro Service Worker buscar a chave pública quando o navegador
// não manda `event.oldSubscription` no `pushsubscriptionchange` (nem todo
// navegador manda) — não é segredo, é a mesma chave já exposta ao client
// via NEXT_PUBLIC_VAPID_PUBLIC_KEY, só que o SW (arquivo estático) não tem
// acesso a env vars do build.
export async function GET() {
  return NextResponse.json({ key: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? null });
}
