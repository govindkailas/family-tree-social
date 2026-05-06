-- auto_approve_if_pre_added
-- Called from /api/check-membership for newly-logged-in users.
-- Runs as SECURITY DEFINER so it can read people + write family_members
-- without the calling user being a family member yet.
--
-- Returns a JSONB object:
--   { "approved": false }                         — email not pre-added, go to /pending
--   { "approved": true, "person_name": "...",     — auto-approved, go to /dashboard
--     "family_name": "..." }

create or replace function auto_approve_if_pre_added(
  p_user_id   uuid,
  p_email     text,
  p_family_id uuid
)
returns jsonb
language plpgsql
security definer
as $$
declare
  v_person_id   uuid;
  v_person_name text;
  v_family_name text;
begin
  -- Look for a people record in this family with a matching email.
  -- Only match if unlinked (user_id is null) or already linked to this user.
  select
    id,
    trim(first_name || ' ' || coalesce(last_name, ''))
  into v_person_id, v_person_name
  from people
  where family_id        = p_family_id
    and lower(email)     = lower(p_email)
    and (user_id is null or user_id = p_user_id)
  limit 1;

  if v_person_id is null then
    return jsonb_build_object('approved', false);
  end if;

  -- Add to family_members. on conflict = idempotent re-runs.
  insert into family_members (user_id, family_id, role, approved, approved_at)
  values (p_user_id, p_family_id, 'member', true, now())
  on conflict (user_id) do nothing;

  -- Link the people record to this auth user (only if not yet linked).
  update people
  set user_id = p_user_id
  where id = v_person_id
    and user_id is null;

  -- Fetch family name for the welcome email
  select name into v_family_name
  from families
  where id = p_family_id;

  return jsonb_build_object(
    'approved',     true,
    'person_name',  v_person_name,
    'family_name',  v_family_name
  );
end;
$$;
