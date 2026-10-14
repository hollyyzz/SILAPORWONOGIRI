// Logika login.html & dashboard.html – Supabase Auth + Database (+ Realtime).
// Path import relatif terhadap file ini (js/admin.js) agar aman di Live Server.
import { supabase } from './supabase.js';
import { esc } from './main.js';

const $ = (id) => document.getElementById(id);
// Helper aman: tidak error jika elemen tidak ada di halaman tertentu
// (catatan: "el?.prop = x" tidak valid di JavaScript, jadi dipakai helper)
const setText = (id, t) => { const el = $(id); if (el) el.textContent = t; };
const setHTML = (id, h) => { const el = $(id); if (el) el.innerHTML = h; };

const STATUS = {
  baru:     { label: 'Baru',     badge: 'badge-baru' },
  diproses: { label: 'Diproses', badge: 'badge-diproses' },
  selesai:  { label: 'Selesai',  badge: 'badge-selesai' },
};
// Jika kolom `kategori` menyimpan id (bukan label), tampilkan labelnya
const KATEGORI_LABEL = {
  jalan: 'Jalan Rusak', pju: 'Lampu Jalan', drainase: 'Drainase/Banjir', sampah: 'Sampah',
  air: 'Air Bersih', bencana: 'Bencana', fasum: 'Fasilitas Umum', lainnya: 'Lainnya',
};
const labelKategori = (k) => KATEGORI_LABEL[k] ?? k ?? '-';

// ================= UTIL =================
function toast(pesan, tipe = 'ok') {
  const warna = { ok: 'bg-sage-700', warn: 'bg-amber-600', err: 'bg-red-600' }[tipe];
  const el = document.createElement('div');
  el.setAttribute('role', 'status');
  el.className = `fixed inset-x-4 bottom-4 z-50 mx-auto max-w-md rounded-xl px-4 py-3 text-sm font-semibold text-white shadow-md ${warna}`;
  el.textContent = pesan;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 4000);
}

function pesanGalatLogin(error) {
  const msg = (error?.message || '').toLowerCase();
  if (msg.includes('invalid login credentials')) return 'Email atau kata sandi salah. Silakan periksa kembali.';
  if (msg.includes('email not confirmed')) return 'Email akun ini belum dikonfirmasi. Hubungi pengelola sistem.';
  if (error?.status === 429 || msg.includes('rate limit') || msg.includes('too many')) return 'Terlalu banyak percobaan masuk. Tunggu beberapa menit lalu coba lagi.';
  if (msg.includes('fetch') || msg.includes('network')) return 'Tidak dapat terhubung ke server. Periksa koneksi internet Anda.';
  return 'Terjadi kendala saat masuk. Silakan coba lagi.';
}

// Routing relatif (kompatibel dengan VS Code Live Server)
const HAL_LOGIN = 'login.html';
const HAL_DASHBOARD = 'dashboard.html';
const keLogin = () => location.replace(HAL_LOGIN);

// ================= LOGIN =================
async function initLogin() {
  // Sesi dikelola otomatis oleh supabase-js (disimpan di localStorage & diperbarui sendiri)
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) return location.replace(HAL_DASHBOARD);
  } catch { /* abaikan, tampilkan form */ }

  const err = (t) => {
    setText('error', t || '');
    $('error')?.classList.toggle('hidden', !t);
  };
  const resetTombol = () => {
    const btn = $('btn-masuk');
    if (!btn) return;
    btn.disabled = false;
    btn.textContent = 'Masuk';
  };

  $('toggle-pw')?.addEventListener('click', () => {
    const pw = $('password');
    if (!pw) return;
    const tampil = pw.type === 'password';
    pw.type = tampil ? 'text' : 'password';
    $('toggle-pw')?.setAttribute('aria-label', tampil ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi');
  });

  $('form-login')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = $('email')?.value.trim() ?? '';
    const password = $('password')?.value ?? '';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return err('Format email tidak valid.');
    if (!password) return err('Kata sandi wajib diisi.');
    err('');
    const btn = $('btn-masuk');
    if (btn) { btn.disabled = true; btn.textContent = 'Memeriksa…'; }
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      location.replace(HAL_DASHBOARD);
    } catch (ex) {
      err(pesanGalatLogin(ex));
      resetTombol();
      $('password')?.focus();
    }
  });
}

