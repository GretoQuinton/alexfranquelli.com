import { mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { extname, join, resolve } from 'node:path';

const repoRoot=resolve(process.cwd());
const astroRoot=join(repoRoot,'astro-rebuild');
const contentRoot=join(astroRoot,'src/content/writing');
const outDir=join(astroRoot,'public/images/recovered');
const manifestPath=join(astroRoot,'src/data/recovered-images.json');
const reportDir=join(astroRoot,'migration/2026-09-25');
const reportPath=join(reportDir,'squarespace-image-preservation.json');

const csvFiles=[
  'research/squarespace-final-page-recovery.csv',
  'research/squarespace-page-1-recovery.csv',
  'research/squarespace-page-2-recovery.csv',
  'research/squarespace-page-3-recovery.csv',
  'research/squarespace-page-4-recovery.csv',
  'research/squarespace-page-5-recovery.csv'
];

const hero={
  slug:'__homeHero',
  title:'Alex Franquelli homepage',
  image:'https://images.squarespace-cdn.com/content/v1/658e990e3cae2759c6d9f2ff/7d580778-c1f9-45d0-b073-ce2166a984b4/IMG_2633.jpeg',
  source:'homepage'
};

function parseCSV(input){
  const rows=[]; let row=[], field='', quoted=false;
  for(let i=0;i<input.length;i++){
    const ch=input[i];
    if(quoted){
      if(ch==='"'&&input[i+1]==='"'){field+='"';i++;}
      else if(ch==='"') quoted=false;
      else field+=ch;
    }else{
      if(ch==='"') quoted=true;
      else if(ch===','){row.push(field);field='';}
      else if(ch==='\n'){row.push(field);rows.push(row);row=[];field='';}
      else if(ch!=='\r') field+=ch;
    }
  }
  if(field.length||row.length){row.push(field);rows.push(row);}
  const headers=rows.shift()||[];
  return rows.filter(r=>r.some(Boolean)).map(r=>Object.fromEntries(headers.map((h,i)=>[h,r[i]||''])));
}

const normalise=value=>(value||'').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/&/g,'and').replace(/[^a-z0-9]+/g,'');

function fmField(text,name){
  const match=text.match(new RegExp('^'+name+':\\s*(.+)\\s*$','m'));
  if(!match) return '';
  const value=match[1].trim();
  return ((value.startsWith('"')&&value.endsWith('"'))||(value.startsWith("'")&&value.endsWith("'"))) ? value.slice(1,-1) : value;
}

const articleFiles=(await readdir(contentRoot)).filter(name=>name.endsWith('.md'));
const builtSlugs=new Set();
const titleToSlugs=new Map();
for(const name of articleFiles){
  const text=await readFile(join(contentRoot,name),'utf8');
  const slug=fmField(text,'slug');
  const title=fmField(text,'title');
  if(!slug) continue;
  builtSlugs.add(slug);
  const key=normalise(title);
  if(key){
    if(!titleToSlugs.has(key)) titleToSlugs.set(key,[]);
    titleToSlugs.get(key).push(slug);
  }
}

const redirects=await readFile(join(astroRoot,'public/_redirects'),'utf8');
const legacyToSlug=new Map();
for(const line of redirects.split(/\n/)){
  const rule=line.trim();
  if(!rule||rule.startsWith('#')) continue;
  const [source,destination]=rule.split(/\s+/);
  if(!source||!destination?.startsWith('/writing/')) continue;
  legacyToSlug.set(source.replace(/\/$/,''),destination.replace(/^\/writing\//,'').replace(/\/$/,''));
}

const candidates=[];
for(const relative of csvFiles){
  const rows=parseCSV(await readFile(join(repoRoot,relative),'utf8'));
  for(const record of rows){
    const image=(record.image||'').trim();
    if(!image) continue;
    const title=(record.title||'').trim();
    let source=(record.path||'').trim();
    if(source&&!source.startsWith('/')&&!source.startsWith('http')) source='/portfolio/'+source;
    let slug='';
    if(source.startsWith('/')) slug=legacyToSlug.get(source.replace(/\/$/,''))||'';
    if(!slug){
      const possible=titleToSlugs.get(normalise(title))||[];
      if(possible.length===1) slug=possible[0];
    }
    if(slug&&builtSlugs.has(slug)) candidates.push({slug,title,image,source});
  }
}
candidates.push(hero);

const unique=[...new Map(candidates.map(record=>[record.slug,record])).values()];
await rm(outDir,{recursive:true,force:true});
await mkdir(outDir,{recursive:true});
await mkdir(reportDir,{recursive:true});

function extension(contentType,url){
  if(contentType.includes('image/png')) return '.png';
  if(contentType.includes('image/webp')) return '.webp';
  if(contentType.includes('image/gif')) return '.gif';
  if(contentType.includes('image/jpeg')||contentType.includes('image/jpg')) return '.jpg';
  const ext=extname(new URL(url).pathname).toLowerCase();
  return ['.jpg','.jpeg','.png','.webp','.gif'].includes(ext) ? (ext==='.jpeg'?'.jpg':ext) : '.jpg';
}

async function fetchOne(record){
  try{
    const response=await fetch(record.image,{
      redirect:'follow',
      signal:AbortSignal.timeout(30000),
      headers:{'user-agent':'alexfranquelli.com image preservation/1.0'}
    });
    if(!response.ok) return {...record,ok:false,status:response.status};
    const type=response.headers.get('content-type')||'';
    if(!type.startsWith('image/')) return {...record,ok:false,status:response.status,error:'Not an image: '+type};
    const bytes=new Uint8Array(await response.arrayBuffer());
    if(bytes.byteLength>15000000) return {...record,ok:false,status:response.status,error:'Image exceeds 15 MB'};
    const ext=extension(type,response.url||record.image);
    const filename=(record.slug==='__homeHero'?'home-hero':record.slug)+ext;
    await writeFile(join(outDir,filename),bytes);
    return {...record,ok:true,status:response.status,bytes:bytes.byteLength,localPath:'/images/recovered/'+filename,contentType:type};
  }catch(error){
    return {...record,ok:false,status:null,error:error instanceof Error?error.message:String(error)};
  }
}

const results=[];
const concurrency=6;
for(let i=0;i<unique.length;i+=concurrency){
  results.push(...await Promise.all(unique.slice(i,i+concurrency).map(fetchOne)));
}

const manifest={};
for(const result of results){
  if(!result.ok) continue;
  manifest[result.slug]={
    src:result.localPath,
    alt:result.slug==='__homeHero'?'':(result.title?'Artwork or image associated with '+result.title:'Recovered archive image'),
    sourceUrl:result.image
  };
}
await writeFile(manifestPath,JSON.stringify(manifest,null,2)+'\n');

const report={
  generatedAt:new Date().toISOString(),
  candidates:unique.length,
  preserved:results.filter(r=>r.ok).length,
  failed:results.filter(r=>!r.ok).length,
  totalBytes:results.filter(r=>r.ok).reduce((sum,r)=>sum+(r.bytes||0),0),
  failures:results.filter(r=>!r.ok).map(({slug,title,image,source,status,error})=>({slug,title,image,source,status,error}))
};
await writeFile(reportPath,JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report,null,2));
if(report.preserved===0) process.exitCode=1;
