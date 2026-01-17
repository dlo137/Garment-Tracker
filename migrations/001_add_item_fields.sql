-- =====================================================
-- MIGRATION: Add new columns to items table
-- =====================================================
-- Run this SQL in your Supabase SQL Editor
-- (Dashboard → SQL Editor → New Query → Paste → Run)

-- Add brand column
ALTER TABLE public.items
ADD COLUMN IF NOT EXISTS brand TEXT;

-- Add color column
ALTER TABLE public.items
ADD COLUMN IF NOT EXISTS color TEXT;

-- Add garment_type column
ALTER TABLE public.items
ADD COLUMN IF NOT EXISTS garment_type TEXT;

-- Add size column
ALTER TABLE public.items
ADD COLUMN IF NOT EXISTS size TEXT;

-- Add notes column
ALTER TABLE public.items
ADD COLUMN IF NOT EXISTS notes TEXT;

-- Verify the columns were added
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'items'
ORDER BY ordinal_position;
