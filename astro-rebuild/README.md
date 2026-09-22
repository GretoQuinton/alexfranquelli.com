# Astro migration branch

This folder is the incremental migration path for the existing alexfranquelli.com static work-in-progress.

## Chosen stack

- Astro 7
- GitHub repository content
- Markdown article files
- Pages CMS for browser-based editing
- Pagefind for static full-text search
- Cloudflare Workers Static Assets for hosting and automatic Git deployments

## Safety rule

The existing static prototype at the repository root remains untouched while this folder is evaluated. Film & TV and Fiction routes are retained in navigation. Existing Fiction content is not part of the article-archive migration.

## Development

```bash
cd astro-rebuild
npm install
npm run dev
```

Production:

```bash
npm run build
```

The static output is written to `dist/`. The included `wrangler.jsonc` points Cloudflare Workers Static Assets at that directory.

## Content workflow

Each article becomes one Markdown file in `src/content/writing`. Frontmatter mirrors the master migration sheet: title, slug, publication, date, language, type, original URL, issue/page and cover reference.

Pages CMS reads `.pages.yml` and provides a browser editor over those GitHub files. Article bodies must be imported from a verified source; the migration must not manufacture or paraphrase missing published copy.

## Next implementation pass

1. Convert the first build-ready batch from the master Sheet to Markdown.
2. Preserve existing Squarespace paths with redirects or matching routes.
3. Add Pagefind UI and publication/language filters.
4. Migrate magazine cover assets.
5. Compare Astro output against the current GitHub Pages preview.
6. Connect the branch to a Cloudflare preview only after the content import is representative.
