create extension if not exists "uuid-ossp";

create table if not exists users (
  id uuid primary key default uuid_generate_v4(),
  email text unique not null,
  password_hash text not null,
  display_name text,
  created_at timestamptz default now()
);

create table if not exists pets (
  id uuid primary key default uuid_generate_v4(),
  owner_id uuid references users(id) on delete cascade,
  name text not null,
  breed text,
  photo_url text,
  created_at timestamptz default now()
);

create table if not exists walks (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references users(id) on delete cascade,
  pet_ids uuid[] not null,
  route jsonb not null,                 -- [{lat,lon,t}]
  distance_m integer not null default 0,
  duration_s integer not null default 0,
  notes text,
  privacy text check (privacy in ('public','friends','private')) default 'public',
  created_at timestamptz default now()
);

create table if not exists walk_events (
  id uuid primary key default uuid_generate_v4(),
  walk_id uuid references walks(id) on delete cascade,
  type text check (type in ('poop','pee','water')) not null,
  lat double precision not null,
  lon double precision not null,
  occurred_at timestamptz not null default now()
);

create table if not exists posts (
  id uuid primary key default uuid_generate_v4(),
  author_id uuid references users(id) on delete cascade,
  walk_id uuid references walks(id) on delete set null,
  caption text,
  privacy text check (privacy in ('public','friends','private')) default 'public',
  created_at timestamptz default now()
);

create table if not exists comments (
  id uuid primary key default uuid_generate_v4(),
  post_id uuid references posts(id) on delete cascade,
  author_id uuid references users(id) on delete cascade,
  body text not null,
  created_at timestamptz default now()
);

create table if not exists likes (
  post_id uuid references posts(id) on delete cascade,
  user_id uuid references users(id) on delete cascade,
  created_at timestamptz default now(),
  primary key (post_id, user_id)
);
