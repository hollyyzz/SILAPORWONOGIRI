# PRD SILAPOR – Sistem Aspirasi & Pelaporan Warga

**SIDESA-NET Wonogiri · Versi Prototipe/MVP "No-Build" (HTML + Vanilla JS)**

| Atribut | Keterangan |
| --- | --- |
| Versi dokumen | 2.0 (re-arsitektur dari React/Vite) |
| Tanggal | 13 Oktober 2026 |
| Status | Draf untuk implementasi prototipe |
| Target deploy | Vercel (static hosting, tanpa build step) |
| Stack | HTML statis, Vanilla JS (ES Modules), Tailwind CSS CDN, Leaflet.js CDN, Supabase JS CDN |

---

## 1. Overview

### 1.1 Latar Belakang

Warga desa di Kabupaten Wonogiri sering kesulitan menyampaikan keluhan infrastruktur dan layanan publik (jalan rusak, lampu jalan mati, saluran tersumbat, longsor kecil, dsb.). Laporan lisan atau lewat grup WhatsApp mudah hilang, tidak punya lokasi pasti, dan tidak bisa dilacak. **SILAPOR** menyediakan satu pintu pelaporan yang sederhana, berbasis lokasi, dan transparan.

### 1.2 Mengapa Arsitektur Diubah

Versi awal memakai React/Vite sehingga butuh Node.js, proses build, dan konfigurasi deploy. Untuk MVP cepat, arsitektur dirombak menjadi **No-Build**: setiap halaman adalah file `.html` biasa, logika ada di file `.js` terpisah, dan semua pustaka dimuat via CDN. Hasilnya: deploy cukup *drag-and-drop* atau `git push` ke Vercel, tanpa `npm install` maupun `npm run build`.

### 1.3 Tujuan Produk

1. Warga dapat melapor dalam **maksimal 3 langkah** dari HP, termasuk warga lansia.
2. Setiap laporan memiliki **lokasi GPS, foto, dan kode tiket unik** yang bisa dilacak.
3. Publik dapat melihat sebaran masalah di **peta interaktif** dengan status berwarna.
4. Perangkat desa dapat **mengelola antrean, mengubah status, dan menghubungi pelapor via WhatsApp** dari satu dashboard.

### 1.4 Prinsip Prototipe

- **Semua fitur inti berfungsi 100%**, hanya teknologinya yang disederhanakan.
- Tidak ada framework, bundler, atau server custom. Backend sepenuhnya Supabase.
- Mobile-first, ringan, dan nyaman di jaringan seluler yang tidak stabil.

### 1.5 Di Luar Cakupan (Out of Scope)

Notifikasi push, integrasi SMS gateway, analitik lanjutan, multi-bahasa penuh, moderasi berbasis AI, dan manajemen multi-desa dengan hierarki wilayah kompleks. Hal ini dijadwalkan pada fase berikutnya.

---

## 2. Target Pengguna

| Persona | Deskripsi | Kebutuhan Utama | Modul |
| --- | --- | --- | --- |
| **Warga Umum** | Usia 17–55, terbiasa memakai HP dan WhatsApp | Lapor cepat, tahu progres | Lapor, Lacak, Peta |
| **Warga Lansia** | Usia 55+, penglihatan menurun, kurang familiar aplikasi | Teks besar, tombol besar, alur jelas | Lapor, Lacak (+ Font Resizer) |
| **Perangkat Desa (Admin)** | Kades, sekdes, staf desa | Melihat antrean, memperbarui status, menghubungi warga | Login, Dashboard |
| **Publik/Pengunjung** | Warga lain, jurnalis, pemantau | Transparansi kondisi desa | Beranda, Peta |

### Kondisi Penggunaan

- Dominan di **smartphone Android** kelas menengah ke bawah dengan koneksi 3G/4G tidak stabil.
- Pelaporan sering dilakukan **di lokasi kejadian** (GPS dan kamera harus mudah diakses).
- Admin memakai laptop atau HP; dashboard harus responsif.

---

## 3. Functional Requirements

Prioritas: **P0** = wajib ada di MVP, **P1** = sebaiknya ada, **P2** = opsional.

### 3.1 Beranda Publik (`index.html`)

