import Link from 'next/link';
import {requireAdmin} from '@/lib/admin';
import {signOut} from '@/app/auth/actions';
const groups=[
 {title:'The community',links:[['Overview','/'],['AI media','/media'],['People','/users'],['Ratings','/ratings'],['Images','/images']]},
 {title:'Generation pipeline',links:[['Prompt chains','/catalog/chains'],['Chain steps','/catalog/steps'],['Chain mix','/catalog/mix'],['Requests','/catalog/requests'],['LLM responses','/catalog/responses']]},
 {title:'Editorial catalog',links:[['Terms','/catalog/terms'],['AI examples','/catalog/examples'],['LLM models','/catalog/models'],['LLM providers','/catalog/providers']]},
 {title:'Signup lists',links:[['Allowed domains','/catalog/domains'],['Whitelisted emails','/catalog/emails']]},
];
export default async function AdminLayout({children}:{children:React.ReactNode}){
 const {user}=await requireAdmin();
 return <div className="shell"><aside><Link className="brand" href="/">THE HUMOR<br/><i>INDEX.</i><span>NEW YORK CITY · CONTROL ROOM</span></Link><nav aria-label="Admin navigation">{groups.map(g=><div className="nav-group" key={g.title}><span>{g.title}</span>{g.links.map(([label,href])=><Link href={href} key={href}>{label}</Link>)}</div>)}</nav><div className="account"><span className="dot"/> SUPERADMIN<p>{user.email}</p><form action={signOut}><button className="quiet">Sign out ↗</button></form></div></aside><main>{children}</main></div>;
}
