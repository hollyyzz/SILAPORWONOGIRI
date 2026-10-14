// js/lacak.js – Logika halaman lacak.html (Supabase Integration)
import { supabase } from './supabase.js';
import { esc } from './main.js';

const $ = (id) => document.getElementById(id);

const TAHAP = [
  { id: 'baru',     label: 'Dilaporkan',     info: 'Laporan diterima dan tercatat di sistem.',  dot: '#DC2626', badge: 'badge-baru' },
  { id: 'diproses', label: 'Sedang Diproses', info: 'Perangkat desa sedang menindaklanjuti.', dot: '#EAB308', badge: 'badge-diproses' },
  { id: 'selesai',  label: 'Selesai',         info: 'Masalah telah berhasil ditangani.',        dot: '#16A34A', badge: 'badge-selesai' },
];

const KATEGORI_LABEL = {
  jalan:'Jalan Rusak', pju:'Lampu Jalan', drainase:'Drainase/Banjir',
  sampah:'Sampah', air:'Air Bersih', bencana:'Bencana', fasum:'Fasilitas Umum', lainnya:'Lainnya',
};
const labelKat = (k) => KATEGORI_LABEL[k] ?? k ?? '-';

// PERBAIKAN: Pembersihan string tiket yang lebih fleksibel
function normalisasi(v) {
  if (!v) return null;
  // Hapus semua spasi, jadikan huruf besar
  let k = v.trim().toUpperCase().replace(/\s+/g, '');
  // Jika pengguna tidak memasukkan '#', kita tambahkan secara otomatis untuk pencocokan ke database
  if (!k.startsWith('#')) {
    k = '#' + k;
  }
  // Validasi format akhir
  return /^#LPR-\d{6}-\d{3,}$/.test(k) ? k : null;
}

const fmt = (iso) => new Date(iso).toLocaleString('id-ID', {
  day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit'
});

function tampilkanPesan(t, tipe = 'error') {
  const el = $('pesan');
  if (!el) return;
  el.textContent = t || '';
  el.classList.toggle('hidden', !t);
  if (t && tipe === 'error') {
    el.className = 'rounded-xl bg-red-50 border border-red-100 px-4 py-3 text-sm font-semibold text-red-700';
  }
}

function sembunyikanTidakDitemukan() {
  const td = $('tidak-ditemukan');
  if (td) td.classList.add('hidden');
}

function tampilkanTidakDitemukan() {
  const td = $('tidak-ditemukan');
  if (td) td.classList.remove('hidden');
  $('hasil')?.classList.add('hidden');
}

function render(l, riwayat) {
  const idx   = TAHAP.findIndex(t => t.id === l.status);
  const tahap = TAHAP[Math.max(0, idx)];

  // Header
  $('h-kode').textContent = l.kode_tiket;
  $('h-meta').textContent = `${esc(labelKat(l.kategori))} ·${fmt(l.created_at)}`;
  $('h-deskripsi').textContent = l.deskripsi;

  // Badge
  const badge = $('h-badge');
  badge.className = `shrink-0 rounded-full px-3 py-1.5 text-xs font-bold ${tahap.badge}`;
  badge.textContent = tahap.label;

  // Foto
  const fotoWrap = $('h-foto-wrap');
  const fotoImg  = $('h-foto');
  if (l.foto_url && fotoImg && fotoWrap) {
    fotoImg.src = l.foto_url;
    fotoWrap.classList.remove('hidden');
  } else if (fotoWrap) {
    fotoWrap.classList.add('hidden');
  }

  // Catatan admin
  const catatanWrap = $('h-catatan-wrap');
  const catatanEl   = $('h-catatan');
  if (l.catatan_admin && catatanWrap && catatanEl) {
    catatanEl.textContent = l.catatan_admin;
    catatanWrap.classList.remove('hidden');
  } else if (catatanWrap) {
    catatanWrap.classList.add('hidden');
  }

  // PERBAIKAN: Perbaikan syntax error pada string literal (`) di baris ini
  $('timeline').innerHTML = TAHAP.map((t, i) => {
    const tercapai = i <= idx;
    const rData   = riwayat?.find(r => r.status === t.id);
    const waktu   = rData ? rData.created_at : (i === 0 ? l.created_at : null);
    const isAktif = i === idx;

    return `<li class="timeline-item ${i < TAHAP.length - 1 ? 'pb-6' : ''}">
      <div class="timeline-dot" style="color:${tercapai ? t.dot : '#D1D5DB'}; background:${tercapai ? t.dot : '#E5E7EB'}"></div>
      <div class="rounded-xl p-3 ${isAktif ? 'bg-sage-50 ring-1 ring-sage-200' : ''}">
        <p class="font-bold text-sm ${tercapai ? 'text-ink' : 'text-gray-400'}">${esc(t.label)}</p>
        <p class="text-xs mt-0.5 ${tercapai ? 'text-gray-500' : 'text-gray-300'}">${esc(t.info)}</p>
        ${waktu ? `<p class="mt-1 text-xs font-semibold text-sage-600">${fmt(waktu)}</p>` : ''}
      </div>
    </li>`;
  }).join('');

  sembunyikanTidakDitemukan();
  $('hasil').classList.remove('hidden');
}

