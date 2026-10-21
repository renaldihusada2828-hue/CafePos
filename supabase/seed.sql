-- MelekCafe POS — Seed Menu
-- Jalankan SETELAH 0001_initial_schema.sql
-- Data menu dari daftar resmi MelekCafe.
-- Idempoten: tidak membuat duplikat jika dijalankan ulang.
-- PENTING: Seed ini TIDAK mengisi stok bahan baku atau takaran resep
--          karena angka-angka tersebut harus diisi berdasarkan data nyata dapur.

insert into products (name, category, price, is_active)
values
  -- Coffee
  ('Americano Single Shot',  'Coffee',     5000.00,  true),
  ('Americano Double Shot',  'Coffee',     7000.00,  true),
  ('Melekcoffe Latte',       'Coffee',     9000.00,  true),
  ('Coffe Latte Gula Aren',  'Coffee',    10000.00,  true),
  ('Matcha Latte',           'Coffee',    12000.00,  true),
  -- Non-Coffee
  ('Royal Chocolate',        'Non-Coffee', 12000.00, true),
  ('Lemon Tea',              'Non-Coffee',  6000.00, true),
  ('Pink Lemonade',          'Non-Coffee',  6000.00, true),
  ('Orange Squash',          'Non-Coffee',  6000.00, true),
  ('Blackcurrant',           'Non-Coffee',  5000.00, true)
on conflict do nothing;
