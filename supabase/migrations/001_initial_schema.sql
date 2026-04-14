-- Supabase Voice AI Assistant - Initial Schema
-- Created: 2026-04-07
-- Description: Complete schema for voice-first AI personal assistant with multi-service data aggregation

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- USERS TABLE
-- ============================================================================
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  avatar_url TEXT,
  timezone VARCHAR(100) DEFAULT 'America/Chicago',
  preferences JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_created_at ON users(created_at);

-- ============================================================================
-- ACCOUNTS TABLE (OAuth/Service Connections)
-- ============================================================================
CREATE TABLE accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  service VARCHAR(100) NOT NULL,
  email_or_identifier VARCHAR(255) NOT NULL,
  access_token TEXT,
  refresh_token TEXT,
  token_expires_at TIMESTAMPTZ,
  scopes TEXT[],
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, service, email_or_identifier)
);

CREATE INDEX idx_accounts_user_id ON accounts(user_id);
CREATE INDEX idx_accounts_service ON accounts(service);
CREATE INDEX idx_accounts_is_active ON accounts(is_active);
CREATE INDEX idx_accounts_token_expires_at ON accounts(token_expires_at);

-- ============================================================================
-- CALENDAR EVENTS TABLE
-- ============================================================================
CREATE TABLE calendar_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  external_id VARCHAR(500) NOT NULL,
  title VARCHAR(500) NOT NULL,
  description TEXT,
  location VARCHAR(500),
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  all_day BOOLEAN DEFAULT false,
  calendar_name VARCHAR(255),
  priority INTEGER DEFAULT 0,
  status VARCHAR(50),
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, external_id)
);

CREATE INDEX idx_calendar_events_user_id ON calendar_events(user_id);
CREATE INDEX idx_calendar_events_account_id ON calendar_events(account_id);
CREATE INDEX idx_calendar_events_start_time ON calendar_events(start_time);
CREATE INDEX idx_calendar_events_end_time ON calendar_events(end_time);
CREATE INDEX idx_calendar_events_external_id ON calendar_events(external_id);
CREATE INDEX idx_calendar_events_user_start ON calendar_events(user_id, start_time);

-- ============================================================================
-- EMAILS TABLE
-- ============================================================================
CREATE TABLE emails (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  external_id VARCHAR(500) NOT NULL,
  thread_id VARCHAR(500),
  from_address VARCHAR(255) NOT NULL,
  from_name VARCHAR(255),
  to_addresses TEXT[],
  subject VARCHAR(1000),
  snippet TEXT,
  body_preview TEXT,
  labels TEXT[],
  is_flagged BOOLEAN DEFAULT false,
  flag_reason TEXT,
  is_read BOOLEAN DEFAULT false,
  has_attachments BOOLEAN DEFAULT false,
  received_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, external_id)
);

CREATE INDEX idx_emails_user_id ON emails(user_id);
CREATE INDEX idx_emails_account_id ON emails(account_id);
CREATE INDEX idx_emails_received_at ON emails(received_at);
CREATE INDEX idx_emails_thread_id ON emails(thread_id);
CREATE INDEX idx_emails_external_id ON emails(external_id);
CREATE INDEX idx_emails_is_read ON emails(is_read);
CREATE INDEX idx_emails_is_flagged ON emails(is_flagged);
CREATE INDEX idx_emails_user_received ON emails(user_id, received_at DESC);
CREATE INDEX idx_emails_labels ON emails USING GIN(labels);

-- ============================================================================
-- TASKS TABLE
-- ============================================================================
CREATE TABLE tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  external_id VARCHAR(500) NOT NULL,
  title VARCHAR(500) NOT NULL,
  notes TEXT,
  status VARCHAR(50) DEFAULT 'pending',
  due_date TIMESTAMPTZ,
  priority INTEGER DEFAULT 0,
  list_name VARCHAR(255),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, external_id)
);

