-- Link authenticated users to their people record
alter table people add column if not exists user_id uuid references auth.users(id);
create index if not exists people_user_id_idx on people(user_id);

-- Allow a user to update their own people record (in addition to owner policy)
-- (Assumes you already have an owner update policy; this adds the self-edit one)
create policy "users can update own people record"
  on people for update
  using (auth.uid() = user_id);
