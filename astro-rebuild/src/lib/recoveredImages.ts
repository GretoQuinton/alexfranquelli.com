import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

type ImageRecord={src:string;alt:string;sourceUrl?:string};

const csvFiles=[
  '../research/squarespace-final-page-recovery.csv',
  '../research/squarespace-page-1-recovery.csv',
  '../research/squarespace-page-2-recovery.csv',
  '../research/squarespace-page-3-recovery.csv',
  '../research/squarespace-page-4-recovery.csv',
  '../research/squarespace-page-5-recovery.csv'
];

function parseCSV(input:string){
  const rows:string[][]=[]; let row:string[]=[], field='', quoted=false;
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

const normalise=(value:string)=>
  (value||'').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/&/g,'and').replace(/[^a-z0-9]+/g,'');

const localManifestPath=resolve(process.cwd(),'src/data/recovered-images.json');
let localManifest:Record<string,ImageRecord>={};
try{localManifest=JSON.parse(readFileSync(localManifestPath,'utf8'));}catch{}

const redirectsText=readFileSync(resolve(process.cwd(),'public/_redirects'),'utf8');
const legacyToSlug=new Map<string,string>();
for(const line of redirectsText.split(/\n/)){
  const rule=line.trim();
  if(!rule||rule.startsWith('#')) continue;
  const [source,destination]=rule.split(/\s+/);
  if(!source||!destination?.startsWith('/writing/')) continue;
  legacyToSlug.set(source.replace(/\/$/,''),destination.replace(/^\/writing\//,'').replace(/\/$/,''));
}

const bySlug=new Map<string,ImageRecord>();
const byTitleCandidates=new Map<string,ImageRecord[]>();

for(const relative of csvFiles){
  const text=readFileSync(resolve(process.cwd(),relative),'utf8');
  for(const record of parseCSV(text)){
    const image=(record.image||'').trim();
    if(!image) continue;
    const title=(record.title||'').trim();
    const alt=title?`Artwork or image associated with ${title}`:'Recovered archive image';
    let source=(record.path||'').trim();
    if(source&&!source.startsWith('/')&&!source.startsWith('http')) source='/portfolio/'+source;
    if(source.startsWith('/')){
      const slug=legacyToSlug.get(source.replace(/\/$/,''));
      if(slug&&!bySlug.has(slug)) bySlug.set(slug,{src:image,alt});
    }
    const key=normalise(title);
    if(key){
      if(!byTitleCandidates.has(key)) byTitleCandidates.set(key,[]);
      byTitleCandidates.get(key)!.push({src:image,alt});
    }
  }
}

const byTitle=new Map<string,ImageRecord>();
for(const [key,records] of byTitleCandidates){
  const unique=[...new Map(records.map(r=>[r.src,r])).values()];
  if(unique.length===1) byTitle.set(key,unique[0]);
}

export function getRecoveredImage(slug:string,title:string):ImageRecord|null{
  return localManifest[slug]||bySlug.get(slug)||byTitle.get(normalise(title))||null;
}

export const recoveredImageCount=Object.keys(localManifest).length||bySlug.size;
