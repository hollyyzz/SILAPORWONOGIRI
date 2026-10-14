// js/peta.js – Logika peta.html: Supabase + Leaflet + Realtime
import { supabase } from '/js/supabase.js';
import { esc } from '/js/main.js';

const PUSAT   = [-7.8168, 110.9254]; // Wonogiri
const KATEGORI_LABEL = {
  jalan:'Jalan Rusak', pju:'Lampu Jalan', drainase:'Drainase/Banjir',
  sampah:'Sampah', air:'Air Bersih', bencana:'Bencana', fasum:'Fasilitas Umum', lainnya:'Lainnya',
};
const labelKat = (k) => KATEGORI_LABEL[k] ?? k ?? '-';

const STATUS = {
  baru:     { label: 'Belum Ditangani', warna: '#DC2626', bg: 'bg-red-600',    badge: 'badge-baru',     hex: '#DC2626' },
  diproses: { label: 'Diproses',        warna: '#EAB308', bg: 'bg-yellow-500', badge: 'badge-diproses', hex: '#EAB308' },
  selesai:  { label: 'Selesai',         warna: '#16A34A', bg: 'bg-green-600',  badge: 'badge-selesai',  hex: '#16A34A' },
};

const $ = (id) => document.getElementById(id);
const aktif = new Set(Object.keys(STATUS));
let sudahFit = false;
let globalData = [];

// ══════════════════════════════════════════════════════════════
// PETA LEAFLET
// ══════════════════════════════════════════════════════════════
const map = L.map('map', { zoomControl: false }).setView(PUSAT, 12);
L.control.zoom({ position: 'bottomright' }).addTo(map);
L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
  maxZoom: 19,
  attribution: '&copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors',
}).addTo(map);

const layer = L.layerGroup().addTo(map);
new ResizeObserver(() => map.invalidateSize()).observe($('map'));

// ══════════════════════════════════════════════════════════════
// IKON MARKER
// ══════════════════════════════════════════════════════════════
function buatIkon(status) {
  const s    = STATUS[status] ?? STATUS.baru;
  const ping = status === 'baru'
    ? `<span class="absolute inline-flex h-full w-full animate-ping rounded-full opacity-40" style="background:${s.hex}"></span>`
    : '';
  return L.divIcon({
    className: '',
    html: `<span class="relative flex h-7 w-7">${ping}<span class="relative inline-flex h-7 w-7 rounded-full border-[3px] border-white shadow-lg" style="background:${s.hex}"></span></span>`,
    iconSize:    [28, 28],
    iconAnchor:  [14, 14],
    popupAnchor: [0, -18],
  });
}

// ══════════════════════════════════════════════════════════════
// POPUP
// ══════════════════════════════════════════════════════════════
const fmtTgl = (iso) => new Date(iso).toLocaleDateString('id-ID', {
  day: 'numeric', month: 'short', year: 'numeric',
});

function popupHtml(l) {
  const s      = STATUS[l.status] ?? STATUS.baru;
  const ringkas = l.deskripsi?.length > 100 ? l.deskripsi.slice(0, 100) + '…' : (l.deskripsi ?? '');
  const foto   = /^https?:\/\//i.test(l.foto_url || '') ? l.foto_url : null;

  return `<div class="w-60 space-y-2 text-sm font-sans">
    <div class="flex items-start justify-between gap-2">
      <div>
        <p class="text-base font-extrabold" style="color:#4A6850">${esc(l.kode_tiket)}</p>
        <p class="text-xs text-gray-400">${fmtTgl(l.created_at)}</p>
      </div>
      <span class="shrink-0 rounded-full px-2 py-0.5 text-xs font-bold ${s.badge}">${esc(s.label)}</span>
    </div>
    <p class="font-semibold text-gray-700">${esc(labelKat(l.kategori))}</p>
    <p class="text-xs text-gray-500 leading-relaxed">${esc(ringkas)}</p>
    ${foto ? `<img src="${esc(foto)}" loading="lazy" class="w-full h-24 rounded-xl object-cover" alt="Foto laporan">` : ''}
    <a href="lacak.html?kode=${encodeURIComponent((l.kode_tiket ?? '').replace('#', ''))}"
       class="block rounded-xl py-2 text-center text-xs font-bold transition-colors"
       style="background:#F2F6F3;color:#4A6850"
       onmouseover="this.style.background='#E1EBE3'" onmouseout="this.style.background='#F2F6F3'">
      📋 Lihat Perkembangan
    </a>
  </div>`;
}

