-- ==============================================================================
-- SUPABASE DATABASE SCHEMA CHO ỨNG DỤNG SẮP XẾP THỜI KHÓA BIỂU
-- Chạy toàn bộ mã này trong Supabase: SQL Editor -> New Query -> Run
-- ==============================================================================

-- 1. BẢNG LƯU DỮ LIỆU CẤU HÌNH THỜI KHÓA BIỂU CỦA NGƯỜI DÙNG (app_data)
-- Lưu: Lớp, Môn học, Giáo viên, Cấu hình tiết/buổi/tiết trống, Thời khóa biểu các tuần
create table if not exists public.app_data (
  id text primary key,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamp with time zone default timezone('utc'::text, now())
);

-- Bật RLS và cấp quyền truy cập toàn quyền cho app_data
alter table public.app_data enable row level security;

drop policy if exists "Allow all operations on app_data" on public.app_data;
create policy "Allow all operations on app_data" 
on public.app_data 
for all 
using (true) 
with check (true);

grant all on table public.app_data to anon, authenticated, service_role;


-- 2. BẢNG QUẢN LÝ BẢN QUYỀN (licenses)
-- Lưu trữ mã kích hoạt bản quyền (1 tháng / 1 năm), trạng thái sử dụng, email người kích hoạt
create table if not exists public.licenses (
  id uuid primary key default gen_random_uuid(),
  key text unique not null,
  type text default 'full', -- 'trial' (1 tháng) hoặc 'full' (1 năm)
  status text default 'unused', -- 'unused' hoặc 'used'
  used_by_email text,
  used_by_name text,
  used_by_phone text,
  used_at timestamp with time zone,
  duration_days integer default 365,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- Bật RLS và cấp quyền truy cập toàn quyền cho licenses
alter table public.licenses enable row level security;

drop policy if exists "Allow all operations on licenses" on public.licenses;
create policy "Allow all operations on licenses" 
on public.licenses 
for all 
using (true) 
with check (true);

grant all on table public.licenses to anon, authenticated, service_role;


-- 3. BẢNG CẤU HÌNH TOÀN CỤC (global_settings)
-- Lưu hình ảnh nền màn hình đăng nhập, logo, thông tin hệ thống
create table if not exists public.global_settings (
  id text primary key,
  value jsonb not null default '{}'::jsonb,
  updated_at timestamp with time zone default timezone('utc'::text, now())
);

-- Bật RLS và cấp quyền truy cập toàn quyền cho global_settings
alter table public.global_settings enable row level security;

drop policy if exists "Allow all operations on global_settings" on public.global_settings;
create policy "Allow all operations on global_settings" 
on public.global_settings 
for all 
using (true) 
with check (true);

grant all on table public.global_settings to anon, authenticated, service_role;


-- 4. TẠO BUCKET STORAGE CHO ẢNH (images)
-- Dùng để lưu ảnh nền trang đăng nhập, tài liệu và các ảnh tải lên
insert into storage.buckets (id, name, public)
values ('images', 'images', true)
on conflict (id) do update set public = true;

drop policy if exists "Allow public select on images" on storage.objects;
create policy "Allow public select on images" 
on storage.objects for select 
using (bucket_id = 'images');

drop policy if exists "Allow public insert on images" on storage.objects;
create policy "Allow public insert on images" 
on storage.objects for insert 
with check (bucket_id = 'images');

drop policy if exists "Allow public update on images" on storage.objects;
create policy "Allow public update on images" 
on storage.objects for update 
using (bucket_id = 'images');

drop policy if exists "Allow public delete on images" on storage.objects;
create policy "Allow public delete on images" 
on storage.objects for delete 
using (bucket_id = 'images');


-- 5. THÊM DỮ LIỆU MẪU SẴN DÙNG (SEED DATA)
-- Cấu hình ảnh nền đăng nhập mặc định
insert into public.global_settings (id, value)
values (
  'login_bg', 
  jsonb_build_object('url', 'https://images.unsplash.com/photo-1580582932707-520aed937b7b?auto=format&fit=crop&w=1920&q=80')
)
on conflict (id) do nothing;

-- Thêm một số Key bản quyền mẫu để kích hoạt ngay:
insert into public.licenses (key, type, status, duration_days)
values 
  ('SL-DEMO-2026', 'full', 'unused', 365),
  ('SL-PRO1-2026', 'full', 'unused', 365),
  ('SL-TRIAL-01', 'trial', 'unused', 30)
on conflict (key) do nothing;