| ID | Requirement | Prioritas |
| --- | --- | --- |
| FR-H1 | Hero section dengan tagline dan dua tombol utama: **"Buat Laporan"** (CTA Amber) dan **"Lacak Laporan"** | P0 |
| FR-H2 | Ringkasan statistik publik: total laporan, diproses, selesai (dihitung dari database) | P1 |
| FR-H3 | Penjelasan singkat "Cara Melapor" dalam 3 langkah | P0 |
| FR-H4 | Navbar responsif (hamburger di mobile) dan footer identitas SIDESA-NET Wonogiri | P0 |
| FR-H5 | Tombol **Font Resizer A− / A+** tampil di navbar semua halaman | P0 |

### 3.2 Modul Warga – Form Lapor (`lapor.html`)

Alur berupa **wizard 3 langkah** dengan indikator progres (1/3, 2/3, 3/3). Data disimpan sementara di memori/`localStorage` sehingga tidak hilang saat berpindah langkah.

**Langkah 1 – Foto & Lokasi**

| ID | Requirement | Prioritas |
| --- | --- | --- |
| FR-L1 | Unggah foto lewat input `<input type="file" accept="image/*" capture="environment">` sehingga bisa membuka **kamera langsung** atau memilih dari galeri | P0 |
| FR-L2 | Pratinjau foto sebelum lanjut; foto **dikompres di sisi klien** (Canvas, maks. sisi 1280 px, kualitas \~0,75, target ≤ 500 KB) | P0 |
| FR-L3 | **Auto-geotagging**: memanggil `navigator.geolocation.getCurrentPosition` otomatis saat halaman dibuka/langkah 1 aktif; menampilkan latitude, longitude, dan akurasi | P0 |
| FR-L4 | Mini-peta Leaflet menampilkan pin lokasi; pin **dapat digeser** untuk koreksi manual | P0 |
| FR-L5 | Fallback jika GPS ditolak/gagal: pesan ramah + pilihan menentukan lokasi dengan mengetuk peta | P0 |
| FR-L6 | Validasi: foto dan koordinat wajib sebelum tombol **Lanjut** aktif | P0 |

**Langkah 2 – Kategori & Deskripsi**

| ID | Requirement | Prioritas |
| --- | --- | --- |
| FR-L7 | Pilihan kategori berupa kartu ikon besar: Jalan Rusak, Penerangan/PJU, Drainase & Banjir, Sampah, Air Bersih, Bencana (longsor/pohon tumbang), Fasilitas Umum, Lainnya | P0 |
| FR-L8 | Kolom deskripsi (min. 10, maks. 500 karakter) dengan penghitung karakter | P0 |
| FR-L9 | Nama pelapor dan **nomor WhatsApp** (format 08xx/62xx, dinormalisasi ke 62xx). Nama boleh opsional/anonim di tampilan publik, tetapi nomor WA wajib agar admin bisa menghubungi | P0 |
| FR-L10 | Dropdown Dusun/RT/RW atau kolom alamat singkat (teks bebas) | P1 |

**Langkah 3 – Konfirmasi**

| ID | Requirement | Prioritas |
| --- | --- | --- |
| FR-L11 | Halaman ringkasan: foto, lokasi di peta mini, kategori, deskripsi, kontak. Tiap bagian punya tombol **Ubah** | P0 |
| FR-L12 | Tombol **Kirim Laporan** (CTA Amber): unggah foto ke Supabase Storage, lalu insert baris ke tabel `laporan` | P0 |
| FR-L13 | Setelah sukses tampilkan layar sukses berisi **kode tiket unik** (contoh `#LPR-202610-001`), tombol **Salin Kode**, dan tautan **Lacak Laporan** | P0 |
| FR-L14 | Indikator loading dan penanganan error (jaringan putus, unggah gagal) dengan tombol **Coba Lagi** | P0 |
| FR-L15 | **Draf offline**: bila offline, data teks disimpan di `localStorage`/IndexedDB dan dikirim ulang saat online (Service Worker, opsional) | P2 |

**Format Kode Tiket** `#LPR-YYYYMM-NNN` di mana `YYYYMM` = tahun-bulan pembuatan dan `NNN` = nomor urut 3 digit yang **direset tiap bulan** (001, 002, … 999, lalu otomatis 4 digit bila lebih). Kode dibuat **di database** (trigger) agar tidak bentrok saat dua warga melapor bersamaan. Detail di bagian 5.4.

