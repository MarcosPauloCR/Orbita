"use client";

import { useEffect, useState } from "react";
import { subscribeToPush } from "@/app/app/actions";

type Status = "checking" | "prompt" | "asking" | "enabled" | "denied" | "unsupported";

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  const output = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) {
    output[i] = rawData.charCodeAt(i);
  }
  return output;
}

// Cria a inscrição se não existir e sempre reenvia pro servidor — cobre
// tanto o caso do navegador ter perdido a inscrição (comum depois de um
// tempo, mesmo sem o usuário mexer em nada) quanto o caso da linha ter
// sumido do banco por algum motivo. Rodar isso toda vez que o app abre
// (com permissão já concedida) evita depender do usuário perceber que
// parou de notificar e ter que limpar o cache pra "consertar".
async function ensureSubscribed() {
  const registration = await navigator.serviceWorker.ready;
  let subscription = await registration.pushManager.getSubscription();
  if (!subscription) {
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(
        process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!
      ),
    });
  }

  const json = subscription.toJSON();
  await subscribeToPush({
    endpoint: json.endpoint!,
    keys: { p256dh: json.keys!.p256dh, auth: json.keys!.auth },
  });
}

export function NotificationBridge() {
  const [status, setStatus] = useState<Status>("checking");

  useEffect(() => {
    if (
      !("serviceWorker" in navigator) ||
      !("PushManager" in window) ||
      !("Notification" in window)
    ) {
      setStatus("unsupported");
      return;
    }

    navigator.serviceWorker.register("/sw.js").catch(() => {});

    if (Notification.permission === "granted") {
      setStatus("enabled");
      ensureSubscribed().catch(() => {});
    } else if (Notification.permission === "denied") setStatus("denied");
    else setStatus("prompt");

    function handleMessage(event: MessageEvent) {
      if (event.data?.type === "signal-received") {
        const audio = new Audio("/sounds/signal.mp3");
        audio.play().catch(() => {});
        if (event.data.urgent && "vibrate" in navigator) {
          navigator.vibrate([200, 100, 200, 100, 200]);
        }
      }
    }

    navigator.serviceWorker.addEventListener("message", handleMessage);
    return () =>
      navigator.serviceWorker.removeEventListener("message", handleMessage);
  }, []);

  async function handleEnable() {
    setStatus("asking");

    const permission = await Notification.requestPermission();
    if (permission !== "granted") {
      setStatus("denied");
      return;
    }

    await ensureSubscribed();
    setStatus("enabled");
  }

  if (status === "enabled" || status === "unsupported" || status === "checking") {
    return null;
  }

  if (status === "denied") {
    return (
      <p className="text-xs text-ink-muted">
        notificações bloqueadas no navegador
      </p>
    );
  }

  return (
    <button
      onClick={handleEnable}
      disabled={status === "asking"}
      className="text-xs text-ink-muted underline underline-offset-2 hover:text-ink"
    >
      {status === "asking" ? "ativando…" : "ativar notificações"}
    </button>
  );
}
