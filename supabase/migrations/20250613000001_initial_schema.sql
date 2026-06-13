-- ============================================================
-- A₹tha — Initial Schema
-- Migration: 20250613000001_initial_schema
-- ============================================================

-- USER DATA TABLES

create table profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  age integer,
  city text,
  company_type text check (company_type in ('startup','mnc','psu','other')),
  risk_appetite text check (risk_appetite in ('conservative','moderate','aggressive')),
  created_at timestamptz default now()
);

create table financial_twin (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade unique,
  monthly_income numeric default 0,
  last_year_income numeric default 0,
  income_growth_rate numeric generated always as (
    case when last_year_income = 0 then 0
    else (monthly_income - last_year_income) / last_year_income end
  ) stored,
  monthly_rent numeric default 0,
  monthly_food numeric default 0,
  monthly_transport numeric default 0,
  monthly_entertainment numeric default 0,
  monthly_other numeric default 0,
  total_monthly_emi numeric default 0,
  total_monthly_expenses numeric generated always as (
    monthly_rent + monthly_food + monthly_transport +
    monthly_entertainment + monthly_other + total_monthly_emi
  ) stored,
  current_savings numeric default 0,
  equity_investments numeric default 0,
  epf_balance numeric default 0,
  primary_goal text check (primary_goal in ('home','wealth','safety','retirement','education')),
  goal_target_amount numeric,
  goal_target_year integer,
  updated_at timestamptz default now()
);

create table subscriptions (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade,
  name text not null,
  monthly_amount numeric default 0,
  category text,
  is_active boolean default true,
  created_at timestamptz default now()
);

create table twin_analyses (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade,
  analysis_type text check (analysis_type in ('verdict','blind_spots','health_score')),
  twin_snapshot jsonb,
  output jsonb,
  created_at timestamptz default now()
);

create table simulations (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade,
  scenario_query text,
  scenario_type text check (scenario_type in ('mba','home_purchase','job_switch','custom')),
  twin_snapshot jsonb,
  result jsonb,
  created_at timestamptz default now()
);

-- REFERENCE DATA TABLES

create table market_returns (
  id uuid default gen_random_uuid() primary key,
  instrument text,
  period_years integer,
  cagr_pct numeric,
  source text,
  as_of_date date
);

create table city_inflation (
  id uuid default gen_random_uuid() primary key,
  city text,
  state text,
  annual_cpi_pct numeric,
  year integer
);

create table property_appreciation (
  id uuid default gen_random_uuid() primary key,
  city text unique,
  state text,
  annual_appreciation_pct numeric,
  residex_index_current numeric,
  as_of_quarter text
);

create table term_premiums (
  id uuid default gen_random_uuid() primary key,
  age_years integer,
  cover_amount_cr numeric,
  annual_premium_inr numeric,
  gender text check (gender in ('male','female')),
  smoker boolean default false,
  insurer text
);

create table tax_slabs (
  id uuid default gen_random_uuid() primary key,
  regime text check (regime in ('old','new')),
  income_min numeric,
  income_max numeric,
  tax_rate numeric,
  financial_year text
);

create table credit_cards (
  id uuid default gen_random_uuid() primary key,
  card_id text unique,
  name text,
  issuer text,
  tier text check (tier in ('entry','mid','premium','super_premium')),
  annual_fee_inr numeric default 0,
  joining_fee_inr numeric default 0,
  fee_waiver_condition text,
  reward_rate_best numeric,
  reward_rate_others numeric,
  best_for_categories text[],
  reward_type text check (reward_type in ('cashback','points','miles')),
  reward_point_value_paise numeric,
  min_annual_income_inr numeric,
  credit_score_min integer,
  employment_type text check (employment_type in ('salaried','self_employed','both')),
  lounge_access_domestic integer default 0,
  lounge_access_international integer default 0,
  has_fuel_surcharge_waiver boolean default false,
  has_movie_benefits boolean default false,
  insurance_benefits text,
  welcome_benefit_inr numeric default 0,
  best_combo_with text,
  trap_warning text,
  is_lifetime_free boolean default false,
  network text check (network in ('visa','mastercard','rupay','amex','diners')),
  is_active boolean default true
);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

alter table profiles enable row level security;
alter table financial_twin enable row level security;
alter table subscriptions enable row level security;
alter table twin_analyses enable row level security;
alter table simulations enable row level security;
alter table market_returns enable row level security;
alter table city_inflation enable row level security;
alter table property_appreciation enable row level security;
alter table term_premiums enable row level security;
alter table tax_slabs enable row level security;
alter table credit_cards enable row level security;

-- User tables: owner-only
create policy "Users own their profile"
  on profiles for all using (auth.uid() = id);

create policy "Users own their twin"
  on financial_twin for all using (auth.uid() = user_id);

create policy "Users own their subscriptions"
  on subscriptions for all using (auth.uid() = user_id);

create policy "Users own their analyses"
  on twin_analyses for all using (auth.uid() = user_id);

create policy "Users own their simulations"
  on simulations for all using (auth.uid() = user_id);

-- Reference tables: authenticated read only
create policy "Authenticated read market_returns"
  on market_returns for select using (auth.role() = 'authenticated');

create policy "Authenticated read city_inflation"
  on city_inflation for select using (auth.role() = 'authenticated');

create policy "Authenticated read property_appreciation"
  on property_appreciation for select using (auth.role() = 'authenticated');

create policy "Authenticated read term_premiums"
  on term_premiums for select using (auth.role() = 'authenticated');

create policy "Authenticated read tax_slabs"
  on tax_slabs for select using (auth.role() = 'authenticated');

create policy "Authenticated read credit_cards"
  on credit_cards for select using (auth.role() = 'authenticated');