CREATE INDEX idx_tasks_user_id ON tasks(user_id);
CREATE INDEX idx_tasks_account_id ON tasks(account_id);
CREATE INDEX idx_tasks_due_date ON tasks(due_date);
CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_tasks_external_id ON tasks(external_id);
CREATE INDEX idx_tasks_priority ON tasks(priority);
CREATE INDEX idx_tasks_user_status ON tasks(user_id, status);
CREATE INDEX idx_tasks_user_due_date ON tasks(user_id, due_date);

-- ============================================================================
-- TEXT MESSAGES TABLE (SMS/Twilio)
-- ============================================================================
CREATE TABLE text_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  from_number VARCHAR(20) NOT NULL,
  to_number VARCHAR(20) NOT NULL,
  body TEXT NOT NULL,
  direction VARCHAR(20) NOT NULL,
  is_flagged BOOLEAN DEFAULT false,
  flag_reason TEXT,
  media_urls TEXT[],
  twilio_sid VARCHAR(100) UNIQUE,
  received_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_text_messages_user_id ON text_messages(user_id);
CREATE INDEX idx_text_messages_received_at ON text_messages(received_at);
CREATE INDEX idx_text_messages_twilio_sid ON text_messages(twilio_sid);
CREATE INDEX idx_text_messages_from_number ON text_messages(from_number);
CREATE INDEX idx_text_messages_direction ON text_messages(direction);
CREATE INDEX idx_text_messages_user_received ON text_messages(user_id, received_at DESC);

-- ============================================================================
-- SCHOOL EVENTS TABLE (ParentSquare, etc.)
-- ============================================================================
CREATE TABLE school_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  external_id VARCHAR(500),
  source VARCHAR(100) DEFAULT 'parentsquare',
  title VARCHAR(500) NOT NULL,
  description TEXT,
  event_date TIMESTAMPTZ,
  due_date TIMESTAMPTZ,
  event_type VARCHAR(50),
  child_name VARCHAR(255),
  school_name VARCHAR(255),
  is_action_required BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, source, external_id)
);

CREATE INDEX idx_school_events_user_id ON school_events(user_id);
CREATE INDEX idx_school_events_event_date ON school_events(event_date);
CREATE INDEX idx_school_events_due_date ON school_events(due_date);
CREATE INDEX idx_school_events_event_type ON school_events(event_type);
CREATE INDEX idx_school_events_is_action_required ON school_events(is_action_required);
CREATE INDEX idx_school_events_external_id ON school_events(external_id);
CREATE INDEX idx_school_events_user_event_date ON school_events(user_id, event_date);

-- ============================================================================
-- FINANCIAL DATA TABLE
-- ============================================================================
CREATE TABLE financial_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  account_id UUID REFERENCES accounts(id) ON DELETE SET NULL,
  report_date DATE NOT NULL,
  period_start DATE,
  period_end DATE,
  revenue NUMERIC(12, 2),
  expenses NUMERIC(12, 2),
  profit NUMERIC(12, 2),
  cash_flow NUMERIC(12, 2),
  accounts_receivable NUMERIC(12, 2),
  accounts_payable NUMERIC(12, 2),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, report_date)
);

CREATE INDEX idx_financial_data_user_id ON financial_data(user_id);
CREATE INDEX idx_financial_data_account_id ON financial_data(account_id);
CREATE INDEX idx_financial_data_report_date ON financial_data(report_date);
CREATE INDEX idx_financial_data_period_start ON financial_data(period_start);
CREATE INDEX idx_financial_data_user_report_date ON financial_data(user_id, report_date DESC);

-- ============================================================================
-- NEWS ITEMS TABLE
-- ============================================================================
CREATE TABLE news_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  source VARCHAR(255),
  title VARCHAR(1000) NOT NULL,
  url TEXT NOT NULL,
  summary TEXT,
  category VARCHAR(100),
  image_url TEXT,
  relevance_score NUMERIC(3, 2) DEFAULT 0.5,
  is_read BOOLEAN DEFAULT false,
  published_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_news_items_user_id ON news_items(user_id);
CREATE INDEX idx_news_items_published_at ON news_items(published_at DESC);
CREATE INDEX idx_news_items_category ON news_items(category);
CREATE INDEX idx_news_items_is_read ON news_items(is_read);
CREATE INDEX idx_news_items_relevance_score ON news_items(relevance_score DESC);
CREATE INDEX idx_news_items_user_published ON news_items(user_id, published_at DESC);

