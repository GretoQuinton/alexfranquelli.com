import { getCollection } from 'astro:content';

export const prerender = true;

export async function GET() {
  const site = 'https://www.alexfranquelli.com';
  const staticPaths = ['/', '/writing', '/fiction', '/about', '/contact'];
  const writing = await getCollection('writing', ({ data }) => !data.draft);
  const urls = [
    ...staticPaths.map(path => ({ loc: site + path })),
    ...writing.map(article => ({
      loc: `${site}/writing/${article.data.slug}`,
      lastmod: article.data.publicationDate
    }))
  ];
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map(url => `  <url>
    <loc>${url.loc}</loc>${url.lastmod && /^\\d{4}-\\d{2}-\\d{2}$/.test(url.lastmod) ? `
    <lastmod>${url.lastmod}</lastmod>` : ''}
  </url>`).join('\n')}
</urlset>`;
  return new Response(xml, { headers: { 'Content-Type': 'application/xml' } });
}
