import Link from 'next/link';
import {requireAdmin} from '@/lib/admin';
import {signOut} from '@/app/auth/actions';
export default async function AdminLayout({children}:{children:React.ReactNode}) {const {user}=await requireAdmin();return <div className="shell"><aside><Link className="brand" href="/">THE HUMOR<br/><i>INDEX.</i><span>NEW YORK CITY · CONTROL ROOM</span></Link><nav><Link href="/">01 / Overview</Link><Link href="/media">02 / AI media</Link><Link href="/users">03 / People</Link><Link href="/ratings">04 / Ratings</Link></nav><div className="account"><span className="dot"/> SUPERADMIN<p>{user.email}</p><form action={signOut}><button className="quiet">Sign out ↗</button></form></div></aside><main>{children}</main></div>}
