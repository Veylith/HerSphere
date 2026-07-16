-- HerSphere production schema for PostgreSQL 16+
-- Run with: psql "$DATABASE_URL" -f database/migrations/001_initial_schema.sql

CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS citext;

CREATE TYPE user_role AS ENUM ('candidate', 'recruiter', 'admin');
CREATE TYPE user_status AS ENUM ('active', 'disabled');
CREATE TYPE verification_status AS ENUM ('pending', 'verified', 'rejected');
CREATE TYPE opportunity_type AS ENUM ('job', 'internship');
CREATE TYPE opportunity_status AS ENUM ('draft', 'active', 'paused', 'closed', 'deleted');
CREATE TYPE application_status AS ENUM ('submitted', 'in_review', 'shortlisted', 'interview', 'offered', 'rejected', 'withdrawn');
CREATE TYPE review_status AS ENUM ('published', 'flagged', 'removed');
CREATE TYPE skill_kind AS ENUM ('required', 'nice_to_have');

CREATE TABLE users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role user_role NOT NULL,
  name varchar(120) NOT NULL,
  email citext UNIQUE NOT NULL,
  password_hash text NOT NULL,
  email_verified boolean NOT NULL DEFAULT false,
  status user_status NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE auth_verification_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash text NOT NULL,
  purpose varchar(40) NOT NULL CHECK (purpose IN ('email_verification', 'password_reset')),
  expires_at timestamptz NOT NULL,
  consumed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE companies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name varchar(140) NOT NULL,
  slug varchar(160) UNIQUE NOT NULL,
  industry varchar(90) NOT NULL,
  location varchar(140) NOT NULL,
  website varchar(240),
  size_band varchar(40),
  verification_status verification_status NOT NULL DEFAULT 'pending',
  safety_policy_url varchar(240),
  description text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE recruiter_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE RESTRICT,
  title varchar(120),
  approved boolean NOT NULL DEFAULT false,
  approved_by uuid REFERENCES users(id),
  approved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE candidate_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  headline varchar(180),
  location varchar(140),
  career_goal varchar(140),
  resume_text text,
  experience_years numeric(4,1) NOT NULL DEFAULT 0,
  verified_portfolio boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE candidate_interests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_profile_id uuid NOT NULL REFERENCES candidate_profiles(id) ON DELETE CASCADE,
  interest varchar(80) NOT NULL,
  UNIQUE (candidate_profile_id, interest)
);

CREATE TABLE candidate_education (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_profile_id uuid NOT NULL REFERENCES candidate_profiles(id) ON DELETE CASCADE,
  institution varchar(180),
  degree varchar(160) NOT NULL,
  field varchar(120),
  start_year integer,
  end_year integer,
  display_order integer NOT NULL DEFAULT 0
);

CREATE TABLE skills (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  normalized_name varchar(90) UNIQUE NOT NULL,
  display_name varchar(90) NOT NULL,
  category varchar(60),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE candidate_skills (
  candidate_profile_id uuid NOT NULL REFERENCES candidate_profiles(id) ON DELETE CASCADE,
  skill_id uuid NOT NULL REFERENCES skills(id) ON DELETE RESTRICT,
  proficiency smallint CHECK (proficiency BETWEEN 1 AND 5),
  source varchar(40) NOT NULL DEFAULT 'profile',
  PRIMARY KEY (candidate_profile_id, skill_id)
);

CREATE TABLE candidate_projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_profile_id uuid NOT NULL REFERENCES candidate_profiles(id) ON DELETE CASCADE,
  title varchar(160) NOT NULL,
  summary text NOT NULL,
  link varchar(240),
  display_order integer NOT NULL DEFAULT 0
);

CREATE TABLE candidate_experiences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_profile_id uuid NOT NULL REFERENCES candidate_profiles(id) ON DELETE CASCADE,
  title varchar(140) NOT NULL,
  company varchar(140),
  start_date date,
  end_date date,
  years numeric(4,1),
  summary text
);

CREATE TABLE candidate_certifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_profile_id uuid NOT NULL REFERENCES candidate_profiles(id) ON DELETE CASCADE,
  name varchar(180) NOT NULL,
  issuer varchar(140),
  issued_at date,
  credential_url varchar(240)
);

CREATE TABLE candidate_achievements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_profile_id uuid NOT NULL REFERENCES candidate_profiles(id) ON DELETE CASCADE,
  title varchar(180) NOT NULL,
  description text,
  achieved_at date
);

CREATE TABLE candidate_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_profile_id uuid NOT NULL REFERENCES candidate_profiles(id) ON DELETE CASCADE,
  label varchar(80) NOT NULL,
  url varchar(240) NOT NULL
);

