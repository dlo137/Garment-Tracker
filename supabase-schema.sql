-- =====================================================
-- INVENTORY TRACKER - DATABASE SCHEMA & RLS POLICIES
-- =====================================================
-- Run this SQL in your Supabase SQL Editor
-- (Dashboard → SQL Editor → New Query → Paste → Run)

-- =====================================================
-- 1. FOLDERS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.folders (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Create index for faster queries filtered by user_id
CREATE INDEX IF NOT EXISTS folders_user_id_idx ON public.folders(user_id);

-- =====================================================
-- 2. ITEMS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  folder_id UUID NOT NULL REFERENCES public.folders(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 0,
  image_uri TEXT, -- Not used currently, but kept for future use
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS items_user_id_idx ON public.items(user_id);
CREATE INDEX IF NOT EXISTS items_folder_id_idx ON public.items(folder_id);

-- =====================================================
-- 3. ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================================

-- Enable RLS on both tables
ALTER TABLE public.folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.items ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- FOLDERS POLICIES
-- =====================================================

-- Policy: Users can SELECT only their own folders
-- auth.uid() returns the currently authenticated user's UUID
CREATE POLICY "Users can view their own folders"
  ON public.folders
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Users can INSERT folders with their own user_id
CREATE POLICY "Users can create their own folders"
  ON public.folders
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can UPDATE only their own folders
CREATE POLICY "Users can update their own folders"
  ON public.folders
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can DELETE only their own folders
-- CASCADE will automatically delete associated items
CREATE POLICY "Users can delete their own folders"
  ON public.folders
  FOR DELETE
  USING (auth.uid() = user_id);

-- =====================================================
-- ITEMS POLICIES
-- =====================================================

-- Policy: Users can SELECT only their own items
CREATE POLICY "Users can view their own items"
  ON public.items
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Users can INSERT items with their own user_id
-- Also ensures the folder they're adding to belongs to them
CREATE POLICY "Users can create their own items"
  ON public.items
  FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.folders
      WHERE folders.id = folder_id
      AND folders.user_id = auth.uid()
    )
  );

-- Policy: Users can UPDATE only their own items
CREATE POLICY "Users can update their own items"
  ON public.items
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can DELETE only their own items
CREATE POLICY "Users can delete their own items"
  ON public.items
  FOR DELETE
  USING (auth.uid() = user_id);

-- =====================================================
-- 4. ENABLE ANONYMOUS AUTHENTICATION
-- =====================================================
-- Go to: Dashboard → Authentication → Providers
-- Toggle ON "Anonymous sign-ins"
-- This allows users to sign in without email/password

-- =====================================================
-- DONE!
-- =====================================================
-- Your database is now ready with:
-- ✅ Two tables (folders, items) with proper relationships
-- ✅ Row Level Security enabled
-- ✅ Policies ensuring users only access their own data
-- ✅ Indexes for query performance
-- ✅ Cascade deletes (delete folder → delete all its items)
