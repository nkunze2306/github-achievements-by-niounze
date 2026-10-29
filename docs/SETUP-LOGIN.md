# Owner login for the dashboard (optional, one time)

The dashboard is a static page and does not know who you are. The "Theme & look" bar (change overlays, save and rebuild) should only appear for you,
on every device where you are logged in to GitHub. For that the page needs an OAuth app and a tiny worker.
The worker only sees your login name, stores nothing and does not keep the token. Saving still goes through an issue that the workflow only applies for the owner.

1. **OAuth app** (GitHub > Settings > Developer settings > OAuth Apps > New OAuth App)
   - Homepage URL and Authorization callback URL: `https://YOUR-USER.github.io/YOUR-REPO/`
   - Note the **Client ID** and create a **Client secret**.
2. **Worker** (free Cloudflare account)
   ```bash
   cd tools && npx wrangler deploy oauth-worker.js --name stats-login --compatibility-date 2024-11-01
   npx wrangler secret put CLIENT_SECRET --name stats-login      # paste the client secret
   npx wrangler deploy oauth-worker.js --name stats-login --compatibility-date 2024-11-01 \
     --var CLIENT_ID:<Client ID> --var ALLOWED_ORIGIN:https://YOUR-USER.github.io
   ```
   Note the worker URL (`https://stats-login.<account>.workers.dev`).
3. **Tell the action:** pass both values in your workflow.
   ```yaml
   with:
     components: stats,achievements,dashboard
     dashboard-auth-client-id: <Client ID>
     dashboard-auth-worker: https://stats-login.<account>.workers.dev
   ```
4. **Allow saving:** add `examples/apply-theme.yml` as `.github/workflows/apply-theme.yml`. It applies "theme: ..." issues of the owner and closes everybody else's.

Use: on a new device open `https://YOUR-USER.github.io/YOUR-REPO/#settings` once (bookmark it). The page redirects to GitHub, you confirm, and the bar appears.
Without login the page only shows "Owner sign-in" in the footer.
