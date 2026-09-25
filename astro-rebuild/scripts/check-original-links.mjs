import { readdir, readFile, writeFile } from 'node:fs/promises';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const root=fileURLToPath(new URL('../src/content/writing/',import.meta.url));
const output=new URL('../link-audit.json',import.meta.url);
const timeoutMs=15000;
const concurrency=6;

async function files(dir){
  const entries=await readdir(dir,{withFileTypes:true});
  const out=[];
  for(const entry of entries){
    const path=join(dir,entry.name);
    if(entry.isDirectory()) out.push(...await files(path));
    else if(entry.name.endsWith('.md')) out.push(path);
  }
  return out;
}
function field(frontmatter,name){
  const match=frontmatter.match(new RegExp('^'+name+':\\s*(.+)\\s*$','m'));
  if(!match) return null;
  const value=match[1].trim();
  if((value.startsWith('"')&&value.endsWith('"'))||(value.startsWith("'")&&value.endsWith("'"))) return value.slice(1,-1);
  return value;
}
async function request(url,method){
  return fetch(url,{
    method,
    redirect:'follow',
    signal:AbortSignal.timeout(timeoutMs),
    headers:{
      'user-agent':'alexfranquelli.com archive-link-audit/1.0',
      ...(method==='GET'?{Range:'bytes=0-2047'}:{})
    }
  });
}
async function inspect(item){
  try{
    let response=await request(item.originalUrl,'HEAD');
    if([400,403,405].includes(response.status)) response=await request(item.originalUrl,'GET');
    let state='error';
    if(response.status>=200&&response.status<400) state='live';
    else if(response.status===404||response.status===410) state='dead';
    else if([401,403,429].includes(response.status)) state='blocked';
    return {...item,state,status:response.status,finalUrl:response.url||item.originalUrl,checkedAt:new Date().toISOString()};
  }catch(error){
    return {...item,state:'error',status:null,error:error instanceof Error?error.message:String(error),checkedAt:new Date().toISOString()};
  }
}
const paths=await files(root);
const items=[];
for(const path of paths){
  const text=await readFile(path,'utf8');
  const fm=text.match(/^---\n([\s\S]*?)\n---/);
  if(!fm) continue;
  const originalUrl=field(fm[1],'originalUrl');
  if(!originalUrl) continue;
  items.push({
    file:relative(new URL('../',root).pathname,path),
    slug:field(fm[1],'slug'),
    title:field(fm[1],'title'),
    publication:field(fm[1],'publication'),
    originalUrl,
    declaredStatus:field(fm[1],'originalUrlStatus'),
    archiveUrl:field(fm[1],'archiveUrl')
  });
}
const results=[];
for(let i=0;i<items.length;i+=concurrency){
  results.push(...await Promise.all(items.slice(i,i+concurrency).map(inspect)));
}
const counts=results.reduce((acc,row)=>{acc[row.state]=(acc[row.state]||0)+1;return acc;},{});
const needsReview=results.filter(row=>row.state!=='live'||(row.declaredStatus&&row.declaredStatus!==row.state));
const report={generatedAt:new Date().toISOString(),checked:results.length,counts,needsReviewCount:needsReview.length,needsReview,results};
await writeFile(output,JSON.stringify(report,null,2)+'\n');
console.log(`Checked ${results.length} original URLs: ${JSON.stringify(counts)}. ${needsReview.length} need review.`);
