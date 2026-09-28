import { readFile, readdir } from 'node:fs/promises';
import { resolve } from 'node:path';

const source = resolve('src/content/writing');
const decodeEntities=(value)=>value
  .replace(/&nbsp;/gi,' ')
  .replace(/&amp;/gi,'&')
  .replace(/&quot;/gi,'"')
  .replace(/&#39;|&apos;/gi,"'")
  .replace(/&ldquo;|&rdquo;/gi,'"')
  .replace(/&lsquo;|&rsquo;/gi,"'");
const plainText=(value)=>decodeEntities(value
  .replace(/<[^>]+>/g,' ')
  .replace(/[#*_~`>]+/g,' ')
  .replace(/\s+/g,' ')
  .trim());
const normalise=(value)=>plainText(value).toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
const scaffoldPattern=/(?:^|\b)(?:di\s+alex\s+franquelli|by\s+alex\s+franquelli|alex\s+franquelli|voto\s*:|rating\s*:|labels?\s*:|websites?\s*:|release\s+dates?\s*:|tracklist\s*:|similar\s+(?:artist|artists|to)\s*:|titolo\s*:|regista\s*:|durata\s*:|caratteri\s*\(con\s+spazi\)|parole\s*:|x{3,}|no\s+title\s+yet)/i;
const hits=[];
for (const name of (await readdir(source)).filter(n=>n.endsWith('.md'))) {
  const file=await readFile(resolve(source,name),'utf8');
  const match=file.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if(!match) continue;
  const fm=match[1], rawBody=match[2].trim();
  const slug=(fm.match(/^slug:\s*["']?([^"'\n]+)["']?\s*$/m)||[])[1]?.trim()||name.replace(/\.md$/,'');
  const title=(fm.match(/^title:\s*["']?(.+?)["']?\s*$/m)||[])[1]?.trim()||'';
  const rawBlocks=rawBody.split(/\n\s*\n/).filter(Boolean);
  const titleKey=normalise(title);
  const leadText=rawBlocks.slice(0,6).map(plainText).join(' | ');
  const repeatsTitle=rawBlocks.slice(0,4).some(block=>{
    const key=normalise(block);
    return key&&titleKey&&(key===titleKey||(key.length>10&&titleKey.includes(key))||(titleKey.length>10&&key.includes(titleKey)));
  });
  const initialMatch=!/^\s*<p[\s>]/i.test(rawBody)&&(scaffoldPattern.test(leadText)||repeatsTitle);
  if(initialMatch) hits.push({slug,title,start:rawBlocks.slice(0,3).map(plainText)});
}
console.log('ORIGINAL_NON_HTML_TARGETS='+JSON.stringify(hits));
console.log('ORIGINAL_NON_HTML_COUNT='+hits.length);