async function cari(nilai) {
  tampilkanPesan('');
  $('hasil')?.classList.add('hidden');
  sembunyikanTidakDitemukan();

  // Memanggil fungsi normalisasi yang sudah diperbaiki
  const kode = normalisasi(nilai);
  if (!kode) {
      return tampilkanPesan('Format kode tidak sesuai. Pastikan menggunakan format yang benar, contoh: LPR-202610-001');
  }

  const btnSubmit = $('form-cari')?.querySelector('button[type="submit"]');
  const oldHTML   = btnSubmit?.innerHTML;

  try {
    // Kembalikan teks ke input dengan format yang rapi (menggunakan #)
    $('kode').value = kode;
    
    if (btnSubmit) {
      btnSubmit.disabled = true;
      btnSubmit.innerHTML = '<svg class="animate-spin h-5 w-5 mr-2 inline" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path></svg>Mencari…';
    }

    // Ambil laporan dari View publik
    const { data: laporanData, error: errLapor } = await supabase
      .from('laporan_publik')
      .select('id, kode_tiket, kategori, deskripsi, foto_url, status, catatan_admin, created_at, lat, lng')
      .eq('kode_tiket', kode)
      .maybeSingle();

    if (errLapor || !laporanData) {
      tampilkanTidakDitemukan();
      return;
    }

    // Riwayat status
    let riwayatData = [];
    const { data: rData } = await supabase
      .from('riwayat_status')
      .select('status, created_at')
      .eq('laporan_id', laporanData.id)
      .order('created_at', { ascending: true });
      
    if (rData) riwayatData = rData;

    render(laporanData, riwayatData);

  } catch (err) {
    tampilkanPesan('Terjadi kesalahan saat mencari tiket. Coba lagi.');
    console.error('[lacak]', err);
  } finally {
    if (btnSubmit) {
      btnSubmit.disabled = false;
      btnSubmit.innerHTML = oldHTML;
    }
  }
}

// Event listeners
$('form-cari')?.addEventListener('submit', (e) => {
  e.preventDefault();
  cari($('kode').value);
});

$('contoh')?.addEventListener('click', () => {$('kode').value = '#LPR-202610-001';
  // Trigger clear button visibility
  const clrBtn = $('btn-clear');
  if (clrBtn) { clrBtn.classList.remove('hidden'); clrBtn.classList.add('flex'); }
  cari('#LPR-202610-001');
});

// Auto-cari dari URL param (memastikan bersih dari ekstensi yang menempel di belakangnya jika ada)
let param = new URLSearchParams(location.search).get('kode');
if (param) {
  // Antisipasi jika Live Server tak sengaja menyisipkan .html di belakang param
  param = param.replace(/\.html$/, '');$('kode').value = param;
  cari(param);
}