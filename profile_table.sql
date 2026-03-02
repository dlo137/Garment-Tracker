-- profile_table.sql
-- Creates a profile table with a persistent UUID per user

CREATE TABLE IF NOT EXISTS profiles (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid UNIQUE NOT NULL,
    username text,
    email text,
    plan text DEFAULT 'free',
    purchase_time timestamptz,
    price text,
    subscription_id text,
    product_id text,
    is_pro_version boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT timezone('utc', now()),
    updated_at timestamp with time zone DEFAULT timezone('utc', now())
);

-- Ensure the pgcrypto extension is enabled for gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS "pgcrypto";