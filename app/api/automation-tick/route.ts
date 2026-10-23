import { db, runAutomations, HttpError } from '@/lib/server';
import { getChatGPTUser } from '@/app/chatgpt-auth';
export const dynamic='force-dynamic';
// Service endpoint: production authorization is the owner-private Sites dispatch
// boundary. Do not broaden the Site audience without adding a dedicated service
// credential to this route. Dispatch consumes OAI-Sites-Authorization itself.
async function authorize(){
 const visitor=await getChatGPTUser();
 if(visitor){const member:any=await db().prepare('SELECT role FROM users WHERE id=? OR lower(email)=lower(?)').bind(visitor.userId,visitor.email).first();if(member?.role!=='Owner')throw new HttpError(403,'Owner access required.');}
 else if(import.meta.env.DEV)throw new HttpError(401,'Sign in for local automation testing.');
}
export async function POST(request:Request){try{const origin=request.headers.get('origin');if(origin&&origin!==new URL(request.url).origin)throw new HttpError(403,'Invalid origin');await authorize();const owners=await db().prepare("SELECT * FROM users WHERE role='Owner'").all();for(const owner of owners.results)await runAutomations(owner);const at=new Date().toISOString();for(const owner of owners.results)await db().prepare("UPDATE settings SET data=json_set(data,'$.lastScheduledRun',?) WHERE workspace=?").bind(at,String(owner.workspace)).run();return Response.json({ok:true,completedAt:at,workspacesProcessed:owners.results.length});}catch(e:any){return Response.json({error:e.status?e.message:'Automation run failed'},{status:e.status||500});}}
export async function GET(){try{await authorize();const rows=await db().prepare("SELECT json_extract(data,'$.lastScheduledRun') AS completedAt FROM settings").all();return Response.json({runs:rows.results.filter((r:any)=>r.completedAt)});}catch(e:any){return Response.json({error:e.status?e.message:'Unable to read scheduler status'},{status:e.status||500});}}
