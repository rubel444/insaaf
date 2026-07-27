-- এই পুরো ফাইলটা Supabase Dashboard > SQL Editor এ পেস্ট করে "Run" চাপুন

create extension if not exists "pgcrypto";

create table if not exists members (
  id uuid primary key default gen_random_uuid(),
  member_no int,
  name text not null,
  photo_url text,
  status text not null default 'active', -- active | left | excluded
  previous_amount numeric not null default 0,
  join_date date default now(),
  left_date date,
  notes text,
  created_at timestamptz default now()
);

create table if not exists investments (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  invested_amount numeric not null default 0,
  profit_amount numeric not null default 0,
  distribution_date date not null default now(),
  notes text,
  created_at timestamptz default now()
);

create table if not exists transactions (
  id uuid primary key default gen_random_uuid(),
  member_id uuid references members(id) on delete cascade,
  type text not null, -- deposit | profit | adjustment | withdrawal
  amount numeric not null,
  deposit_date date not null default now(),
  for_month text, -- e.g. "July 2026" - কোন মাসের কিস্তি এইটা
  remarks text,
  investment_id uuid references investments(id) on delete set null,
  created_at timestamptz default now()
);

create index if not exists idx_transactions_member on transactions(member_id);
create index if not exists idx_transactions_investment on transactions(investment_id);

-- Row Level Security বন্ধ রাখা হচ্ছে কারণ সব অ্যাক্সেস আমাদের Next.js সার্ভার
-- কোড এর মাধ্যমে service_role key দিয়ে হবে (browser এ কখনো key যাবে না)
alter table members disable row level security;
alter table investments disable row level security;
alter table transactions disable row level security;
