"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/get-session";
import { SESSION_COOKIE } from "@/lib/auth/session";
import { createAdminClient } from "@/lib/supabase/admin";
import { getPublicUsers } from "@/lib/auth/users";
import {
  sendPushToUser,
  upsertPushSubscription,
  type PushSubscriptionInput,
} from "@/lib/push";

export async function logoutAction() {
  cookies().delete(SESSION_COOKIE);
  redirect("/");
}

export async function sendSignal() {
  const session = await getSession();
  if (!session) {
    redirect("/");
  }

  const supabase = createAdminClient();
  const { error } = await supabase
    .from("signals")
    .insert({ from_user: session.userId });

  if (error) {
    throw new Error(`Falha ao enviar sinal: ${error.message}`);
  }

  const otherUser = (await getPublicUsers()).find(
    (u) => u.id !== session.userId
  );
  if (otherUser) {
    await sendPushToUser(otherUser.id, { title: "Órbita", body: "1 novo item" });
  }
}

export async function subscribeToPush(subscription: PushSubscriptionInput) {
  const session = await getSession();
  if (!session) return;
  await upsertPushSubscription(session.userId, subscription);
}
