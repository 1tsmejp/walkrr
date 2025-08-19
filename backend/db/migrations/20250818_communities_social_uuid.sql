-- Ensure UUID generation available
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Walk visibility + notes
ALTER TABLE walks ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE walks ADD COLUMN IF NOT EXISTS visibility TEXT DEFAULT 'private' CHECK (visibility IN ('private','friends','groups'));

-- Groups (new) - UUID PK
CREATE TABLE IF NOT EXISTS groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  privacy TEXT NOT NULL DEFAULT 'public' CHECK (privacy IN ('public','approval','private')),
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT now()
);

-- In case a legacy groups table exists but lacked privacy column
ALTER TABLE groups ADD COLUMN IF NOT EXISTS privacy TEXT DEFAULT 'public' CHECK (privacy IN ('public','approval','private'));

-- Memberships (UUID FKs)
CREATE TABLE IF NOT EXISTS group_members (
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  group_id UUID REFERENCES groups(id) ON DELETE CASCADE,
  joined_at TIMESTAMP DEFAULT now(),
  PRIMARY KEY (user_id, group_id)
);

-- Join requests (UUID FKs)
CREATE TABLE IF NOT EXISTS group_join_requests (
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  group_id UUID REFERENCES groups(id) ON DELETE CASCADE,
  requested_at TIMESTAMP DEFAULT now(),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  PRIMARY KEY (user_id, group_id)
);

-- Shares of walks to groups (UUID FKs)
CREATE TABLE IF NOT EXISTS walk_shares (
  walk_id UUID REFERENCES walks(id) ON DELETE CASCADE,
  group_id UUID REFERENCES groups(id) ON DELETE CASCADE,
  shared_at TIMESTAMP DEFAULT now(),
  PRIMARY KEY (walk_id, group_id)
);

-- Social follows (UUID FKs)
CREATE TABLE IF NOT EXISTS user_follows (
  follower_id UUID REFERENCES users(id) ON DELETE CASCADE,
  followee_id UUID REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT now(),
  PRIMARY KEY (follower_id, followee_id)
);
