import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';
import {parseResource,resourceFor} from '../lib/resources.ts';
import {imageExtension} from '../lib/image-validation.ts';
import {chooseWeighted} from '../lib/pipeline-selection.ts';

test('server-side resource validation rejects malformed payloads and normalizes access lists',()=>{
 const parse=(key,values)=>{const f=new FormData();for(const [k,v] of Object.entries(values))f.set(k,v);return parseResource(resourceFor(key),f);};
 assert.equal(parse('domains',{domain:'Columbia.EDU',enabled:'on'}).domain,'columbia.edu');
 assert.equal(parse('emails',{email:' XZ3570@COLUMBIA.EDU '}).email,'xz3570@columbia.edu');
 assert.throws(()=>parse('domains',{domain:'https://columbia.edu'}));
 assert.throws(()=>parse('emails',{email:'bad@address'}));
 assert.throws(()=>parse('mix',{weight:'NaN'}));
 assert.throws(()=>parse('mix',{weight:'10001'}));
 assert.throws(()=>parse('providers',{name:'Example',base_url:'http://localhost'}));
 assert.throws(()=>parse('providers',{name:'Example',base_url:'https://example.com?api_key=secret'}));
 assert.equal(resourceFor('__proto__'),undefined);assert.equal(resourceFor('profiles'),undefined);
 const allowed=parse('terms',{term:'Test',definition:'Meaning',id:'forged',is_superadmin:'true'});
 assert.deepEqual(Object.keys(allowed),['term','definition','example']);
});
test('private upload signatures and weighted pipeline selection',()=>{
 assert.equal(imageExtension(Uint8Array.from([137,80,78,71,13,10,26,10]),'image/png'),'png');
 assert.throws(()=>imageExtension(new TextEncoder().encode('<svg onload="x()"/>'),'image/png'));
 assert.throws(()=>imageExtension(Uint8Array.from([255,216,255]),'image/webp'));
 const mix=[{id:'a',weight:1},{id:'b',weight:3}];
 assert.equal(chooseWeighted(mix,0).id,'a');assert.equal(chooseWeighted(mix,.24).id,'a');assert.equal(chooseWeighted(mix,.25).id,'b');assert.equal(chooseWeighted(mix,.999).id,'b');
 assert.throws(()=>chooseWeighted([],0));assert.throws(()=>chooseWeighted([{weight:-1}],0));
});

