/**
 * penflow service worker (VN-DIST-002, docs/specs/distribution.md). Written by hand, with no
 * dependencies. The build (vite.config.ts, `pwaPlugin`) replaces the two placeholders below
 * and writes the result as sw.js next to index.html.
 *
 * - Install: stores the exact list of files of the build in a cache named after the version.
 *   It does not take over by itself: a new version waits until the page asks for it
 *   (`skip-waiting`), after the user accepted the update and the project was saved.
 * - Fetch: answers GET requests of its own origin from that cache first, and leaves any other
 *   origin alone. Navigations get index.html. Nothing else is stored: scans and projects stay
 *   in IndexedDB, and files read by the user never go through here.
 * - Activate: deletes the caches of previous versions.
 */

/* global self, caches, URL, Request, fetch, __PENFLOW_FILES__ */
const CACHE = "penflow-0.60.0-93bf4c985cc0";
/** Paths relative to the scope of the worker, which is the folder of index.html. */
const FILES = ["THIRD_PARTY_NOTICES.txt","assets/MapView-zHwQb8Jo.js","assets/catalog-BoUGcPgm.js","assets/cveBase.worker-CMxyfuRM.js","assets/de-BnXKKtGS.js","assets/en-CXOcNIp_.js","assets/en-wDz3UtuT.js","assets/es-BeQ126vf.js","assets/es-DHfnEmP4.js","assets/fr-emigkt0K.js","assets/index-BzaJQDEz.css","assets/index-C3VEE2YY.js","assets/parse.worker-BQo_gKOn.js","assets/ru-ClSpKFLL.js","assets/sample-scan-CCOBdWzD.js","icons/icon-192.png","icons/icon-512.png","icons/icon-maskable-192.png","icons/icon-maskable-512.png","index.html","manifest.webmanifest"];
const PREFIX = 'penflow-';

const scopeUrl = (path) => new URL(path, self.registration.scope).href;

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      // `reload` skips the HTTP cache, so the files stored are exactly those of this version.
      .then((cache) =>
        cache.addAll(FILES.map((path) => new Request(scopeUrl(path), { cache: 'reload' }))),
      ),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((names) =>
        Promise.all(
          names
            .filter((name) => name.startsWith(PREFIX) && name !== CACHE)
            .map((name) => caches.delete(name)),
        ),
      )
      // The first version takes the open pages at once: nothing is reloaded for it.
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'skip-waiting') self.skipWaiting();
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (!url.href.startsWith(self.registration.scope)) return;

  const key = request.mode === 'navigate' ? scopeUrl('index.html') : url.origin + url.pathname;
  event.respondWith(
    caches
      .open(CACHE)
      .then((cache) => cache.match(key))
      .then((cached) => cached || fetch(request)),
  );
});
