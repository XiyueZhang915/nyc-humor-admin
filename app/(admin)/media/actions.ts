"use server";
import {requireAdmin} from '@/lib/admin';
import {parseMoment,makePrompt,generateCaption,defaultGeminiModel} from '@/lib/humor';
import {revalidatePath} from 'next/cache';
export type State = {error?:string;success?:string};
export async function createMedia(_state:State,form:FormData):Promise<State>{
 const {db,user}=await requireAdmin();
 try{const moment=parseMoment(form);const key=process.env.GEMINI_API_KEY;if(!key)throw new Error('Configure the server Gemini key before creating media.');const prompt=makePrompt(moment);const model=process.env.GEMINI_MODEL||defaultGeminiModel;
 const {data:g,error}=await db.from('generations').insert({user_id:user.id,prompt,model}).select('id').single();if(error)throw new Error('Could not reserve generation. Wait 30 seconds between attempts; daily limit is 10.');
 const caption=await generateCaption(prompt,key,model);const {error:saveError}=await db.from('captions').insert({...moment,caption,generation_id:g.id});if(saveError)throw new Error('AI responded but publishing failed. Check database permissions.');
 revalidatePath('/');revalidatePath('/media');return {success:'AI caption generated and published.'};
 }catch(e){return {error:e instanceof Error?e.message:'Creation failed.'};}
}
export async function editMedia(_state:State,form:FormData):Promise<State>{
 const {db}=await requireAdmin();
 const id=String(form.get('id')||'');if(!/^[0-9a-f-]{36}$/i.test(id))return {error:'Invalid caption ID.'};
 if(form.get('intent')==='delete'){
  if(form.get('confirm')!=='on')return {error:'Confirm deletion first.'};
  const {data,error}=await db.from('captions').delete().eq('id',id).select('id');if(error||!data?.length)return {error:'Delete failed or caption no longer exists.'};
 }else{
  try{const moment=parseMoment(form);const caption=String(form.get('caption')||'').trim();if(!caption||caption.length>600)return {error:'Caption must contain 1–600 characters.'};const {data,error}=await db.from('captions').update({...moment,caption}).eq('id',id).select('id');if(error||!data?.length)return {error:'Update failed or caption no longer exists.'};}catch(e){return {error:e instanceof Error?e.message:'Invalid input.'};}
 }
 revalidatePath('/');revalidatePath('/media');revalidatePath('/ratings');return {success:'Saved.'};
}
