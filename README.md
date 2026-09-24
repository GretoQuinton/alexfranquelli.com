# alexfranquelli.com

Personal portfolio and publication archive for Alex Franquelli.

## Production site

The production implementation lives in `astro-rebuild/` and is built with Astro.

Current launch corpus:
- 368 full-text published articles
- English and Italian
- reviews, interviews, features and live reports
- legacy Squarespace redirects preserved in `public/_redirects`
- Pagefind static search index
- custom 404, sitemap, robots.txt and structured metadata

The remaining historical recovery list is a post-launch archive backlog and is not a launch dependency.

## Local development

```bash
cd astro-rebuild
npm install
npm run dev
```

Production validation:

```bash
npm run build
```

The output is written to `astro-rebuild/dist/`.

## Cloudflare Workers deployment

Use Cloudflare Workers Builds with the GitHub repository `GretoQuinton/alexfranquelli.com`.

Recommended settings:
- Production branch: `main`
- Root directory: `astro-rebuild`
- Build command: `npm run build`
- Deploy command: `npx wrangler deploy`
- Preview command: `npx wrangler preview`
- Preview builds: enabled

The Worker configuration is `astro-rebuild/wrangler.jsonc`. It serves the static `dist` directory and uses the custom Astro 404 page for missing routes.

After the workers.dev preview has been checked, attach `www.alexfranquelli.com` as the Worker custom domain. Keep Squarespace live until the preview passes final visual and redirect QA.

## Launch QA

Before changing the production domain:
1. Check homepage on desktop and mobile.
2. Check `/writing` search and filters.
3. Open several long English and Italian articles.
4. Test representative legacy `/portfolio/...` redirects.
5. Check `/404`, `/sitemap.xml` and `/robots.txt`.
6. Check contact links and external original-publication links.
7. Confirm Cloudflare serves HTTPS and the custom domain correctly.

After cutover:
1. Submit `https://www.alexfranquelli.com/sitemap.xml` in Google Search Console.
2. Monitor 404s and redirect failures.
3. Cancel Squarespace only after the new domain has been stable and verified.
