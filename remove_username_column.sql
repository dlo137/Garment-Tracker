-- Remove the username column from the profiles table
ALTER TABLE profiles DROP COLUMN IF EXISTS username;
