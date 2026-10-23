import { db, ensureDatabase, runAutomations, HttpError, settings } from '@/lib/server';
import { getChatGPTUser } from '@/app/chatgpt-auth';
export const dynamic='force-dynamic';
// Service endpoint: production authorization is the owner-private Sites dispatch
// boundary. Do not broaden the Site audience without adding a dedicated service
// credential to this route. Dispatch consumes OAI-Sites-Authorization itself.
async function authorize(){
 await ensureDatabase();
 const visitor=await getChatGPTUser();
 if(visitor){const member:any=await db().prepare('SELECT role FROM users WHERE id=? OR lower(email)=lower(?)').bind(visitor.userId,visitor.email).first();if(member?.role!=='Owner')throw new HttpError(403,'Owner access required.');}
 else if(process.env.NODE_ENV!=='production')throw new HttpError(401,'Sign in for local automation testing.');
}
export async function POST(request:Request){try{const origin=request.headers.get('origin');if(origin&&origin!==new URL(request.url).origin)throw new HttpError(403,'Invalid origin');await authorize();const owners=await db().prepare("SELECT * FROM users WHERE role='Owner'").all();for(const owner of owners.results)await runAutomations(owner);const at=new Date().toISOString();for(const owner of owners.results){const cfg=await settings(String(owner.workspace));await db().prepare('UPDATE settings SET data=? WHERE workspace=?').bind(JSON.stringify({...cfg,lastScheduledRun:at}),String(owner.workspace)).run();}return Response.json({ok:true,completedAt:at,workspacesProcessed:owners.results.length});}catch(e:any){return Response.json({error:e.status?e.message:'Automation run failed'},{status:e.status||500});}}
export async function GET(){try{await authorize();const entries=await db().prepare('SELECT data FROM settings').all();return Response.json({runs:entries.results.map((r:any)=>JSON.parse(r.data||'{}').lastScheduledRun).filter(Boolean).map((completedAt:any)=>({completedAt}))});}catch(e:any){return Response.json({error:e.status?e.message:'Unable to read scheduler status'},{status:e.status||500});}}
