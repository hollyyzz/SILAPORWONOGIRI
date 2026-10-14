// js/lapor.js – Logika wizard lapor.html (Supabase Integration + Leaflet mini-map)
import { supabase } from './supabase.js';
import { esc } from './main.js';

const KATEGORI = [
  { id: 'jalan',    label: 'Jalan Rusak',      ikon: '🕳️' },
  { id: 'pju',      label: 'Lampu Jalan',       ikon: '💡' },
  { id: 'drainase', label: 'Drainase/Banjir',   ikon: '🌊' },
  { id: 'sampah',   label: 'Sampah',             ikon: '🗑️' },
  { id: 'air',      label: 'Air Bersih',         ikon: '🚰' },
  { id: 'bencana',  label: 'Bencana',            ikon: '⛰️' },
  { id: 'fasum',    label: 'Fasilitas Umum',     ikon: '🏫' },
  { id: 'lainnya',  label: 'Lainnya',            ikon: '📝' },
];

// Koordinat default: Wonogiri
const FALLBACK   = { lat: -7.8168, lng: 110.9254 };
const NAMA_STEP  = ['Foto & Lokasi', 'Kategori & Data', 'Konfirmasi'];

const $ = (id) => document.getElementById(id);

const state = {
  step: 1,
  fileInput: null,    // File object asli
  fotoBlob: null,     // Blob terkompresi
  fotoUrl:  null,     // Object URL untuk preview
  lat: null, lng: null, akurasi: null,
  kategori: null,
};

// ══════════════════════════════════════════════════════════════
// STEPPER
// ══════════════════════════════════════════════════════════════
function renderStepper() {
  $('stepper').innerHTML = NAMA_STEP.map((n, i) => {
    const no = i + 1, aktif = no === state.step, selesai = no < state.step;
    const warna = aktif   ? 'active'
                : selesai ? 'done'
                :           'pending';
    const selingan = no < NAMA_STEP.length
      ? `<div class="step-connector ${selesai ? 'done' : ''}"></div>`
      : '';
    return `<li class="flex flex-1 flex-col items-center gap-1.5" ${aktif ? 'aria-current="step"' : ''}>
      <div class="flex w-full items-center">
        <div class="step-circle ${warna}">${selesai ? '✓' : no}</div>
        ${selingan}
      </div>
      <span class="text-center text-[11px] font-semibold ${aktif ? 'text-sage-700' : selesai ? 'text-sage-500' : 'text-gray-400'}">${n}</span>
    </li>`;
  }).join('');
}

// ══════════════════════════════════════════════════════════════
// NAVIGASI ANTAR LANGKAH
// ══════════════════════════════════════════════════════════════
function tampilkanError(pesan) {
  const el = $('error');
  el.textContent = pesan || '';
  el.classList.toggle('hidden', !pesan);
  if (pesan) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function goTo(step) {
  state.step = step;
  document.querySelectorAll('[data-step]').forEach(s =>
    s.classList.toggle('hidden', Number(s.dataset.step) !== step)
  );
  $('btn-prev').classList.toggle('hidden', step === 1);
  const isStep3 = step === 3;
  $('btn-next').innerHTML = isStep3
    ? `<svg class="h-5 w-5 mr-2 inline" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M6 12 3.269 3.125A59.769 59.769 0 0 1 21.485 12 59.768 59.768 0 0 1 3.27 20.875L5.999 12Zm0 0h7.5"/></svg>Kirim Laporan`
    : `Lanjut <svg class="h-5 w-5 ml-1 inline" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3"/></svg>`;
  if (isStep3) isiRingkasan();
  tampilkanError('');
  renderStepper();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ══════════════════════════════════════════════════════════════
// KOMPRES FOTO (Canvas)
// ══════════════════════════════════════════════════════════════
function kompresGambar(file) {
  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const MAX = 1280;
      let { width, height } = img;
      if (width > MAX || height > MAX) {
        if (width > height) { height = Math.round(height * MAX / width); width = MAX; }
        else                 { width = Math.round(width * MAX / height); height = MAX; }
      }
      const canvas  = document.createElement('canvas');
      canvas.width  = width; canvas.height = height;
      canvas.getContext('2d').drawImage(img, 0, 0, width, height);
      canvas.toBlob(blob => {
        URL.revokeObjectURL(url);
        resolve(blob ?? file);
      }, 'image/jpeg', 0.75);
    };
    img.onerror = () => { URL.revokeObjectURL(url); resolve(file); };
    img.src = url;
  });
}

// ══════════════════════════════════════════════════════════════
// LANGKAH 1 – FOTO
// ══════════════════════════════════════════════════════════════
$('foto').addEventListener('change', async (e) => {
  const f = e.target.files[0];
  if (!f) return;
  state.fileInput = f;

  // Kompres
  const blob = await kompresGambar(f);
  state.fotoBlob = blob;
  if (state.fotoUrl) URL.revokeObjectURL(state.fotoUrl);
  state.fotoUrl = URL.createObjectURL(blob);

  $('foto-preview').src = state.fotoUrl;
  $('foto-preview').classList.remove('hidden');$('foto-hint').classList.add('hidden');
  tampilkanError('');
});

