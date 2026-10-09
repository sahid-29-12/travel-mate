# TravelMate

TravelMate helps people compare local travel options, find ride-share companions, and coordinate trips.

## Getting started

Install dependencies and start the development server:

```bash
npm install
npm run dev
```

## Configure Supabase

Authentication and persisted profiles, ride posts, and conversations are powered by Supabase.

1. Create a Supabase project.
2. Copy `.env.example` to `.env.local` and set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` using the project URL and publishable (or legacy anon) key.
3. Run [`supabase/schema.sql`](./supabase/schema.sql) in the Supabase SQL Editor. It creates the app tables, signup profile trigger, indexes, and row-level security policies. For a project where this schema is already installed, run [`supabase/guest-access.sql`](./supabase/guest-access.sql) to add the guest write restrictions without recreating the app tables.
4. In Supabase Authentication URL settings, add `http://localhost:3000/auth/callback` as a redirect URL. Add the deployed callback URL before production use.
5. Enable email/password sign-in. To use guest mode, also enable **Anonymous Sign-Ins** in Supabase Authentication settings. If Google sign-in is desired, configure the Google OAuth provider in Supabase and add its credentials there.
6. For map selection, create a Google Maps API key with billing enabled and the Maps JavaScript API and Geocoding API enabled. Restrict the key to your local and deployed website referrers, and restrict API access to those APIs. The map also offers optional live location; the browser asks permission only after the user selects **Use my location**. Geolocation requires localhost or a secure HTTPS origin.
7. Set `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` in `.env.local`, then restart the development server.

The app uses the public Supabase key only; never put a service-role key in a `NEXT_PUBLIC_*` variable or in browser code. Table access is protected by row-level security. Without project credentials, the site remains viewable, while backend actions show a configuration error.

## Backend features

- Email/password sign-up and sign-in, optional Google OAuth, and cookie-based session refresh.
- Temporary anonymous guest sessions for browsing public rides. Guests cannot publish rides, edit profiles, start conversations, or send messages.
- A private profile for each account, private additional traveller profiles, and private avatar uploads.
- Public ride listings with authenticated ride creation.
- Authenticated one-to-one conversations and persisted messages, scoped to conversation participants.
