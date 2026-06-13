-- Migration: 20250613000003_market_returns_unique
-- Adds unique constraint to support upsert in seed script

alter table market_returns
  add constraint market_returns_instrument_period_unique
  unique (instrument, period_years);
