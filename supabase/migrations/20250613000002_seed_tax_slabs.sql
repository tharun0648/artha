-- ============================================================
-- A₹tha — Seed Tax Slabs
-- Migration: 20250613000002_seed_tax_slabs
-- Source: incometax.gov.in — Post Budget 2024, FY2024-25
-- ============================================================

insert into tax_slabs (regime, income_min, income_max, tax_rate, financial_year) values
  -- New regime (post-Budget July 2024)
  ('new', 0,       300000,  0.00, 'FY2024-25'),
  ('new', 300001,  700000,  0.05, 'FY2024-25'),
  ('new', 700001,  1000000, 0.10, 'FY2024-25'),
  ('new', 1000001, 1200000, 0.15, 'FY2024-25'),
  ('new', 1200001, 1500000, 0.20, 'FY2024-25'),
  ('new', 1500001, null,    0.30, 'FY2024-25'),
  -- Old regime
  ('old', 0,       250000,  0.00, 'FY2024-25'),
  ('old', 250001,  500000,  0.05, 'FY2024-25'),
  ('old', 500001,  1000000, 0.20, 'FY2024-25'),
  ('old', 1000001, null,    0.30, 'FY2024-25');
