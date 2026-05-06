-- Tracks explicit invitations sent by family owners to join the tree
create table if not exists family_invites (
  id            uuid primary key default gen_random_uuid(),
  family_id     uuid references families(id) on delete cascade not null,
  invited_email text not null,
  invited_by    uuid references auth.users(id) not null,
  created_at    timestamptz default now()
);

alter table family_invites enable row level security;

-- Family members can read invites for their family
create policy "members can view family invites"
  on family_invites for select
  using (
    exists (
      select 1 from family_members
      where family_members.family_id = family_invites.family_id
        and family_members.user_id   = auth.uid()
    )
  );

-- Only owners can send invites
create policy "owners can insert family invites"
  on family_invites for insert
  with check (
    exists (
      select 1 from family_members
      where family_members.family_id = family_invites.family_id
        and family_members.user_id   = auth.uid()
        and family_members.role      = 'owner'
    )
  );