// ══════════════════════════════════════════════════════════════
// LEGENDA & FILTER
// ══════════════════════════════════════════════════════════════
function renderLegenda(data) {
  $('legenda').innerHTML = Object.entries(STATUS).map(([id, s]) => {
    const on  = aktif.has(id);
    const jml = data.filter(l => l.status === id).length;
    return `<button type="button" data-status="${id}" aria-pressed="${on}"
      class="flex h-10 items-center gap-2 rounded-xl border px-3 text-sm font-semibold transition-all ${on ? 'border-sage-500 bg-white shadow-sm text-ink' : 'border-gray-200 bg-gray-100 text-gray-400'}">
      <span class="h-3.5 w-3.5 rounded-full ${s.bg} ${on ? '' : 'opacity-40'}"></span>
      ${esc(s.label)}
      <span class="rounded-full bg-gray-100 px-1.5 text-xs font-bold text-gray-600">${jml}</span>
    </button>`;
  }).join('');
}

$('legenda').addEventListener('click', (e) => {
  const b = e.target.closest('button[data-status]');
  if (!b) return;
  const id = b.dataset.status;
  aktif.has(id) ? aktif.delete(id) : aktif.add(id);
  renderMarkers();
});

// ══════════════════════════════════════════════════════════════
// RENDER MARKER
// ══════════════════════════════════════════════════════════════
function renderMarkers() {
  const data   = globalData.filter(l => Number.isFinite(l.lat) && Number.isFinite(l.lng));
  renderLegenda(data);
  layer.clearLayers();

  const tampil = data.filter(l => aktif.has(l.status));
  tampil.forEach(l => {
    L.marker([l.lat, l.lng], {
      icon:  buatIkon(l.status),
      title: `${l.kode_tiket} – ${labelKat(l.kategori)}`,
      alt:   `Laporan ${l.kode_tiket}`,
    })
      .bindPopup(popupHtml(l), { maxWidth: 280, className: 'silapor-popup' })
      .addTo(layer);
  });

  const jmlEl = $('jumlah');
  if (jmlEl) {
    jmlEl.textContent = `${tampil.length} dari ${data.length} laporan`;
  }

  if (!sudahFit && tampil.length) {
    map.fitBounds(
      L.latLngBounds(tampil.map(l => [l.lat, l.lng])),
      { paddingTopLeft: [40, 160], paddingBottomRight: [40, 60], maxZoom: 14 }
    );
    sudahFit = true;
  }
}

// ══════════════════════════════════════════════════════════════
// FETCH DATA DARI SUPABASE
// ══════════════════════════════════════════════════════════════
async function fetchPeta() {
  try {
    const { data, error } = await supabase
      .from('laporan_publik')
      .select('id, kode_tiket, kategori, deskripsi, lat, lng, foto_url, status, created_at')
      .order('created_at', { ascending: false })
      .limit(500);

    if (error) throw error;
    globalData = data ?? [];
    renderMarkers();
  } catch (err) {
    console.error('[peta] Gagal menarik data:', err.message);
    const jmlEl = $('jumlah');
    if (jmlEl) jmlEl.textContent = 'Gagal memuat data';
  } finally {
    // Sembunyikan loading overlay
    $('peta-loading')?.remove();
  }
}

// ══════════════════════════════════════════════════════════════
// TOMBOL LOKASI SAYA
// ══════════════════════════════════════════════════════════════
$('btn-lokasi-saya')?.addEventListener('click', () => {
  const btn = $('btn-lokasi-saya');
  if (!('geolocation' in navigator)) {
    return alert('Browser Anda tidak mendukung GPS.');
  }
  btn.disabled  = true;
  btn.innerHTML = `<svg class="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path></svg>`;
  navigator.geolocation.getCurrentPosition(
    (pos) => {
      map.setView([pos.coords.latitude, pos.coords.longitude], 15);
      L.circleMarker([pos.coords.latitude, pos.coords.longitude], {
        radius: 8, fillColor: '#3B82F6', color: 'white', weight: 3, fillOpacity: 1,
      }).addTo(map).bindPopup('📍 Lokasi Anda').openPopup();
      btn.disabled  = false;
      btn.innerHTML = `<svg class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z"/><path stroke-linecap="round" stroke-linejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z"/></svg>Lokasi Saya`;
    },
    () => {
      btn.disabled  = false;
      btn.innerHTML = `📍 Lokasi Saya`;
      alert('Tidak bisa mengambil lokasi. Izinkan akses GPS di browser Anda.');
    },
    { enableHighAccuracy: true, timeout: 10000 }
  );
});

// ══════════════════════════════════════════════════════════════
// REALTIME SUBSCRIPTION
// ══════════════════════════════════════════════════════════════
supabase.channel('peta-warga')
  .on('postgres_changes', { event: '*', schema: 'public', table: 'laporan' }, () => {
    sudahFit = false; // biarkan re-fit saat data berubah
    fetchPeta();
  })
  .subscribe();

// ══════════════════════════════════════════════════════════════
// INIT
// ══════════════════════════════════════════════════════════════
fetchPeta();