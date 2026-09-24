# Migration verification — 24 September 2026

Recovered the complete IndieForBunnies HTML bodies for AF-0579 (Nine Inch Nails, 9 September 2013) and AF-0581 (Boards Of Canada, 15 July 2013). Original publisher pages verify Alex Franquelli's byline. The recovery manifest records HTML snapshot hashes and every character-encoding repair; prose and apparent source typos were otherwise retained. Nine Inch Nails has six article paragraphs plus its photo credit; Boards Of Canada has eight paragraphs. Both rendered bodies match the imported content after HTML parsing and whitespace normalisation.

The branch now contains 361 article files, matching 361 unique migrated tracker slugs. Of those, 245 are marked Ready and 116 still need metadata. The full publishable target is 541: 141 need metadata in total and 155 need source recovery. Full-text migration is 66.7%; this is not the publication-readiness percentage.

A successful Astro/Pagefind build does not prove legacy redirects work. The previous “110/110 resolved” represented mapping confidence, not target existence. This pass corrected three stale destination slugs (Charlemagne Palestine/Z'EV, Dennis Rea, Fabrizio Sferra), affecting six rules. After those repairs, 74 of 110 legacy mappings have built targets; 36 mappings still lead to 34 distinct missing destinations, listed in redirect-audit.json. Three Ulver Messe paths share a stale target: the three publication-specific versions must be matched to their historical routes before choosing redirects.

The public Squarespace portfolio JSON endpoint returned HTTP 401 during this pass, so no new Squarespace capture was obtained. The malformed XML exports were not retried. Cloudflare and fiction/Greto source material were not modified or investigated.

Validation: Astro generated 367 pages; Pagefind indexed 361 article pages. No deployment or merge performed. Raw publisher HTML snapshots are retained in the local project recovery directory; source URLs and hashes are included here for provenance.
