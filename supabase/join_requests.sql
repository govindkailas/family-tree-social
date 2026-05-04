-- Join requests table: holds pending signup approvals
create table if not exists join_requests (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references auth.users(id) on delete cascade,
  email       text not null,
  family_id   uuid references families(id) on delete cascade not null,
  status      text not null default 'pending'
                check (status in ('pending', 'approved', 'rejected')),
  created_at  timestamptz default now(),
  reviewed_at timestamptz,
  reviewed_by uuid references auth.users(id)
);

alter table join_requests enable row level security;

-- Authenticated user can insert their own request
create policy "users can create own join request"
  on join_requests for insert
  with check (auth.uid() = user_id);

-- User can read their own request (to show /pending status)
create policy "users can view own join request"
  on join_requests for select
  using (auth.uid() = user_id);

-- Family owner can read all requests for their family
create policy "owners can view family join requests"
  on join_requests for select
  using (
    exists (
      select 1 from family_members
      where family_members.family_id = join_requests.family_id
        and family_members.user_id   = auth.uid()
        and family_members.role      = 'owner'
    )
  );

-- Family owner can approve/reject (update status)
create policy "owners can update join requests"
  on join_requests for update
  using (
    exists (
      select 1 from family_members
      where family_members.family_id = join_requests.family_id
        and family_members.user_id   = auth.uid()
        and family_members.role      = 'owner'
    )
  );
