-- BERC OMS schema for Supabase (PostgreSQL)
-- Run this in the Supabase SQL Editor (or via supabase db push)

create extension if not exists "pgcrypto";

create table if not exists roles (
  id text primary key default gen_random_uuid()::text,
  name text not null unique,
  description text,
  is_system boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists permissions (
  id text primary key default gen_random_uuid()::text,
  code text not null unique,
  name text not null,
  module text not null
);

create table if not exists role_permissions (
  role_id text not null references roles(id) on delete cascade,
  permission_id text not null references permissions(id) on delete cascade,
  primary key (role_id, permission_id)
);

create table if not exists users (
  id text primary key default gen_random_uuid()::text,
  email text not null unique,
  password_hash text not null,
  is_active boolean not null default true,
  role_id text not null references roles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Per-user views assigned by Admin (Employee role has no fixed permissions)
create table if not exists user_permissions (
  user_id text not null references users(id) on delete cascade,
  permission_id text not null references permissions(id) on delete cascade,
  primary key (user_id, permission_id)
);

create table if not exists password_reset_tokens (
  id text primary key default gen_random_uuid()::text,
  token text not null unique,
  user_id text not null references users(id) on delete cascade,
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists company_settings (
  id text primary key default 'default',
  name text not null default 'BERC',
  legal_name text,
  address text,
  phone text,
  email text,
  website text,
  logo_url text,
  primary_color text not null default '#0F766E',
  accent_color text not null default '#0284C7'
);

create table if not exists employees (
  id text primary key default gen_random_uuid()::text,
  employee_id text not null unique,
  full_name text not null,
  profile_photo text,
  cnic text,
  phone text,
  email text not null unique,
  address text,
  emergency_contact text,
  designation text,
  joining_date timestamptz,
  status text not null default 'ACTIVE',
  bank_details text,
  department_id text,
  user_id text unique references users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists departments (
  id text primary key default gen_random_uuid()::text,
  name text not null unique,
  description text,
  manager_id text references employees(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table employees
  drop constraint if exists employees_department_id_fkey;
alter table employees
  add constraint employees_department_id_fkey
  foreign key (department_id) references departments(id) on delete set null;

create table if not exists employee_documents (
  id text primary key default gen_random_uuid()::text,
  employee_id text not null references employees(id) on delete cascade,
  name text not null,
  category text,
  file_path text not null,
  mime_type text,
  size int,
  created_at timestamptz not null default now()
);

create table if not exists tasks (
  id text primary key default gen_random_uuid()::text,
  title text not null,
  description text,
  priority text not null default 'MEDIUM',
  status text not null default 'TODO',
  due_date timestamptz,
  created_by_id text not null references users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists task_assignees (
  task_id text not null references tasks(id) on delete cascade,
  employee_id text not null references employees(id) on delete cascade,
  primary key (task_id, employee_id)
);

create table if not exists task_comments (
  id text primary key default gen_random_uuid()::text,
  task_id text not null references tasks(id) on delete cascade,
  user_id text not null references users(id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now()
);

create table if not exists task_attachments (
  id text primary key default gen_random_uuid()::text,
  task_id text not null references tasks(id) on delete cascade,
  name text not null,
  file_path text not null,
  mime_type text,
  size int,
  created_at timestamptz not null default now()
);

create table if not exists task_activities (
  id text primary key default gen_random_uuid()::text,
  task_id text not null references tasks(id) on delete cascade,
  message text not null,
  created_at timestamptz not null default now()
);

create table if not exists meetings (
  id text primary key default gen_random_uuid()::text,
  title text not null,
  description text,
  location text,
  platform text,
  meeting_url text,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists meeting_participants (
  meeting_id text not null references meetings(id) on delete cascade,
  employee_id text not null references employees(id) on delete cascade,
  primary key (meeting_id, employee_id)
);

create table if not exists meeting_notes (
  id text primary key default gen_random_uuid()::text,
  meeting_id text not null references meetings(id) on delete cascade,
  author_id text not null references users(id) on delete cascade,
  content text not null,
  created_at timestamptz not null default now()
);

create table if not exists action_items (
  id text primary key default gen_random_uuid()::text,
  meeting_id text not null references meetings(id) on delete cascade,
  title text not null,
  assignee_id text references employees(id) on delete set null,
  due_date timestamptz,
  status text not null default 'OPEN',
  created_at timestamptz not null default now()
);

create table if not exists assets (
  id text primary key default gen_random_uuid()::text,
  asset_id text not null unique,
  name text not null,
  category text not null,
  assigned_to_id text references employees(id) on delete set null,
  purchase_date timestamptz,
  warranty_until timestamptz,
  status text not null default 'AVAILABLE',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists asset_maintenance (
  id text primary key default gen_random_uuid()::text,
  asset_id text not null references assets(id) on delete cascade,
  description text not null,
  cost double precision,
  performed_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table if not exists document_folders (
  id text primary key default gen_random_uuid()::text,
  name text not null,
  parent_id text references document_folders(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists documents (
  id text primary key default gen_random_uuid()::text,
  title text not null,
  category text,
  folder_id text references document_folders(id) on delete set null,
  employee_id text references employees(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists document_versions (
  id text primary key default gen_random_uuid()::text,
  document_id text not null references documents(id) on delete cascade,
  version int not null,
  file_path text not null,
  mime_type text,
  size int,
  created_at timestamptz not null default now(),
  unique (document_id, version)
);

create table if not exists announcements (
  id text primary key default gen_random_uuid()::text,
  title text not null,
  body text not null,
  pinned boolean not null default false,
  author_id text not null references users(id) on delete cascade,
  published_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table if not exists notifications (
  id text primary key default gen_random_uuid()::text,
  user_id text not null references users(id) on delete cascade,
  title text not null,
  body text,
  link text,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists conversations (
  id text primary key default gen_random_uuid()::text,
  subject text,
  created_by_id text not null references users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists conversation_participants (
  conversation_id text not null references conversations(id) on delete cascade,
  user_id text not null references users(id) on delete cascade,
  last_read_at timestamptz,
  primary key (conversation_id, user_id)
);

create table if not exists messages (
  id text primary key default gen_random_uuid()::text,
  conversation_id text not null references conversations(id) on delete cascade,
  sender_id text not null references users(id) on delete cascade,
  body text not null default '',
  created_at timestamptz not null default now()
);

create table if not exists message_attachments (
  id text primary key default gen_random_uuid()::text,
  message_id text not null references messages(id) on delete cascade,
  name text not null,
  file_path text not null,
  mime_type text,
  size int,
  created_at timestamptz not null default now()
);

create table if not exists holidays (
  id text primary key default gen_random_uuid()::text,
  name text not null,
  date timestamptz not null,
  recurring boolean not null default false
);

create table if not exists office_events (
  id text primary key default gen_random_uuid()::text,
  title text not null,
  description text,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  created_at timestamptz not null default now()
);

create table if not exists integrations (
  id text primary key default gen_random_uuid()::text,
  provider text not null unique,
  status text not null default 'DISCONNECTED',
  account_email text,
  access_token text,
  refresh_token text,
  metadata text,
  connected_at timestamptz,
  connected_by_id text references users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists audit_logs (
  id text primary key default gen_random_uuid()::text,
  user_id text references users(id) on delete set null,
  action text not null,
  entity text not null,
  entity_id text,
  metadata text,
  created_at timestamptz not null default now()
);

-- Service-role access from Next.js API; disable RLS for app tables
alter table roles disable row level security;
alter table permissions disable row level security;
alter table role_permissions disable row level security;
alter table users disable row level security;
alter table user_permissions disable row level security;
alter table password_reset_tokens disable row level security;
alter table company_settings disable row level security;
alter table employees disable row level security;
alter table departments disable row level security;
alter table employee_documents disable row level security;
alter table tasks disable row level security;
alter table task_assignees disable row level security;
alter table task_comments disable row level security;
alter table task_attachments disable row level security;
alter table task_activities disable row level security;
alter table meetings disable row level security;
alter table meeting_participants disable row level security;
alter table meeting_notes disable row level security;
alter table action_items disable row level security;
alter table assets disable row level security;
alter table asset_maintenance disable row level security;
alter table document_folders disable row level security;
alter table documents disable row level security;
alter table document_versions disable row level security;
alter table announcements disable row level security;
alter table notifications disable row level security;
alter table conversations disable row level security;
alter table conversation_participants disable row level security;
alter table messages disable row level security;
alter table message_attachments disable row level security;
alter table holidays disable row level security;
alter table office_events disable row level security;
alter table integrations disable row level security;
alter table audit_logs disable row level security;
