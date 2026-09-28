const CACHE_NAME = 'little-by-little-shell-v6';
const KATEX_FONTS = ['KaTeX_AMS-Regular', 'KaTeX_Caligraphic-Bold', 'KaTeX_Caligraphic-Regular', 'KaTeX_Fraktur-Bold', 'KaTeX_Fraktur-Regular', 'KaTeX_Main-Bold', 'KaTeX_Main-BoldItalic', 'KaTeX_Main-Italic', 'KaTeX_Main-Regular', 'KaTeX_Math-BoldItalic', 'KaTeX_Math-Italic', 'KaTeX_SansSerif-Bold', 'KaTeX_SansSerif-Italic', 'KaTeX_SansSerif-Regular', 'KaTeX_Script-Regular', 'KaTeX_Size1-Regular', 'KaTeX_Size2-Regular', 'KaTeX_Size3-Regular', 'KaTeX_Size4-Regular', 'KaTeX_Typewriter-Regular'];
const APP_FILES = ['./', './index.html', './styles.css', './art-direction.css', './app.js', './supabase-config.js', './manifest.webmanifest', './icon.svg', './icon-192.png', './icon-512.png', './vendor/katex/katex.min.css', './vendor/katex/katex.min.js', './vendor/katex/contrib/auto-render.min.js', ...KATEX_FONTS.map((font) => `./vendor/katex/fonts/${font}.woff2`)];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_FILES)));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((key) => key.startsWith('little-by-little-shell-') && key !== CACHE_NAME).map((key) => caches.delete(key)))));
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET' || new URL(event.request.url).origin !== self.location.origin) return;
  event.respondWith(fetch(event.request).then(async (response) => {
    if (response.ok) await caches.open(CACHE_NAME).then((cache) => cache.put(event.request, response.clone()));
    return response;
  }).catch(async () => {
    const cached = await caches.match(event.request);
    if (cached) return cached;
    if (event.request.mode === 'navigate') return caches.match('./index.html');
    return new Response('Offline and this page has not been cached yet.', { status: 503, headers: { 'Content-Type': 'text/plain' } });
  }));
});
