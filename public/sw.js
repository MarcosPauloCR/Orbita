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

      if (clientsList.length > 0) {
        // App aberto (mesmo em segundo plano): quem toca o áudio customizado
        // é a própria página, então normalmente não sobe notificação nenhuma.
        for (const client of clientsList) {
          client.postMessage({ type: "signal-received", urgent: !!payload.urgent });
        }
        // "SOS": mesmo com o app aberto, sobe uma notificação real e vibra —
        // não dá pra confiar só no áudio/overlay caso a tela esteja bloqueada.
        if (!payload.urgent) return;
      }

      // App fechado (ou sinal urgente): só o Service Worker está vivo, não
      // dá pra tocar áudio customizado — precisa de uma notificação real pro
      // navegador liberar o som padrão do sistema. Conteúdo neutro, sem
      // revelar do que se trata.
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
