-- =====================================================
-- MIGRATION: Backfill garment_type from folder name
-- =====================================================
-- Run this SQL in your Supabase SQL Editor
-- (Dashboard → SQL Editor → New Query → Paste → Run)
--
-- Fixes existing items that were created without a
-- garment_type, causing them to always show the shirt
-- icon. Sets garment_type to the folder name for any
-- item where garment_type is NULL or empty.
-- =====================================================

UPDATE items
SET garment_type = folders.name
FROM folders
WHERE items.folder_id = folders.id
  AND (items.garment_type IS NULL OR items.garment_type = '');
