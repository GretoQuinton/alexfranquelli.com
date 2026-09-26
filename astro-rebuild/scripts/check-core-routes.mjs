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

const [home, writingIndex, contact, sitemap, robots] = await Promise.all([
  text('index.html'),
  text('writing/index.html'),
  text('contact/index.html'),
  text('sitemap.xml'),
  text('robots.txt')
]);

const assertions = [
  [home.includes('google-site-verification'), 'Homepage is missing Google site verification metadata.'],
  [home.includes('noindex,nofollow'), 'Pre-launch homepage must remain noindex,nofollow on main.'],
  [contact.includes('https://formspree.io/f/xppwjybp'), 'Contact form is not wired to the expected Formspree endpoint.'],
  [robots.includes('Disallow: /'), 'Pre-launch robots.txt must block crawling on main.'],
  [sitemap.includes('https://www.alexfranquelli.com/writing'), 'Sitemap is missing the writing archive route.']
];
for (const [ok, message] of assertions) if (!ok) throw new Error(message);

const headers = await text('_headers');
if (!headers.includes('X-Robots-Tag: noindex, nofollow')) {
  throw new Error('Pre-launch _headers must send X-Robots-Tag: noindex, nofollow on main.');
}

const entries = (await readdir(source)).filter(name => name.endsWith('.md'));
const missingPages = [];
const missingSitemap = [];

for (const name of entries) {
  const frontmatter = await readFile(resolve(source, name), 'utf8');
  if (/^draft:\s*true\s*$/m.test(frontmatter)) continue;
  const match = frontmatter.match(/^slug:\s*["']?([^"'\n]+)["']?\s*$/m);
  if (!match) throw new Error(`Missing slug in ${name}`);
  const slug = match[1].trim();
  const article = resolve(root, 'writing', slug, 'index.html');
  const info = await stat(article).catch(() => null);
  if (!info?.isFile()) missingPages.push(slug);
  if (!sitemap.includes(`https://www.alexfranquelli.com/writing/${slug}`)) missingSitemap.push(slug);
}

if (missingPages.length) {
  throw new Error(`Published article pages missing from dist:\n${missingPages.join('\n')}`);
}
if (missingSitemap.length) {
  throw new Error(`Published article URLs missing from sitemap:\n${missingSitemap.join('\n')}`);
}

const countMatch = writingIndex.match(/Archive\s*[·&middot;]\s*([0-9]+)\s*pieces/i);
if (countMatch && Number(countMatch[1]) !== entries.length) {
  throw new Error(`Writing archive count (${countMatch[1]}) does not match source file count (${entries.length}).`);
}

console.log(`Verified core routes, launch safeguards and ${entries.length} published article pages.`);
