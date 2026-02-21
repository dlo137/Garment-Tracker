-- =====================================================
-- VIEWS TO SHOW USER NAME WITH FOLDERS AND ITEMS
-- =====================================================
-- Run this in Supabase SQL Editor
-- These views join folders/items with profiles to show the user's name

-- View: folders with user name
CREATE OR REPLACE VIEW folders_with_user AS
SELECT
  f.id,
  f.user_id,
  f.name AS folder_name,
  f.created_at,
  p.name AS user_name
FROM public.folders f
LEFT JOIN public.profiles p ON f.user_id = p.user_id;

-- View: items with user name
CREATE OR REPLACE VIEW items_with_user AS
SELECT
  i.id,
  i.user_id,
  i.folder_id,
  i.name AS item_name,
  i.quantity,
  i.brand,
  i.color,
  i.garment_type,
  i.size,
  i.notes,
  i.image_uri,
  i.created_at,
  p.name AS user_name,
  f.name AS folder_name
FROM public.items i
LEFT JOIN public.profiles p ON i.user_id = p.user_id
LEFT JOIN public.folders f ON i.folder_id = f.id;

-- Grant access to the views
GRANT SELECT ON folders_with_user TO authenticated;
GRANT SELECT ON folders_with_user TO anon;
GRANT SELECT ON items_with_user TO authenticated;
GRANT SELECT ON items_with_user TO anon;

-- =====================================================
-- DONE!
-- =====================================================
-- Now in Supabase Table Editor you can view:
-- - folders_with_user: shows folder_name + user_name
-- - items_with_user: shows item_name + user_name + folder_name
