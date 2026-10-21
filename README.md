# MelekCafe POS

Sistem kasir (POS) dan manajemen inventori bahan baku untuk kedai kopi MelekCafe.

> **Tagline:** Seribu Kenikmatan disetiap Seruputan.

Dibangun dengan Next.js 14 (App Router), TypeScript, Supabase (Auth + PostgreSQL + RLS), dan Tailwind CSS. Bukan mockup — aplikasi ini menyimpan transaksi nyata ke database, mengurangi stok bahan baku secara atomik, dan membatasi akses berdasarkan role.

---

## Daftar Isi

1. [Fitur Utama](#fitur-utama)
2. [Teknologi](#teknologi)
3. [Persiapan Awal](#persiapan-awal)
4. [Setup Lokal — Langkah Demi Langkah](#setup-lokal--langkah-demi-langkah)
5. [Menjalankan Aplikasi](#menjalankan-aplikasi)
6. [Setup Pertama di Supabase](#setup-pertama-di-supabase)
7. [Provisioning Akun Awal](#provisioning-akun-awal)
8. [Login Pertama dan Ganti Password](#login-pertama-dan-ganti-password)
9. [Konfigurasi Stok dan Resep](#konfigurasi-stok-dan-resep)
10. [Deployment ke Vercel](#deployment-ke-vercel)
11. [Struktur Project](#struktur-project)
12. [Keamanan](#keamanan)
13. [Troubleshooting](#troubleshooting)

---

## Fitur Utama

**Untuk Admin / Owner:**
- Dashboard: total penjualan hari ini, jumlah transaksi, rata-rata, stok kritis, transaksi pending
- Manajemen produk & menu (CRUD, aktif/nonaktif)
- Manajemen inventori bahan baku (CRUD, penyesuaian stok, riwayat pergerakan)
- Manajemen resep (bahan + takaran per porsi)
- Manajemen akun kasir (buat, aktif/nonaktif, paksa ganti password)
- Riwayat transaksi semua kasir
- Pembatalan transaksi (void) dengan alasan wajib — stok dikembalikan otomatis
- Konfirmasi pembayaran QRIS/Transfer
- Laporan penjualan per rentang tanggal + export CSV
- Audit log (read-only)

**Untuk Kasir:**
- Halaman POS: pilih produk, atur keranjang, pilih metode pembayaran
- Checkout atomik (validasi stok, harga dari server, pengurangan stok via RPC)
- Cetak struk (Ctrl+P, layout thermal 58mm/80mm)
- Riwayat transaksi sendiri
- Ganti password akun sendiri

---

## Teknologi

| Komponen       | Teknologi                            |
|----------------|--------------------------------------|
| Framework      | Next.js 14 (App Router)               |
| Bahasa         | TypeScript 5                         |
| Styling        | Tailwind CSS 3 + custom CSS          |
| Database       | Supabase PostgreSQL                  |
| Auth           | Supabase Auth                         |
| Keamanan DB    | Row Level Security (RLS)              |
| Validasi       | Zod                                  |
| Ikon            | Inline SVG (ringan, tanpa dependensi) |
| Deployment     | Vercel                               |

---

## Persiapan Awal

Sebelum mulai, pastikan kamu punya:

1. **Node.js 20 LTS** atau lebih baru — cek dengan `node --version`
2. **Editor** — Visual Studio Code (direkomendasikan)
3. **Akun Supabase** gratis di [supabase.com](https://supabase.com)
4. **Akun GitHub** untuk version control
5. **Akun Vercel** untuk deployment (opsional, bisa pakai GitHub login)

---

## Setup Lokal — Langkah Demi Langkah

### 1. Buka folder project di VS Code

Buka folder `melekcafe-pos` di Visual Studio Code.

### 2. Install dependency

Buka terminal di VS Code (Ctrl+` atau menu Terminal → New Terminal):

```bash
npm install
```

### 3. Buat project Supabase

1. Login ke [supabase.com](https://supabase.com)
2. Klik **New Project**
3. Isi:
   - **Name:** `melekcafe-pos`
   - **Database Password:** simpan password ini di tempat aman
   - **Region:** pilih yang terdekat (misal `Southeast Asia (Singapore)`)
4. Klik **Create new project**, tunggu ~2 menit sampai selesai

### 4. Ambil URL dan API Key

Buka project Supabase kamu → **Project Settings** (ikon gerigi di kiri bawah) → **API**:

- **Project URL** — format: `https://xxxxxxxx.supabase.co`
- **anon public** key — aman untuk browser
- **service_role** key — **RAHASIA**, hanya untuk server

### 5. Buat file `.env.local`

Di root project, salin `.env.example` menjadi `.env.local`:

```bash
copy .env.example .env.local
```

Buka `.env.local` dan isi:

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbG...anon_key_kamu...
SUPABASE_SERVICE_ROLE_KEY=eyJhbG...service_role_key_kamu...
NEXT_PUBLIC_SITE_URL=http://localhost:3005

INITIAL_OWNER_LOGIN_ID=owner
INITIAL_OWNER_PASSWORD=GantiPasswordKuatMin12!
INITIAL_CASHIER_LOGIN_ID=kasir01
INITIAL_CASHIER_PASSWORD=GantiPasswordKuatMin12!
```

> **Penting:** Jangan commit `.env.local` ke Git. File ini sudah ada di `.gitignore`.

### 6. Jalankan SQL migration

Buka Supabase Dashboard → **SQL Editor** → **New query**.

Salin seluruh isi file `supabase/migrations/0001_initial_schema.sql` dari project, paste ke editor, lalu klik **Run**.

Jika berhasil, akan muncul pesan "Success. No rows returned." dan semua tabel, RLS, triggers, dan RPC functions akan terbuat.

### 7. Jalankan seed menu

Buka **SQL Editor** lagi → **New query**.

Salin seluruh isi `supabase/seed.sql`, paste, klik **Run**.

Ini akan menambahkan 10 menu awal MelekCafe (Americano, Melekcoffe Latte, Matcha Latte, Lemon Tea, dll). Dijalankan ulang tidak akan membuat duplikat.

### 8. Provisioning akun owner dan kasir pertama

Jalankan dari terminal (di folder project):

**PowerShell:**
```powershell
$env:NEXT_PUBLIC_SUPABASE_URL="https://xxxxxxxx.supabase.co"
$env:SUPABASE_SERVICE_ROLE_KEY="eyJhbG...service_role_key_kamu..."
$env:INITIAL_OWNER_LOGIN_ID="owner"
$env:INITIAL_OWNER_PASSWORD="GantiPasswordKuatMin12!"
$env:INITIAL_CASHIER_LOGIN_ID="kasir01"
$env:INITIAL_CASHIER_PASSWORD="GantiPasswordKuatMin12!"
node scripts/provision-users.mjs
```

**Bash (Linux/Mac):**
```bash
NEXT_PUBLIC_SUPABASE_URL="https://xxxxxxxx.supabase.co" \
SUPABASE_SERVICE_ROLE_KEY="eyJhbG...service_role_key_kamu..." \
INITIAL_OWNER_LOGIN_ID="owner" \
INITIAL_OWNER_PASSWORD="GantiPasswordKuatMin12!" \
INITIAL_CASHIER_LOGIN_ID="kasir01" \
INITIAL_CASHIER_PASSWORD="GantiPasswordKuatMin12!" \
node scripts/provision-users.mjs
```

Script ini **idempoten** — bisa dijalankan ulang tanpa membuat akun duplikat. Setelah selesai, **hapus variabel `INITIAL_*_PASSWORD`** dari environment.

---

## Menjalankan Aplikasi

```bash
npm run dev
```

Buka browser ke [http://localhost:3005](http://localhost:3005). Kamu akan dialihkan ke halaman login.

### Build production

Untuk verifikasi build sebelum deploy:

```bash
npm run build
```

Jika sukses, jalankan production server lokal:

```bash
npm start
```

---

## Login Pertama dan Ganti Password

1. Buka [http://localhost:3005/login](http://localhost:3005/login)
2. Masukkan **Login ID**: `owner` (atau `kasir01` untuk kasir)
3. Masukkan **Password** yang kamu set di provisioning
4. Klik **Masuk**
5. Setelah masuk ke dashboard, buka menu **Pengaturan Akun** di sidebar
6. Ganti password dengan kombinasi yang kuat (min. 12 karakter)
7. Setelah ganti password, flag "wajib ganti password" akan otomatis hilang

---

## Konfigurasi Stok dan Resep

Setelah login sebagai owner, sebelum bisa melakukan transaksi nyata:

### 1. Tambah bahan baku

Buka menu **Inventory Bahan Baku** → klik **+ Tambah Bahan**.

Isi nama bahan (misal: "Kopi Arabika"), satuan (misal: "gram"), stok awal aktual dari dapur, dan stok minimum untuk peringatan.

> **Penting:** Jangan mengisi angka rekaan. Isi stok yang benar-benar diketahui dari stok opname dapur.

### 2. Buat resep untuk setiap produk

Buka menu **Resep** → klik **+ Tambah Resep**.

Pilih produk, lalu tambahkan bahan baku dengan takaran per porsi. Contoh untuk "Americano Single Shot":
- Kopi Arabika: 18 gram
- Air: 150 ml

Tanpa resep, checkout produk tersebut akan gagal dengan pesan "Resep belum dikonfigurasi".

### 3. Uji transaksi

Login sebagai kasir (atau owner), buka **Kasir / POS**, tambahkan produk ke keranjang, pilih metode pembayaran, lalu proses transaksi. Stok bahan baku akan otomatis berkurang sesuai resep.

---

## Deployment ke Vercel

### 1. Push ke GitHub

Inisialisasi Git (jika belum):

```bash
git init
git add .
git commit -m "Initial commit: MelekCafe POS"
```

Buat repository baru di GitHub, lalu:

```bash
git remote add origin https://github.com/USERNAME/melekcafe-pos.git
git branch -M main
git push -u origin main
```

### 2. Import ke Vercel

1. Buka [vercel.com](https://vercel.com) → login dengan GitHub
2. Klik **Add New** → **Project**
3. Pilih repository `melekcafe-pos`
4. Vercel akan otomatis mendeteksi Next.js — biarkan setting default

### 3. Set environment variables di Vercel

Buka **Settings** → **Environment Variables** dan tambahkan:

| Key | Value |
|-----|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | URL project Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | anon public key |
| `SUPABASE_SERVICE_ROLE_KEY` | service_role key (RAHASIA) |
| `NEXT_PUBLIC_SITE_URL` | `https://nama-project.vercel.app` (URL Vercel) |

> **Jangan** tambahkan `INITIAL_*_PASSWORD` di Vercel. Provisioning hanya dilakukan lokal sekali.

### 4. Deploy

Klik **Deploy**. Tunggu ~2 menit hingga build selesai. Aplikasi akan live di URL Vercel.

### 5. Update redirect URL di Supabase

Buka Supabase Dashboard → **Authentication** → **URL Configuration**:

- **Site URL:** URL Vercel kamu (misal `https://melekcafe-pos.vercel.app`)
- **Redirect URLs:** tambahkan URL Vercel dan `http://localhost:3005`

### 6. Jalankan migration production

Migration sudah dijalankan di langkah setup lokal. Tidak perlu diulang kecuali ada migration baru.

Jika perlu, buka SQL Editor di Supabase dan jalankan ulang file `supabase/migrations/*.sql`.

### 7. Verifikasi deployment

Buka URL Vercel, login sebagai owner, periksa:
- Dashboard menampilkan data
- POS bisa checkout
- Inventory dan resep bisa diakses
- Riwayat transaksi muncul

---

## Struktur Project

```
melekcafe-pos/
├── app/
│   ├── (app)/                    # Halaman authenticated (dengan sidebar)
│   │   ├── dashboard/page.tsx
│   │   ├── pos/page.tsx
│   │   ├── transactions/
│   │   │   ├── page.tsx          # List transaksi
│   │   │   └── [id]/page.tsx     # Detail struk + print + void
│   │   ├── products/page.tsx
│   │   ├── inventory/page.tsx    # CRUD + stock movement history
│   │   ├── recipes/page.tsx
│   │   ├── reports/page.tsx
│   │   ├── users/page.tsx
│   │   ├── settings/page.tsx     # Ganti password
│   │   └── audit/page.tsx
│   ├── api/
│   │   ├── auth/login/route.ts
│   │   ├── auth/signout/route.ts
│   │   ├── checkout/route.ts     # Atomic checkout
│   │   ├── settings/route.ts
│   │   ├── reports/route.ts     # JSON + CSV
│   │   └── admin/
│   │       ├── products/[route.ts | [id]/route.ts]
│   │       ├── inventory/[route.ts | [id]/route.ts | [id]/movements/route.ts]
│   │       ├── recipes/[route.ts | [id]/route.ts]
│   │       ├── users/[route.ts | [id]/route.ts]
│   │       └── transactions/[id]/route.ts  # void + confirm
│   ├── login/page.tsx
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx
├── components/
│   ├── Sidebar.tsx
│   ├── auth/LoginForm.tsx
│   ├── pos/POSClient.tsx
│   └── transactions/ReceiptActions.tsx
├── lib/
│   ├── supabase/{client,server}.ts
│   ├── api/adminGuard.ts
│   ├── auth/permissions.ts
│   └── currency.ts               # formatIDR + timezone Jakarta
├── types/database.ts
├── supabase/
│   ├── migrations/0001_initial_schema.sql
│   └── seed.sql
├── scripts/provision-users.mjs
├── middleware.ts                # Auth guard
├── package.json
├── tsconfig.json
├── tailwind.config.ts
├── next.config.mjs
└── .env.example
```

---

## Keamanan

### Prinsip yang diterapkan

- **Server-side role verification** — setiap API route memverifikasi role via `requireAdmin()` / `requireAuth()`
- **RLS aktif** di semua tabel — kasir tidak bisa mengubah harga, stok, atau resep langsung
- **Service role key** tidak pernah diekspos ke browser (tidak ada `NEXT_PUBLIC_` prefix)
- **Harga diambil dari server** saat checkout — harga dari client tidak dipercaya
- **Checkout atomik** via PostgreSQL function `checkout_sale` (SECURITY DEFINER) dengan `FOR UPDATE` lock
- **Void transaksi** mengembalikan stok dan mencatat audit log
- **Password hashing** ditangani Supabase Auth, tidak disimpan plaintext
- **Pencegahan self-deactivation** — admin tidak bisa menonaktifkan akun sendiri
- **Error generik** saat login gagal — mencegah user enumeration

### Yang harus dijaga

- Jangan commit `.env.local` (sudah di `.gitignore`)
- Jangan taruh `SUPABASE_SERVICE_ROLE_KEY` di `NEXT_PUBLIC_*`
- Hapus variabel `INITIAL_*_PASSWORD` setelah provisioning
- Gunakan password yang kuat (min 12 karakter, kombinasi huruf+angka+simbol)
- Batasi akses dashboard Supabase ke orang yang tepercaya

---

## Troubleshooting

### Login gagal: "ID atau password tidak valid"

- Pastikan akun sudah di-provision (jalankan `node scripts/provision-users.mjs`)
- Cek apakah `login_id` benar (huruf kecil)
- Pastikan `NEXT_PUBLIC_SUPABASE_URL` dan `SUPABASE_SERVICE_ROLE_KEY` sudah benar di `.env.local`

### Checkout gagal: "Resep belum dikonfigurasi"

- Buka menu **Resep**, tambahkan resep untuk produk tersebut
- Pastikan resep aktif (status: Aktif)

### Checkout gagal: "Stok bahan baku tidak mencukupi"

- Buka menu **Inventory**, cek stok bahan baku
- Lakukan **Sesuaikan Stok** dengan delta positif untuk restock

### Dashboard kosong

- Wajar jika belum ada transaksi. Lakukan transaksi pertama via POS.
- Stok kritis hanya muncul jika `stock_quantity <= minimum_stock`

### Build gagal di Vercel

- Pastikan semua environment variables sudah diisi
- Cek apakah ada error TypeScript: jalankan `npm run build` lokal dulu

### "Server tidak terkonfigurasi"

- Salah satu environment variable belum diisi
- Khususnya `SUPABASE_SERVICE_ROLE_KEY` untuk operasi admin

### Struk tidak bisa dicetak

- Gunakan Ctrl+P (Windows/Linux) atau Cmd+P (Mac) di halaman struk
- Atau klik tombol **Cetak Struk**
- Pastikan printer thermal terhubung dan ukuran kertas 58mm atau 80mm

---

## Catatan Operasional

- **Zona waktu:** Semua tampilan dan laporan menggunakan `Asia/Jakarta` (WIB). Timestamp di database disimpan sebagai `timestamptz` (UTC).
- **Mata uang:** Format Rupiah dengan pemisah ribuan titik dan desimal koma (misal `Rp12.000,00`). Penyimpanan pakai `numeric(14,2)` untuk akurasi.
- **QRIS/Transfer:** Tidak ada integrasi payment gateway otomatis. Status pembayaran "pending" sampai owner mengonfirmasi manual setelah memverifikasi dana masuk.
- **Transaksi void:** Tidak dihapus permanen — tetap ada di riwayat dengan alasan, identitas, dan waktu. Stok dikembalikan otomatis via RPC.
- **Resep kosong:** Produk tanpa resep aktif tidak bisa di-checkout. Ini sengaja untuk mencegah penjualan tanpa pengurangan stok yang akurat.

---

## Lisensi

Project ini dibuat untuk MelekCafe. Hubungi owner untuk penggunaan.
