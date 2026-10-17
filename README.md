# The Humor Index — Assignment 6
Independent Next.js admin app for the existing NYC AI caption database.

## Setup
1. Install: `npm ci`. Copy `.env.example` to `.env.local`; use the SAME database as the creation/rating app. No service-role key.
2. Run `supabase/assignment6.sql` in Supabase SQL Editor after assignments 3 and 4. This limits profile column writes to prevent privilege escalation while preserving member profile editing.
3. Bootstrap: sign in with Google in the original app; find your verified user in Supabase Authentication. In SQL Editor execute the commented UPDATE at the end of the migration with your verified Google email. Direct owner access solves the initial admin lockout. Ordinary app users cannot set this field.
4. Run `npm run dev`. All four data pages and every mutation check the Google identity and the live database flag. Database RLS checks both too. Login/callback/access-denied and framework assets are public entry points and expose no admin data.
5. Optional Gemini key enables genuine AI creation. Original per-user daily and spacing quotas remain enforced. Editing and deletion use the authenticated user, never a service-role bypass. Deleting captions cascades their votes; generation history remains.

## Independent GitHub and Vercel projects
Initialize Git INSIDE this directory. Create a new repository `nyc-humor-admin`, push it, and import into a NEW Vercel project. Add SUPABASE_URL, SUPABASE_ANON_KEY, GEMINI_API_KEY and optionally GEMINI_MODEL. Do not reuse the original Vercel project.
Add the production and exact commit-deployment `/auth/callback` URLs to Supabase Authentication URL Configuration. Google continues redirecting through the existing Supabase provider callback.
Disable Vercel Authentication deployment protection for both submitted apps. This does not remove the application's Google + database superadmin checks.

## Verification and submission
Run lint, TypeScript and build. Test signed-out direct visits to `/`, `/users`, `/media`, `/ratings`; all redirect to login. Test a Google member without the flag; data routes redirect to denied and direct database admin mutations fail. Test a flagged Google admin: full profile/rating reads, AI creation, edit, delete. Sign out and revisit data routes. Verify revoking the flag blocks the next request and action. Never delete valuable production media merely to test.
Use Vercel's deployment details to copy the latest successful deployment URL tied to each app's final Git commit. Verify both from Incognito (admin must show Google login), then submit both URLs in the course Submissions section. Production aliases are not commit-specific URLs.

Statistics use real complete paginated database reads: member count, captions, ratings, approval, category distribution, ranked net-vote captions, and publication per generation attempt. Empty data is shown honestly. Admin edits preserve the source prompt/model; ratings are read-only. For large datasets, move aggregates into authorized database functions.
