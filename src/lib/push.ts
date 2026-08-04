import webpush from "web-push";
import { createAdminClient } from "@/lib/supabase/admin";

let vapidReady = false;

// Configurado sob demanda (não no carregamento do módulo) pra uma variável
// de ambiente faltando/errada não derrubar Server Actions que só usam push
// como efeito colateral (ex: avisar quando uma cápsula é aberta) — nesse
// caso a notificação é só pulada, sem quebrar a ação principal.
function ensureVapidConfigured(): boolean {
  if (vapidReady) return true;

  const subject = process.env.VAPID_SUBJECT;
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;

  if (!subject || !publicKey || !privateKey) {
    console.error(
      "Push desativado: VAPID_SUBJECT, VAPID_PRIVATE_KEY ou NEXT_PUBLIC_VAPID_PUBLIC_KEY ausente."
    );
    return false;
  }

  webpush.setVapidDetails(subject, publicKey, privateKey);
  vapidReady = true;
  return true;
}

export type PushSubscriptionInput = {
  endpoint: string;
  keys: { p256dh: string; auth: string };
};

export async function upsertPushSubscription(
  userId: string,
  subscription: PushSubscriptionInput
): Promise<void> {
  const supabase = createAdminClient();
  const { error } = await supabase.from("push_subscriptions").upsert(
    {
      user_id: userId,
      endpoint: subscription.endpoint,
      p256dh: subscription.keys.p256dh,
      auth: subscription.keys.auth,
    },
    { onConflict: "endpoint" }
  );
  if (error) throw error;
}

export async function sendPushToUser(
  userId: string,
  payload: { title: string; body: string; urgent?: boolean }
): Promise<void> {
  if (!ensureVapidConfigured()) return;

  const supabase = createAdminClient();
  const { data: subs, error } = await supabase
    .from("push_subscriptions")
    .select("endpoint, p256dh, auth")
    .eq("user_id", userId);

  if (error || !subs) return;

  const json = JSON.stringify(payload);

  await Promise.allSettled(
    subs.map(async (sub) => {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          json
        );
      } catch (err) {
        const statusCode = (err as { statusCode?: number }).statusCode;
        if (statusCode === 404 || statusCode === 410) {
          await supabase
            .from("push_subscriptions")
            .delete()
            .eq("endpoint", sub.endpoint);
        }
      }
    })
  );
}
