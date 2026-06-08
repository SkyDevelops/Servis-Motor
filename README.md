# SiMontir

SiMontir adalah sistem reservasi servis motor berbasis web dengan Express.js, Bootstrap 5, Supabase PostgreSQL, dan Supabase Auth.

## Fitur

- Register, login, dan logout
- Manajemen kendaraan pelanggan
- Reservasi servis motor
- Cek slot servis
- Dashboard admin
- Update status reservasi
- Rekomendasi servis berdasarkan kilometer

## Instalasi

```bash
npm install
```

Salin `.env.example` menjadi `.env`, lalu isi konfigurasi Supabase.

```env
SUPABASE_URL=
SUPABASE_ANON_KEY=
JWT_SECRET=
PORT=3000
```

Jalankan SQL di `supabase_schema.sql` melalui Supabase SQL Editor.

## Menjalankan Program

```bash
npm run dev
```

atau:

```bash
npm start
```

Aplikasi berjalan di:

```text
http://localhost:3000
```

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

## GitHub

Repository target:

```text
https://github.com/SkyDevelops/Servis-Motor.git
```