// ══════════════════════════════════════════════════════════════
// LANGKAH 1 – GPS & PETA MINI LEAFLET
// ══════════════════════════════════════════════════════════════
let petaMini = null;
let pinMarker = null;

function initPetaMini(lat, lng) {
  if (!window.L) return; // Leaflet tidak tersedia
  const el = $('peta-mini');
  if (!el) return;

  if (!petaMini) {
    petaMini = L.map('peta-mini', { zoomControl: true, attributionControl: false }).setView([lat, lng], 15);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
    }).addTo(petaMini);
  } else {
    petaMini.setView([lat, lng], 15);
  }

  const icon = L.divIcon({
    html: `<div style="width:24px;height:24px;border-radius:50% 50% 50% 0;background:#DC2626;border:3px solid white;box-shadow:0 2px 6px rgba(0,0,0,.3);transform:rotate(-45deg)"></div>`,
    iconSize: [24, 24],
    iconAnchor: [12, 24],
    className: '',
  });

  if (pinMarker) { pinMarker.setLatLng([lat, lng]); }
  else {
    pinMarker = L.marker([lat, lng], { icon, draggable: true }).addTo(petaMini);
    pinMarker.on('dragend', () => {
      const p = pinMarker.getLatLng();
      Object.assign(state, { lat: p.lat, lng: p.lng });
      $('gps-status').innerHTML = `<span class="inline-block h-2 w-2 rounded-full bg-green-500 mr-1.5"></span>Lat ${p.lat.toFixed(5)}, Lng ${p.lng.toFixed(5)} (dikoreksi manual)`;
    });
  }
}

function setLokasi(lat, lng, akurasi, dummy) {
  Object.assign(state, { lat, lng, akurasi });
  const statusEl = $('gps-status');
  statusEl.innerHTML = `<span class="inline-block h-2 w-2 rounded-full ${dummy ? 'bg-yellow-500' : 'bg-green-500'} mr-1.5 align-middle"></span>`
    + `Lat ${lat.toFixed(5)}, Lng ${lng.toFixed(5)}`
    + (akurasi ? ` · ±${Math.round(akurasi)} m` : '')
    + (dummy ? ' <em class="text-xs text-gray-400">(lokasi perkiraan – GPS tidak tersedia)</em>' : '');
  $('btn-gps').innerHTML = `<svg class="h-5 w-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M12 3v3m0 12v3M3 12h3m12 0h3M12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z"/></svg> Perbarui Lokasi`;
  initPetaMini(lat, lng);
}

function ambilLokasi() {
  $('gps-status').innerHTML = `<span class="inline-block h-2 w-2 rounded-full bg-yellow-400 mr-1.5 animate-pulse align-middle"></span>Mencari lokasi Anda…`;
  if (!('geolocation' in navigator)) return setLokasi(FALLBACK.lat, FALLBACK.lng, null, true);
  navigator.geolocation.getCurrentPosition(
    (p) => setLokasi(p.coords.latitude, p.coords.longitude, p.coords.accuracy, false),
    ()  => setLokasi(FALLBACK.lat, FALLBACK.lng, null, true),
    { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 }
  );
}

$('btn-gps').addEventListener('click', ambilLokasi);
ambilLokasi(); // auto-geotagging

// ══════════════════════════════════════════════════════════════
// LANGKAH 2 – KATEGORI
// ══════════════════════════════════════════════════════════════
$('kategori').innerHTML = KATEGORI.map(k => `
  <button type="button" role="radio" aria-checked="false" data-id="${k.id}"
          class="kategori-card flex flex-col items-center justify-center gap-1.5 min-h-[5.5rem]">
    <span class="text-3xl leading-none" aria-hidden="true">${k.ikon}</span>
    <span class="text-xs font-bold leading-tight text-center">${k.label}</span>
  </button>`).join('');

$('kategori').addEventListener('click', (e) => {
  const b = e.target.closest('button[data-id]');
  if (!b) return;
  state.kategori = b.dataset.id;
  $('kategori').querySelectorAll('button').forEach(x => {
    const on = x === b;
    x.setAttribute('aria-checked', on);
    x.classList.toggle('dipilih', on);
  });
});

$('deskripsi').addEventListener('input', () => {
  $('hitung').textContent =$('deskripsi').value.length;
});

// ══════════════════════════════════════════════════════════════
// VALIDASI
// ══════════════════════════════════════════════════════════════
function normalisasiWA(v) {
  let n = v.replace(/\D/g, '');
  if (n.startsWith('0')) n = '62' + n.slice(1);
  else if (n.startsWith('8')) n = '62' + n;
  return /^62\d{9,13}$/.test(n) ? n : null;
}