-- ============================================================================
-- PODCAST RECOMMENDATIONS TABLE
-- ============================================================================
CREATE TABLE podcast_recommendations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(500) NOT NULL,
  podcast_name VARCHAR(500) NOT NULL,
  url TEXT NOT NULL,
  duration_minutes INTEGER,
  summary TEXT,
  reason TEXT,
  category VARCHAR(100),
  is_listened BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_podcast_recommendations_user_id ON podcast_recommendations(user_id);
CREATE INDEX idx_podcast_recommendations_is_listened ON podcast_recommendations(is_listened);
CREATE INDEX idx_podcast_recommendations_category ON podcast_recommendations(category);
CREATE INDEX idx_podcast_recommendations_created_at ON podcast_recommendations(created_at DESC);

-- ============================================================================
-- BRIEFINGS TABLE (Daily/Weekly Voice Briefings)
-- ============================================================================
CREATE TABLE briefings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  briefing_date DATE NOT NULL,
  content TEXT,
  audio_url TEXT,
  duration_seconds INTEGER,
  data_snapshot JSONB,
  generated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, briefing_date)
);

CREATE INDEX idx_briefings_user_id ON briefings(user_id);
CREATE INDEX idx_briefings_briefing_date ON briefings(briefing_date DESC);
CREATE INDEX idx_briefings_generated_at ON briefings(generated_at DESC);
CREATE INDEX idx_briefings_user_date ON briefings(user_id, briefing_date DESC);

-- ============================================================================
-- CONVERSATIONS TABLE (Chat History)
-- ============================================================================
CREATE TABLE conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role VARCHAR(50) NOT NULL,
  content TEXT NOT NULL,
  audio_url TEXT,
  context JSONB,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_conversations_user_id ON conversations(user_id);
CREATE INDEX idx_conversations_created_at ON conversations(created_at DESC);
CREATE INDEX idx_conversations_role ON conversations(role);
CREATE INDEX idx_conversations_user_created ON conversations(user_id, created_at DESC);

-- ============================================================================
-- SYNC LOGS TABLE
-- ============================================================================
CREATE TABLE sync_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  account_id UUID REFERENCES accounts(id) ON DELETE CASCADE,
  service VARCHAR(100) NOT NULL,
  status VARCHAR(50) NOT NULL,
  items_synced INTEGER DEFAULT 0,
  error_message TEXT,
  started_at TIMESTAMPTZ NOT NULL,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_sync_logs_user_id ON sync_logs(user_id);
CREATE INDEX idx_sync_logs_account_id ON sync_logs(account_id);
CREATE INDEX idx_sync_logs_service ON sync_logs(service);
CREATE INDEX idx_sync_logs_status ON sync_logs(status);
CREATE INDEX idx_sync_logs_completed_at ON sync_logs(completed_at DESC);
CREATE INDEX idx_sync_logs_user_service ON sync_logs(user_id, service);

-- ============================================================================
-- TRIGGER FUNCTIONS
-- ============================================================================

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply update_updated_at trigger to all tables that have updated_at
CREATE TRIGGER update_users_updated_at
BEFORE UPDATE ON users
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_accounts_updated_at
BEFORE UPDATE ON accounts
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_calendar_events_updated_at
BEFORE UPDATE ON calendar_events
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tasks_updated_at
BEFORE UPDATE ON tasks
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE calendar_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE emails ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE text_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE school_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE financial_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE news_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE podcast_recommendations ENABLE ROW LEVEL SECURITY;
ALTER TABLE briefings ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE sync_logs ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- USERS TABLE RLS POLICIES
-- ============================================================================
CREATE POLICY "Users can view own profile"
  ON users FOR SELECT
  USING (auth.uid()::text = id::text);

CREATE POLICY "Users can update own profile"
  ON users FOR UPDATE
  USING (auth.uid()::text = id::text)
  WITH CHECK (auth.uid()::text = id::text);

