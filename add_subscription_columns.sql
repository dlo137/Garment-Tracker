-- Add subscription-related columns to profiles table
-- Run this in Supabase SQL Editor (Dashboard → SQL Editor → New Query → Paste → Run)

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS purchase_time TIMESTAMPTZ;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS price TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS subscription_id TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS product_id TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_pro_version BOOLEAN DEFAULT FALSE;
