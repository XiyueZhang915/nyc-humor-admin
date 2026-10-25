import {requireAdmin} from '@/lib/admin';
import {uuidPattern,type Resource} from '@/lib/resources';
export type DataRow=Record<string,string|number|boolean|null>;
export const pageSize=20;
export async function catalogRows(resource:Resource,page:number,query:string,trash:boolean,linked?:{chain?:string;request?:string}){
 const {db}=await requireAdmin();
 let req=db.from(resource.table).select('*',{count:'exact'});
 if(resource.mode==='crud')req=trash?req.not('deleted_at','is',null):req.is('deleted_at',null);
 if(linked?.chain&&uuidPattern.test(linked.chain)&&['prompt_chain_steps','prompt_chain_mix'].includes(resource.table))req=req.eq('prompt_chain_id',linked.chain);
 if(linked?.request&&uuidPattern.test(linked.request)&&resource.table==='llm_responses')req=req.eq('generation_id',linked.request);
 if(query&&resource.primary==='id'){if(!uuidPattern.test(query))return {rows:[],count:0,setup:false};req=req.eq('id',query);}
 else if(query){const safe=query.replace(/[\\%_]/g,'\\$&');req=req.ilike(resource.primary,`%${safe}%`);}
 req=resource.table==='prompt_chain_steps'?req.order('prompt_chain_id').order('position'):req.order('created_at',{ascending:false});
 const {data,error,count}=await req.order('id',{ascending:false}).range((page-1)*pageSize,page*pageSize-1);
 if(error){if(error.code==='42P01'||error.code==='PGRST205')return {rows:[],count:0,setup:true};throw new Error('Could not read this collection. Please retry.');}
 return {rows:data as DataRow[],count:count??0,setup:false};
}
export async function referenceOptions(){
 const {db}=await requireAdmin();
 const options:Record<string,{value:string;label:string}[]>={};
 for(const [key,table,label] of [['providers','llm_providers','name'],['models','llm_models','name'],['chains','prompt_chains','name'],['steps','prompt_chain_steps','name']] as const){
  const all: {value:string;label:string}[]=[];
  for(let offset=0;;offset+=500){const {data,error}=await db.from(table).select('*').order('id').range(offset,offset+499);if(error)break;all.push(...data.map(r=>({value:String(r.id),label:String(r[label])+(r.deleted_at?' (in trash)':'')})));if(data.length<500)break;}
  options[key]=all;
 }
 return options;
}
export function databaseMessage(code?:string,message?:string){
 if(code==='23505')return 'A record with this identifier already exists, possibly in Trash. Restore it or use a different value.';
 if(code==='23503')return 'This record refers to an item that no longer exists.';
 if(code==='23514')return 'A value does not meet the database constraints. Check the form and retry.';
 if(message?.includes('Keep at least one'))return 'Keep at least one enabled prompt chain with a positive weight.';
 if(code==='42501')return 'Your account no longer has permission for this operation.';
 return 'The database could not save this change. Please retry.';
}
