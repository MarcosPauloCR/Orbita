// Por padrão um Service Worker novo fica em "waiting" até todas as abas do
// app serem fechadas — o que num PWA de celular pode demorar dias. Como
// aqui não há cache de assets (só push), assumir o controle na hora é
// seguro e garante que uma correção no push valha já na próxima abertura.
self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  const output = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) {
    output[i] = rawData.charCodeAt(i);
  }
  return output;
}

// O navegador pode invalidar/trocar a inscrição de push sozinho (chaves
// expiram, troca de conta no navegador, etc.) sem o app estar aberto —
// sem tratar esse evento, a inscrição antiga morre e as notificações
// simplesmente param de chegar depois de um tempo, silenciosamente.
self.addEventListener("pushsubscriptionchange", (event) => {
  event.waitUntil(
    (async () => {
      let applicationServerKey = event.oldSubscription?.options?.applicationServerKey;

      if (!applicationServerKey) {
        const res = await fetch("/api/push/vapid-public-key");
        const { key } = await res.json();
        if (!key) return;
        applicationServerKey = urlBase64ToUint8Array(key);
      }

      const subscription =
        event.newSubscription ??
        (await self.registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey,
        }));

      const json = subscription.toJSON();
      await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ endpoint: json.endpoint, keys: json.keys }),
      });
    })()
  );
});

self.addEventListener("push", (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch {
    payload = {};
  }

  event.waitUntil(
    (async () => {
      const clientsList = await self.clients.matchAll({
        type: "window",
        includeUncontrolled: true,
      });

      // `matchAll` devolve a aba mesmo minimizada ou congelada (tela
      // bloqueada), e aba congelada não roda JS — por isso o teste é de
      // visibilidade real, não de "existe uma aba".
      for (const client of clientsList) {
        if (client.visibilityState === "visible") {
          client.postMessage({ type: "signal-received", urgent: !!payload.urgent });
        }
      }

      // Cada push vira notificação, inclusive com o app aberto na tela. O
      // iPhone (WebKit) conta cada push que não mostra notificação — estar
      // com o app visível NÃO isenta — e no 3º cancela a inscrição sozinho,
      // sem aviso. Pular a notificação com o app aberto era o que fazia o
      // iPhone parar de receber depois de alguns dias.
      //
      // `renotify`: com a mesma `tag`, a notificação nova substitui a
      // anterior em silêncio — sem isso, do 2º sinal em diante não tocava
      // nada enquanto o primeiro ainda estivesse na bandeja.
      await self.registration.showNotification(payload.title || "Órbita", {
        body: payload.body || "1 novo item",
        icon: "/icons/icon-192.png",
        tag: payload.urgent ? "orbita-sos" : "orbita-signal",
        renotify: true,
        requireInteraction: !!payload.urgent,
        vibrate: payload.urgent ? [200, 100, 200, 100, 200] : undefined,
      });
    })()
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clientsList) => {
        if (clientsList.length > 0) return clientsList[0].focus();
        return self.clients.openWindow("/");
      })
  );
});
