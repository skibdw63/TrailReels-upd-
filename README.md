# TrailReels Real Online Version

This is the normal GitHub + Netlify version.

## What works

- Real video players with play/pause buttons
- Memories button plays `public/bliss.mp3`
- Demo mode works even without Supabase
- Supabase-ready accounts/login
- Online/global tables for profiles, posts, reports, follows, gifts, and badges
- Owner panel appears if your profile role is `owner`

## GitHub upload rule

The first page of your repo must show:

```txt
package.json
index.html
src
public
netlify.toml
manifest.webmanifest
icon.svg
README.md
supabase-schema.sql
```

`src/main.jsx` and `src/styles.css` must be inside the `src` folder.

## Netlify settings

Build command:

```txt
npm run build
```

Publish directory:

```txt
dist
```

Functions directory: leave blank.

## Supabase setup

1. Make a Supabase project.
2. Open SQL Editor.
3. Paste and run `supabase-schema.sql`.
4. In Netlify, add environment variables:

```txt
VITE_SUPABASE_URL
VITE_SUPABASE_ANON_KEY
VITE_OWNER_EMAIL
```

5. Deploy again.
6. Sign up in TrailReels.
7. In Supabase SQL Editor, run:

```sql
update public.profiles
set role = 'owner', creator_type = 'music', display_name = 'TrailReels Owner'
where email = 'your-email@example.com';
```

Then log out/log in again and you should see the Owner Panel.