CREATE TABLE opportunities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE RESTRICT,
  created_by uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  type opportunity_type NOT NULL,
  title varchar(160) NOT NULL,
  location varchar(140) NOT NULL,
  remote_mode varchar(40) NOT NULL,
  employment_type varchar(60) NOT NULL,
  salary_range varchar(90),
  description text NOT NULL,
  min_experience numeric(4,1) NOT NULL DEFAULT 0,
  status opportunity_status NOT NULL DEFAULT 'draft',
  posted_at timestamptz,
  closes_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE opportunity_skills (
  opportunity_id uuid NOT NULL REFERENCES opportunities(id) ON DELETE CASCADE,
  skill_id uuid NOT NULL REFERENCES skills(id) ON DELETE RESTRICT,
  kind skill_kind NOT NULL,
  PRIMARY KEY (opportunity_id, skill_id, kind)
);

CREATE TABLE opportunity_project_signals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  opportunity_id uuid NOT NULL REFERENCES opportunities(id) ON DELETE CASCADE,
  signal varchar(90) NOT NULL
);

CREATE TABLE opportunity_certifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  opportunity_id uuid NOT NULL REFERENCES opportunities(id) ON DELETE CASCADE,
  certification_name varchar(180) NOT NULL
);

CREATE TABLE applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  opportunity_id uuid NOT NULL REFERENCES opportunities(id) ON DELETE CASCADE,
  candidate_user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status application_status NOT NULL DEFAULT 'submitted',
  cover_note text,
  eligibility_score smallint CHECK (eligibility_score BETWEEN 0 AND 100),
  confidence_score smallint CHECK (confidence_score BETWEEN 0 AND 100),
  eligibility_reasoning jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (opportunity_id, candidate_user_id)
);

CREATE TABLE bookmarks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  opportunity_id uuid NOT NULL REFERENCES opportunities(id) ON DELETE CASCADE,
  candidate_user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (opportunity_id, candidate_user_id)
);

CREATE TABLE interviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id uuid NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  opportunity_id uuid NOT NULL REFERENCES opportunities(id) ON DELETE CASCADE,
  recruiter_user_id uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  candidate_user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  scheduled_at timestamptz NOT NULL,
  mode varchar(80) NOT NULL,
  meeting_url varchar(240),
  status varchar(40) NOT NULL DEFAULT 'scheduled',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE company_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  verified_employment boolean NOT NULL DEFAULT false,
  status review_status NOT NULL DEFAULT 'published',
  title varchar(160) NOT NULL,
  comment text NOT NULL,
  spam_detected boolean NOT NULL DEFAULT false,
  spam_reasons jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE company_review_ratings (
  review_id uuid PRIMARY KEY REFERENCES company_reviews(id) ON DELETE CASCADE,
  work_culture numeric(2,1) NOT NULL CHECK (work_culture BETWEEN 1 AND 5),
  safety numeric(2,1) NOT NULL CHECK (safety BETWEEN 1 AND 5),
  mentorship numeric(2,1) NOT NULL CHECK (mentorship BETWEEN 1 AND 5),
  career_growth numeric(2,1) NOT NULL CHECK (career_growth BETWEEN 1 AND 5),
  work_life_balance numeric(2,1) NOT NULL CHECK (work_life_balance BETWEEN 1 AND 5)
);

CREATE TABLE notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title varchar(160) NOT NULL,
  body text NOT NULL,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  action varchar(120) NOT NULL,
  entity_type varchar(80) NOT NULL,
  entity_id uuid,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_users_role_status ON users(role, status);
CREATE INDEX idx_companies_verification ON companies(verification_status);
CREATE INDEX idx_candidate_profiles_goal_location ON candidate_profiles(career_goal, location);
CREATE INDEX idx_candidate_skills_skill ON candidate_skills(skill_id);
CREATE INDEX idx_opportunities_search ON opportunities(type, status, location, posted_at DESC);
CREATE INDEX idx_opportunities_company ON opportunities(company_id, status);
CREATE INDEX idx_opportunity_skills_skill_kind ON opportunity_skills(skill_id, kind);
CREATE INDEX idx_applications_candidate_status ON applications(candidate_user_id, status);
CREATE INDEX idx_applications_opportunity_status ON applications(opportunity_id, status);
CREATE INDEX idx_bookmarks_candidate ON bookmarks(candidate_user_id, created_at DESC);
CREATE INDEX idx_reviews_company_status ON company_reviews(company_id, status, created_at DESC);
CREATE INDEX idx_reviews_spam ON company_reviews(spam_detected, status);
CREATE INDEX idx_notifications_user_unread ON notifications(user_id, created_at DESC) WHERE read_at IS NULL;
CREATE INDEX idx_audit_logs_actor_time ON audit_logs(actor_user_id, created_at DESC);

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER companies_updated_at BEFORE UPDATE ON companies FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER recruiter_profiles_updated_at BEFORE UPDATE ON recruiter_profiles FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER candidate_profiles_updated_at BEFORE UPDATE ON candidate_profiles FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER opportunities_updated_at BEFORE UPDATE ON opportunities FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER applications_updated_at BEFORE UPDATE ON applications FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER interviews_updated_at BEFORE UPDATE ON interviews FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER company_reviews_updated_at BEFORE UPDATE ON company_reviews FOR EACH ROW EXECUTE FUNCTION set_updated_at();
