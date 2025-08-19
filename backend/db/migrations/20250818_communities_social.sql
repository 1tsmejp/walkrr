-- Walk visibility + notes
ALTER TABLE walks ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE walks ADD COLUMN IF NOT EXISTS visibility TEXT DEFAULT 'private' CHECK (visibility IN ('private','friends','groups'));

-- Communities privacy + join requests
ALTER TABLE groups ADD COLUMN IF NOT EXISTS privacy TEXT DEFAULT 'public' CHECK (privacy IN ('public','approval','private'));

CREATE TABLE IF NOT EXISTS group_members (
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  group_id INTEGER REFERENCES groups(id) ON DELETE CASCADE,
  joined_at TIMESTAMP DEFAULT now(),
  PRIMARY KEY (user_id, group_id)
);

CREATE TABLE IF NOT EXISTS group_join_requests (
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  group_id INTEGER REFERENCES groups(id) ON DELETE CASCADE,
  requested_at TIMESTAMP DEFAULT now(),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  PRIMARY KEY (user_id, group_id)
);

-- Shares of walks to groups
CREATE TABLE IF NOT EXISTS walk_shares (
  walk_id INTEGER REFERENCES walks(id) ON DELETE CASCADE,
  group_id INTEGER REFERENCES groups(id) ON DELETE CASCADE,
  shared_at TIMESTAMP DEFAULT now(),
  PRIMARY KEY (walk_id, group_id)
);

-- Social follows
CREATE TABLE IF NOT EXISTS user_follows (
  follower_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  followee_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT now(),
  PRIMARY KEY (follower_id, followee_id)
);
