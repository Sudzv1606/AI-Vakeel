-- Add user_id column to sessions table for per-user session isolation.
-- Links sessions to Supabase Auth users.

ALTER TABLE sessions ADD COLUMN user_id UUID REFERENCES auth.users(id);

CREATE INDEX idx_sessions_user_id ON sessions(user_id);
