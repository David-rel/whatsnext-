-- Async Challenge Mode tables for What's Next?
-- All tables use whatsnext_ prefix — DO NOT modify existing tables

CREATE TABLE IF NOT EXISTS whatsnext_challenges (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  code TEXT UNIQUE NOT NULL,
  host_id TEXT NOT NULL REFERENCES whatsnext_users(id),
  quiz_id TEXT NOT NULL REFERENCES whatsnext_quizzes(id),
  title TEXT DEFAULT '',
  status TEXT DEFAULT 'OPEN',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS whatsnext_challenge_players (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  challenge_id TEXT NOT NULL REFERENCES whatsnext_challenges(id),
  name TEXT NOT NULL,
  score INTEGER DEFAULT 0,
  current_clip_index INTEGER DEFAULT 0,
  status TEXT DEFAULT 'PLAYING',
  joined_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS whatsnext_challenge_submissions (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  challenge_id TEXT NOT NULL,
  player_id TEXT NOT NULL REFERENCES whatsnext_challenge_players(id),
  clip_id TEXT NOT NULL REFERENCES whatsnext_clips(id),
  answer TEXT NOT NULL,
  awarded BOOLEAN DEFAULT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(player_id, clip_id)
);

CREATE INDEX IF NOT EXISTS idx_wn_chal_players ON whatsnext_challenge_players(challenge_id);
CREATE INDEX IF NOT EXISTS idx_wn_chal_subs_player ON whatsnext_challenge_submissions(player_id);
CREATE INDEX IF NOT EXISTS idx_wn_chal_subs_challenge ON whatsnext_challenge_submissions(challenge_id);
