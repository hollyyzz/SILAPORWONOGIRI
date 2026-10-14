// js/main.js – Fungsi global: Navbar + Font Resizer (A-/A+) + SW Registration
// Dimuat di SEMUA halaman via <script type="module" src="/js/main.js">

/* ── Font Resizer ─────────────────────────────────────────── */
const SKALA = [87.5, 100, 112.5, 125, 150]; // persen dari 16px
const KEY   = 'silapor_font_idx';

function bacaIdx() {
  try {
    const s = localStorage.getItem(KEY);
    const n = s === null ? 1 : Number(s);
    return Number.isInteger(n) && n >= 0 && n < SKALA.length ? n : 1;
  } catch { return 1; }
}

let idx = bacaIdx();

function terapkanFont() {
  document.documentElement.style.fontSize = SKALA[idx] + '%';
  try { localStorage.setItem(KEY, idx); } catch {}
  const minus = document.getElementById('font-minus');
  const plus  = document.getElementById('font-plus');
  if (minus) minus.disabled = idx === 0;
  if (plus)  plus.disabled  = idx === SKALA.length - 1;

  // Aksesibel: tampilkan label skala di title tombol
  if (minus) minus.title = `Perkecil (saat ini ${SKALA[idx]}%)`;
  if (plus)  plus.title  = `Perbesar (saat ini ${SKALA[idx]}%)`;
}

/* ── Navbar ───────────────────────────────────────────────── */
const LINKS = [
  { href: 'index.html',    label: 'Beranda',  icon: `<svg class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/></svg>` },
  { href: 'lapor.html',    label: 'Lapor',    icon: `<svg class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15"/></svg>` },
  { href: 'lacak.html',    label: 'Lacak',    icon: `<svg class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="m21 21-4.35-4.35M17 10.5a6.5 6.5 0 1 1-13 0 6.5 6.5 0 0 1 13 0Z"/></svg>` },
  { href: 'peta.html',     label: 'Peta',     icon: `<svg class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"/></svg>` },
];

function renderNavbar() {
  const el = document.getElementById('navbar');
  if (!el) return;

  // Deteksi halaman aktif – ambil nama file dari akhir pathname
  // Berfungsi di file://, localhost, dan Vercel
  const segments = location.pathname.split('/');
  const file = segments[segments.length - 1] || 'index.html';

  const btnClass = 'h-10 w-10 rounded-xl border border-sage-100 bg-white font-bold text-sage-700 hover:bg-sage-50 disabled:opacity-40 focus:outline-none focus:ring-2 focus:ring-sage-500 transition-all';

  el.className = 'sticky top-0 z-30 bg-white/95 backdrop-blur-md shadow-sm';
  el.innerHTML = `
    <div class="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3">
      <a href="index.html" class="flex items-center gap-3 group" aria-label="SILAPOR – Beranda">
        <div class="flex h-10 w-10 items-center justify-center rounded-xl bg-sage-500 text-lg font-extrabold text-white shadow-sm group-hover:bg-sage-600 transition-colors">
          <svg class="h-6 w-6" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2Zm9-13.5V9"/></svg>
        </div>
        <div class="leading-tight">
          <p class="font-extrabold text-sage-700 text-base tracking-tight">SILAPOR</p>
          <p class="text-[11px] text-gray-400 leading-none">SIDESA-NET Wonogiri</p>
        </div>
      </a>
      <div class="flex items-center gap-2" role="group" aria-label="Ukuran huruf">
        <button id="font-minus" class="${btnClass} text-sm" aria-label="Perkecil huruf">A<sup>-</sup></button>
        <button id="font-plus"  class="${btnClass} text-base" aria-label="Perbesar huruf">A<sup>+</sup></button>
      </div>
    </div>
    <nav class="border-t border-sage-100 bg-white/80 backdrop-blur-sm" aria-label="Navigasi utama">
      <ul class="mx-auto flex max-w-5xl gap-0.5 overflow-x-auto px-3 py-1.5 hide-scroll">
        ${LINKS.map(l => {
          const isActive = file === l.href || (l.href === 'index.html' && (file === '' || file === 'index.html'));
          return `<li><a href="${l.href}" class="flex items-center gap-1.5 whitespace-nowrap rounded-xl px-3.5 py-2 text-sm font-semibold transition-all ${isActive ? 'bg-sage-50 text-sage-700 font-bold' : 'text-gray-500 hover:bg-sage-50 hover:text-sage-700'}">${l.icon}${l.label}</a></li>`;
        }).join('')}
      </ul>
    </nav>`;

  document.getElementById('font-minus').addEventListener('click', () => { idx = Math.max(0, idx - 1); terapkanFont(); });
  document.getElementById('font-plus').addEventListener('click',  () => { idx = Math.min(SKALA.length - 1, idx + 1); terapkanFont(); });
}

/* ── Service Worker Registration ─────────────────────────── */
function daftarSW() {
  if (!('serviceWorker' in navigator)) return;
  // Hanya daftar jika origin bukan file:// (butuh http/https)
  if (location.protocol === 'file:') return;
  navigator.serviceWorker.register('./sw.js', { scope: './' })
    .then(r => console.log('[SW] Terdaftar, scope:', r.scope))
    .catch(e => console.warn('[SW] Gagal daftar:', e));
}

/* ── XSS Helper ──────────────────────────────────────────── */
export const esc = (s) =>
  String(s ?? '').replace(/[&<>"']/g, c =>
    ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));

/* ── Back Button Helper ──────────────────────────────────── */
export function renderBackButton(container, href = 'index.html', label = 'Kembali') {
  if (!container) return;
  const btn = document.createElement('a');
  btn.href = href;
  btn.className = 'inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-sage-700 hover:bg-sage-50 border border-sage-100 bg-white shadow-sm transition-all mb-4';
  btn.setAttribute('aria-label', label);
  btn.innerHTML = `<svg class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18"/></svg>${label}`;
  container.prepend(btn);
}

/* ── Init ─────────────────────────────────────────────────── */
renderNavbar();
terapkanFont();
daftarSW();