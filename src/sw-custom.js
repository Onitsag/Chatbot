// src/sw-custom.js

import { precacheAndRoute } from 'workbox-precaching';
import { registerRoute } from 'workbox-routing';
import { NetworkFirst } from 'workbox-strategies';

// Pré-cachez tous les assets générés par Vite
precacheAndRoute(self.__WB_MANIFEST || []);

// Mise en cache à la volée pour l’API OpenAI (vous pouvez ajouter d’autres règles si besoin)
registerRoute(
  ({ url }) => url.origin === 'https://api.openai.com',
  new NetworkFirst({
    cacheName: 'openai-api-cache',
    plugins: []
  })
);

// Lors d'un background sync, nous ne faisons pas l'appel nous-mêmes
// mais nous informons le client pour qu'il procède à la synchronisation.
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-messages') {
    event.waitUntil(
      self.clients.matchAll().then((clients) => {
        for (const client of clients) {
          client.postMessage({ type: 'SYNC_OFFLINE_MESSAGES' });
        }
      })
    );
  }
});