function validasi(step) {
  if (step === 1) {
    if (!state.fotoBlob) return 'Mohon ambil atau pilih foto terlebih dahulu.';
    if (state.lat === null) return 'Lokasi belum diambil. Ketuk "Ambil Lokasi Saya (GPS)".';
  }
  if (step === 2) {
    if (!state.kategori) return 'Silakan pilih kategori masalah.';
    if ($('deskripsi').value.trim().length < 10) return 'Deskripsi minimal 10 karakter.';
    if (!normalisasiWA($('wa').value)) return 'Nomor WhatsApp tidak valid. Contoh: 081234567890.';
  }
  return '';
}

// ══════════════════════════════════════════════════════════════
// LANGKAH 3 – RINGKASAN
// ══════════════════════════════════════════════════════════════
const labelKategori = () => KATEGORI.find(k => k.id === state.kategori)?.label ?? '-';

function isiRingkasan() {
  $('s-foto').src    = state.fotoUrl;
  $('s-lokasi').textContent  = `${state.lat.toFixed(5)}, ${state.lng.toFixed(5)}`;
  $('s-kategori').textContent = labelKategori();$('s-deskripsi').textContent = $('deskripsi').value.trim();$('s-kontak').textContent    = `${$('nama').value.trim() || 'Anonim'} · ${$('wa').value.trim()}`;
}

document.querySelectorAll('[data-goto]').forEach(b =>
  b.addEventListener('click', () => goTo(Number(b.dataset.goto)))
);

// ══════════════════════════════════════════════════════════════
// KIRIM LAPORAN
// ══════════════════════════════════════════════════════════════
async function kirim() {
  const btn = $('btn-next');
  btn.disabled = true;
  btn.innerHTML = `<svg class="animate-spin h-5 w-5 mr-2 inline" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path></svg>Mengunggah Foto…`;

  try {
    // 1. Upload foto terkompresi ke Storage Supabase
    const ext      = (state.fileInput.name.split('.').pop() || 'jpg').toLowerCase();
    const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext === 'jpeg' ? 'jpg' : ext}`;

    const { error: uploadError } = await supabase.storage
      .from('foto-laporan')
      .upload(`public/${fileName}`, state.fotoBlob, { contentType: `image/${ext}` });

    if (uploadError) throw new Error('Gagal mengunggah foto: ' + uploadError.message);

    const { data: { publicUrl } } = supabase.storage
      .from('foto-laporan')
      .getPublicUrl(`public/${fileName}`);

    // 2. Insert ke tabel laporan
    btn.innerHTML = `<svg class="animate-spin h-5 w-5 mr-2 inline" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path></svg>Menyimpan Laporan…`;

    const { data: insertData, error: insertError } = await supabase
      .from('laporan')
      .insert([{
        nama:      $('nama').value.trim() || null,
        no_wa:     normalisasiWA($('wa').value),
        kategori:  state.kategori,      // simpan id, bukan label
        deskripsi: $('deskripsi').value.trim(),
        alamat:    $('alamat')?.value.trim() || null,
        lat:       state.lat,
        lng:       state.lng,
        foto_url:  publicUrl,
      }])
      .select('kode_tiket')
      .single();

    if (insertError) throw new Error('Gagal menyimpan data: ' + insertError.message);

    // 3. Tampilkan layar sukses
    const kode = insertData.kode_tiket;
    $('ticket').textContent = kode;
    
    // PERBAIKAN: Menggunakan lacak.html agar berfungsi di Live Server
    $('link-lacak').href    = `lacak.html?kode=${encodeURIComponent(kode.replace('#', ''))}`;

    document.querySelectorAll('[data-step]').forEach(s => s.classList.add('hidden'));
    $('stepper').classList.add('hidden');
    $('aksi').classList.add('hidden');$('sukses').classList.remove('hidden');
    window.scrollTo({ top: 0, behavior: 'smooth' });

  } catch (err) {
    console.error('[lapor]', err);
    tampilkanError(err.message + ' – Periksa koneksi dan coba lagi.');
    btn.disabled = false;
    btn.innerHTML = `<svg class="h-5 w-5 mr-2 inline" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M6 12 3.269 3.125A59.769 59.769 0 0 1 21.485 12 59.768 59.768 0 0 1 3.27 20.875L5.999 12Zm0 0h7.5"/></svg>Coba Lagi`;
  }
}

// Salin kode tiket
$('btn-salin')?.addEventListener('click', async () => {
  try {
    await navigator.clipboard.writeText($('ticket').textContent);$('btn-salin').innerHTML = `✅ Tersalin!`;
    setTimeout(() => {
      $('btn-salin').innerHTML = `<svg class="h-5 w-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M15.666 3.888A2.25 2.25 0 0 0 13.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 0 1-.75.75H9a.75.75 0 0 1-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 0 1-2.25 2.25H6.75A2.25 2.25 0 0 1 4.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 0 1 1.927-.184"/> Salin Kode Tiket`;
    }, 2500);
  } catch {
    $('btn-salin').textContent = 'Tekan lama kode untuk menyalin';
  }
});

$('btn-next').addEventListener('click', () => {
  const err = validasi(state.step);
  if (err) return tampilkanError(err);
  state.step === 3 ? kirim() : goTo(state.step + 1);
});

$('btn-prev').addEventListener('click', () => goTo(state.step - 1));

// Inisialisasi
goTo(1);