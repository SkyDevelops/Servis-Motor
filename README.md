# SiMontir

SiMontir adalah sistem reservasi servis motor berbasis web dengan Express.js, Bootstrap 5, Supabase PostgreSQL, dan Supabase Auth.

## Struktur Folder

```text
User/       Web pelanggan, login/sign up pelanggan, reservasi servis
Admin/      Dashboard admin dengan port terpisah
src/        Backend shared: controller, route, service, config Supabase
```

Logo aplikasi berada di:

```text
src/public/assets/logo-SiMontir.webp
```

## Environment

Isi `.env`:

```env
SUPABASE_URL=
SUPABASE_PUBLISHABLE_KEY=
SUPABASE_ANON_KEY=
SUPABASE_SECRET_KEY=
JWT_SECRET=
PORT=3000
USER_PORT=3000
ADMIN_PORT=3001
```

Jalankan SQL di `supabase_schema.sql` melalui Supabase SQL Editor.

## Menjalankan Web Pelanggan

```bash
npm run dev:user
```

atau:

```bash
npm run dev
```

URL:

```text
http://localhost:3000
```

Pengunjung bisa membuka halaman informasi tanpa login. Login/sign up hanya diperlukan ketika pelanggan ingin menambahkan kendaraan dan membuat reservasi servis.

## Menjalankan Dashboard Admin

```bash
npm run dev:admin
```

URL:

```text
http://localhost:3001
```

Akun admin harus memiliki `role = admin` di tabel `users`.

## Endpoint

### Authentication

```http
POST /api/auth/register
POST /api/auth/login
POST /api/auth/logout
```

### Vehicle

```http
GET    /api/vehicles
POST   /api/vehicles
PUT    /api/vehicles/:id
DELETE /api/vehicles/:id
```

### Reservation

```http
GET    /api/reservations
POST   /api/reservations
PUT    /api/reservations/:id
DELETE /api/reservations/:id
POST   /api/reservations/recommendation
```

### Admin

```http
GET /api/admin/dashboard
GET /api/admin/users
GET /api/admin/reservations
PUT /api/admin/reservations/:id
```

## Rekomendasi Servis

Fitur rekomendasi servis memberi saran jenis servis berdasarkan kilometer motor:

```text
< 5.000 km    Servis Ringan
< 10.000 km   Ganti Oli
< 20.000 km   Tune Up
>= 20.000 km  Servis Besar
```

Ini bukan AI kompleks. Di aplikasi ini fungsinya sebagai fitur bantu agar pelanggan punya saran awal sebelum membuat reservasi.
