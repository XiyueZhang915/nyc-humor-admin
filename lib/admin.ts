import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
export async function requireAdmin() {
 const db = await createClient();
 const { data: { user }, error } = await db.auth.getUser();
 if (error || !user) redirect('/login');
 if (!user.app_metadata.providers?.includes('google')) redirect('/denied');
 const { data: profile, error: profileError } = await db.from('profiles').select('id,is_superadmin').eq('id',user.id).maybeSingle();
 if (profileError || profile?.is_superadmin !== true) redirect('/denied');
 return { db, user };
}
export async function rows(table: 'profiles'|'captions'|'generations'|'caption_votes') {
 const {db} = await requireAdmin();
 const all: Record<string, string | number | boolean | null>[] = [];
 for(let offset=0;;offset+=500) {
  const {data,error} = await db.from(table).select('*').order('id').range(offset,offset+499);
  if(error) throw new Error('Database read failed. Check the assignment 6 migration and permissions.');
  all.push(...data); if(data.length<500) return all;
 }
}
