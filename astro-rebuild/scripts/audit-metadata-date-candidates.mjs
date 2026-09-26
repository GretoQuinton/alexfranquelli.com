import { readdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const root='astro-rebuild/src/content/writing';
const output='astro-rebuild/metadata-date-candidates.json';

function field(frontmatter,name){
  const match=frontmatter.match(new RegExp('^'+name+':\\s*(.+)\\s*$','m'));
  if(!match) return '';
  const value=match[1].trim();
  return ((value.startsWith('"')&&value.endsWith('"'))||(value.startsWith("'")&&value.endsWith("'"))) ? value.slice(1,-1) : value;
}
function cleanBody(text){
  return text
    .replace(/^---\n[\s\S]*?\n---\n?/,'')
    .replace(/<br\s*\/?>/gi,' ')
    .replace(/<[^>]+>/g,' ')
    .replace(/&nbsp;/g,' ')
    .replace(/&amp;/g,'&')
    .replace(/\s+/g,' ')
    .trim();
}
const monthEn='January|February|March|April|May|June|July|August|September|October|November|December';
const monthIt='gennaio|febbraio|marzo|aprile|maggio|giugno|luglio|agosto|settembre|ottobre|novembre|dicembre';
const patterns=[
  {kind:'iso',re:/\b20\d{2}-[01]?\d-[0-3]?\d\b/gi},
  {kind:'numeric',re:/\b[0-3]?\d[\/.][01]?\d[\/.](?:19|20)\d{2}\b/g},
  {kind:'english-day-month',re:new RegExp('\\b[0-3]?\\d\\s+(?:'+monthEn+')\\s+(?:19|20)\\d{2}\\b','gi')},
  {kind:'english-month-day',re:new RegExp('\\b(?:'+monthEn+')\\s+[0-3]?\\d,?\\s+(?:19|20)\\d{2}\\b','gi')},
  {kind:'italian-day-month',re:new RegExp('\\b[0-3]?\\d\\s+(?:'+monthIt+')\\s+(?:19|20)\\d{2}\\b','gi')},
  {kind:'month-year',re:new RegExp('\\b(?:'+monthEn+'|'+monthIt+')\\s+(?:19|20)\\d{2}\\b','gi')}
];

const results=[];
for(const name of (await readdir(root)).filter(n=>n.endsWith('.md'))){
  const path=join(root,name);
  const text=await readFile(path,'utf8');
  const fm=text.match(/^---\n([\s\S]*?)\n---/);
  if(!fm) continue;
  if(field(fm[1],'publicationDate')) continue;
  const body=cleanBody(text);
  const matches=[];
  for(const {kind,re} of patterns){
    re.lastIndex=0;
    for(const match of body.matchAll(re)){
      const index=match.index??0;
      const start=Math.max(0,index-90);
      const end=Math.min(body.length,index+match[0].length+90);
      matches.push({kind,value:match[0],snippet:body.slice(start,end)});
    }
  }
  const unique=[...new Map(matches.map(m=>[m.kind+'|'+m.value+'|'+m.snippet,m])).values()];
  if(unique.length){
    results.push({
      file:name,
      slug:field(fm[1],'slug'),
      title:field(fm[1],'title'),
      publication:field(fm[1],'publication'),
      language:field(fm[1],'language'),
      candidates:unique
    });
  }
}
const report={generatedAt:new Date().toISOString(),articlesWithCandidates:results.length,results};
await writeFile(output,JSON.stringify(report,null,2)+'\n');
console.log('Found explicit date candidates in '+results.length+' undated built articles.');