### 3.3 Modul Warga – Lacak Tiket (`lacak.html`)

| ID | Requirement | Prioritas |
| --- | --- | --- |
| FR-T1 | Input kode tiket (toleran terhadap huruf besar/kecil dan ada/tidaknya tanda `#`) | P0 |
| FR-T2 | Hasil menampilkan: kategori, deskripsi, foto, tanggal lapor, dan **status saat ini** | P0 |
| FR-T3 | **Timeline status** (Dilaporkan → Diproses → Selesai) dengan cap waktu tiap perubahan | P0 |
| FR-T4 | Catatan/tanggapan dari admin ditampilkan bila ada | P1 |
| FR-T5 | Pesan jelas jika tiket tidak ditemukan; mendukung parameter URL `lacak.html?kode=LPR-202610-001` agar mudah dibagikan | P0 |
| FR-T6 | Pelacakan **tidak boleh** menampilkan nomor WA pelapor | P0 |

### 3.4 Modul Peta Publik (`peta.html`)

| ID | Requirement | Prioritas |
| --- | --- | --- |
| FR-P1 | Peta Leaflet.js (tile OpenStreetMap) terpusat di wilayah Wonogiri, zoom bisa diatur | P0 |
| FR-P2 | Marker **3 warna**: 🔴 **Merah** = Belum ditangani (`baru`), 🟡 **Kuning** = Diproses (`diproses`), 🟢 **Hijau** = Selesai (`selesai`) | P0 |
| FR-P3 | Klik marker memunculkan popup: foto kecil, kategori, deskripsi singkat, status, tanggal, kode tiket | P0 |
| FR-P4 | Legenda warna terlihat jelas dan **filter** berdasarkan status dan kategori | P1 |
| FR-P5 | Tombol **"Lokasi Saya"** untuk memusatkan peta ke posisi pengguna | P1 |
| FR-P6 | **Sinkron dengan admin**: saat status diubah, warna marker ikut berubah (via refresh data saat load + Supabase Realtime, lihat 5.5) | P0 |
| FR-P7 | Data publik **tidak memuat** nomor WA maupun nama lengkap pelapor | P0 |
| FR-P8 | Marker berkelompok (cluster) bila padat (Leaflet.markercluster via CDN) | P2 |

### 3.5 Modul Admin (`login.html`, `dashboard.html`)

**Autentikasi**

| ID | Requirement | Prioritas |
| --- | --- | --- |
| FR-A1 | Login email + kata sandi memakai **Supabase Auth**; akun perangkat desa dibuat manual oleh pengembang di Supabase Dashboard (tidak ada registrasi publik) | P0 |
| FR-A2 | `dashboard.html` memeriksa sesi saat dimuat; bila tidak ada sesi, otomatis diarahkan ke `login.html` | P0 |
| FR-A3 | Tombol **Keluar** (sign out) | P0 |

**Dashboard Antrean**

| ID | Requirement | Prioritas |
| --- | --- | --- |
| FR-D1 | **Tabel antrean laporan** terurut terbaru: kode tiket, tanggal, kategori, ringkasan, alamat, status (badge berwarna), aksi. Di HP tabel berubah menjadi daftar kartu | P0 |
| FR-D2 | Kartu statistik di atas tabel: Baru, Diproses, Selesai | P0 |
| FR-D3 | Filter status/kategori dan kolom pencarian (kode tiket atau kata kunci) | P1 |
| FR-D4 | Modal detail: foto penuh, peta mini, deskripsi lengkap, kontak pelapor, riwayat status | P0 |
| FR-D5 | **Ubah status** lewat dropdown/tombol (Baru → Diproses → Selesai) dengan kolom catatan opsional. Perubahan langsung tersimpan ke database dan **otomatis mengubah warna marker di peta publik** | P0 |
| FR-D6 | Setiap perubahan status mencatat waktu dan admin yang mengubah (tabel `riwayat_status`) | P1 |
| FR-D7 | Tombol **WhatsApp Direct Chat** per laporan: membuka `https://wa.me/<nomor>?text=<template>` pada tab baru | P0 |
| FR-D8 | Template pesan WA otomatis menyesuaikan status (lihat 3.6) | P0 |
| FR-D9 | Ekspor daftar laporan ke CSV | P2 |

### 3.6 Template Pesan WhatsApp

