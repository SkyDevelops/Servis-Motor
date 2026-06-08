create extension if not exists "pgcrypto";

create table if not exists users (
  id uuid primary key,
  nama varchar(100) not null,
  email varchar(100) unique not null,
  role varchar(20) default 'user',
  created_at timestamp default now()
);

create table if not exists kendaraan (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete cascade,
  merk varchar(100) not null,
  tipe varchar(100) not null,
  nomor_polisi varchar(20) not null,
  tahun integer,
  kilometer integer default 0,
  created_at timestamp default now()
);

create table if not exists reservasi (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete cascade,
  kendaraan_id uuid references kendaraan(id) on delete cascade,
  tanggal_servis date not null,
  jam_servis time not null,
  jenis_servis varchar(100) not null,
  keluhan text,
  status varchar(30) default 'Pending',
  created_at timestamp default now()
);

alter table users enable row level security;
alter table kendaraan enable row level security;
alter table reservasi enable row level security;

create policy "users can read own profile"
on users for select
using (auth.uid() = id);

create policy "users can insert own profile"
on users for insert
with check (auth.uid() = id);

create policy "users can manage own vehicles"
on kendaraan for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "users can manage own reservations"
on reservasi for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);
