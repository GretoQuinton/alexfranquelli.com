import { readFile, readdir, stat } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = resolve('dist');
const source = resolve('src/content/writing');

async function mustFile(path) {
  const full = resolve(root, path);
  const info = await stat(full).catch(() => null);
  if (!info?.isFile()) throw new Error(`Missing required build output: ${path}`);
  return full;
}

async function optionalText(path) {
  const full = resolve(root, path);
  const info = await stat(full).catch(() => null);
  return info?.isFile() ? readFile(full, 'utf8') : '';
}

async function text(path) {
  return readFile(await mustFile(path), 'utf8');
}

const required = [
  'index.html',
  'writing/index.html',
  'fiction/index.html',
  'about/index.html',
  'contact/index.html',
  '404.html',
  'sitemap.xml',
  'robots.txt'
];
await Promise.all(required.map(mustFile));

const [home, writingIndex, contact, sitemap, robots, headers] = await Promise.all([
  text('index.html'),
  text('writing/index.html'),
  text('contact/index.html'),
  text('sitemap.xml'),
  text('robots.txt'),
  optionalText('_headers')
]);

const assertions = [
  [home.includes('google-site-verification'), 'Homepage is missing Google site verification metadata.'],
  [contact.includes('https://formspree.io/f/xppwjybp'), 'Contact form is not wired to the expected Formspree endpoint.'],
  [sitemap.includes('https://www.alexfranquelli.com/writing'), 'Sitemap is missing the writing archive route.']
];
for (const [ok, message] of assertions) if (!ok) throw new Error(message);

const isNoIndex = home.includes('name="robots" content="noindex,nofollow"');
const isIndexable = home.includes('name="robots" content="index,follow"');
if (isNoIndex === isIndexable) {
  throw new Error('Homepage must declare exactly one robots policy: noindex,nofollow or index,follow.');
}

if (isNoIndex) {
  const robotsBlocks = robots.includes('Disallow: /');
  const previewAllows = robots.includes('Allow: /');
  if (!robotsBlocks && !previewAllows) {
    throw new Error('Noindex build must declare either Disallow: / or the preview-only Allow: / crawler policy.');
  }
  if (!headers.includes('X-Robots-Tag: noindex, nofollow')) {
    throw new Error('Pre-launch _headers must send X-Robots-Tag: noindex, nofollow.');
  }
} else {
  if (!robots.includes('Allow: /')) {
    throw new Error('Production robots.txt must allow crawling when the site is indexable.');
  }
  if (!robots.includes('Sitemap: https://www.alexfranquelli.com/sitemap.xml')) {
    throw new Error('Production robots.txt must advertise the canonical sitemap.');
  }
  if (/X-Robots-Tag:\s*noindex/i.test(headers)) {
    throw new Error('Indexable production build still sends a noindex X-Robots-Tag header.');
  }
}

const entries = (await readdir(source)).filter(name => name.endsWith('.md'));
const published = [];
const missingPages = [];
const missingSitemap = [];
const squarespaceLeaks = [];
const descriptionScaffoldLeaks = [];

for (const name of entries) {
  const frontmatter = await readFile(resolve(source, name), 'utf8');
  if (/^draft:\s*true\s*$/m.test(frontmatter)) continue;
  const match = frontmatter.match(/^slug:\s*["']?([^"'\n]+)["']?\s*$/m);
  if (!match) throw new Error(`Missing slug in ${name}`);
  const slug = match[1].trim();
  published.push(slug);
  const article = resolve(root, 'writing', slug, 'index.html');
  const info = await stat(article).catch(() => null);
  if (!info?.isFile()) missingPages.push(slug);
  else {
    const built = await readFile(article, 'utf8');
    if (built.includes('squarespace-cdn.com')) squarespaceLeaks.push(slug);
    if (!/^description:\s*/m.test(frontmatter)) {
      const description = built.match(/<meta[^>]+name="description"[^>]+content="([^"]*)"/i)?.[1] || '';
      if (/(?:voto\s*:|rating\s*:|x{3,}|no\s+title\s+yet|tracklist\s*:|similar\s+(?:artist|artists|to)\s*:|release\s+dates?\s*:|caratteri\s*\(con\s+spazi\)|parole\s*:)/i.test(description)) {
        descriptionScaffoldLeaks.push(slug);
      }
    }
  }
  if (!sitemap.includes(`https://www.alexfranquelli.com/writing/${slug}`)) missingSitemap.push(slug);
}

if (missingPages.length) {
  throw new Error(`Published article pages missing from dist:\n${missingPages.join('\n')}`);
}
if (missingSitemap.length) {
  throw new Error(`Published article URLs missing from sitemap:\n${missingSitemap.join('\n')}`);
}
if (home.includes('squarespace-cdn.com') || squarespaceLeaks.length) {
  throw new Error(`Squarespace CDN references remain in the rendered build:\n${['homepage', ...squarespaceLeaks].filter((value,index)=>index>0 || home.includes('squarespace-cdn.com')).join('\n')}`);
}
if (descriptionScaffoldLeaks.length) {
  throw new Error(`Derived article descriptions still contain manuscript scaffolding:\n${descriptionScaffoldLeaks.join('\n')}`);
}

const countMatch = writingIndex.match(/Archive\s*[·&middot;]\s*([0-9]+)\s*pieces/i);
if (countMatch && Number(countMatch[1]) !== published.length) {
  throw new Error(`Writing archive count (${countMatch[1]}) does not match published article count (${published.length}).`);
}

const mode = isNoIndex
  ? (robots.includes('Allow: /') ? 'preview-crawlable/noindex' : 'pre-launch/noindex')
  : 'production/indexable';
console.log(`Verified core routes, ${mode} safeguards and ${published.length} published article pages.`);
