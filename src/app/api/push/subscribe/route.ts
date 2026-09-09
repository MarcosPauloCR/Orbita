import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/get-session";
import { upsertPushSubscription } from "@/lib/push";

// Endpoint simples pro Service Worker chamar sozinho quando o navegador
// invalida/rotaciona a inscrição de push em segundo plano (evento
// `pushsubscriptionchange`, ver public/sw.js) — um SW não consegue chamar
// uma Server Action diretamente, só fetch. A sessão vem do cookie, igual
// a subscribeToPush (Server Action usada na tela normal).
export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const endpoint = body?.endpoint;
  const p256dh = body?.keys?.p256dh;
  const auth = body?.keys?.auth;
  if (typeof endpoint !== "string" || typeof p256dh !== "string" || typeof auth !== "string") {
    return NextResponse.json({ error: "invalid subscription" }, { status: 400 });
  }

  await upsertPushSubscription(session.userId, { endpoint, keys: { p256dh, auth } });
  return NextResponse.json({ ok: true });
}
