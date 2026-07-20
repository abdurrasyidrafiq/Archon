-- Reset Archon POS schema — jalankan ini SEBELUM schema.sql kalau sebelumnya
-- sempat ada percobaan run yang gagal/sebagian (meninggalkan tabel dengan
-- struktur lama). Aman dipakai selama belum ada data asli yang mau dipertahankan.

drop function if exists public.checkout_transaction(uuid, text, numeric, jsonb);
drop function if exists public.find_user_by_email(text);
drop function if exists public.is_company_member(uuid);
drop function if exists public.is_company_owner(uuid);

drop trigger if exists trg_inventory_updated_at on public.inventory;
drop function if exists public.set_updated_at();

drop trigger if exists on_auth_user_created on auth.users;
drop function if exists public.handle_new_user();

drop table if exists public.receipt_details cascade;
drop table if exists public.transactions cascade;
drop table if exists public.ingredients cascade;
drop table if exists public.inventory cascade;
drop table if exists public.expenses cascade;
drop table if exists public.products cascade;
drop table if exists public.company_worker cascade;
drop table if exists public.company cascade;
drop table if exists public.users cascade;

drop type if exists public.user_role;
