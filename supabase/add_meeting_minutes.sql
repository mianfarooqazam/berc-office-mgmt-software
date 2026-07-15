-- Run against an existing database that already applied schema.sql
create table if not exists meeting_minutes (
  id text primary key default gen_random_uuid()::text,
  meeting_id text references meetings(id) on delete set null,
  title text not null,
  meeting_date timestamptz,
  attendees text,
  discussion text not null default '',
  decisions text,
  action_summary text,
  file_name text,
  file_path text,
  mime_type text,
  file_size int,
  author_id text not null references users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table meeting_minutes disable row level security;

-- If the table already existed without file columns:
alter table meeting_minutes add column if not exists file_name text;
alter table meeting_minutes add column if not exists file_path text;
alter table meeting_minutes add column if not exists mime_type text;
alter table meeting_minutes add column if not exists file_size int;
alter table meeting_minutes alter column discussion set default '';