// ================= DASHBOARD =================
let user = null;
let semua = [];                  // seluruh laporan (tabel `laporan`)
let channel = null;              // langganan Realtime
const sedangUbah = new Set();    // kode tiket yang sedang disimpan
const filter = { status: 'semua', q: '' };

const fmtTanggal = (iso) => new Date(iso).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
const badge = (s) => `<span class="inline-block rounded-full px-3 py-1 text-xs font-bold ${STATUS[s]?.badge ?? ''}">${esc(STATUS[s]?.label ?? s)}</span>`;
const urlAman = (u) => (/^https?:\/\//i.test(u || '') ? u : null);

// ---------- WhatsApp Direct Chat ----------
function normalisasiWA(v) {
  let n = String(v ?? '').replace(/\D/g, '');
  if (n.startsWith('0')) n = '62' + n.slice(1);
  else if (n.startsWith('8')) n = '62' + n;
  return /^62\d{9,13}$/.test(n) ? n : null;
}

function templatePesan(l) {
  const sapa = l.nama ? `Halo Bapak/Ibu ${l.nama},` : 'Halo Bapak/Ibu,';
  const awal = `${sapa} kami dari Pemdes menindaklanjuti laporan ${l.kode_tiket} tentang ${labelKategori(l.kategori)}.`;
  const akhir = {
    baru: ' Laporan Anda sudah kami terima. Boleh kami minta informasi tambahan terkait lokasi dan kondisi di lapangan? Terima kasih.',
    diproses: ' Saat ini laporan Anda sedang kami tindak lanjuti. Kami akan kabari kembali setelah selesai. Terima kasih atas kesabarannya.',
    selesai: ' Laporan Anda telah selesai ditangani. Mohon kabari kami jika masih ada kendala. Terima kasih atas partisipasinya.',
  }[l.status] ?? '';
  return awal + akhir;
}

function bukaWA(l) {
  const nomor = normalisasiWA(l.no_wa);
  if (!nomor) return toast(`Nomor WhatsApp untuk ${l.kode_tiket} tidak valid atau kosong.`, 'err');
  window.open(`https://wa.me/${nomor}?text=${encodeURIComponent(templatePesan(l))}`, '_blank', 'noopener');
}

// ---------- Data ----------
async function muatData() {
  const { data, error } = await supabase
    .from('laporan')               // tabel utama (bukan view publik) → no_wa terbaca
    .select('*')
    .order('created_at', { ascending: false })
    .limit(500);
  if (error) throw error;
  semua = data ?? [];
}

async function ubahStatus(kode, baru) {
  const l = semua.find(x => x.kode_tiket === kode);
  if (!l || !STATUS[baru] || l.status === baru || sedangUbah.has(kode)) return render();

  const lama = l.status;
  sedangUbah.add(kode);
  l.status = baru;               // optimistic UI
  render();

  try {
    const { data, error } = await supabase
      .from('laporan')
      .update({ status: baru })
      .eq('kode_tiket', kode)
      .select('id')
      .maybeSingle();
    if (error) throw error;
    if (!data) throw new Error('Tidak ada baris yang berubah (izin akses ditolak?)');

    const { error: eLog } = await supabase
      .from('riwayat_status')
      .insert({ laporan_id: data.id, status: baru, oleh: user?.id });
    if (eLog) {
      console.error('Gagal mencatat riwayat:', eLog);
      toast(`Status ${kode} tersimpan, tetapi riwayat gagal dicatat.`, 'warn');
    } else {
      toast(`Status ${kode} diubah menjadi "${STATUS[baru].label}". Warna marker di peta ikut berubah.`);
    }
  } catch (ex) {
    console.error('Gagal mengubah status:', ex);
    l.status = lama;             // kembalikan tampilan
    toast('Gagal mengubah status. Periksa koneksi lalu coba lagi.', 'err');
  } finally {
    sedangUbah.delete(kode);
    render();
  }
}

// ---------- Render ----------
function selectStatus(l) {
  const lock = sedangUbah.has(l.kode_tiket) ? 'disabled' : '';
  return `<select data-status="${esc(l.kode_tiket)}" ${lock} aria-label="Ubah status ${esc(l.kode_tiket)}" class="h-11 w-full rounded-xl border border-gray-300 bg-white px-2 text-sm font-semibold focus:border-sage-500 focus:outline-none focus:ring-2 focus:ring-sage-500/40 disabled:opacity-50">
    ${Object.entries(STATUS).map(([id, s]) => `<option value="${id}" ${id === l.status ? 'selected' : ''}>${s.label}</option>`).join('')}
  </select>`;
}

function tombolWA(l) {
  return `<button type="button" data-wa="${esc(l.kode_tiket)}" aria-label="Chat warga ${esc(l.kode_tiket)} lewat WhatsApp" class="flex h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-green-600 px-4 text-sm font-bold text-white hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-600/40">
    <svg class="h-5 w-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z"/></svg>Chat Warga</button>`;
}

function tautanBantu(l) {
  const foto = urlAman(l.foto_url);
  const peta = Number.isFinite(l.lat) && Number.isFinite(l.lng) ? `https://www.google.com/maps?q=${l.lat},${l.lng}` : null;
  const kelas = 'inline-block py-1 text-xs font-bold text-sage-700 underline';
  return [
    foto && `<a href="${esc(foto)}" target="_blank" rel="noopener noreferrer" class="${kelas}">Lihat foto</a>`,
    peta && `<a href="${esc(peta)}" target="_blank" rel="noopener noreferrer" class="${kelas}">Buka lokasi</a>`,
  ].filter(Boolean).join('<span class="px-2 text-gray-300">·</span>');
}

function baris(l) {
  return `<tr class="align-top hover:bg-sage-50/50">
    <td class="whitespace-nowrap px-4 py-4 font-bold text-sage-700">${esc(l.kode_tiket)}</td>
    <td class="whitespace-nowrap px-4 py-4 text-gray-600">${fmtTanggal(l.created_at)}</td>
    <td class="max-w-[16rem] px-4 py-4"><p class="font-semibold">${esc(labelKategori(l.kategori))}</p><p class="mt-0.5 line-clamp-2 text-xs text-gray-500">${esc(l.deskripsi)}</p><div class="mt-1">${tautanBantu(l)}</div></td>
    <td class="px-4 py-4">${badge(l.status)}</td>
    <td class="px-4 py-4"><div class="flex w-64 gap-2"><div class="flex-1">${selectStatus(l)}</div>${tombolWA(l)}</div></td>
  </tr>`;
}

function kartu(l) {
  return `<article class="space-y-3 rounded-xl bg-white p-4 shadow-md">
    <div class="flex items-start justify-between gap-2">
      <div><p class="font-extrabold text-sage-700">${esc(l.kode_tiket)}</p><p class="text-xs text-gray-500">${fmtTanggal(l.created_at)}</p></div>
      ${badge(l.status)}
    </div>
    <div><p class="font-semibold">${esc(labelKategori(l.kategori))}</p><p class="mt-0.5 line-clamp-2 text-sm text-gray-600">${esc(l.deskripsi)}</p><div class="mt-1">${tautanBantu(l)}</div></div>
    <div class="grid grid-cols-2 gap-2">${selectStatus(l)}${tombolWA(l)}</div>
  </article>`;
}

function renderFilter() {
  const opsi = [['semua', 'Semua', semua.length], ...Object.entries(STATUS).map(([id, s]) => [id, s.label, semua.filter(l => l.status === id).length])];
  setHTML('filter', opsi.map(([id, label, n]) => {
    const on = filter.status === id;
    return `<button type="button" data-filter="${id}" aria-pressed="${on}" class="h-11 shrink-0 rounded-xl px-4 text-sm font-semibold ${on ? 'bg-sage-500 text-white' : 'bg-sage-50 text-sage-700 hover:bg-sage-100'}">${label} (${n})</button>`;
  }).join(''));
}

function pesan(html) {
  setHTML('kosong', html || '');
  $('kosong')?.classList.toggle('hidden', !html);
}

function render() {
  setText('m-baru', semua.filter(l => l.status === 'baru').length);
  setText('m-diproses', semua.filter(l => l.status === 'diproses').length);
  setText('m-selesai', semua.filter(l => l.status === 'selesai').length);
  renderFilter();

  const q = filter.q.toLowerCase();
  const tampil = semua.filter(l =>
    (filter.status === 'semua' || l.status === filter.status) &&
    (!q || `${l.kode_tiket} ${labelKategori(l.kategori)} ${l.deskripsi}`.toLowerCase().includes(q)));

  setHTML('tbody', tampil.map(baris).join(''));
  setHTML('kartu', tampil.map(kartu).join(''));
  pesan(tampil.length ? '' : (semua.length ? 'Tidak ada laporan yang cocok dengan filter.' : 'Belum ada laporan masuk.'));
}

// ---------- Realtime ----------
function gabung(payload) {
  const { eventType, new: baru, old } = payload;
  if (eventType === 'INSERT') {
    if (semua.some(x => x.id === baru.id)) return;
    semua.unshift(baru);
    toast(`Laporan baru masuk: ${baru.kode_tiket}`);
  } else if (eventType === 'UPDATE') {
    const i = semua.findIndex(x => x.id === baru.id);
    if (i >= 0) semua[i] = { ...semua[i], ...baru }; else semua.unshift(baru);
  } else if (eventType === 'DELETE') {
    semua = semua.filter(x => x.id !== old.id);
  }
  semua.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  render();
}

function mulaiRealtime() {
  channel = supabase.channel('admin-laporan')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'laporan' }, gabung)
    .subscribe();
  window.addEventListener('pagehide', () => { if (channel) supabase.removeChannel(channel); });
}

