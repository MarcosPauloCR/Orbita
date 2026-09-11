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

      // CUIDADO: `matchAll` devolve a aba mesmo quando ela está em segundo
      // plano ou congelada pelo sistema (celular com o app minimizado ou a
      // tela bloqueada). Uma aba congelada não roda JS e não toca áudio, ou
      // seja: pular a notificação nesse caso deixava o push sem NENHUM
      // efeito. Pior, `userVisibleOnly: true` é uma promessa de sempre
      // mostrar algo visível — descumprir repetidamente faz o navegador
      // primeiro mostrar um aviso genérico dele e depois cancelar a
      // inscrição de push sozinho. Por isso o teste aqui é de visibilidade
      // real, não de "existe uma aba".
      const visibleClients = clientsList.filter(
        (client) => client.visibilityState === "visible"
      );

      // Só a aba visível recebe o aviso pra tocar o áudio: uma aba oculta
      // ou não consegue tocar (congelada) ou tocaria junto com o som da
      // notificação, dobrando o alerta.
      for (const client of visibleClients) {
        client.postMessage({ type: "signal-received", urgent: !!payload.urgent });
      }

      // App realmente na frente: a própria página toca o áudio customizado e
      // mostra o overlay, então não precisa de notificação. "SOS" é exceção —
      // sobe notificação e vibra de qualquer jeito.
      if (visibleClients.length > 0 && !payload.urgent) return;

      // App fechado, minimizado ou com a tela bloqueada (ou sinal urgente):
      // só o Service Worker está vivo, não dá pra tocar áudio customizado —
      // precisa de uma notificação real pro navegador liberar o som padrão
      // do sistema. Conteúdo neutro, sem revelar do que se trata.
      await self.registration.showNotification(payload.title || "Órbita", {
        body: payload.body || "1 novo item",
        icon: "/icons/icon-192.png",
        tag: payload.urgent ? "orbita-sos" : "orbita-signal",
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