Pesan disusun di `admin.js` dan di-encode dengan `encodeURIComponent`.

- **Status Diproses:**

  > Halo Bapak/Ibu {nama}, kami dari Pemerintah Desa. Laporan Anda dengan kode *{kode}* tentang *{kategori}* sudah kami terima dan sedang kami tindak lanjuti. Terima kasih atas partisipasinya.
- **Status Selesai:**

  > Halo Bapak/Ibu {nama}, laporan Anda *{kode}* tentang *{kategori}* telah selesai ditangani. Mohon konfirmasi jika masih ada kendala. Terima kasih.
- **Status Baru / minta info tambahan:**

  > Halo Bapak/Ibu {nama}, kami menerima laporan *{kode}*. Boleh kami minta informasi tambahan terkait lokasi/kondisi di lapangan?

### 3.7 Aksesibilitas – Font Resizer (semua halaman)

| ID | Requirement | Prioritas |
| --- | --- | --- |
| FR-X1 | Tombol **A−** dan **A+** di navbar, dapat diakses di setiap halaman | P0 |
| FR-X2 | Menggunakan 5 level skala (mis. 87,5% · 100% · 112,5% · 125% · 150%) yang diterapkan ke `font-size` elemen `<html>`. Karena Tailwind memakai satuan `rem`, seluruh teks dan jarak ikut menyesuaikan | P0 |
| FR-X3 | Pilihan tersimpan di `localStorage` (`silapor_font_scale`) dan dipulihkan otomatis pada kunjungan berikutnya | P0 |
| FR-X4 | Layout tidak boleh rusak pada skala terbesar (tidak ada teks terpotong/overflow horizontal) | P0 |
| FR-X5 | Kontras warna minimal WCAG AA, target sentuh minimal 44×44 px, label form jelas, atribut `aria-label` pada tombol ikon, dan fokus keyboard terlihat | P0 |
| FR-X6 | Bahasa antarmuka: Bahasa Indonesia sederhana, tanpa istilah teknis | P0 |

### 3.8 PWA (Opsional tapi Disarankan)

| ID | Requirement | Prioritas |
| --- | --- | --- |
| FR-W1 | `manifest.json` (nama, ikon 192/512, `display: standalone`, `theme_color` Sage Green) agar bisa **"Tambahkan ke Layar Utama"** | P1 |
| FR-W2 | `sw.js` meng-cache aset statis (HTML, JS, CSS, ikon) dan menyimpan draf laporan saat offline | P2 |

---

## 4. Panduan Desain (UI/UX)

### 4.1 Gaya Visual

**Profesional, Modern, dan Clean.** Hindari kesan web instansi jadul (tabel padat, banner berlebihan, warna kontras tajam).

- Layout **card-based**: tiap blok informasi berada dalam kartu putih dengan `rounded-xl`, `shadow-sm`/`shadow-md` lembut, dan `border` tipis.
- **Whitespace lega**: padding kartu `p-5`–`p-6`, jarak antarbagian `space-y-6`.
- **Thumb-friendly**: tombol utama tinggi minimal `h-12` (48 px), lebar penuh di HP, diletakkan di bagian bawah layar (sticky action bar pada wizard).
- Satu aksi utama per layar; aksi sekunder berupa tombol outline/teks.
- Ikon konsisten (Heroicons/Lucide dalam bentuk SVG inline), ilustrasi ringan.

### 4.2 Palet Warna (Identitas SIDESA-NET)

| Peran | Nama | Contoh Hex | Penggunaan |
| --- | --- | --- | --- |
| Primer | **Sage Green** | `#6B8F71` (tint 50: `#F2F6F3`, 700: `#4A6850`) | Navbar, heading, tombol sekunder, progres |
| **CTA** | **Warm Amber** | `#F59E0B` (hover `#D98706`) | Tombol "Buat Laporan", "Lanjut", "Kirim Laporan" |
| Latar | Off-white | `#FAFAF7` | Latar halaman |
| Teks | Charcoal | `#1F2937` / `#6B7280` | Teks utama / sekunder |
| Status Baru | Merah | `#DC2626` | Marker & badge "Belum ditangani" |
| Status Proses | Kuning | `#EAB308` | Marker & badge "Diproses" |
| Status Selesai | Hijau | `#16A34A` | Marker & badge "Selesai" |

