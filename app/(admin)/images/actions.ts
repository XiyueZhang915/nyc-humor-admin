"use server";
import {requireAdmin} from '@/lib/admin';
import {imageExtension} from '@/lib/image-validation';
import {uuidPattern} from '@/lib/resources';
import {databaseMessage} from '@/lib/catalog';
import {revalidatePath} from 'next/cache';
export type ImageState={error?:string;success?:string};
export async function saveImage(_state:ImageState,form:FormData):Promise<ImageState>{
 const {db}=await requireAdmin();const intent=String(form.get('intent')??'');const id=String(form.get('id')??'');
 if(!['upload','update','delete','restore'].includes(intent))return {error:'Invalid operation.'};
 if(intent!=='upload'&&!uuidPattern.test(id))return {error:'Invalid image ID.'};
 try{
  if(intent==='delete'||intent==='restore'){
   const {data,error}=await db.from('images').update({deleted_at:intent==='delete'?new Date().toISOString():null}).eq('id',id).select('id');if(error)return {error:databaseMessage(error.code,error.message)};if(!data?.length)return {error:'Image not found.'};
  }else{
   const filename=String(form.get('filename')??'').trim();const alt_text=String(form.get('alt_text')??'').trim();const description=String(form.get('description')??'').trim();
   if(!filename||filename.length>200||!alt_text||alt_text.length>500||description.length>2000)return {error:'Add a name (1–200 characters), alt text (1–500), and description up to 2000 characters.'};
   if(intent==='upload'){
    const file=form.get('file');if(!(file instanceof File)||file.size<1||file.size>5242880)return {error:'Choose an image up to 5 MB.'};
    const bytes=new Uint8Array(await file.arrayBuffer());const ext=imageExtension(bytes,file.type);const imageId=crypto.randomUUID();const path=`images/${imageId}.${ext}`;
    const {error:uploadError}=await db.storage.from('admin-media').upload(path,bytes,{contentType:file.type,upsert:false});if(uploadError)return {error:'Upload failed. Check the private bucket configuration and retry.'};
    const {error}=await db.from('images').insert({id:imageId,storage_path:path,filename,alt_text,description,mime_type:file.type,byte_size:file.size});
    if(error){await db.storage.from('admin-media').remove([path]);return {error:databaseMessage(error.code,error.message)};}
   }else{const {data,error}=await db.from('images').update({filename,alt_text,description}).eq('id',id).select('id');if(error)return {error:databaseMessage(error.code,error.message)};if(!data?.length)return {error:'Image not found.'};}
  }
  revalidatePath('/images');return {success:intent==='delete'?'Moved to Trash. The private file is retained so you can restore it.':intent==='restore'?'Image restored.':'Image saved.'};
 }catch(e){return {error:e instanceof Error?e.message:'Could not save the image.'};}
}
