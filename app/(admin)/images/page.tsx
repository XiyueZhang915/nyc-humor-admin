/* eslint-disable @next/next/no-img-element */
import Link from 'next/link';
import {requireAdmin} from '@/lib/admin';
import {ImageForm} from '@/components/image-form';
import {catalogRows,type DataRow} from '@/lib/catalog';
import type {Resource} from '@/lib/resources';
const config:Resource={table:'images',title:'Images',singular:'Image',description:'',mode:'crud',primary:'filename',columns:[],fields:[]};
export default async function Images({searchParams}:{searchParams:Promise<{trash?:string;page?:string;q?:string}>}){
 const {db}=await requireAdmin();const f=await searchParams;const trash=f.trash==='1';const page=Math.max(1,Math.min(100000,Number.parseInt(f.page??'1')||1));const q=(f.q??'').slice(0,160);const result=await catalogRows(config,page,q,trash);
 const images=await Promise.all(result.rows.map(async(row:DataRow)=>{if(trash)return {row,url:null,error:false};const {data,error}=await db.storage.from('admin-media').createSignedUrl(String(row.storage_path),300);return {row,url:data?.signedUrl??null,error:Boolean(error)};}));
 const href=(n:number)=>`/images?${new URLSearchParams({q,page:String(n),...(trash?{trash:'1'}:{})})}`;
 return <><span className="eyebrow">EDITORIAL ASSETS / PRIVATE LIBRARY</span><h1>Images.</h1><p className="intro">Upload and manage private image assets. Previews expire after five minutes; refresh to renew them. Deleted images remain recoverable in Trash.</p><div className="collection-toolbar"><form className="search-form"><label>Search image name<input name="q" defaultValue={q} maxLength={160}/></label>{trash&&<input type="hidden" name="trash" value="1"/>}<button>Search</button></form><div><Link className={!trash?'pill selected':'pill'} href="/images">Active</Link><Link className={trash?'pill selected':'pill'} href="/images?trash=1">Trash</Link></div></div>
 {result.setup?<section className="panel">Apply the Assignment 7 database and storage migrations.</section>:<>{!trash&&<details className="panel"><summary>Upload a new image</summary><ImageForm/></details>}<p>{result.count} {trash?'deleted ':''}images · Page {page}</p><div className="image-grid">{images.map(({row,url,error})=><article key={String(row.id)} className="panel image-card">{url&&<a href={url} target="_blank" rel="noreferrer"><img src={url} alt={String(row.alt_text)} loading="lazy"/></a>}{error&&<p role="alert">Preview unavailable. Refresh to retry.</p>}<h2>{String(row.filename)}</h2><small>{String(row.mime_type)} · {Math.round(Number(row.byte_size)/1024)} KB</small><ImageForm row={row} trash={trash}/></article>)}</div>{!images.length&&<section className="panel"><h2>{trash?'Nothing in Trash.':'No images yet.'}</h2></section>}<nav className="pagination" aria-label="Image pages">{page>1&&<Link className="pill" href={href(page-1)}>← Previous</Link>}{page*20<result.count&&<Link className="pill" href={href(page+1)}>Next →</Link>}</nav></>}
 </>;
}