> Warna hex bersifat acuan dan dapat disetel ulang sesuai panduan identitas resmi SIDESA-NET. Pastikan teks di atas tombol Amber memakai warna gelap (`#1F2937`) agar kontras memenuhi AA.

Konfigurasi Tailwind via CDN (di setiap HTML, sebelum konten):

```html
<script src="https://cdn.tailwindcss.com/3.4.17"></script>
<script>
  tailwind.config = {
    theme: { extend: { colors: {
      sage:  { 50:'#F2F6F3', 100:'#E1EBE3', 500:'#6B8F71', 600:'#58795E', 700:'#4A6850' },
      amber: { cta:'#F59E0B', ctahover:'#D98706' }
    }}}
  }
</script>
```

### 4.3 Tipografi

- Font sans-serif bersih (mis. *Plus Jakarta Sans* atau *Inter* via Google Fonts, dengan fallback `system-ui`).
- Ukuran dasar 16 px (1 rem); judul tebal; `line-height` longgar untuk keterbacaan lansia.

### 4.4 Komponen Kunci

- **Wizard stepper**: tiga lingkaran bernomor dengan garis penghubung, langkah aktif berwarna Sage.
- **Kartu kategori**: grid 2 kolom di HP, ikon besar + label, terpilih ditandai border Sage dan latar tint.
- **Badge status**: pil berwarna sesuai status + ikon (jangan hanya mengandalkan warna, untuk pengguna buta warna).
- **Toast/alert** ramah untuk sukses dan error.
- **Empty state** dengan ilustrasi dan ajakan bertindak.

### 4.5 Responsivitas

Mobile-first (`<meta name="viewport" content="width=device-width, initial-scale=1">`); breakpoint `md` (≥768 px) untuk tabel dan layout dua kolom di dashboard.

---

## 5. Arsitektur Teknis

### 5.1 Struktur Folder

```text
silapor-html/
│
├── public/
│   ├── images/              # Logo Wonogiri, aset visual SIDESA, marker peta
│   ├── icons/               # Ikon untuk instalasi PWA di HP
│   ├── manifest.json        # Konfigurasi agar aplikasi bisa di-install (PWA)
│   └── sw.js                # Service Worker (opsional) untuk simpan draf saat offline
│
├── css/
│   └── style.css            # (Opsional) CSS tambahan di luar Tailwind
│
├── js/                      # PUSAT LOGIKA SISTEM
│   ├── supabase.js          # Koneksi ke database & storage Supabase
│   ├── main.js              # Fungsi global (Navbar, Font Resizer A-/A+)
│   ├── lapor.js             # Logika lapor.html: wizard 3 langkah, GPS, kamera
│   ├── lacak.js             # Logika lacak.html: pencarian tiket
│   ├── peta.js              # Logika peta.html: Leaflet JS & warna marker
│   └── admin.js             # Logika dashboard.html: tarik data, ubah status
│
├── index.html               # Beranda (Landing Page Publik)
├── lapor.html               # Form Pelaporan (Modul Warga)
├── lacak.html               # Pelacakan Tiket (Modul Warga)
├── peta.html                # Peta Hazard Interaktif (Modul Publik)
├── login.html               # Masuk untuk Perangkat Desa
├── dashboard.html           # Antrean Laporan (Modul Admin)
│
└── vercel.json              # Konfigurasi sederhana Vercel
```

**Catatan penempatan aset:** Agar `public/` dapat dilayani apa adanya, path di HTML ditulis relatif terhadap akar situ (mis. `/public/images/logo.png`) atau `vercel.json` memetakan `/images/*` ke `/public/images/*`. `manifest.json` dan `sw.js` sebaiknya dilayani dari akar domain (`/manifest.json`, `/sw.js`) agar *scope* Service Worker mencakup seluruh situs; gunakan *rewrite* di `vercel.json` untuk itu.

### 5.2 Pustaka via CDN

| Pustaka | Fungsi | Cara Muat |
| --- | --- | --- |
| Tailwind CSS 3.4 | Styling utilitas | `<script src="https://cdn.tailwindcss.com/3.4.17">` |
| Leaflet 1.9 | Peta interaktif | CSS + JS dari cdnjs/unpkg (versi dipatok) |
| Supabase JS v2 | Database, Auth, Storage, Realtime | ES Module dari `cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm` |

