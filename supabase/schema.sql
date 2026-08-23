-- ============================================================
-- DAYBOOK — Supabase schema
-- Chạy toàn bộ file này trong: Supabase Dashboard > SQL Editor > New query
-- ============================================================

-- ------------------------------------------------------------
-- 1) profiles — 1 hàng / 1 user, chứa cài đặt + API key riêng
-- ------------------------------------------------------------
create table if not exists public.profiles (
  id               uuid primary key references auth.users (id) on delete cascade,
  language         text not null default 'vi',
  theme            text not null default 'light',
  gemini_api_key   text,                              -- API key Gemini riêng của user (không bao giờ để lộ cho user khác)
  ai_model         text not null default 'gemini-2.5-flash',
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

-- ------------------------------------------------------------
-- 2) tasks — công việc / sự kiện của từng user
-- ------------------------------------------------------------
create table if not exists public.tasks (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users (id) on delete cascade,
  title         text not null,
  description   text default '',
  date          date not null,
  time          time,                                  -- nullable: việc "cả ngày" không có giờ cụ thể
  tag           text not null default 'personal' check (tag in ('study','work','personal','entertainment')),
  completed     boolean not null default false,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists tasks_user_date_idx on public.tasks (user_id, date);

-- ------------------------------------------------------------
-- 3) updated_at tự động cập nhật
-- ------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_profiles_updated_at on public.profiles;
create trigger trg_profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

drop trigger if exists trg_tasks_updated_at on public.tasks;
create trigger trg_tasks_updated_at
  before update on public.tasks
  for each row execute function public.set_updated_at();

-- ------------------------------------------------------------
-- 4) Row Level Security — mỗi user CHỈ đọc/sửa/xóa được dữ liệu của chính mình
-- ------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.tasks    enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own" on public.profiles
  for select using (auth.uid() = id);

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own" on public.profiles
  for insert with check (auth.uid() = id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);

drop policy if exists "tasks_select_own" on public.tasks;
create policy "tasks_select_own" on public.tasks
  for select using (auth.uid() = user_id);

drop policy if exists "tasks_insert_own" on public.tasks;
create policy "tasks_insert_own" on public.tasks
  for insert with check (auth.uid() = user_id);

drop policy if exists "tasks_update_own" on public.tasks;
create policy "tasks_update_own" on public.tasks
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "tasks_delete_own" on public.tasks;
create policy "tasks_delete_own" on public.tasks
  for delete using (auth.uid() = user_id);

-- ============================================================
-- Xong! Kiểm tra nhanh:
--   select * from public.profiles;   -- chỉ thấy được của chính mình khi query qua anon key + đã đăng nhập
--   select * from public.tasks;
-- ============================================================
