import {NextResponse} from 'next/server';
import {createClient} from '@/lib/supabase/server';
export async function GET(request:Request){const url=new URL(request.url);const code=url.searchParams.get('code');let path='/login?error=callback';if(code){const db=await createClient();const {error}=await db.auth.exchangeCodeForSession(code);if(!error)path='/';}const response=NextResponse.redirect(new URL(path,url.origin));response.headers.set('Cache-Control','private, no-store');return response;}
