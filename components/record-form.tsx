"use client";
import {useActionState,useId} from 'react';
import {mutateResource} from '@/app/(admin)/catalog/[resource]/actions';
import type {Resource} from '@/lib/resources';
import type {DataRow} from '@/lib/catalog';
export function RecordForm({resourceKey,resource,row,options,trash=false}:{resourceKey:string;resource:Resource;row?:DataRow;options:Record<string,{value:string;label:string}[]>;trash?:boolean}){
 const [state,action,pending]=useActionState(mutateResource,{});const prefix=useId();
 return <form action={action} className="record-form"><input type="hidden" name="resource" value={resourceKey}/>{row&&<input type="hidden" name="id" value={String(row.id)}/>}
 {!trash&&<div className="fields">{resource.fields.map(f=><label key={f.key} htmlFor={prefix+f.key} className={f.kind==='textarea'?'wide':f.kind==='checkbox'?'checkbox-field':''}>{f.kind==='checkbox'?<><input id={prefix+f.key} type="checkbox" name={f.key} defaultChecked={row?row[f.key]===true:true}/>{f.label}</>:<>{f.label}{f.required?' *':''}{f.kind==='textarea'?<textarea id={prefix+f.key} name={f.key} defaultValue={String(row?.[f.key]??'')} required={f.required} maxLength={f.max}/>:f.kind==='select'?<select id={prefix+f.key} name={f.key} defaultValue={String(row?.[f.key]??'')} required={f.required}><option value="">Choose {f.label.toLowerCase()}</option>{(options[f.relation??'']??[]).map(o=><option key={o.value} value={o.value}>{o.label}</option>)}</select>:<input id={prefix+f.key} name={f.key} type={f.kind==='number'?'number':f.kind==='email'?'email':f.kind==='url'?'url':'text'} min={f.min} max={f.kind==='number'?f.max:undefined} step={f.kind==='number'?'any':undefined} required={f.required} maxLength={f.kind==='number'?undefined:f.max} defaultValue={String(row?.[f.key]??'')}/>}</>}{f.help&&<small>{f.help}</small>}</label>)}</div>}
 <div className="actions">{trash?<button name="intent" value="restore" disabled={pending}>Restore record</button>:<><button name="intent" value={row?'update':'create'} disabled={pending}>{pending?'Saving…':row?'Save changes':`Create ${resource.singular.toLowerCase()}`}</button>{row&&resource.mode==='crud'&&<button name="intent" value="delete" className="danger" formNoValidate disabled={pending}>Move to Trash</button>}</>}</div>
 {state.error&&<p role="alert">{state.error}</p>}{state.success&&<p role="status">{state.success}</p>}
 </form>;
}
