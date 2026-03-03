-- migrations/002_migrate_anonymous_user.sql
--
-- Promotes an anonymous user's data to a permanent account.
-- Called via supabase.rpc('migrate_anonymous_user', ...) from the client
-- after the user signs in to an existing account.
--
-- SECURITY DEFINER lets this function bypass RLS so it can UPDATE/DELETE
-- rows owned by the anonymous user (who is no longer the current session).
--
-- Run in: Supabase Dashboard → SQL Editor → New Query → Paste → Run

CREATE OR REPLACE FUNCTION public.migrate_anonymous_user(
  anon_user_id  UUID,
  perm_user_id  UUID
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  anon_profile  public.profiles%ROWTYPE;
  perm_exists   BOOLEAN;
BEGIN
  -- No-op if the IDs are the same (shouldn't happen, but be safe)
  IF anon_user_id = perm_user_id THEN
    RETURN;
  END IF;

  -- ── Folders ──────────────────────────────────────────────────────────────
  UPDATE public.folders
  SET user_id = perm_user_id
  WHERE user_id = anon_user_id;

  -- ── Items ─────────────────────────────────────────────────────────────────
  UPDATE public.items
  SET user_id = perm_user_id
  WHERE user_id = anon_user_id;

  -- ── Profile & subscription ────────────────────────────────────────────────
  SELECT * INTO anon_profile
  FROM public.profiles
  WHERE user_id = anon_user_id;

  SELECT EXISTS(
    SELECT 1 FROM public.profiles WHERE user_id = perm_user_id
  ) INTO perm_exists;

  IF anon_profile IS NOT NULL THEN
    IF perm_exists THEN
      -- Permanent profile already exists.
      -- Carry over the subscription if the anon user was pro and permanent is not.
      UPDATE public.profiles
      SET
        is_pro_version = CASE
          WHEN NOT is_pro_version AND anon_profile.is_pro_version THEN TRUE
          ELSE is_pro_version
        END,
        subscription_id = CASE
          WHEN NOT is_pro_version AND anon_profile.is_pro_version THEN anon_profile.subscription_id
          ELSE subscription_id
        END,
        product_id = CASE
          WHEN NOT is_pro_version AND anon_profile.is_pro_version THEN anon_profile.product_id
          ELSE product_id
        END,
        purchase_time = CASE
          WHEN NOT is_pro_version AND anon_profile.is_pro_version THEN anon_profile.purchase_time
          ELSE purchase_time
        END,
        status = CASE
          WHEN NOT is_pro_version AND anon_profile.is_pro_version THEN anon_profile.status
          ELSE status
        END,
        current_period_start = CASE
          WHEN NOT is_pro_version AND anon_profile.is_pro_version THEN anon_profile.current_period_start
          ELSE current_period_start
        END,
        current_period_end = CASE
          WHEN NOT is_pro_version AND anon_profile.is_pro_version THEN anon_profile.current_period_end
          ELSE current_period_end
        END,
        cancel_at_period_end = CASE
          WHEN NOT is_pro_version AND anon_profile.is_pro_version THEN anon_profile.cancel_at_period_end
          ELSE cancel_at_period_end
        END,
        canceled_at = CASE
          WHEN NOT is_pro_version AND anon_profile.is_pro_version THEN anon_profile.canceled_at
          ELSE canceled_at
        END,
        provider = CASE
          WHEN NOT is_pro_version AND anon_profile.is_pro_version THEN anon_profile.provider
          ELSE provider
        END,
        updated_at = NOW()
      WHERE user_id = perm_user_id;

      -- Remove the now-orphaned anonymous profile
      DELETE FROM public.profiles WHERE user_id = anon_user_id;
    ELSE
      -- No permanent profile yet: reassign the anonymous one
      UPDATE public.profiles
      SET user_id = perm_user_id, updated_at = NOW()
      WHERE user_id = anon_user_id;
    END IF;
  END IF;
END;
$$;

-- Grant execute to authenticated and anonymous roles
GRANT EXECUTE ON FUNCTION public.migrate_anonymous_user(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.migrate_anonymous_user(UUID, UUID) TO anon;
