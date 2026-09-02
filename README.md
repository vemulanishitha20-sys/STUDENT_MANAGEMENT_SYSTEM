# Campusly

A responsive student management dashboard with Admin, Teacher, and Student spaces.

## Run locally

```bash
npm install
npm run dev
```

Without environment variables the app runs in browser demo mode. Admin login is `ADMIN001` / `admin123`; teacher and student demo passwords are `987654321`.

## Connect Supabase

1. Create a Supabase project and run `supabase/schema.sql` in its SQL editor.
2. Copy `.env.example` to `.env` and add the project URL and anon key.
3. Restart the dev server.

PostgreSQL sequences generate IDs and never roll back after deletion, so deleted IDs cannot be issued again. Teacher IDs begin at `TCH001`; CSE begins at `23611A01`; ECE begins at `23612A01`.

> The included SQL policies are suitable for a prototype. Before production, move admin mutations behind Supabase Auth plus an Edge Function and restrict the table policies to authenticated admins.
