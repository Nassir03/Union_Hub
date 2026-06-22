const CACHE_NAME = "muunganohub-mobile-v61-profile-photo";
const SCOPE_PATH = new URL(self.registration.scope).pathname.replace(/\/$/, "");
const BASE_PATH = SCOPE_PATH === "" ? "" : SCOPE_PATH;
const withBase = (path) => `${BASE_PATH}${path}`;
const APP_SHELL = [
  withBase("/"),
  withBase("/index.html"),
  withBase("/styles.css?v=20260619-profile-photo"),
  withBase("/quiz-bank.js?v=20260618g"),
  withBase("/app.js?v=20260619-profile-photo"),
  withBase("/manifest.webmanifest"),
  withBase("/assets/app-icon-192.png"),
  withBase("/assets/app-icon-512.png"),
  withBase("/assets/app-maskable-512.png"),
  withBase("/assets/app-icon.svg"),
  withBase("/assets/app-maskable-icon.svg"),
  withBase("/assets/union-pattern.svg"),
  withBase("/assets/muungano-homepage-bg.png"),
  withBase("/assets/nyerere-founder.jpg"),
  withBase("/assets/abeid-karume-founder.webp"),
  withBase("/assets/samia-suluhu.jpg"),
  withBase("/assets/hussein-mwinyi.webp"),
  withBase("/assets/bg-digital-blue.jpg"),
  withBase("/assets/bg-globe-tech.webp"),
  withBase("/assets/bg-ocean-sunset.webp"),
  withBase("/assets/bg-learning-3d.webp"),
  withBase("/assets/bg-nature-leaf.webp"),
  withBase("/assets/safari-hero-bg.png"),
  withBase("/assets/passport-hero-bg.png"),
  withBase("/assets/safari-articles-of-union.png"),
  withBase("/assets/safari-union-day.png"),
  withBase("/assets/safari-union-institutions.png")
];

function appPath(pathname) {
  if (BASE_PATH && pathname.startsWith(`${BASE_PATH}/`)) return pathname.slice(BASE_PATH.length);
  if (BASE_PATH && pathname === BASE_PATH) return "/";
  return pathname;
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.map((key) => caches.delete(key))))
      .then(() => caches.open(CACHE_NAME))
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.map((key) => {
        if (key === CACHE_NAME) return Promise.resolve();
        return caches.delete(key);
      })))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  const pathname = appPath(url.pathname);
  if (pathname.startsWith("/chat") || pathname.startsWith("/auth") || pathname.startsWith("/tts")) {
    return;
  }

  if (pathname.startsWith("/static/assets/videos/") || pathname.startsWith("/assets/videos/")) {
    event.respondWith(fetch(request));
    return;
  }

  if (pathname.startsWith("/static/assets/docs/") || pathname.startsWith("/assets/docs/")) {
    event.respondWith(fetch(request));
    return;
  }

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request, { cache: "no-store" })
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(withBase("/"), copy));
          return response;
        })
        .catch(() => caches.match(withBase("/")) || caches.match(withBase("/index.html")))
    );
    return;
  }

  const cacheKey = pathname;
  if (
    cacheKey === "/app.js" ||
    cacheKey === "/styles.css" ||
    cacheKey === "/quiz-bank.js" ||
    cacheKey === "/index.html" ||
    cacheKey === "/manifest.webmanifest" ||
    cacheKey === "/static/app.js" ||
    cacheKey === "/static/styles.css" ||
    cacheKey === "/static/quiz-bank.js" ||
    cacheKey === "/static/index.html" ||
    cacheKey === "/static/manifest.webmanifest" ||
    cacheKey === "/sw.js"
  ) {
    event.respondWith(
      fetch(request, { cache: "no-store" })
        .then((response) => {
          if (!response || response.status !== 200 || response.type === "opaque") return response;
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          return response;
        })
        .catch(() => caches.match(request))
    );
    return;
  }

  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request).then((response) => {
        if (!response || response.status !== 200 || response.type === "opaque") return response;
        const copy = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
        return response;
      });
    })
  );
});
