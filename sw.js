// Service Worker SILAPOR – cache sederhana agar halaman publik tetap terbuka saat sinyal buruk.
// Naikkan VERSI setiap kali Anda deploy perubahan besar agar cache lama dibersihkan.
const VERSI = 'v1';
const CACHE_STATIS = `silapor-statis-${VERSI}`;
const CACHE_RUNTIME = `silapor-runtime-${VERSI}`;

// Aset inti. Entri yang gagal/ter-redirect dilewati (aman dengan atau tanpa cleanUrls Vercel).
const PRECACHE = [
  '/', '/lapor', '/lacak', '/peta',
  '/index.html', '/lapor.html', '/lacak.html', '/peta.html',
  '/css/style.css',
  '/js/main.js', '/js/supabase.js', '/js/lapor.js', '/js/lacak.js', '/js/peta.js',
  '/manifest.json', '/public/icons/icon-192.png',
];

// Pustaka CDN yang boleh di-cache (supaya Tailwind/Leaflet tetap tampil offline)
const CDN = ['cdn.tailwindcss.com', 'cdnjs.cloudflare.com', 'cdn.jsdelivr.net', 'fonts.googleapis.com', 'fonts.gstatic.com'];

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_STATIS);
    await Promise.allSettled(PRECACHE.map(async (url) => {
      const res = await fetch(url, { cache: 'reload' });
      // Respons hasil redirect tidak boleh dipakai untuk navigasi → jangan disimpan
      if (res.ok && !res.redirected && res.type === 'basic') await cache.put(url, res);
    }));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const aktif = [CACHE_STATIS, CACHE_RUNTIME];
    const kunci = await caches.keys();
    await Promise.all(kunci.filter(k => k.startsWith('silapor-') && !aktif.includes(k)).map(k => caches.delete(k)));
    await self.clients.claim();
  })());
});

async function networkFirst(req) {
  const url = new URL(req.url);
  // Navigasi disimpan tanpa query (?kode=…) agar tidak menumpuk
  const kunci = req.mode === 'navigate' ? url.origin + url.pathname : req;
  try {
    const res = await fetch(req);
    if (res.ok && !res.redirected) {
      const cache = await caches.open(CACHE_RUNTIME);
      cache.put(kunci, res.clone());
    }
    return res;
  } catch {
    const cached = await caches.match(kunci);
    if (cached) return cached;
    if (req.mode === 'navigate') {
      return (await caches.match('/'))
        || new Response('Anda sedang offline. Silakan coba lagi setelah tersambung internet.',
             { status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
    }
    return Response.error();
  }
}

async function staleWhileRevalidate(req) {
  const cache = await caches.open(CACHE_RUNTIME);
  const cached = await caches.match(req);
  const jaringan = fetch(req)
    .then((res) => { if (res.ok || res.type === 'opaque') cache.put(req, res.clone()); return res; })
    .catch(() => null);
  return cached || (await jaringan) || Response.error();
}

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // Jangan pernah di-cache: data & auth Supabase, tile peta, dan halaman admin
  if (/\.supabase\.(co|in)$/.test(url.hostname)) return;
  if (url.hostname.endsWith('tile.openstreetmap.org')) return;
  if (url.origin === location.origin && /^\/(login|dashboard)(\.html)?$|^\/js\/admin\.js$/.test(url.pathname)) return;

  if (url.origin === location.origin) {
    event.respondWith(networkFirst(req));            // aset sendiri: selalu coba versi terbaru
  } else if (CDN.includes(url.hostname)) {
    event.respondWith(staleWhileRevalidate(req));    // pustaka CDN: cepat dari cache
  }
});