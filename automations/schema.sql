-- Wayfare Digital control center database (PostgreSQL)
-- Run once on the Railway Postgres database. Safe to re-run.

-- Client sites you build, host, or maintain
CREATE TABLE IF NOT EXISTS sites (
  id              SERIAL PRIMARY KEY,
  client_name     TEXT NOT NULL,
  site_name       TEXT NOT NULL,
  url             TEXT NOT NULL UNIQUE,          -- full https:// address
  contact_email   TEXT,
  payment_plan    TEXT CHECK (payment_plan IN ('pay_up_front', 'pay_monthly', 'upkeep_only', 'internal')),
  upkeep_tier     TEXT CHECK (upkeep_tier IN ('basic', 'managed', 'none')),
  built_by_us     BOOLEAN NOT NULL DEFAULT TRUE,  -- FALSE for existing sites taken over on Managed care
  github_repo     TEXT,
  hosting         TEXT,                           -- e.g. railway, client-hosted
  monitor         BOOLEAN NOT NULL DEFAULT TRUE,  -- set FALSE to pause checks
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- One row per check run by the site monitor
CREATE TABLE IF NOT EXISTS checks (
  id              BIGSERIAL PRIMARY KEY,
  site_id         INTEGER NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  checked_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  ok              BOOLEAN NOT NULL,               -- site answered with a 2xx or 3xx status
  status_code     INTEGER,                        -- 0 means no response at all
  response_ms     INTEGER,
  ssl_days_left   INTEGER,                        -- NULL if the certificate couldn't be read
  error           TEXT
);
CREATE INDEX IF NOT EXISTS checks_site_time_idx ON checks (site_id, checked_at DESC);

-- Problems that stay open until the site recovers
CREATE TABLE IF NOT EXISTS incidents (
  id              BIGSERIAL PRIMARY KEY,
  site_id         INTEGER NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  kind            TEXT NOT NULL CHECK (kind IN ('down', 'ssl')),
  detail          TEXT,
  opened_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at     TIMESTAMPTZ,
  notes           TEXT
);
-- Only one open incident of each kind per site
CREATE UNIQUE INDEX IF NOT EXISTS incidents_one_open_idx
  ON incidents (site_id, kind) WHERE resolved_at IS NULL;

-- Free audit and intake form submissions from the Wayfare site
CREATE TABLE IF NOT EXISTS submissions (
  id              BIGSERIAL PRIMARY KEY,
  type            TEXT NOT NULL CHECK (type IN ('audit', 'intake')),
  email           TEXT NOT NULL,
  name            TEXT,
  business        TEXT,
  site_url        TEXT,                           -- audited site, or current site from intake
  data            JSONB NOT NULL,                 -- everything the form sent
  status          TEXT NOT NULL DEFAULT 'received',
  submitted_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS submissions_email_idx ON submissions (lower(email));
CREATE INDEX IF NOT EXISTS submissions_time_idx ON submissions (submitted_at DESC);

-- Start by monitoring the Wayfare site itself. Replace the URL with the real domain.
INSERT INTO sites (client_name, site_name, url, payment_plan, upkeep_tier, github_repo, hosting, notes)
VALUES ('Wayfare Digital', 'Wayfare Digital marketing site', 'https://YOUR_DOMAIN',
        'internal', 'none', 'jamesbaldwings/WayfareDigital', 'railway', 'Our own site')
ON CONFLICT (url) DO NOTHING;

-- Housekeeping: keep 90 days of check history. The monitor workflow runs this daily.
-- DELETE FROM checks WHERE checked_at < now() - interval '90 days';
