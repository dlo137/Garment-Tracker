-- =====================================================
-- ADD user_name COLUMN TO FOLDERS AND ITEMS TABLES
-- =====================================================
-- Run this in Supabase SQL Editor

-- 1. Add user_name column to folders table
ALTER TABLE public.folders
ADD COLUMN IF NOT EXISTS user_name TEXT;

-- 2. Add user_name column to items table
ALTER TABLE public.items
ADD COLUMN IF NOT EXISTS user_name TEXT;

-- 3. Update existing folders with user_name from profiles
UPDATE public.folders f
SET user_name = p.name
FROM public.profiles p
WHERE f.user_id = p.user_id;

-- 4. Update existing items with user_name from profiles
UPDATE public.items i
SET user_name = p.name
FROM public.profiles p
WHERE i.user_id = p.user_id;

-- 5. Create trigger function to auto-set user_name on insert
CREATE OR REPLACE FUNCTION set_user_name()
RETURNS TRIGGER AS $$
BEGIN
  SELECT name INTO NEW.user_name
  FROM public.profiles
  WHERE user_id = NEW.user_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Create triggers for folders table
DROP TRIGGER IF EXISTS set_folder_user_name ON public.folders;
CREATE TRIGGER set_folder_user_name
  BEFORE INSERT ON public.folders
  FOR EACH ROW
  EXECUTE FUNCTION set_user_name();

-- 7. Create triggers for items table
DROP TRIGGER IF EXISTS set_item_user_name ON public.items;
CREATE TRIGGER set_item_user_name
  BEFORE INSERT ON public.items
  FOR EACH ROW
  EXECUTE FUNCTION set_user_name();

-- =====================================================
-- DONE!
-- =====================================================
-- Your folders and items tables now have a user_name column
-- that auto-populates from the profiles table on insert
