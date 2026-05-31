-- What's Next? — initial schema migration
-- All tables prefixed with whatsnext_ to avoid conflicts with existing data.

CREATE TABLE IF NOT EXISTS whatsnext_users (
  id          TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  email       TEXT UNIQUE NOT NULL,
  password    TEXT NOT NULL,
  name        TEXT NOT NULL DEFAULT '',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS whatsnext_quizzes (
  id          TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  host_id     TEXT NOT NULL REFERENCES whatsnext_users(id) ON DELETE CASCADE,
  title       TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS whatsnext_clips (
  id          TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  quiz_id     TEXT NOT NULL REFERENCES whatsnext_quizzes(id) ON DELETE CASCADE,
  title       TEXT NOT NULL,
  video_url   TEXT NOT NULL,
  duration    FLOAT NOT NULL DEFAULT 0,
  "order"     INTEGER NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS whatsnext_rooms (
  id                    TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  code                  TEXT UNIQUE NOT NULL,
  host_id               TEXT NOT NULL REFERENCES whatsnext_users(id) ON DELETE CASCADE,
  quiz_id               TEXT NOT NULL REFERENCES whatsnext_quizzes(id),
  status                TEXT NOT NULL DEFAULT 'LOBBY',   -- LOBBY | PLAYING | FINISHED
  current_clip_index    INTEGER NOT NULL DEFAULT 0,
  current_phase         TEXT,                            -- WATCHING | SUBMITTING | REVEALING | SCORING
  submission_timer_secs INTEGER NOT NULL DEFAULT 60,
  phase_started_at      TIMESTAMPTZ,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS whatsnext_teams (
  id          TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  room_id     TEXT NOT NULL REFERENCES whatsnext_rooms(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  color       TEXT NOT NULL,
  emoji       TEXT NOT NULL DEFAULT '⭐',
  max_players INTEGER NOT NULL DEFAULT 4,
  score       INTEGER NOT NULL DEFAULT 0,
  "order"     INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS whatsnext_players (
  id          TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  team_id     TEXT NOT NULL REFERENCES whatsnext_teams(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  joined_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS whatsnext_submissions (
  id          TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  clip_id     TEXT NOT NULL REFERENCES whatsnext_clips(id) ON DELETE CASCADE,
  team_id     TEXT NOT NULL REFERENCES whatsnext_teams(id) ON DELETE CASCADE,
  answer      TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(clip_id, team_id)
);

CREATE TABLE IF NOT EXISTS whatsnext_round_results (
  id          TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  clip_id     TEXT NOT NULL REFERENCES whatsnext_clips(id) ON DELETE CASCADE,
  team_id     TEXT NOT NULL REFERENCES whatsnext_teams(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for common lookups
CREATE INDEX IF NOT EXISTS idx_wn_quizzes_host     ON whatsnext_quizzes(host_id);
CREATE INDEX IF NOT EXISTS idx_wn_clips_quiz       ON whatsnext_clips(quiz_id, "order");
CREATE INDEX IF NOT EXISTS idx_wn_rooms_code       ON whatsnext_rooms(code);
CREATE INDEX IF NOT EXISTS idx_wn_rooms_host       ON whatsnext_rooms(host_id);
CREATE INDEX IF NOT EXISTS idx_wn_teams_room       ON whatsnext_teams(room_id);
CREATE INDEX IF NOT EXISTS idx_wn_players_team     ON whatsnext_players(team_id);
CREATE INDEX IF NOT EXISTS idx_wn_submissions_clip ON whatsnext_submissions(clip_id);
