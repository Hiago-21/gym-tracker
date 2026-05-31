const CACHE_NAME = 'gymtracker-v1';

// Arquivos que serão salvos no celular para funcionar offline
const arquivosParaCache = [
  './',
  './index.html',
  './styles.css',
  './script.js',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
];

// Instalando o Service Worker / Salvando os arquivos no cache
self.addEventListener('install', (evento) => {
  evento.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(arquivosParaCache);
    })
  );
});

// Buscando os arquivos (Se estiver offline, pega do cache)
self.addEventListener('fetch', (evento) => {
  evento.respondWith(
    caches.match(evento.request).then((resposta) => {
      return resposta || fetch(evento.request);
    })
  );
});