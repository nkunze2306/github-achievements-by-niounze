# Visitor statistics for your dashboard (optional, owner only)

See who opens your dashboard and from where, without a third-party service. The page sends one small ping per browser session to **your own** Cloudflare worker
(the same one as for the owner login). You read the result on a password-protected page of that worker. Nothing is sent anywhere else, and it is off by default.

**What is stored per visit:** time, page, referrer and campaign (utm), country, region, city, postal code and coordinates (city level, from Cloudflare), time zone, network provider (ASN),
browser, system, device, language, screen and window size, pixel ratio, dark/light mode, touch, CPU cores, memory, connection type, page load time, and a visitor id.
**What is not stored:** the IP address and cookies. The visitor id is a hash of IP + browser + day, so the same person is only recognised within one day.
Your own visits (owner login) and bots are not counted. Rows older than 180 days are deleted.

> Privacy: location, provider and device details of real people are personal data. If your page is public and visited from the EU, mention it in your privacy notice
> (purpose: reach statistics, no cookies, no IP stored, 180 days). Only use this on pages you are allowed to measure.

## Setup (once)

You need the worker from [SETUP-LOGIN.md](SETUP-LOGIN.md) (`tools/oauth-worker.js`). Free Cloudflare plan is enough.

1. **Database and password**
   ```bash
   cd tools
   npx wrangler login
   npx wrangler d1 create visits                     # note the database_id
   npx wrangler secret put VISITS_KEY --name stats-login   # a long random password, you type it into the browser later
   ```
2. **Deploy the worker with the database.** Create `tools/wrangler.toml` (do not commit it):
   ```toml
   name = "stats-login"
   main = "oauth-worker.js"
   compatibility_date = "2024-11-01"
   [vars]
   CLIENT_ID = "<Client ID>"
   ALLOWED_ORIGIN = "https://YOUR-USER.github.io"
   [[d1_databases]]
   binding = "DB"
   database_name = "visits"
   database_id = "<database_id from step 1>"
   ```
   ```bash
   npx wrangler deploy
   ```
   The table is created automatically on the first visit.
3. **Switch it on in your workflow:**
   ```yaml
   with:
     dashboard-auth-worker: https://stats-login.<account>.workers.dev
     dashboard-visits: 'true'
   ```
4. **Read it:** open `https://stats-login.<account>.workers.dev/visits`. The browser asks for a login: any user name, the password is your `VISITS_KEY`.
   Add `?days=7|30|90|180` for the range, `/visits.json` for the raw rows.

The page needs one run of the workflow to pick up the new setting. Free limits: 100,000 writes per day on D1 are far more than a profile page needs.
