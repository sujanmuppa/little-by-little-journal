# Supabase cloud sync setup

The site is still hosted as a static Cloudflare Pages app. Supabase Free supplies sign-in, a private Postgres row per account, and private illustration storage. Never add the Supabase `service_role` or secret key to this website.

## Create the free project

1. Create a project at [supabase.com/dashboard](https://supabase.com/dashboard) on the Free plan. Keep the database password in a password manager; the app does not use it.
2. In **SQL Editor**, run all contents of `supabase-setup.sql`.
3. In **Authentication → Providers → Google**, enable Google sign-in and enter the Google OAuth Web client ID and client secret. Create them in [Google Auth Platform](https://console.cloud.google.com/auth/clients). Add `https://little-by-little-journal.pages.dev` as an authorized JavaScript origin. Add `https://ejordmthcedivrjcznmo.supabase.co/auth/v1/callback` as an authorized redirect URI. Keep the client secret in Supabase only; never add it to this repository.
4. In **Authentication → URL Configuration**, set the Site URL to `https://little-by-little-journal.pages.dev`. Add `https://little-by-little-journal.pages.dev` to the allowed redirect URLs. For local development, also add `http://localhost:4173`.
5. In **Project Settings → API**, copy the Project URL and the `publishable` key (or legacy `anon` key). These keys are intended to be public in a browser app; database row-level security and storage policies protect user data.
6. Paste the URL and public key into `supabase-config.js`, replacing the placeholders. Save and deploy the changed files to Cloudflare Pages.
7. Open the deployed app, choose **Connect**, then choose **Continue with Google**. If the current browser already contains your journal, that device’s pages and images are copied to your account the first time it signs in. Other browsers can sign into the same Google account to load that journal. Email/password sign-in remains available as a fallback.

## Limits and behavior

Supabase currently lists the Free plan as $0 with 500 MB database size, 1 GB file storage, and 50,000 monthly active users. Free projects pause after one week of inactivity and can be resumed from the dashboard. Quotas and plan terms can change; review [Supabase pricing](https://supabase.com/pricing).

Each account can read and modify only its own journal row and its own folder of illustrations. The app keeps a local browser copy as an offline cache and shows sync status beneath the page list. Use **Back up or restore** periodically as an independent backup; Supabase Free does not include automatic database backups.

For ongoing updates, commit and push changes to the connected GitHub `master` branch; Cloudflare Pages will deploy them automatically.
