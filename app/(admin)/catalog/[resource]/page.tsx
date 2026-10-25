import Link from 'next/link';
import {notFound} from 'next/navigation';
import {requireAdmin} from '@/lib/admin';
import {resourceFor} from '@/lib/resources';
import {catalogRows,referenceOptions,pageSize} from '@/lib/catalog';
import {RecordForm} from '@/components/record-form';
function label(key:string){return key.replaceAll('_',' ');}
export default async function CatalogPage({params,searchParams}:{params:Promise<{resource:string}>;searchParams:Promise<{q?:string;page?:string;trash?:string;id?:string;chain?:string;request?:string}>}){
 const {db}=await requireAdmin();const {resource:key}=await params;const resource=resourceFor(key);if(!resource)notFound();
 const filters=await searchParams;const q=(filters.q??'').slice(0,160);const page=Math.max(1,Math.min(100000,Number.parseInt(filters.page??'1')||1));const trash=resource.mode==='crud'&&filters.trash==='1';
 const [result,options]=await Promise.all([catalogRows(resource,page,q,trash,{chain:filters.chain,request:filters.request}),referenceOptions()]);
 let records=result.rows;
 if(filters.id&&/^[0-9a-f-]{36}$/i.test(filters.id)){const {data,error}=await db.from(resource.table).select('*').eq('id',filters.id);if(error)throw new Error('Could not read linked record.');records=data??[];}
 const href=(n:number)=>`/catalog/${key}?${new URLSearchParams({q,page:String(n),...(trash?{trash:'1'}:{}),...(filters.chain?{chain:filters.chain}:{}),...(filters.request?{request:filters.request}:{})})}`;
 return <><span className="eyebrow">EDITORIAL OPERATIONS / {resource.mode==='read'?'READ ONLY':resource.mode==='update'?'READ & UPDATE':'MANAGE COLLECTION'}</span><h1>{resource.title}.</h1><p className="intro">{resource.description}</p>
 {result.setup?<section className="panel"><h2>Database setup required</h2><p>Apply the Assignment 7 migration in the existing Supabase project, then refresh this page.</p></section>:<>
 <div className="collection-toolbar"><form method="get" className="search-form"><label>Search {label(resource.primary)}<input name="q" defaultValue={q} maxLength={160} placeholder={`Search ${resource.title.toLowerCase()}`}/></label>{trash&&<input type="hidden" name="trash" value="1"/>}<button>Search</button></form><div>{resource.mode==='crud'&&<><Link className={!trash?'pill selected':'pill'} href={`/catalog/${key}`}>Active</Link><Link className={trash?'pill selected':'pill'} href={`/catalog/${key}?trash=1`}>Trash</Link></>}</div></div>
 {resource.mode==='crud'&&!trash&&<details className="panel"><summary>Create {resource.singular.toLowerCase()}</summary><RecordForm resourceKey={key} resource={resource} options={options}/></details>}
 <p className="result-count">{filters.id?'Linked record':`${result.count} ${trash?'deleted ':''}records · Page ${page} of ${Math.max(1,Math.ceil(result.count/pageSize))}`}</p>
 {!records.length&&<section className="panel empty-state"><h2>{trash?'Nothing in Trash.':'No records found.'}</h2><p>{q?'Try another search.':resource.mode==='crud'?'Use the create form above to add a record.':'This collection will fill as the application records activity.'}</p></section>}
 {records.map(row=><details className="panel record-card" key={String(row.id)}><summary><span className="record-title">{String(row[resource.primary]??row.id).slice(0,100)}</span><span className="record-meta">{resource.columns.filter(c=>c!==resource.primary).map(c=>{const rel=resource.relations?.[c];const text=rel?options[rel]?.find(o=>o.value===row[c])?.label:row[c];return <span key={c}>{label(c)}: {text===null||text===undefined?'—':typeof text==='boolean'?(text?'Yes':'No'):String(text).slice(0,85)}</span>})}</span><span className="open-label">{resource.mode==='read'?'View details':'View / edit'} ↗</span></summary>
 <dl className="record-details">{Object.entries(row).map(([field,value])=><div key={field}><dt>{label(field)}</dt><dd>{resource.relations?.[field]&&value?<Link href={`/catalog/${resource.relations[field]}?id=${value}`}>{options[resource.relations[field]]?.find(o=>o.value===value)?.label??String(value)} ↗</Link>:field==='generation_id'&&value?<Link href={`/catalog/requests?id=${value}`}>{String(value)} ↗</Link>:String(value??'—')}</dd></div>)}</dl>
 {key==='chains'&&<Link className="pill" href={`/catalog/steps?chain=${row.id}`}>Browse ordered steps</Link>}
 {key==='requests'&&<Link className="pill" href={`/catalog/responses?request=${row.id}`}>View LLM responses ↗</Link>}
 {resource.mode!=='read'&&<RecordForm resourceKey={key} resource={resource} row={row} options={options} trash={trash}/>}
 </details>)}
 {!filters.id&&<nav className="pagination" aria-label="Collection pages">{page>1&&<Link className="pill" href={href(page-1)}>← Previous</Link>}{page*pageSize<result.count&&<Link className="pill" href={href(page+1)}>Next →</Link>}</nav>}
 </>}
 </>;
}