> Selalu **patok versi** (bukan `latest`) agar prototipe tidak rusak mendadak oleh pembaruan pustaka.

### 5.3 Cara HTML Statis & JS Berinteraksi dengan Supabase (Tanpa React)

Tanpa framework, interaksi dibangun dari tiga hal sederhana: **ES Modules**, **DOM API**, dan **Supabase client**.

**1) Satu klien Supabase bersama.** `js/supabase.js` membuat klien sekali lalu mengekspornya:

```js
// js/supabase.js
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

const SUPABASE_URL = 'https://XXXX.supabase.co';
const SUPABASE_ANON_KEY = 'eyJ...'; // anon/publishable key, aman di sisi klien bila RLS aktif

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
```

**2) Tiap halaman memuat modulnya sendiri.** Di akhir `<body>`:

```html
<script type="module" src="/js/main.js"></script>   <!-- navbar + font resizer -->
<script type="module" src="/js/lapor.js"></script>  <!-- logika khusus halaman -->
```

Browser menangani `import` antar-file secara native; **tidak perlu bundler**. `main.js` dimuat di semua halaman, sedangkan `lapor.js`, `lacak.js`, `peta.js`, `admin.js` hanya di halaman masing-masing.

**3) Manipulasi DOM langsung sebagai pengganti state React.** Data diambil dengan `await supabase.from(...)`, lalu UI dirender memakai *template literal* dan `innerHTML`/`textContent`. Contoh pola render:

```js
const { data, error } = await supabase
  .from('laporan_publik')      // view aman untuk publik
  .select('*')
  .order('created_at', { ascending: false });

if (error) return tampilkanError(error);
document.querySelector('#daftar').innerHTML = data.map(kartuLaporan).join('');
```

Penting: teks dari pengguna harus di-*escape* (atau memakai `textContent`) sebelum disisipkan ke HTML untuk mencegah XSS.

**4) Alur data per modul**

| Modul | Operasi Supabase |
| --- | --- |
| Lapor | `storage.from('foto-laporan').upload(...)` lalu `getPublicUrl(...)`, kemudian `from('laporan').insert({...}).select('kode_tiket').single()` |
| Lacak | `supabase.rpc('lacak_tiket', { p_kode })` (fungsi `SECURITY DEFINER` yang hanya mengembalikan kolom aman) |
| Peta | `from('laporan_publik').select(...)` + `channel('laporan').on('postgres_changes', ...)` untuk pembaruan langsung |
| Login | `auth.signInWithPassword({ email, password })`, `auth.getSession()`, `auth.signOut()` |
| Dashboard | `from('laporan').select('*')` (hanya bisa oleh user ter-autentikasi), `update({ status })`, `insert` ke `riwayat_status` |

**5) Keamanan tanpa server sendiri: Row Level Security (RLS).** Karena *anon key* terlihat di browser, keamanan **bukan** ditentukan oleh menyembunyikan kunci, tetapi oleh kebijakan RLS di Postgres:

- Role `anon` (publik) hanya boleh `INSERT` ke `laporan` dan `SELECT` dari view `laporan_publik` (tanpa nomor WA/nama).
- Hanya role `authenticated` (perangkat desa) yang boleh `SELECT` penuh dan `UPDATE` status.
- Bucket Storage `foto-laporan` bersifat publik untuk baca, dan unggah dibatasi tipe/ukuran file.
- **Jangan pernah** menaruh `service_role` key di kode klien.

### 5.4 Model Data (Ringkas)

```sql
-- Tabel utama
create table laporan (
  id          uuid primary key default gen_random_uuid(),
  kode_tiket  text unique,                  -- diisi trigger, mis. #LPR-202610-001
  nama        text,
  no_wa       text not null,                -- format 62xxxxxxxxxx
  kategori    text not null,
  deskripsi   text not null check (char_length(deskripsi) between 10 and 500),
  alamat      text,
  lat         double precision not null,
  lng         double precision not null,
  foto_url    text not null,
  status      text not null default 'baru'
              check (status in ('baru','diproses','selesai')),
  catatan_admin text,
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

create table riwayat_status (
  id         bigserial primary key,
  laporan_id uuid references laporan(id) on delete cascade,
  status     text not null,
  catatan    text,
  oleh       uuid references auth.users(id),
  created_at timestamptz default now()
);

-- Penghitung nomor urut per bulan (aman dari race condition)
create table counter_tiket (
  periode text primary key,   -- '202610'
  terakhir int not null default 0
);
```

