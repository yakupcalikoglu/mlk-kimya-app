-- MLK Kimya ERP — Sermaye Modülü Tabloları
-- Bu dosyayı Supabase SQL Editor'de çalıştırın.

create table if not exists mlk_sermaye_ortaklar (
  id          bigserial primary key,
  ad          text not null,
  pay         numeric default 0,
  hedef       numeric,
  tc_no       text,
  notlar      text,
  created_at  timestamptz default now()
);

create table if not exists mlk_sermaye_odemeler (
  id             bigserial primary key,
  ortak_id       bigint references mlk_sermaye_ortaklar(id) on delete cascade,
  ortak_ad       text,
  tarih          date not null,
  tutar          numeric not null,
  tur            text check (tur in ('nakit','havale','cek')) default 'nakit',
  durum          text check (durum in ('odendi','bekliyor')) default 'odendi',
  aciklama       text,
  hedef          text check (hedef in ('kasaya','cariye','direkt','diger')),
  hedef_aciklama text,
  kasa_har_id    bigint,
  created_at     timestamptz default now()
);

create table if not exists mlk_sermaye_iadeler (
  id            bigserial primary key,
  ortak_id      bigint references mlk_sermaye_ortaklar(id) on delete cascade,
  ortak_ad      text,
  tarih         date not null,
  tur           text check (tur in ('nakit_iade','mahsup_mal','mahsup_makine','mahsup_kira','diger')),
  tutar         numeric not null,
  aciklama      text,
  kasa_etki     boolean default false,
  kasa_gider_id bigint,
  created_at    timestamptz default now()
);

create index if not exists idx_sermaye_odemeler_ortak on mlk_sermaye_odemeler(ortak_id);
create index if not exists idx_sermaye_iadeler_ortak  on mlk_sermaye_iadeler(ortak_id);

-- NOT: mlk_kasa tablonuzun gerçek kolon adlarını görmediğim için
-- kasa_har_id / kasa_gider_id kolonlarını genel bigint olarak bıraktım.
-- mlk_kasa.id tipiniz uuid ise bu kolonları uuid'ye çevirin.

-- RLS (Row Level Security) — projenizde RLS açıksa aşağıdaki gibi
-- basit bir "authenticated kullanıcılar okuyup yazabilir" politikası
-- ekleyebilirsiniz. Kapalıysa bu bloğu atlayın.
-- alter table mlk_sermaye_ortaklar enable row level security;
-- create policy "auth full access" on mlk_sermaye_ortaklar
--   for all using (auth.role() = 'authenticated');
-- (aynısını mlk_sermaye_odemeler ve mlk_sermaye_iadeler için de yapın)