test('Assignment 7 migrations: real PostgreSQL RLS, CRUD, private storage, response provenance and mix constraints',async()=>{
 const db=new PGlite();const admin='11111111-1111-4111-8111-111111111111',member='22222222-2222-4222-8222-222222222222';
 const tables=['llm_providers','llm_models','prompt_chains','prompt_chain_steps','prompt_chain_mix','terms','ai_generation_examples','allowed_signup_domains','whitelisted_email_addresses','images','llm_responses'];
 const as=async(user,provider='google')=>{await db.exec('reset role');await db.query("select set_config('request.jwt.claim.sub',$1,false),set_config('test.provider',$2,false)",[user??'',provider]);await db.exec(user?'set role authenticated':'set role anon');};
 try{
 await db.exec(`create role anon;create role authenticated;create schema auth;create schema storage;
 create table auth.users(id uuid primary key);
 create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
 create function auth.jwt() returns jsonb language sql stable as $$select jsonb_build_object('app_metadata',jsonb_build_object('providers',jsonb_build_array(coalesce(nullif(current_setting('test.provider',true),''),'google'))))$$;
 grant usage on schema public,auth,storage to anon,authenticated;
 create table public.profiles(id uuid primary key references auth.users,first_name text,last_name text,avatar_path text);
 alter table public.profiles enable row level security;
 grant select,insert,update on public.profiles to authenticated;
 create policy own_read on public.profiles for select to authenticated using(id=auth.uid());
 create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
 create table storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text,name text);
 alter table storage.objects enable row level security;grant select,insert,delete on storage.objects to anon,authenticated;
 insert into auth.users values('${admin}'),('${member}');insert into public.profiles(id) values('${admin}'),('${member}');`);
 for(const file of ['assignment4.sql','assignment6.sql'])await db.exec(await readFile(new URL('../supabase/'+file,import.meta.url),'utf8'));
 const migration=await readFile(new URL('../supabase/assignment7.sql',import.meta.url),'utf8');
 const storage=await readFile(new URL('../supabase/assignment7-storage.sql',import.meta.url),'utf8');
 await db.exec(migration);await db.exec(storage);await db.exec(migration);await db.exec(storage);
 await db.exec(`update public.profiles set is_superadmin=true where id='${admin}'`);
 await as(null);for(const table of [...tables,'generation_requests'])await assert.rejects(db.query(`select * from public.${table}`),/permission denied/);
 await as(member);for(const table of tables)assert.equal((await db.query(`select * from public.${table}`)).rows.length,0,table);
 assert.equal((await db.query('select * from public.generation_requests')).rows.length,0);
 await assert.rejects(db.exec("insert into public.terms(term,definition) values('x','y')"),/row-level security/);
 assert.equal((await db.query('update public.prompt_chain_mix set weight=1 returning id')).rows.length,0);
 await assert.rejects(db.exec("insert into storage.objects(bucket_id,name) values('admin-media','images/x.png')"),/row-level security/);
 await as(admin,'email');assert.equal((await db.query('select * from public.llm_models')).rows.length,0);
 await as(admin);
 const provider=(await db.query("insert into public.llm_providers(name,base_url) values('Test provider','https://example.com') returning id")).rows[0].id;
 const inserts=[
  ['llm_models','provider_id,name,model_key',[provider,'Test model','test-model']],
  ['terms','term,definition',['Test term','A definition']],
  ['ai_generation_examples','title,input_text,output_text',['Test example','A specific input','A specific output']],
  ['allowed_signup_domains','domain',['example.edu']],
  ['whitelisted_email_addresses','email',['test@example.edu']]
 ];
 for(const [table,columns,values] of inserts){const placeholders=values.map((_,i)=>'$'+(i+1)).join(',');const id=(await db.query(`insert into public.${table}(${columns}) values(${placeholders}) returning id`,values)).rows[0].id;
  assert.equal((await db.query(`update public.${table} set deleted_at=now() where id=$1 returning id`,[id])).rows.length,1);
  assert.equal((await db.query(`update public.${table} set deleted_at=null where id=$1 returning id`,[id])).rows.length,1);
  await assert.rejects(db.query(`delete from public.${table} where id=$1`,[id]),/permission denied/);
 }
 await db.query('update public.llm_providers set deleted_at=now() where id=$1',[provider]);await db.query('update public.llm_providers set deleted_at=null where id=$1',[provider]);
 await assert.rejects(db.exec("insert into public.allowed_signup_domains(domain) values('not a domain')"),/check constraint/);
 await assert.rejects(db.exec("insert into public.whitelisted_email_addresses(email) values('not an email')"),/check constraint/);
 for(const table of ['prompt_chains','prompt_chain_steps']){await assert.rejects(db.exec(`update public.${table} set name='forged'`),/permission denied/);await assert.rejects(db.exec(`delete from public.${table}`),/permission denied/);}
 await db.exec('update public.prompt_chain_mix set weight=37');
 await assert.rejects(db.exec('update public.prompt_chain_mix set enabled=false'),/Keep at least one/);
 await assert.rejects(db.exec('update public.prompt_chain_mix set weight=-1'),/check constraint/);
 const image=(await db.query("insert into public.images(id,storage_path,filename,alt_text,mime_type,byte_size) values(gen_random_uuid(),'images/test.png','Test image','An example','image/png',100) returning id,created_by")).rows[0];assert.equal(image.created_by,admin);
 await db.query('update public.images set alt_text=$1,deleted_at=now() where id=$2',['Updated alt',image.id]);await db.query('update public.images set deleted_at=null where id=$1',[image.id]);
 await assert.rejects(db.exec(`update public.images set created_by='${member}'`),/permission denied/);
 await db.exec("insert into storage.objects(bucket_id,name) values('admin-media','images/test.png')");
 assert.equal((await db.query("select * from storage.objects where bucket_id='admin-media'")).rows.length,1);
 await db.exec('reset role');assert.equal((await db.query("select public from storage.buckets where id='admin-media'")).rows[0].public,false);await as(admin);
 const generation=(await db.query('insert into public.generations(user_id,prompt,model) values($1,$2,$3) returning id',[admin,'A sufficiently long original prompt','test-model'])).rows[0].id;
 const caption=(await db.query("insert into public.captions(generation_id,place,category,experience,caption) values($1,'Butler','Around campus','A sufficiently long story','Real output') returning id",[generation])).rows[0].id;
 let response=(await db.query('select * from public.llm_responses where generation_id=$1',[generation])).rows[0];assert.equal(response.output_text,'Real output');assert.equal(response.source,'published_caption');assert.equal(response.latency_ms,null);
 await db.query("update public.captions set caption='Edited copy' where id=$1",[caption]);response=(await db.query('select * from public.llm_responses where generation_id=$1',[generation])).rows[0];assert.equal(response.output_text,'Real output');
 await assert.rejects(db.exec("update public.llm_responses set output_text='forged'"),/permission denied/);
 await as(member);assert.equal((await db.query('select * from public.llm_responses')).rows.length,0);assert.equal((await db.query('select * from storage.objects')).rows.length,0);
 }finally{await db.close();}
});
