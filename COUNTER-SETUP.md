# Soul Quiz — Cloudflare Pages counter setup

The site now uses a first-party Cloudflare Pages Function at `/api/views` and a D1 database. The server sets an HttpOnly cookie and counts at most one view per browser identity every 24 hours. The counter is stored server-side, so refreshes and localStorage changes cannot directly fake the displayed total.

## 1. Create the D1 database
Create a D1 database in Cloudflare and run `schema.sql` against it.

## 2. Bind it to Pages
In Cloudflare Dashboard: Workers & Pages → `soulqu` → Settings → Bindings → Add → D1 database. Use the binding name **DB**, then select the database. Redeploy the Pages project. Cloudflare documents Pages Function bindings for D1 in its bindings guide.

## 3. Deploy
Commit these files to the root of `mufi4ek/soul-quiz`: `index.html`, `_headers`, `robots.txt`, `sitemap.xml`, `og-image.png`, `favicon-32.png`, `apple-touch-icon.png`, `functions/api/views.js`, and `schema.sql`.

The static site and API are deployed through the existing Git integration.
