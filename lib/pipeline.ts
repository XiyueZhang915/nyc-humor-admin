import type {SupabaseClient} from '@supabase/supabase-js';
import {chooseWeighted} from '@/lib/pipeline-selection';
export async function loadPipeline(db:SupabaseClient){
 const {data:mix,error}=await db.from('prompt_chain_mix').select('prompt_chain_id,weight').eq('enabled',true).gt('weight',0).order('id');
 if(error)throw new Error('The prompt pipeline is unavailable. Apply the Assignment 7 migration and retry.');
 const selected=chooseWeighted(mix??[],Math.random());
 const {data:steps,error:stepError}=await db.from('prompt_chain_steps').select('*').eq('prompt_chain_id',selected.prompt_chain_id).order('position');
 if(stepError||!steps?.length)throw new Error('This prompt chain has no readable steps.');
 const plan=[];
 for(const step of steps){
  const {data:model,error:modelError}=await db.from('llm_models').select('*').eq('id',step.llm_model_id).eq('enabled',true).is('deleted_at',null).maybeSingle();
  if(modelError||!model)throw new Error('A chain step references a disabled or deleted model. Restore it in LLM models.');
  const {data:provider,error:providerError}=await db.from('llm_providers').select('*').eq('id',model.provider_id).eq('enabled',true).is('deleted_at',null).maybeSingle();
  if(providerError||!provider)throw new Error('A chain step references a disabled or deleted provider. Restore it in LLM providers.');
  if(provider.base_url!=='https://generativelanguage.googleapis.com')throw new Error('The current generator supports the Google Gemini adapter only. Other providers are catalog records.');
  plan.push({id:String(step.id),template:String(step.prompt_template),model:String(model.model_key)});
 }
 return {chainId:String(selected.prompt_chain_id),steps:plan};
}
