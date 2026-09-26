# Alex Franquelli — Astro portfolio

This folder contains the production Astro rebuild of alexfranquelli.com. The source of truth is the `main` branch; the historical `astro-rebuild` branch is retained only for reference.

## Stack

- Astro 7
- Markdown article files in GitHub
- Pages CMS for browser-based editing
- Pagefind for static full-text archive search
- Cloudflare Workers Static Assets for hosting and Git deployments

## Current state

- 384 unique full-text article pages
- searchable `/writing` archive with publication, language, period and format filters
- Home, About, Fiction and Contact routes
- legacy `/film-tv` route retained outside primary navigation
- local preservation of recovered Squarespace imagery
- permanent legacy redirects activated only when the destination exists
- CI checks the Astro build, redirect destinations and Pagefind index

The historical archive remains incomplete. Missing article bodies or uncertain metadata stay unresolved until a verified source is available; published copy must not be invented or reconstructed.

## Development

```bash
cd astro-rebuild
npm install
npm run dev
```

Production build:

```bash
npm run build
```

The static output is written to `dist/`. `wrangler.jsonc` serves that directory through Cloudflare Workers Static Assets.

## Content workflow

Each published article is one Markdown file in `src/content/writing`. Frontmatter stores title, slug, publication, date, language, type, original URL and optional print/image metadata.

Pages CMS reads `.pages.yml` and edits the same GitHub Markdown files. Publication and date may remain blank when genuinely unconfirmed.

The master migration tracker records provenance, canonical/version decisions, build readiness and legacy redirect mappings.

## Search and redirects

Pagefind indexes article bodies after the Astro build. The `/writing` interface combines full-text results with the archive filters.

Active rules in `public/_redirects` are validated after every build by `scripts/check-redirects.mjs`. Pending legacy rules remain commented until their article destination exists.

## Launch safety

The preview remains blocked from indexing until the production domain is cut over. The production indexing switch is kept in a separate draft pull request and should be merged only during the custom-domain launch.

Do not change DNS merely to test repository changes. Verify the Cloudflare preview and the green GitHub build first.
