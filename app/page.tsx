import Ledger from './ledger';
import { getChatGPTUser } from './chatgpt-auth';
export const dynamic='force-dynamic';
export default async function Page(){const u=await getChatGPTUser();return <Ledger initialUser={u?{id:u.userId,name:u.displayName}:null}/>;}
