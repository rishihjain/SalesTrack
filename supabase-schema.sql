-- ============================================================
-- DukanBook — Supabase SQL Schema
-- Paste this into: Supabase → SQL Editor → New Query → Run
-- ============================================================

-- 1. Shops table (one per user)
create table if not exists shops (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  shop_name text not null,
  created_at timestamptz default now()
);

-- 2. Transactions table
create table if not exists transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  shop_id uuid references shops(id) on delete cascade not null,
  type text not null check (type in ('income', 'expense')),
  subtype text, -- 'cash' or 'upi' for income
  amount numeric(12, 2) not null,
  note text default '',
  date date not null default current_date,
  created_at timestamptz default now()
);

-- 3. Row Level Security — each user sees only their own data
alter table shops enable row level security;
alter table transactions enable row level security;

-- Shops policies
create policy "Users can view own shop"
  on shops for select using (auth.uid() = user_id);

create policy "Users can insert own shop"
  on shops for insert with check (auth.uid() = user_id);

create policy "Users can update own shop"
  on shops for update using (auth.uid() = user_id);

-- Transactions policies
create policy "Users can view own transactions"
  on transactions for select using (auth.uid() = user_id);

create policy "Users can insert own transactions"
  on transactions for insert with check (auth.uid() = user_id);

create policy "Users can delete own transactions"
  on transactions for delete using (auth.uid() = user_id);

-- 4. Index for fast date-range queries
create index if not exists transactions_user_date
  on transactions(user_id, date desc);
