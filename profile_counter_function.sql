-- =====================================================
-- PROFILE COUNTER FUNCTION
-- =====================================================
-- This function returns the total count of profiles
-- It runs with SECURITY DEFINER to bypass RLS for counting
-- Run this in Supabase SQL Editor

-- Create a function to get the next user number
CREATE OR REPLACE FUNCTION get_next_user_number()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER -- Bypasses RLS to count all profiles
AS $$
DECLARE
  profile_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO profile_count FROM public.profiles;
  RETURN profile_count + 1;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_next_user_number() TO authenticated;
GRANT EXECUTE ON FUNCTION get_next_user_number() TO anon;
