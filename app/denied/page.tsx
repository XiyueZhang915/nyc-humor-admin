import {signOut} from '@/app/auth/actions';
export default function Denied(){return <main className="gate"><span className="eyebrow">ACCESS RESTRICTED</span><h1>Staff only.</h1><p>Your account does not have administrator access. Ask the database owner to verify your Google account and enable profiles.is_superadmin.</p><form action={signOut}><button>Sign out</button></form></main>}
