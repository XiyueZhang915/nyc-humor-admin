"use client";
import {useActionState,useId} from 'react';
import {saveImage} from '@/app/(admin)/images/actions';
import type {DataRow} from '@/lib/catalog';
export function ImageForm({row,trash=false}:{row?:DataRow;trash?:boolean}){
 const [state,action,pending]=useActionState(saveImage,{});const id=useId();
 return <form action={action} className="record-form">{row&&<input type="hidden" name="id" value={String(row.id)}/>}{!trash&&<><div className="fields"><label htmlFor={id+'filename'}>Image name *<input id={id+'filename'} name="filename" required maxLength={200} defaultValue={String(row?.filename??'')}/></label><label htmlFor={id+'alt'}>Alt text *<input id={id+'alt'} name="alt_text" required maxLength={500} defaultValue={String(row?.alt_text??'')}/></label><label className="wide" htmlFor={id+'description'}>Description<textarea id={id+'description'} name="description" maxLength={2000} defaultValue={String(row?.description??'')}/></label></div>{!row&&<label htmlFor={id+'file'}>Image file *<input id={id+'file'} type="file" name="file" accept="image/jpeg,image/png,image/webp" required/><small>JPG, PNG, WebP · maximum 5 MB · private storage</small></label>}</>}
 <div className="actions">{trash?<button name="intent" value="restore" disabled={pending}>Restore image</button>:<><button name="intent" value={row?'update':'upload'} disabled={pending}>{pending?'Saving…':row?'Save image details':'Upload image'}</button>{row&&<button className="danger" name="intent" value="delete" formNoValidate disabled={pending}>Move to Trash</button>}</>}</div>{state.error&&<p role="alert">{state.error}</p>}{state.success&&<p role="status">{state.success}</p>}</form>;
}
