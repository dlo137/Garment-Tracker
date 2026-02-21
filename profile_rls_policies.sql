-- =====================================================
-- PROFILE TABLE - RLS POLICIES
-- =====================================================
-- Run this SQL in your Supabase SQL Editor after creating the profiles table
-- (Dashboard -> SQL Editor -> New Query -> Paste -> Run)

-- Enable RLS on profiles table
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- PROFILES POLICIES
-- =====================================================

-- Policy: Users can SELECT only their own profile
CREATE POLICY "Users can view their own profile"
  ON public.profiles
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Users can INSERT their own profile
CREATE POLICY "Users can create their own profile"
  ON public.profiles
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can UPDATE only their own profile
CREATE POLICY "Users can update their own profile"
  ON public.profiles
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can DELETE only their own profile
CREATE POLICY "Users can delete their own profile"
  ON public.profiles
  FOR DELETE
  USING (auth.uid() = user_id);

-- =====================================================
-- DONE!
-- =====================================================
-- Your profiles table now has:
-- ✅ Row Level Security enabled
-- ✅ Policies ensuring users only access their own profile
