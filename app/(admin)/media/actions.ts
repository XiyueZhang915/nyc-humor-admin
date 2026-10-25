"use server";
import {requireAdmin} from '@/lib/admin';
import {parseMoment,generateCaption} from '@/lib/humor';
import {loadPipeline} from '@/lib/pipeline';
import {revalidatePath} from 'next/cache';
export type State = {error?:string;success?:string};
export async function createMedia(_state:State,form:FormData):Promise<State>{
 const {db,user}=await requireAdmin();
 try{
  const moment=parseMoment(form);const key=process.env.GEMINI_API_KEY;
  if(!key)throw new Error('Configure the server Gemini key before creating media.');
  const plan=await loadPipeline(db);
  const render=(template:string,previous:string)=>template.replaceAll('{{moment}}',JSON.stringify(moment)).replaceAll('{{previous_output}}',JSON.stringify(previous));
  const prompt=render(plan.steps[0].template,'');
  if(prompt.length<10||prompt.length>5000)throw new Error('The first step prompt must contain 10–5000 characters.');
  const {data:g,error}=await db.from('generations').insert({user_id:user.id,prompt,model:plan.steps[0].model,prompt_chain_id:plan.chainId}).select('id').single();
  if(error)throw new Error('Could not reserve generation. Wait 30 seconds between attempts; daily limit is 10.');
  let caption='';
  for(const step of plan.steps){
   const stepPrompt=render(step.template,caption);const started=Date.now();
   try{
    caption=await generateCaption(stepPrompt,key,step.model);
   }catch(e){
    const message=e instanceof Error?e.message:'Generation failed.';
    const {error:logError}=await db.from('llm_responses').insert({generation_id:g.id,prompt_chain_step_id:step.id,model_key:step.model,prompt_text:stepPrompt,status:'failed',error_message:message,latency_ms:Date.now()-started});
    if(logError)throw new Error(`${message} The response audit could not be saved.`);
    revalidatePath('/catalog/requests');revalidatePath('/catalog/responses');throw e;
   }
   const {error:logError}=await db.from('llm_responses').insert({generation_id:g.id,prompt_chain_step_id:step.id,model_key:step.model,prompt_text:stepPrompt,status:'succeeded',output_text:caption,latency_ms:Date.now()-started});
   if(logError)throw new Error('AI responded, but its response audit could not be saved. No caption was published.');
  }
  const {error:saveError}=await db.from('captions').insert({...moment,caption,generation_id:g.id});
  if(saveError)throw new Error('AI responded but publishing failed. The request and response remain available for inspection.');
  for(const path of ['/','/media','/catalog/requests','/catalog/responses'])revalidatePath(path);
  return {success:'AI caption generated and published. Request and response recorded.'};
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
