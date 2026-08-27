// GMV Gestão v27.17 — funcionamento offline robusto
const CACHE_VERSION = 'gmv-v27-17-offline';
const APP_CACHE = `${CACHE_VERSION}-app`;
const RUNTIME_CACHE = `${CACHE_VERSION}-runtime`;
const TILE_CACHE = `${CACHE_VERSION}-tiles`;

const APP_SHELL = [
  './',
  './index.html',
  './manifest.json',
  './firebase-config.js',
  './logo-gmv.jpeg',
  './logo.svg',
  './logo-gmv-watermark.png',
  './icon-192.png',
  './icon-512.png',
  './apple-touch-icon.png',
  './favicon.png',
  './backup_restauracao_soja_26_27.json'
];

// Bibliotecas externas necessárias para abrir mapa/sincronização.
// São guardadas na primeira instalação/uso para poder reabrir sem internet.
const EXTERNAL_STATIC = [
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js',
  'https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js',
  'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore-compat.js'
];

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(APP_CACHE);
    // O app local é obrigatório: se um arquivo opcional falhar, não derruba toda a instalação.
    for (const url of APP_SHELL) {
      try { await cache.add(new Request(url, {cache:'reload'})); } catch (e) { console.warn('Pré-cache local falhou:', url, e); }
    }
    // Dependências externas são melhor-esforço (opaque/CORS também podem ser cacheadas).
    for (const url of EXTERNAL_STATIC) {
      try {
        const req = new Request(url, {mode:'no-cors', cache:'reload'});
        const res = await fetch(req);
        await cache.put(req, res);
      } catch (e) { console.warn('Pré-cache externo falhou:', url, e); }
    }
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keep = new Set([APP_CACHE, RUNTIME_CACHE, TILE_CACHE]);
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => k.startsWith('gmv-') && !keep.has(k)).map(k => caches.delete(k)));
    await self.clients.claim();
  })());
});

async function trimCache(name, maxItems) {
  const cache = await caches.open(name);
  const keys = await cache.keys();
  if (keys.length > maxItems) {
    await Promise.all(keys.slice(0, keys.length - maxItems).map(k => cache.delete(k)));
  }
}

async function cacheFirst(request, cacheName, refreshInBackground=false) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request, {ignoreSearch:false});
  if (cached) {
    if (refreshInBackground) {
      fetch(request).then(res => { if (res && (res.ok || res.type === 'opaque')) cache.put(request, res.clone()); }).catch(()=>{});
    }
    return cached;
  }
  const res = await fetch(request);
  if (res && (res.ok || res.type === 'opaque')) await cache.put(request, res.clone());
  return res;
}

async function navigationResponse(request) {
  const cache = await caches.open(APP_CACHE);
  // Quando houver internet, atualiza o HTML; sem internet, cai no index salvo.
  try {
    const network = await fetch(request);
    if (network && network.ok) {
      await cache.put('./index.html', network.clone());
      return network;
    }
  } catch (e) {}
  return (await cache.match(request, {ignoreSearch:true})) ||
         (await cache.match('./index.html', {ignoreSearch:true})) ||
         new Response('<h1>GMV Gestão</h1><p>Abra o aplicativo uma vez com internet para concluir a instalação offline.</p>', {headers:{'Content-Type':'text/html; charset=utf-8'}});
}

self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  if (req.mode === 'navigate') {
    event.respondWith(navigationResponse(req));
    return;
  }

  // Arquivos locais do aplicativo: cache primeiro, atualiza em segundo plano.
  if (url.origin === self.location.origin) {
    event.respondWith(cacheFirst(req, APP_CACHE, true).catch(async () => {
      const cache = await caches.open(APP_CACHE);
      return cache.match(req, {ignoreSearch:true}) || Response.error();
    }));
    return;
  }

  // Leaflet/Firebase estáticos: essenciais para o app abrir offline.
  if (url.hostname === 'unpkg.com' || url.hostname === 'www.gstatic.com') {
    event.respondWith(cacheFirst(req, APP_CACHE, true).catch(() => caches.match(req, {ignoreSearch:true})));
    return;
  }

  // Imagens de satélite: guarda as áreas já visualizadas e reutiliza offline.
  if (url.hostname === 'server.arcgisonline.com') {
    event.respondWith((async()=>{
      try {
        const res = await cacheFirst(req, TILE_CACHE, false);
        trimCache(TILE_CACHE, 350).catch(()=>{});
        return res;
      } catch (e) {
        const cache = await caches.open(TILE_CACHE);
        return (await cache.match(req)) || new Response('', {status:204});
      }
    })());
    return;
  }

  // Demais GETs: rede normal; não interfere em chamadas de sincronização.
  event.respondWith(fetch(req).catch(async()=>{
    const cache = await caches.open(RUNTIME_CACHE);
    return (await cache.match(req)) || Response.error();
  }));
});