**Pembuatan kode tiket (trigger `BEFORE INSERT`):**

```sql
create function buat_kode_tiket() returns trigger as $$
declare p text := to_char(now(), 'YYYYMM'); n int;
begin
  insert into counter_tiket(periode, terakhir) values (p, 1)
  on conflict (periode) do update set terakhir = counter_tiket.terakhir + 1
  returning terakhir into n;
  new.kode_tiket := '#LPR-' || p || '-' || lpad(n::text, 3, '0');
  return new;
end; $$ language plpgsql security definer;

create trigger trg_kode_tiket before insert on laporan
for each row execute function buat_kode_tiket();
```

**View publik (tanpa data pribadi):**

```sql
create view laporan_publik as
select id, kode_tiket, kategori, left(deskripsi, 140) as deskripsi,
       lat, lng, foto_url, status, created_at
from laporan;
```

### 5.5 Sinkronisasi Status Admin → Warna Marker

1. Admin mengubah status di `dashboard.html` → `admin.js` menjalankan `update` pada `laporan.status`.
2. Data tersimpan di Postgres (sumber kebenaran tunggal).
3. `peta.js` memetakan status ke warna melalui satu objek konfigurasi:

```js
const WARNA_STATUS = { baru: '#DC2626', diproses: '#EAB308', selesai: '#16A34A' };
```

4. Marker dibuat sebagai `L.divIcon`/`L.circleMarker` dengan warna dari objek di atas, sehingga tidak perlu aset gambar per warna.
5. Peta memuat data terbaru setiap dibuka dan **berlangganan Supabase Realtime**; ketika ada event `UPDATE`, marker terkait diganti warnanya tanpa reload. Cadangan jika Realtime tidak aktif: polling tiap 30–60 detik.

### 5.6 Font Resizer di `main.js`

```js
const SKALA = [87.5, 100, 112.5, 125, 150];
let idx = Number(localStorage.getItem('silapor_font_idx') ?? 1);
const terapkan = () => {
  document.documentElement.style.fontSize = SKALA[idx] + '%';
  localStorage.setItem('silapor_font_idx', idx);
};
document.querySelector('#font-plus')?.addEventListener('click',  () => { idx = Math.min(idx + 1, SKALA.length - 1); terapkan(); });
document.querySelector('#font-minus')?.addEventListener('click', () => { idx = Math.max(idx - 1, 0); terapkan(); });
terapkan();
```

Skrip kecil serupa sebaiknya juga dipanggil lebih awal (inline di `<head>`) agar tidak ada kedipan ukuran font.

### 5.7 Konfigurasi Vercel (`vercel.json`)

```json
{
  "cleanUrls": true,
  "trailingSlash": false,
  "rewrites": [
    { "source": "/manifest.json", "destination": "/public/manifest.json" },
    { "source": "/sw.js",         "destination": "/public/sw.js" }
  ],
  "headers": [
    { "source": "/sw.js", "headers": [{ "key": "Cache-Control", "value": "no-cache" }] }
  ]
}
```

Dengan `cleanUrls`, halaman dapat diakses sebagai `/lapor`, `/peta`, dst. Karena tidak ada build, setelan Vercel: **Framework Preset = Other**, *Build Command* kosong, *Output Directory* = `.` (root).

### 5.8 Catatan Teknis Penting

- **HTTPS wajib** untuk Geolocation dan kamera; Vercel menyediakannya otomatis.
- Geolocation membutuhkan izin pengguna; sediakan petunjuk jika izin ditolak.
- Kompres foto di klien untuk menghemat kuota dan kuota Storage Supabase.
- Tambahkan pembatasan laju (rate limit) sederhana di sisi klien dan pertimbangkan Cloudflare Turnstile/hCaptcha pada fase berikutnya untuk mencegah spam laporan.
- Hindari `eval`/inline handler berlebih; escape semua input pengguna.

---

## 6. Persyaratan Non-Fungsional

