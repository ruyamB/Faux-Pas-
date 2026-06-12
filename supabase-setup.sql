-- ═══════════════════════════════════════════════
-- FAUX PAS — Supabase Database Setup
-- Run this in the Supabase SQL Editor
-- ═══════════════════════════════════════════════

-- Projects
CREATE TABLE IF NOT EXISTS projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  cover_author TEXT DEFAULT '',
  cover_contact TEXT DEFAULT '',
  cover_date TEXT DEFAULT '',
  cover_comments TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Episodes
CREATE TABLE IF NOT EXISTS episodes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  sort_order INTEGER DEFAULT 0,
  in_main_branch BOOLEAN DEFAULT true
);

-- Acts
CREATE TABLE IF NOT EXISTS acts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  episode_id UUID NOT NULL REFERENCES episodes(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  sort_order INTEGER DEFAULT 0
);

-- Script elements
CREATE TABLE IF NOT EXISTS elements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  act_id UUID NOT NULL REFERENCES acts(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('slugline', 'action', 'character', 'parenthetical', 'dialogue', 'transition')),
  content TEXT DEFAULT '',
  sort_order INTEGER DEFAULT 0
);

-- ═══════════════════════════════════════════════
-- Row Level Security (RLS)
-- ═══════════════════════════════════════════════

ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE episodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE acts ENABLE ROW LEVEL SECURITY;
ALTER TABLE elements ENABLE ROW LEVEL SECURITY;

-- Projects: users can only see/edit their own
CREATE POLICY "Users can view own projects"
  ON projects FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own projects"
  ON projects FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own projects"
  ON projects FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own projects"
  ON projects FOR DELETE
  USING (auth.uid() = user_id);

-- Episodes: access through project ownership
CREATE POLICY "Users can view episodes of own projects"
  ON episodes FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM projects WHERE projects.id = episodes.project_id AND projects.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert episodes to own projects"
  ON episodes FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM projects WHERE projects.id = episodes.project_id AND projects.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update episodes of own projects"
  ON episodes FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM projects WHERE projects.id = episodes.project_id AND projects.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete episodes of own projects"
  ON episodes FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM projects WHERE projects.id = episodes.project_id AND projects.user_id = auth.uid()
    )
  );

-- Acts: access through episode → project ownership
CREATE POLICY "Users can view acts"
  ON acts FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM episodes
      JOIN projects ON projects.id = episodes.project_id
      WHERE episodes.id = acts.episode_id AND projects.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert acts"
  ON acts FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM episodes
      JOIN projects ON projects.id = episodes.project_id
      WHERE episodes.id = acts.episode_id AND projects.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update acts"
  ON acts FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM episodes
      JOIN projects ON projects.id = episodes.project_id
      WHERE episodes.id = acts.episode_id AND projects.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete acts"
  ON acts FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM episodes
      JOIN projects ON projects.id = episodes.project_id
      WHERE episodes.id = acts.episode_id AND projects.user_id = auth.uid()
    )
  );

-- Elements: access through act → episode → project ownership
CREATE POLICY "Users can view elements"
  ON elements FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM acts
      JOIN episodes ON episodes.id = acts.episode_id
      JOIN projects ON projects.id = episodes.project_id
      WHERE acts.id = elements.act_id AND projects.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert elements"
  ON elements FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM acts
      JOIN episodes ON episodes.id = acts.episode_id
      JOIN projects ON projects.id = episodes.project_id
      WHERE acts.id = elements.act_id AND projects.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update elements"
  ON elements FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM acts
      JOIN episodes ON episodes.id = acts.episode_id
      JOIN projects ON projects.id = episodes.project_id
      WHERE acts.id = elements.act_id AND projects.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete elements"
  ON elements FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM acts
      JOIN episodes ON episodes.id = acts.episode_id
      JOIN projects ON projects.id = episodes.project_id
      WHERE acts.id = elements.act_id AND projects.user_id = auth.uid()
    )
  );

-- ═══════════════════════════════════════════════
-- DATABASE MIGRATION FOR EXISTING TABLES
-- Run this in Supabase SQL editor if database is already created:
-- ═══════════════════════════════════════════════
-- ALTER TABLE projects 
--   ADD COLUMN IF NOT EXISTS cover_author TEXT DEFAULT '',
--   ADD COLUMN IF NOT EXISTS cover_contact TEXT DEFAULT '',
--   ADD COLUMN IF NOT EXISTS cover_date TEXT DEFAULT '',
--   ADD COLUMN IF NOT EXISTS cover_comments TEXT DEFAULT '';

-- Main Branch migration (run if episodes table already exists):
-- ALTER TABLE episodes ADD COLUMN IF NOT EXISTS in_main_branch BOOLEAN DEFAULT true;
