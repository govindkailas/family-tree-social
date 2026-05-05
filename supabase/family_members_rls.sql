-- Allow family owners to read all members in their family.
-- Uses a security-definer function to avoid recursive RLS on family_members.

create or replace function is_family_owner(fid uuid)
returns boolean
language sql
security definer
stable
as $$
  select exists (
    select 1 from family_members
    where family_id = fid
      and user_id   = auth.uid()
      and role      = 'owner'
  )
$$;

-- Owners can read all members of their family
create policy "owners can read all family members"
  on family_members for select
  using (is_family_owner(family_id));

-- Owners can update roles of members in their family
create policy "owners can update member roles"
  on family_members for update
  using (is_family_owner(family_id));

-- Owners can remove members from their family
create policy "owners can delete family members"
  on family_members for delete
  using (is_family_owner(family_id));
