"use server";
import {requireAdmin} from '@/lib/admin';
import {resourceFor,parseResource,uuidPattern} from '@/lib/resources';
import {databaseMessage} from '@/lib/catalog';
import {revalidatePath} from 'next/cache';
export type MutationState={error?:string;success?:string};
export async function mutateResource(_state:MutationState,form:FormData):Promise<MutationState>{
 const {db}=await requireAdmin();
 const key=String(form.get('resource')??'');const resource=resourceFor(key);
 if(!resource||resource.mode==='read')return {error:'This collection is read-only.'};
 const intent=String(form.get('intent')??'');
 if(!['create','update','delete','restore'].includes(intent)||(resource.mode==='update'&&intent!=='update'))return {error:'This operation is not allowed.'};
 const id=String(form.get('id')??'');if(intent!=='create'&&!uuidPattern.test(id))return {error:'Invalid record ID.'};
 try{
  const values=intent==='delete'?{deleted_at:new Date().toISOString()}:intent==='restore'?{deleted_at:null}:parseResource(resource,form);
  const req=intent==='create'?db.from(resource.table).insert(values):db.from(resource.table).update(values).eq('id',id);
  const {data,error}=await req.select('id');if(error)return {error:databaseMessage(error.code,error.message)};if(!data?.length)return {error:'Record not found, or your access has changed. Refresh the page.'};
  revalidatePath(`/catalog/${key}`);revalidatePath('/');return {success:intent==='delete'?'Moved to Trash. You can restore it from the Trash view.':intent==='restore'?'Restored.':intent==='create'?'Created.':'Changes saved.'};
 }catch(e){return {error:e instanceof Error?e.message:'Could not save.'};}
}