-- ============================================================================
-- ACCOUNTS TABLE RLS POLICIES
-- ============================================================================
CREATE POLICY "Users can view own accounts"
  ON accounts FOR SELECT
  USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can insert own accounts"
  ON accounts FOR INSERT
  WITH CHECK (auth.uid()::text = user_id::text);

CREATE POLICY "Users can update own accounts"
  ON accounts FOR UPDATE
  USING (auth.uid()::text = user_id::text)
  WITH CHECK (auth.uid()::text = user_id::text);

CREATE POLICY "Users can delete own accounts"
  ON accounts FOR DELETE
  USING (auth.uid()::text = user_id::text);

-- ============================================================================
-- CALENDAR EVENTS TABLE RLS POLICIES
-- ============================================================================
CREATE POLICY "Users can view own calendar events"
  ON calendar_events FOR SELECT
  USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can insert own calendar events"
  ON calendar_events FOR INSERT
  WITH CHECK (auth.uid()::text = user_id::text);

CREATE POLICY "Users can update own calendar events"
  ON calendar_events FOR UPDATE
  USING (auth.uid()::text = user_id::text)
  WITH CHECK (auth.uid()::text = user_id::text);

CREATE POLICY "Users can delete own calendar events"
  ON calendar_events FOR DELETE
  USING (auth.uid()::text = user_id::text);

-- ============================================================================
-- EMAILS TABLE RLS POLICIES
-- ============================================================================
CREATE POLICY "Users can view own emails"
  ON emails FOR SELECT
  USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can insert own emails"
  ON emails FOR INSERT
  WITH CHECK (auth.uid()::text = user_id::text);

CREATE POLICY "Users can update own emails"
  ON emails FOR UPDATE
  USING (auth.uid()::text = user_id::text)
  WITH CHECK (auth.uid()::text = user_id::text);

CREATE POLICY "Users can delete own emails"
  ON emails FOR DELETE
  USING (auth.uid()::text = user_id::text);

-- ============================================================================
-- TASKS TABLE RLS POLICIES
-- ============================================================================
CREATE POLICY "Users can view own tasks"
  ON tasks FOR SELECT
  USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can insert own tasks"
  ON tasks FOR INSERT
  WITH CHECK (auth.uid()::text = user_id::text);

CREATE POLICY "Users can update own tasks"
  ON tasks FOR UPDATE
  USING (auth.uid()::text = user_id::text)
  WITH CHECK (auth.uid()::text = user_id::text);

CREATE POLICY "Users can delete own tasks"
  ON tasks FOR DELETE
  USING (auth.uid()::text = user_id::text);

-- ============================================================================
-- TEXT MESSAGES TABLE RLS POLICIES
-- ============================================================================
CREATE POLICY "Users can view own text messages"
  ON text_messages FOR SELECT
  USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can insert own text messages"
  ON text_messages FOR INSERT
  WITH CHECK (auth.uid()::text = user_id::text);

CREATE POLICY "Users can update own text messages"
  ON text_messages FOR UPDATE
  USING (auth.uid()::text = user_id::text)
  WITH CHECK (auth.uid()::text = user_id::text);

CREATE POLICY "Users can delete own text messages"
  ON text_messages FOR DELETE
  USING (auth.uid()::text = user_id::text);

-- ============================================================================
-- SCHOOL EVENTS TABLE RLS POLICIES
-- ============================================================================
CREATE POLICY "Users can view own school events"
  ON school_events FOR SELECT
  USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can insert own school events"
  ON school_events FOR INSERT
  WITH CHECK (auth.uid()::text = user_id::text);

CREATE POLICY "Users can update own school events"
  ON school_events FOR UPDATE
  USING (auth.uid()::text = user_id::text)
  WITH CHECK (auth.uid()::text = user_id::text);

CREATE POLICY "Users can delete own school events"
  ON school_events FOR DELETE
  USING (auth.uid()::text = user_id::text);

-- ============================================================================
-- FINANCIAL DATA TABLE RLS POLICIES
-- ============================================================================
CREATE POLICY "Users can view own financial data"
  ON financial_data FOR SELECT
  USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can insert own financial data"
  ON financial_data FOR INSERT
  WITH CHECK (auth.uid()::text = user_id::text);

