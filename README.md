# Kedai Jeyshen Siallagan — Website Pemesanan & Admin

Aplikasi web untuk Kedai Jeyshen Siallagan, dibangun dengan Next.js (React) dan database
SQLite lokal. Ada dua sisi:

- **Halaman pelanggan** (`/`) — lihat menu, pilih item, isi nama, lalu kirim pesanan.
  Setelah pesanan dibuat, halaman langsung menampilkan kode QRIS untuk di-scan dan tombol
  "Saya Sudah Bayar" — pelanggan tidak perlu ke kasir untuk membayar.
- **Panel admin** (`/admin`) — login, lihat semua transaksi dengan filter tanggal/nama/status,
  ringkasan pendapatan per metode pembayaran, ubah status pesanan (menunggu pembayaran / menunggu
  konfirmasi / lunas / dibatalkan), ekspor CSV, kelola daftar menu (tambah, sembunyikan, hapus),
  dan unggah/ganti gambar QRIS yang tampil di halaman pelanggan (tab "Pembayaran QRIS").

## Alur pembayaran QRIS

1. Pelanggan pilih menu dan kirim pesanan.
2. Halaman langsung menampilkan kode QRIS toko (diunggah admin lewat tab "Pembayaran QRIS")
   beserta total tagihan.
3. Pelanggan scan dan bayar lewat aplikasi e-wallet/m-banking apa pun yang mendukung QRIS.
4. Pelanggan menekan "Saya Sudah Bayar" — status pesanan berubah menjadi "Menunggu Konfirmasi".
5. Kasir mengecek mutasi masuk di rekening/aplikasi merchant, lalu mengubah status ke "Lunas"
   (atau "Dibatalkan" bila ternyata tidak ada pembayaran masuk) lewat panel admin.

Ini **bukan** integrasi otomatis ke payment gateway (Midtrans/Xendit/dll) — QR yang ditampilkan
adalah QRIS statis milik toko, dan konfirmasi status tetap dilakukan manual oleh kasir. Kalau ke
depannya butuh konfirmasi otomatis (misalnya lewat notifikasi mutasi bank), itu perlu integrasi
ke payment gateway berizin BI dan bisa dibantu setup terpisah.

## Menjalankan di komputer sendiri

Butuh [Node.js](https://nodejs.org) versi 18 ke atas.

```bash
# 1. Masuk ke folder project
cd kedai-jeyshen

# 2. Install semua dependency
npm install

# 3. Buat database + akun admin default + contoh menu
npm run seed

# 4. Jalankan di mode development
npm run dev
```

Buka `http://localhost:3000` untuk halaman pelanggan, dan `http://localhost:3000/admin`
untuk panel admin.

**Login admin default** (dibuat oleh `npm run seed`):
- Username: `admin`
- Password: `jeyshen123`

Ganti password ini setelah login pertama kali (lewat database, karena belum ada halaman
ganti password — bisa saya tambahkan kalau perlu).

## Struktur data

Database SQLite disimpan otomatis di `data/kedai.db` saat pertama kali dijalankan — tidak
perlu setup database server terpisah. Tabelnya: `admins`, `menu_items`, `orders`, `order_items`.

## Deploy ke internet

Cara termudah adalah lewat [Vercel](https://vercel.com) (gratis untuk mulai):
1. Push folder ini ke repository GitHub.
2. Import repo tersebut di Vercel.
3. Setelah deploy pertama, jalankan `npm run seed` sekali lewat Vercel CLI atau tambahkan
   admin manual, karena database SQLite lokal akan ter-reset setiap deploy di Vercel
   (butuh database eksternal seperti Turso/Postgres kalau mau dipakai produksi jangka
   panjang — saya bisa bantu migrasi kalau sudah siap ke tahap itu).

## Yang bisa dikembangkan selanjutnya

- Halaman ganti password admin
- Multi-admin dengan role berbeda
- Riwayat pesanan per pelanggan (tanpa login, misal lewat nomor WhatsApp)
- Notifikasi pesanan baru masuk (misal ke WhatsApp/Telegram kasir)
- Integrasi QRIS dinamis otomatis lewat payment gateway (Midtrans/Xendit/dll) supaya status
  "Lunas" berubah otomatis tanpa perlu dicek manual oleh kasir
