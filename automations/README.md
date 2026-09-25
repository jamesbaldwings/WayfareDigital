# Automations

n8n workflows and database setup for the Wayfare Digital control center. n8n runs self-hosted on the Hostinger VPS (Docker). The database is Postgres on Railway.

| File | What it is |
|---|---|
| `schema.sql` | Creates the `sites`, `checks`, `incidents`, and `submissions` tables. Safe to run more than once. |
| `wayfare-forms.workflow.json` | Receives the free audit and quote forms from the website, saves them, runs the PageSpeed audit, emails the report or a confirmation through SendGrid, and alerts Avi on Telegram. |
| `site-monitor.workflow.json` | Every 5 minutes, checks every site in `sites`: status, response time, SSL certificate. Alerts on Telegram after 2 failures in a row, sends an all-clear on recovery, warns 14 days before SSL expires. Deletes check history older than 90 days. |

## One-time setup

1. **Database:** run `schema.sql` on the Railway Postgres database. Then change the example row's URL to the real domain:
   `UPDATE sites SET url = 'https://YOUR_REAL_DOMAIN' WHERE client_name = 'Wayfare Digital';`
2. **n8n container settings** (Hostinger Docker manager, then redeploy):
   - `NODE_FUNCTION_ALLOW_BUILTIN=https,tls` (the site monitor needs these to check certificates)
   - `EXECUTIONS_DATA_PRUNE=true` and `EXECUTIONS_DATA_MAX_AGE=336` (keep 14 days of run history so the disk doesn't fill)
3. **n8n credentials:**
   - **Postgres** with the Railway public connection details. SSL: Require, with "Ignore SSL issues" on.
   - **Header Auth** named "SendGrid": header name `Authorization`, value `Bearer <SendGrid API key>`.
   - **Query Auth** named "PageSpeed": name `key`, value `<Google API key>`.
   - **Telegram** for AviDev_bot.
4. **Import** both workflow files (n8n menu, Import from URL, using the raw GitHub links), pick the credentials on each node, and replace every placeholder:
   - `YOUR_DOMAIN`
   - `YOUR_MAILING_ADDRESS` (required by anti-spam law in the email footer)
   - `YOUR_TELEGRAM_CHAT_ID`
5. **Activate** both workflows.
6. **Website:** set `FORM_ENDPOINT` in `index.html` to the production webhook URL, `https://<n8n address>/webhook/wayfare-forms`, then commit and push.

## Monitoring a new client site

```sql
INSERT INTO sites (client_name, site_name, url, contact_email, payment_plan, upkeep_tier, built_by_us, github_repo, hosting)
VALUES ('Client name', 'Site name', 'https://clientsite.com', 'owner@clientsite.com', 'pay_monthly', 'basic', true, 'jamesbaldwings/repo', 'railway');
```

Pause monitoring: `UPDATE sites SET monitor = false WHERE id = 3;`

## Useful queries

```sql
-- Open problems right now
SELECT s.site_name, i.kind, i.detail, i.opened_at FROM incidents i JOIN sites s ON s.id = i.site_id WHERE i.resolved_at IS NULL;

-- Uptime over the last 30 days
SELECT s.site_name, round(100.0 * avg(c.ok::int), 2) AS uptime_pct, round(avg(c.response_ms)) AS avg_ms
FROM checks c JOIN sites s ON s.id = c.site_id
WHERE c.checked_at > now() - interval '30 days' GROUP BY s.site_name;

-- Latest form submissions
SELECT type, email, business, site_url, submitted_at FROM submissions ORDER BY submitted_at DESC LIMIT 20;
```
