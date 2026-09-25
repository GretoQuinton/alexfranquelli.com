import { readFile, stat } from 'node:fs/promises';
import { resolve, sep } from 'node:path';

// Run after Astro: never publish a permanent redirect to an absent local page.
const dist = resolve('dist');
const lines = (await readFile(resolve(dist, '_redirects'), 'utf8')).split('\n');
let checked = 0;
const missing = [];
for (const line of lines) {
  const rule = line.trim();
  if (!rule || rule.startsWith('#')) continue;
  const [source, destination] = rule.split(/\s+/);
  if (!destination?.startsWith('/') || destination.startsWith('//')) continue;
  const pathname = decodeURIComponent(new URL(destination, 'https://example.invalid').pathname);
  const target = resolve(dist, '.' + pathname);
  if (target !== dist && !target.startsWith(dist + sep)) {
    throw new Error(`Redirect destination escapes dist: ${destination}`);
  }
  const exists = await Promise.all([target, resolve(target, 'index.html'), target + '.html']
    .map(path => stat(path).then(info => info.isFile()).catch(error => {
      if (error.code === 'ENOENT' || error.code === 'ENOTDIR') return false;
      throw error;
    })));
  if (!exists.some(Boolean)) missing.push(`${source} → ${destination}`);
  checked++;
}
if (missing.length) throw new Error(`Redirects point to missing assets:\n${missing.join('\n')}`);
console.log(`Verified ${checked} local redirect destinations.`);