CREATE POLICY "Users can update own financial data"
  ON financial_data FOR UPDATE
  USING (auth.uid()::text = user_id::text)
  WITH CHECK (auth.uid()::text = user_id::text);

CREATE POLICY "Users can delete own financial data"
  ON financial_data FOR DELETE
  USING (auth.uid()::text = user_id::text);

-- ============================================================================
-- NEWS ITEMS TABLE RLS POLICIES
-- ============================================================================
CREATE POLICY "Users can view own news items"
  ON news_items FOR SELECT
  USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can insert own news items"
  ON news_items FOR INSERT
  WITH CHECK (auth.uid()::text = user_id::text);

CREATE POLICY "Users can update own news items"
  ON news_items FOR UPDATE
  USING (auth.uid()::text = user_id::text)
  WITH CHECK (auth.uid()::text = user_id::text);

CREATE POLICY "Users can delete own news items"
  ON news_items FOR DELETE
  USING (auth.uid()::text = user_id::text);

-- ============================================================================
-- PODCAST RECOMMENDATIONS TABLE RLS POLICIES
-- ============================================================================
CREATE POLICY "Users can view own podcast recommendations"
  ON podcast_recommendations FOR SELECT
  USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can insert own podcast recommendations"
  ON podcast_recommendations FOR INSERT
  WITH CHECK (auth.uid()::text = user_id::text);

CREATE POLICY "Users can update own podcast recommendations"
  ON podcast_recommendations FOR UPDATE
  USING (auth.uid()::text = user_id::text)
  WITH CHECK (auth.uid()::text = user_id::text);

CREATE POLICY "Users can delete own podcast recommendations"
  ON podcast_recommendations FOR DELETE
  USING (auth.uid()::text = user_id::text);

-- ============================================================================
-- BRIEFINGS TABLE RLS POLICIES
-- ============================================================================
CREATE POLICY "Users can view own briefings"
  ON briefings FOR SELECT
  USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can insert own briefings"
  ON briefings FOR INSERT
  WITH CHECK (auth.uid()::text = user_id::text);

CREATE POLICY "Users can update own briefings"
  ON briefings FOR UPDATE
  USING (auth.uid()::text = user_id::text)
  WITH CHECK (auth.uid()::text = user_id::text);

CREATE POLICY "Users can delete own briefings"
  ON briefings FOR DELETE
  USING (auth.uid()::text = user_id::text);

-- ============================================================================
-- CONVERSATIONS TABLE RLS POLICIES
-- ============================================================================
CREATE POLICY "Users can view own conversations"
  ON conversations FOR SELECT
  USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can insert own conversations"
  ON conversations FOR INSERT
  WITH CHECK (auth.uid()::text = user_id::text);

CREATE POLICY "Users can update own conversations"
  ON conversations FOR UPDATE
  USING (auth.uid()::text = user_id::text)
  WITH CHECK (auth.uid()::text = user_id::text);

CREATE POLICY "Users can delete own conversations"
  ON conversations FOR DELETE
  USING (auth.uid()::text = user_id::text);

-- ============================================================================
-- SYNC LOGS TABLE RLS POLICIES
-- ============================================================================
CREATE POLICY "Users can view own sync logs"
  ON sync_logs FOR SELECT
  USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can insert own sync logs"
  ON sync_logs FOR INSERT
  WITH CHECK (auth.uid()::text = user_id::text);

CREATE POLICY "Users can update own sync logs"
  ON sync_logs FOR UPDATE
  USING (auth.uid()::text = user_id::text)
  WITH CHECK (auth.uid()::text = user_id::text);

CREATE POLICY "Users can delete own sync logs"
  ON sync_logs FOR DELETE
  USING (auth.uid()::text = user_id::text);

-- ============================================================================
-- SCHEMA COMPLETE
-- ============================================================================
-- All tables, indexes, triggers, and RLS policies have been created.
-- Database is production-ready with comprehensive security and performance optimizations.
