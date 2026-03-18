# LIM JAEMIN Sketchbook Portfolio

Static GitHub Pages site for LIM JAEMIN with live GitHub data and a Supabase-backed guestbook.

## Theme

- Warm paper texture
- Hand-drawn cat reference image
- Live GitHub profile, repository, and activity data
- Public guestbook powered by Supabase REST

## Files

- `index.html`: page structure, guestbook markup, and templates
- `styles.css`: sketchbook-inspired styling
- `script.js`: GitHub API fetch, Supabase guestbook fetch/insert, and UI state handling
- `supabase/guestbook.sql`: guestbook table, index, and RLS policies
- `assets/cat-sketch.jpg`: reference image used in the hero section

## Supabase Guestbook

The site is wired to Supabase directly from the browser.

- `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `GUESTBOOK_TABLE` are defined in `script.js`
- guestbook reads come from `GET /rest/v1/guestbook_entries`
- guestbook writes are sent to `POST /rest/v1/guestbook_entries`
- database setup lives in `supabase/guestbook.sql`

The SQL file creates the `guestbook_entries` table and enables:

- public read access
- public insert access with length checks for `name` and `message`

If you rotate to a different Supabase project later, update the URL/key in `script.js` and re-run `supabase/guestbook.sql` in the new project.

## Deploy

Push to the `main` branch of `AOLLMAN.github.io` to publish the site at:

- `https://aollman.github.io/`

## Notes

- Supabase anon keys are intended for client-side use, so exposing the anon key in this static site is expected
- if guestbook spam becomes a problem, move writes behind a Supabase Edge Function or add stronger abuse controls
