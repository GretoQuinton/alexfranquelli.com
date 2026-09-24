import { getCollection } from 'astro:content';

export const prerender = true;

export async function GET() {
  const site = 'https://www.alexfranquelli.com';
  const staticPaths = ['/', '/writing', '/fiction', '/about', '/contact'];
  const writing = await getCollection('writing', ({ data }) => !data.draft);
  const urls = [
    ...staticPaths.map(path => site + path),
    ...writing.map(article => `${site}/writing/${article.data.slug}`)
  ];
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map(loc => `  <url><loc>${loc}</loc></url>`).join('\n')}
</urlset>`;
  return new Response(xml, { headers: { 'Content-Type': 'application/xml' } });
}
