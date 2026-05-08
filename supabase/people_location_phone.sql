-- Add location and phone fields to the people table
alter table people
  add column if not exists location text,
  add column if not exists phone    text;
