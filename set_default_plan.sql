-- Set default value for plan column in profiles table
ALTER TABLE public.profiles ALTER COLUMN plan SET DEFAULT 'free';

-- Update all existing users with NULL plan to 'free'
UPDATE public.profiles SET plan = 'free' WHERE plan IS NULL;

-- Example: To mark a user as 'pro' after signup, update their profile
-- UPDATE public.profiles SET plan = 'pro' WHERE id = '<user_id>';

-- You can run these SQL statements in Supabase SQL Editor.