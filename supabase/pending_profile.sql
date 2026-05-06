-- ── get_family_people_for_picker ─────────────────────────────────────────────
-- Returns a minimal people list for the parent picker on the /pending page.
-- SECURITY DEFINER so a non-member (pending user) can read the family tree.

create or replace function get_family_people_for_picker(p_family_id uuid)
returns table (id uuid, first_name text, last_name text)
language sql
security definer
stable
as $$
  select id, first_name, coalesce(last_name, '') as last_name
  from   people
  where  family_id = p_family_id
  order  by first_name, last_name;
$$;


-- ── submit_pending_profile ────────────────────────────────────────────────────
-- Creates a people record for a pending (not-yet-approved) user and
-- optionally links them to a parent via a parent_child relationship.
-- Returns the new (or existing) person's UUID.
-- SECURITY DEFINER so a non-member can insert into people + relationships.

create or replace function submit_pending_profile(
  p_user_id    uuid,
  p_family_id  uuid,
  p_email      text,
  p_first_name text,
  p_last_name  text,    -- pass '' to leave blank
  p_parent_id  uuid     -- pass NULL for no parent
)
returns uuid
language plpgsql
security definer
as $$
declare
  v_person_id uuid;
begin
  -- Idempotent: if a record already exists for this user or email, just
  -- make sure user_id is linked and return it.
  select id into v_person_id
  from   people
  where  family_id = p_family_id
    and  (user_id = p_user_id or lower(email) = lower(p_email))
  limit 1;

  if v_person_id is not null then
    update people
    set    user_id = p_user_id
    where  id      = v_person_id
      and  user_id is null;
    return v_person_id;
  end if;

  -- Insert new person
  insert into people (family_id, user_id, email, first_name, last_name, created_by)
  values (
    p_family_id,
    p_user_id,
    p_email,
    trim(p_first_name),
    nullif(trim(p_last_name), ''),
    p_user_id
  )
  returning id into v_person_id;

  -- Optionally link to a parent
  if p_parent_id is not null then
    insert into relationships (family_id, from_person_id, to_person_id, type)
    values (p_family_id, p_parent_id, v_person_id, 'parent_child')
    on conflict do nothing;
  end if;

  return v_person_id;
end;
$$;