// ---------- Inisialisasi ----------
async function initDashboard() {
  // 1) Auth guard: ada sesi?
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return keLogin();

  // 2) Verifikasi ke server (token bisa saja sudah dicabut). Gangguan jaringan tidak mengeluarkan admin.
  user = session.user;
  const { data: cek, error: eUser } = await supabase.auth.getUser();
  if (cek?.user) user = cek.user;
  else if (eUser && [401, 403].includes(eUser.status)) {
    try { await supabase.auth.signOut(); } catch {}
    return keLogin();
  }

  // Jika sesi berakhir/keluar di tab lain → kembali ke login
  supabase.auth.onAuthStateChange((event) => { if (event === 'SIGNED_OUT') keLogin(); });

  document.documentElement.classList.remove('auth-pending'); // tampilkan halaman
  setText('admin-email', user?.email ?? '');

  // Logout: signOut() lalu redirect ke login.html (tetap redirect walau signOut gagal)
  $('btn-keluar')?.addEventListener('click', async () => {
    const btn = $('btn-keluar');
    if (btn) btn.disabled = true;
    try { await supabase.auth.signOut(); } catch (ex) { console.error(ex); }
    keLogin();
  });

  $('cari')?.addEventListener('input', (e) => { filter.q = e.target.value.trim(); render(); });
  $('filter')?.addEventListener('click', (e) => {
    const b = e.target.closest('button[data-filter]');
    if (!b) return;
    filter.status = b.dataset.filter;
    render();
  });
  document.addEventListener('change', (e) => {          // ubah status (tabel & kartu)
    const sel = e.target.closest?.('select[data-status]');
    if (sel) ubahStatus(sel.dataset.status, sel.value);
  });
  document.addEventListener('click', (e) => {           // WhatsApp Direct Chat
    const b = e.target.closest?.('button[data-wa]');
    if (!b) return;
    const l = semua.find(x => x.kode_tiket === b.dataset.wa);
    if (l) bukaWA(l);
  });
  document.addEventListener('click', (e) => {           // coba lagi setelah gagal muat
    if (e.target.closest?.('#btn-ulang')) muat();
  });

  // 3) Tarik data + langganan Realtime
  async function muat() {
    pesan('Memuat laporan…');
    try { await muatData(); render(); }
    catch (ex) {
      console.error('Gagal memuat laporan:', ex);
      pesan('Gagal memuat laporan. <button id="btn-ulang" type="button" class="ml-1 font-bold text-sage-700 underline">Coba lagi</button>');
    }
  }
  await muat();
  mulaiRealtime();
}

// ================= ENTRY POINT =================
// Fleksibel: menerima 'dashboard' maupun 'dashboard.html'
const halaman = document.body?.dataset?.page ?? '';
if (halaman === 'login' || halaman === 'login.html') initLogin();
else if (halaman === 'dashboard' || halaman === 'dashboard.html') initDashboard();