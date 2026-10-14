import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

export const BASE_PATH='/vc-portfolio-directory-demo';
const appDir=path.dirname(fileURLToPath(import.meta.url));
const MIME=new Map(Object.entries({
  '.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8',
  '.js':'text/javascript; charset=utf-8','.mjs':'text/javascript; charset=utf-8',
  '.json':'application/json; charset=utf-8','.txt':'text/plain; charset=utf-8','.md':'text/markdown; charset=utf-8',
  '.xml':'application/xml; charset=utf-8','.svg':'image/svg+xml',
  '.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.webp':'image/webp',
  '.avif':'image/avif','.gif':'image/gif','.ico':'image/x-icon',
  '.woff':'font/woff','.woff2':'font/woff2','.ttf':'font/ttf','.otf':'font/otf',
  '.pdf':'application/pdf','.wasm':'application/wasm'
}));
function within(root,target){return target===root||target.startsWith(root+path.sep);}
/* Cache policy: content-hashed / versioned build output is cached for a year; everything else revalidates after 5 min.
   _next/static (Next content hashes) · fonts/rs-<chunk>-<hash>.woff2 (scripts/fonts/build-fonts.mjs)
   · vendor/[geo/]<name>-<semver>[.min].js|json (pinned library version, scripts/build-assets.mjs) */
const IMMUTABLE=[/^_next\/static\//,/^fonts\/rs-[a-z-]+-[0-9a-f]{10}\.woff2$/,/^vendor\/(?:geo\/)?[a-z0-9-]+-\d+\.\d+\.\d+(?:\.min)?\.(?:js|json)$/];
export function cacheControlFor(relative=''){return IMMUTABLE.some(re=>re.test(relative))?'public, max-age=31536000, immutable':'public, max-age=300';}
export function resolveRequest(rawUrl='/'){
  let pathname;
  try{pathname=decodeURIComponent(rawUrl.split('?')[0]);}catch{return {status:400};}
  if(!pathname.startsWith('/')||pathname.includes('\\')||/[\u0000-\u001f\u007f]/.test(pathname)||/%(?:2e|2f|5c|00)/i.test(pathname))return {status:400};
  if(pathname.split('/').some(part=>part.startsWith('.')))return {status:403};
  if(pathname==='/')return {status:302,location:BASE_PATH+'/ko/'};
  if(pathname===BASE_PATH)return {status:308,location:BASE_PATH+'/'};
  if(!pathname.startsWith(BASE_PATH+'/'))return {status:404};
  return {status:200,pathname,relative:pathname.slice(BASE_PATH.length+1)};
}
export function createStaticServer({root=path.join(appDir,'out')}={}){
  const absoluteRoot=path.resolve(root);
  return http.createServer(async(req,res)=>{
    const headers={'X-Content-Type-Options':'nosniff','Referrer-Policy':'strict-origin-when-cross-origin','X-Frame-Options':'SAMEORIGIN'};
    const finish=(status,body='',extra={})=>{res.writeHead(status,{...headers,'Content-Type':'text/plain; charset=utf-8',...extra});res.end(req.method==='HEAD'?'':body);};
    // missing path under the basePath: the site's bilingual 404 page (scripts/post-export.mjs), still status 404
    const notFound=async()=>{
      try{
        const page=await fs.readFile(path.join(absoluteRoot,'404.html'));
        res.writeHead(404,{...headers,'Content-Type':'text/html; charset=utf-8','Content-Length':page.length,'Cache-Control':'public, max-age=300'});
        res.end(req.method==='HEAD'?null:page);
      }catch{finish(404,'Not found');}
    };
    if(!['GET','HEAD'].includes(req.method))return finish(405,'Method not allowed',{Allow:'GET, HEAD'});
    const request=resolveRequest(req.url);
    if(request.location)return finish(request.status,'',{Location:request.location});
    if(request.status!==200)return finish(request.status,'Not available');
    const candidate=path.resolve(absoluteRoot,request.relative);
    if(!within(absoluteRoot,candidate))return finish(403,'Not available');
    try{
      const canonicalRoot=await fs.realpath(absoluteRoot);
      let file=await fs.realpath(candidate);
      if(!within(canonicalRoot,file))return finish(403,'Not available');
      let stat=await fs.stat(file);
      if(stat.isDirectory()){
        if(!request.pathname.endsWith('/'))return finish(308,'',{Location:request.pathname+'/'});
        file=await fs.realpath(path.join(file,'index.html'));
        if(!within(canonicalRoot,file))return finish(403,'Not available');
        stat=await fs.stat(file);
      }
      if(!stat.isFile())return notFound();
      const body=req.method==='HEAD'?null:await fs.readFile(file);
      res.writeHead(200,{...headers,'Content-Type':MIME.get(path.extname(file).toLowerCase())||'application/octet-stream','Content-Length':stat.size,'Cache-Control':cacheControlFor(request.relative)});
      res.end(body);
    }catch(error){
      if(['ENOENT','ENOTDIR','EACCES','EPERM','ELOOP'].includes(error.code))return notFound();
      return finish(500,'Static asset unavailable');
    }
  });
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  const port=Number(process.env.PORT||3000);
  if(!Number.isInteger(port)||port<1||port>65535)throw new Error('PORT must be an integer from 1 through 65535');
  createStaticServer().listen(port,'0.0.0.0',()=>console.log('VC directory static export ready on port '+port));
}
