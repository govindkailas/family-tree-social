-- Run this in your Supabase SQL editor

create extension if not exists "uuid-ossp";

create table families (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  created_by uuid references auth.users not null,
  created_at timestamptz default now()
);

create table family_members (
  id uuid primary key default uuid_generate_v4(),
  family_id uuid references families on delete cascade not null,
  user_id uuid references auth.users unique,
  email text,
  role text default 'member',
  approved boolean default false,
  invited_at timestamptz default now(),
  approved_at timestamptz
);

create table people (
  id uuid primary key default uuid_generate_v4(),
  family_id uuid references families on delete cascade not null,
  first_name text not null,
  last_name text,
  nick_name text,
  birth_date date,
  death_date date,
  bio text,
  avatar_url text,
  social_links jsonb default '[]'::jsonb,
  linked_user_id uuid references auth.users,
  created_by uuid references auth.users,
  created_at timestamptz default now()
);

create table relationships (
  id uuid primary key default uuid_generate_v4(),
  family_id uuid references families on delete cascade not null,
  from_person_id uuid references people on delete cascade not null,
  to_person_id uuid references people on delete cascade not null,
  type text check (type in ('parent_child', 'spouse')) not null,
  created_at timestamptz default now()
);

-- Helper function
create or replace function is_family_member(family_id uuid)
returns boolean as $$
  select exists (
    select 1 from family_members
    where family_id = $1
      and user_id = auth.uid()
      and approved = true
  );
$$ language sql security definer;

-- RLS policies
alter table families enable row level security;
create policy "Families visible to their members" on families
  for select using (is_family_member(id));
create policy "Only owner can update family" on families
  for update using (auth.uid() = created_by);

alter table family_members enable row level security;
create policy "Members visible to other family members" on family_members
  for select using (is_family_member(family_id));
create policy "Owner manages memberships" on family_members
  for all using (exists (
    select 1 from families where id = family_id and created_by = auth.uid()
  ));

alter table people enable row level security;
create policy "People accessible by family members" on people
  for select using (is_family_member(family_id));
create policy "Members can insert people" on people
  for insert with check (is_family_member(family_id) and auth.uid() is not null);
create policy "Members can update people" on people
  for update using (is_family_member(family_id));
create policy "Members can delete people" on people
  for delete using (is_family_member(family_id));

alter table relationships enable row level security;
create policy "Relationships visible to family members" on relationships
  for select using (is_family_member(family_id));
create policy "Members can manage relationships" on relationships
  for all using (is_family_member(family_id));