| Aspek | Target |
| --- | --- |
| Performa | LCP < 3 detik di 4G; total JS aplikasi (di luar CDN) < 100 KB |
| Kompatibilitas | Chrome/Edge/Firefox/Safari 2 versi terakhir; Android 8+ dan iOS 14+ |
| Ketersediaan | Mengikuti SLA Vercel dan Supabase (paket gratis cukup untuk prototipe) |
| Keamanan | RLS aktif di semua tabel, HTTPS, tanpa data pribadi di endpoint publik |
| Privasi | Nomor WA hanya terlihat oleh admin; sediakan pernyataan privasi singkat di form lapor |
| Aksesibilitas | WCAG 2.1 AA sebagai acuan |
| Maintainability | Tiap halaman punya satu file JS; fungsi bersama hanya di `main.js` dan `supabase.js` |

---

## 7. Alur Pengguna Utama

1. **Lapor:** Beranda → Buat Laporan → (1) ambil foto & GPS → (2) pilih kategori, isi deskripsi & kontak → (3) cek ringkasan, kirim → terima kode tiket.
2. **Lacak:** Beranda/Lacak → masukkan kode tiket → lihat status dan timeline.
3. **Pantau:** Peta → lihat marker berwarna → klik untuk detail.
4. **Tangani:** Login → Dashboard → buka laporan → ubah status → hubungi pelapor via WhatsApp → marker di peta berubah warna.

---

## 8. Kriteria Penerimaan (Acceptance Criteria)

- [ ] Warga dapat menyelesaikan pelaporan dalam ≤ 3 langkah dan menerima kode tiket berformat `#LPR-YYYYMM-NNN`.
- [ ] Koordinat GPS terisi otomatis dan dapat dikoreksi manual; foto tersimpan di Supabase Storage.
- [ ] Dua laporan yang dikirim bersamaan tidak pernah mendapat kode tiket sama.
- [ ] Pelacakan dengan kode valid menampilkan status dan timeline; kode tidak valid menampilkan pesan yang jelas.
- [ ] Peta menampilkan marker merah/kuning/hijau sesuai status, dan warna berubah setelah admin mengubah status.
- [ ] Dashboard hanya dapat diakses setelah login; pengguna anonim dialihkan ke `login.html`.
- [ ] Tombol WhatsApp membuka chat ke nomor pelapor dengan template pesan yang benar.
- [ ] Font Resizer A−/A+ berfungsi di semua halaman, tersimpan antar kunjungan, dan layout tetap rapi di skala 150%.
- [ ] Tidak ada nomor WA atau data pribadi yang bisa diambil lewat endpoint publik.
- [ ] Situs ter-deploy di Vercel tanpa langkah build.

---

## 9. Rencana Pengerjaan (Saran)

| Tahap | Cakupan | Estimasi |
| --- | --- | --- |
| 1 | Setup Supabase (tabel, RLS, storage, trigger tiket), `supabase.js`, `main.js`, `index.html` | 1 hari |
| 2 | `lapor.html` + `lapor.js` (wizard, GPS, kamera, kirim) | 2 hari |
| 3 | `lacak.html` + `peta.html` | 1–2 hari |
| 4 | `login.html` + `dashboard.html` (status, WhatsApp) | 2 hari |
| 5 | PWA, polesan UI, uji di HP nyata, deploy Vercel | 1–2 hari |

---

## 10. Risiko & Mitigasi

| Risiko | Dampak | Mitigasi |
| --- | --- | --- |
| Spam/laporan palsu | Antrean tidak akurat | Validasi, rate limit, captcha (fase 2), admin dapat menandai/menghapus |
| GPS tidak akurat di dalam ruangan/sinyal lemah | Lokasi salah | Tampilkan akurasi, pin dapat digeser, deskripsi alamat |
| Sinyal buruk saat kirim | Laporan gagal | Kompresi foto, tombol coba lagi, draf offline (P2) |
| Kebocoran data pribadi | Pelanggaran privasi | RLS ketat, view publik tanpa PII, tidak ada `service_role` di klien |
| CDN tidak tersedia | Aplikasi gagal tampil | Patok versi; fase berikutnya salin pustaka ke repo lokal |
| Batas paket gratis Supabase | Layanan terbatas | Kompres foto, pantau penggunaan, siapkan upgrade |

---

## 11. Pengembangan Lanjutan

Notifikasi WhatsApp/SMS otomatis, dashboard statistik dan grafik, ekspor laporan PDF, peran admin bertingkat (RT/RW/Desa/Kecamatan), dukungan penuh offline-first, dan fitur dukungan/"upvote" warga pada laporan yang sama.
