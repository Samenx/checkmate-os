import { neon } from '@neondatabase/serverless';
import { getChatGPTUser } from '@/app/chatgpt-auth';
import { defaultSettings, definitions, dateOffset, today } from './config';
export const tableNames:Record<string,string>={organizations:'organizations',contacts:'contacts',leads:'leads',stages:'stages',deals:'deals',events:'events',tasks:'tasks',activities:'activities',participants:'participants',checklists:'checklists',inventory:'inventory',allocations:'allocations',proposals:'proposals',payments:'payments',expenses:'expenses',documents:'documents',notifications:'notifications',automations:'automations',automationLogs:'automation_logs',goals:'goals',campaigns:'campaigns',auditLogs:'audit_logs'};
const shared=['id','workspace','name','status','owner','demo','createdAt','updatedAt','data'];
const specific:Record<string,string[]>={organizations:['type','city','email','phone'],contacts:['organizationId','email','phone'],leads:['organizationId','contactId','email','phone','city','type','source','value','dueDate','lastContact'],stages:['probability','position','color'],deals:['organizationId','contactId','leadId','value','probability','dueDate'],events:['organizationId','dealId','dueDate','endDate','venue','value','budget','participants','type'],tasks:['organizationId','leadId','dealId','eventId','dueDate'],activities:['organizationId','leadId','dealId','eventId','dueDate','type'],participants:['eventId','organizationId'],checklists:['eventId','dueDate'],inventory:['type','quantity','value'],allocations:['eventId','inventoryId','quantity'],proposals:['organizationId','dealId','dueDate','value'],payments:['eventId','value','dueDate'],expenses:['eventId','value','dueDate','type'],documents:['organizationId','leadId','dealId','eventId','key','mime','size'],notifications:['dueDate'],automations:['type','days'],automationLogs:['ruleId','dedupe'],goals:['type','value','dueDate'],campaigns:['city'],auditLogs:['type']};
export const snake=(s:string)=>s.replace(/[A-Z]/g,c=>'_'+c.toLowerCase());
export const decode=(r:any)=>{const out:any={};for(const [k,v] of Object.entries(r))out[k.replace(/_([a-z])/g,(_,c)=>c.toUpperCase())]=v;return {...JSON.parse(out.data||'{}'),...out,data:undefined};};
const connectionString=process.env.DATABASE_URL||process.env.POSTGRES_URL;
let client:any;
const sql=()=>{if(!connectionString)throw new Error('Database unavailable. Connect a Postgres database in Vercel Storage and redeploy.');return client||(client=neon(connectionString));};
const postgres=(query:string)=>{const ignore=/INSERT OR IGNORE INTO/i.test(query);let parameter=0;const converted=query.replace(/INSERT OR IGNORE INTO/gi,'INSERT INTO').replace(/\?/g,()=>`$${++parameter}`);return ignore?`${converted} ON CONFLICT DO NOTHING`:converted;};
const statement=(query:string,params:any[]=[]):any=>({query,params,bind(...values:any[]){return statement(query,values);},async all(){const results=await sql().query(postgres(query),params);return {results};},async first<T=any>(){const results=await sql().query(postgres(query),params);return (results[0]||null) as T|null;},async run(){await sql().query(postgres(query),params);return {success:true};}});
export const db=()=>({prepare:(query:string)=>statement(query),batch:async(statements:any[])=>{for(const s of statements)await s.run();return {success:true};}});
const schema:Record<string,string[]>=Object.fromEntries(Object.entries(specific).map(([table,fields])=>[table,fields]));
let schemaReady:Promise<void>|undefined;
export async function ensureDatabase(){if(schemaReady)return schemaReady;schemaReady=(async()=>{const type=(field:string)=>['quantity','participants','days','position','size'].includes(field)?'integer':['value','probability','budget'].includes(field)?'double precision':'text';for(const [entity,fields] of Object.entries(schema)){const table=tableNames[entity]||entity;const columns=['id text primary key','workspace text not null','name text not null',"status text not null default 'New'","owner text not null default ''",'demo integer not null default 0','created_at text not null','updated_at text not null',"data text not null default '{}'"];for(const field of fields)if(!columns.some(c=>c.startsWith(field.replace(/[A-Z]/g,c=>'_'+c.toLowerCase())+' ')))columns.push(`${field.replace(/[A-Z]/g,c=>'_'+c.toLowerCase())} ${type(field)}`);await sql().query(`CREATE TABLE IF NOT EXISTS ${table} (${columns.join(',')})`);}await sql().query('CREATE TABLE IF NOT EXISTS quotation_items (id text primary key, workspace text not null, name text not null, status text not null, owner text not null, demo integer not null default 0, created_at text not null, updated_at text not null, data text not null default \'{}\', proposal_id text not null, quantity double precision default 1, value double precision default 0)');await sql().query('CREATE TABLE IF NOT EXISTS users (id text primary key, workspace text not null, email text not null, name text not null, role text not null default \'Owner\')');await sql().query('CREATE TABLE IF NOT EXISTS settings (id text primary key, workspace text not null, data text not null)');await sql().query('CREATE UNIQUE INDEX IF NOT EXISTS user_workspace_email ON users(workspace,email)');await sql().query('CREATE UNIQUE INDEX IF NOT EXISTS automation_dedupe ON automation_logs(workspace,dedupe)');})();return schemaReady;}
export const id=()=>crypto.randomUUID();
export async function identity(){
 await ensureDatabase();
 const u=await getChatGPTUser();if(!u)throw new HttpError(401,'Sign in to access CheckMate OS.');
 let member:any=await db().prepare('SELECT * FROM users WHERE id = ? OR lower(email) = lower(?) LIMIT 1').bind(u.userId,u.email).first();
 if(!member){member={id:u.userId,workspace:u.userId,email:u.email,name:u.fullName||'Owner',role:'Owner'};await db().prepare('INSERT INTO users(id,workspace,email,name,role) VALUES(?,?,?,?,?)').bind(member.id,member.workspace,member.email,member.name,member.role).run();}
 return member;
}
export class HttpError extends Error{constructor(public status:number,message:string){super(message);}}
export function allowed(user:any,entity:string,record?:any,write=false){
 if(user.role==='Owner')return true;
 if(['settings','users','auditLogs','automations','automationLogs'].includes(entity))return false;
 if(user.role==='Manager')return !['payments'].includes(entity)||!write;
 if(user.role==='Sales')return ['leads','contacts','organizations','deals','tasks','activities','proposals','documents','notifications','stages'].includes(entity)&&(!record||record.owner===user.email||record.owner===user.id);
 if(user.role==='Event Staff')return ['events','participants','checklists','tasks','allocations','inventory','documents','notifications'].includes(entity)&&(!record||record.owner===user.email||record.owner===user.id);
 return false;
}
export async function rows(entity:string,workspace:string){if(!Object.hasOwn(tableNames,entity))throw new HttpError(400,'Unknown record type');const r=await db().prepare(`SELECT * FROM ${tableNames[entity]} WHERE workspace = ? ORDER BY created_at DESC`).bind(workspace).all();return r.results.map(decode);}
export async function getRecord(entity:string,recordId:string,workspace:string){if(!Object.hasOwn(tableNames,entity))throw new HttpError(400,'Unknown record type');const r=await db().prepare(`SELECT * FROM ${tableNames[entity]} WHERE id = ? AND workspace = ?`).bind(recordId,workspace).first();if(!r)throw new HttpError(404,'Record not found');return decode(r);}
export function insert(entity:string,record:any){
 const columns=[...shared,...specific[entity]];const extra:any={};for(const [k,v] of Object.entries(record))if(!columns.includes(k))extra[k]=v;
 const r={...record,data:JSON.stringify(extra)};const keys=columns.filter(k=>r[k]!==undefined);return db().prepare(`INSERT INTO ${tableNames[entity]} (${keys.map(snake).join(',')}) VALUES (${keys.map(()=>'?').join(',')})`).bind(...keys.map(k=>r[k]));
}
export function base(workspace:string,name:string,status='New',extra:any={}){const now=new Date().toISOString();return {id:id(),workspace,name,status,owner:'',demo:0,createdAt:now,updatedAt:now,...extra};}
export function audit(user:any,action:string,entity:string,record:any){return insert('auditLogs',base(user.workspace,`${action}: ${record.name}`,'Recorded',{owner:user.email,type:entity,recordId:record.id,actor:user.email}));}
export async function settings(workspace:string){const r:any=await db().prepare('SELECT data FROM settings WHERE workspace=?').bind(workspace).first();return {...defaultSettings,...JSON.parse(r?.data||'{}')};}
export async function validate(user:any,entity:string,r:any){
 if(typeof r.name!=='string'||!r.name.trim()||r.name.length>300)throw new HttpError(400,'Enter a name of 1–300 characters.');
 for(const field of ['value','quantity','participants','budget','probability','discount','days','score'])if(r[field]!==undefined&&r[field]!==null&&(!Number.isFinite(Number(r[field]))||Number(r[field])<0))throw new HttpError(400,`${field} must be a nonnegative number.`);
 if(Number(r.probability)>100||Number(r.score)>100)throw new HttpError(400,'Percentages must be 0–100.');
 if(r.quantity!=null&&!Number.isInteger(Number(r.quantity)))throw new HttpError(400,'Quantity must be a whole number.');
 if(r.email&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(r.email))throw new HttpError(400,'Enter a valid email address.');
 for(const k of ['dueDate','endDate','lastContact'])if(r[k]&&!/^\d{4}-\d{2}-\d{2}$/.test(r[k]))throw new HttpError(400,'Use a valid date.');
 const refs:Record<string,string>={organizationId:'organizations',contactId:'contacts',leadId:'leads',dealId:'deals',eventId:'events',inventoryId:'inventory'};
 for(const [key,table] of Object.entries(refs))if(r[key]){const linked=await getRecord(table,r[key],user.workspace);if(!allowed(user,table,linked))throw new HttpError(403,'You cannot link this record.');}
 if(entity==='deals'&&r.status==='Closed Lost'&&!r.lossReason?.trim())throw new HttpError(400,'Please record a reason for the lost deal.');
 if(entity==='events'&&r.endDate&&r.dueDate&&r.endDate<r.dueDate)throw new HttpError(400,'End date cannot precede start date.');
 if(['participants','allocations','payments','checklists'].includes(entity)&&!r.eventId)throw new HttpError(400,'Select an event.');
 if(entity==='allocations'&&(!r.inventoryId||Number(r.quantity)<1))throw new HttpError(400,'Select equipment and a quantity of at least 1.');
 if(entity==='proposals'){
  if(!Array.isArray(r.items)||!r.items.length)throw new HttpError(400,'Add at least one quotation line item.');
  if(r.items.some((i:any)=>!i.name?.trim()||!Number.isFinite(Number(i.quantity))||Number(i.quantity)<=0||!Number.isFinite(Number(i.price))||Number(i.price)<0))throw new HttpError(400,'Line items need a description, positive quantity, and nonnegative price.');
  const subtotal=r.items.reduce((s:number,i:any)=>s+Number(i.quantity)*Number(i.price),0);if(Number(r.discount||0)>subtotal)throw new HttpError(400,'Discount exceeds subtotal.');r.value=Math.round((subtotal-Number(r.discount||0))*1000)/1000;
 }
 if(entity==='leads'&&!r.allowDuplicate){const all=await rows('leads',user.workspace);const normal=(v:any)=>String(v||'').toLowerCase().replace(/[^\p{L}\p{N}]/gu,'');if(all.some((l:any)=>l.id!==r.id&&((normal(l.name)===normal(r.name))||(r.email&&normal(l.email)===normal(r.email))||(r.phone&&normal(l.phone)===normal(r.phone)))))throw new HttpError(409,'Potential duplicate lead: name, email, or phone already exists.');}
 if(entity==='organizations'){const normalized=r.name.trim().toLowerCase();if((await rows('organizations',user.workspace)).some((o:any)=>o.id!==r.id&&o.name.trim().toLowerCase()===normalized))throw new HttpError(409,'An organization with this name already exists. Link the existing organization.');}
 const config=await settings(user.workspace);let statuses=definitions[entity]?.statuses;
 if(entity==='leads')statuses=config.leadStatuses;
 if(entity==='deals'){const stages=await rows('stages',user.workspace);if(stages.length)statuses=stages.map((s:any)=>s.name);}
 if(statuses&&!statuses.includes(r.status))throw new HttpError(400,'Choose a valid status.');
}
export async function writeRecord(user:any,entity:string,input:any,existing?:any){
 if(!Object.hasOwn(definitions,entity)||['notifications','documents'].includes(entity))throw new HttpError(400,'Use the dedicated action for this record.');
 if(!allowed(user,entity,existing,true))throw new HttpError(403,'Your role does not allow this change.');
 const permitted=[...(definitions[entity]?.fields||[]),'items','allowDuplicate','custom','estimate'];const clean:any={};for(const k of permitted)if(input[k]!==undefined)clean[k]=input[k]===''&&k.endsWith('Id')?null:input[k];
 for(const k of ['value','quantity','budget','participants','probability','discount','days','score','position'])if(clean[k]!==undefined)clean[k]=Number(clean[k]);
 const r={...(existing||base(user.workspace,clean.name,definitions[entity].statuses[0],{owner:user.email})),...clean,updatedAt:new Date().toISOString()};if(!['Owner','Manager'].includes(user.role))r.owner=user.email;
 if(entity==='deals'&&(!existing||r.status!==existing.status)){const stage=(await rows('stages',user.workspace)).find((s:any)=>s.name===r.status);if(stage)r.probability=stage.probability;}
 await validate(user,entity,r);
 const statements:any[]=[];
 if(entity==='allocations'&&r.status==='Reserved'){
  const event=await getRecord('events',r.eventId,user.workspace);if(!event.dueDate)throw new HttpError(400,'Set the event date before reserving equipment.');
  const item=await getRecord('inventory',r.inventoryId,user.workspace);const allocations=await rows('allocations',user.workspace);const events=await rows('events',user.workspace);
  const used=allocations.filter((a:any)=>a.id!==r.id&&a.inventoryId===r.inventoryId&&['Reserved','Damaged','Lost'].includes(a.status)).reduce((sum:number,a:any)=>{const e=events.find((e:any)=>e.id===a.eventId);return sum+(a.status!=='Reserved'||(e&&e.status!=='Cancelled'&&e.dueDate<=(event.endDate||event.dueDate)&&(e.endDate||e.dueDate)>=event.dueDate)?a.quantity:0);},0);
  if(item.status!=='Good'||used+r.quantity>item.quantity)throw new HttpError(409,`Insufficient equipment: ${Math.max(0,item.quantity-used)} available during this event.`);
 }
 if(entity==='inventory'&&existing&&r.quantity<existing.quantity){const reserved=(await rows('allocations',user.workspace)).filter((a:any)=>a.inventoryId===r.id&&a.status!=='Returned').reduce((s:number,a:any)=>s+a.quantity,0);if(r.quantity<reserved)throw new HttpError(409,'Return or resolve allocations before reducing inventory.');}
 const cols=[...shared,...specific[entity]];const extra:any={};for(const [k,v] of Object.entries(r))if(!cols.includes(k)&&v!==undefined)extra[k]=v;delete extra.allowDuplicate;
 if(existing){const values={...r,data:JSON.stringify(extra)};const keys=cols.filter(k=>!['id','workspace','createdAt'].includes(k)&&values[k]!==undefined);statements.push(db().prepare(`UPDATE ${tableNames[entity]} SET ${keys.map(k=>snake(k)+'=?').join(',')} WHERE id=? AND workspace=?`).bind(...keys.map(k=>values[k]),r.id,user.workspace));}else statements.push(insert(entity,r));
 if(entity==='stages'&&existing){if(['Closed Won','Closed Lost'].includes(existing.name)&&r.name!==existing.name)throw new HttpError(400,'Won and lost stage names are reserved for lifecycle workflows.');statements.push(db().prepare('UPDATE deals SET status=?,probability=? WHERE workspace=? AND status=?').bind(r.name,r.probability,user.workspace,existing.name));}
 if(entity==='proposals'){
  statements.push(db().prepare('DELETE FROM quotation_items WHERE proposal_id=? AND workspace=?').bind(r.id,user.workspace));
  for(const item of r.items)statements.push(db().prepare('INSERT INTO quotation_items(id,workspace,name,status,owner,demo,created_at,updated_at,data,proposal_id,quantity,value) VALUES(?,?,?,?,?,?,?,?,?,?,?,?)').bind(id(),user.workspace,item.name,'Active',user.email,r.demo,r.createdAt,r.updatedAt,'{}',r.id,Number(item.quantity),Number(item.price)));
  if(existing)statements.push(insert('activities',base(user.workspace,`Quotation revision: ${r.name}`,'Completed',{type:'Proposal revision',dealId:r.dealId||null,organizationId:r.organizationId||null,owner:user.email,versionSnapshot:existing})));
 }
 if(entity==='deals'&&r.status==='Closed Won'&&r.organizationId){const won:any=await db().prepare("SELECT COUNT(*) AS n FROM deals WHERE workspace=? AND organization_id=? AND status='Closed Won' AND id!=?").bind(user.workspace,r.organizationId,r.id).first();statements.push(db().prepare('UPDATE organizations SET status=?,updated_at=? WHERE id=? AND workspace=?').bind(won.n?'Repeat Customer':'Active Customer',r.updatedAt,r.organizationId,user.workspace));}
 if(entity==='activities'&&r.leadId&&r.status==='Completed')statements.push(db().prepare("UPDATE leads SET last_contact=?,status=CASE WHEN status IN ('New','Researching','Contacted') THEN 'Connected' ELSE status END,updated_at=? WHERE id=? AND workspace=?").bind(today(),r.updatedAt,r.leadId,user.workspace));
 if(entity==='tasks'&&existing?.status!=='Completed'&&r.status==='Completed'){
 statements.push(insert('activities',base(user.workspace,`Completed: ${r.name}`,'Completed',{owner:user.email,type:'Task',leadId:r.leadId||null,eventId:r.eventId||null,dealId:r.dealId||null,organizationId:r.organizationId||null})));
 if(r.recurrence&&r.recurrence!=='None')statements.push(insert('tasks',base(user.workspace,r.name,'To Do',{...extra,demo:r.demo,owner:r.owner,dueDate:dateOffset(r.recurrence==='Daily'?1:r.recurrence==='Weekly'?7:30),leadId:r.leadId||null,eventId:r.eventId||null,dealId:r.dealId||null,organizationId:r.organizationId||null})));
 }
 statements.push(audit(user,existing?'Updated':'Created',entity,r));await db().batch(statements);return r;
}
export async function runAutomations(user:any){
 const rules=await rows('automations',user.workspace);const leads=await rows('leads',user.workspace),deals=await rows('deals',user.workspace),events=await rows('events',user.workspace),tasks=await rows('tasks',user.workspace),checks=await rows('checklists',user.workspace),payments=await rows('payments',user.workspace),orgs=await rows('organizations',user.workspace);const t=today();
 for(const rule of rules.filter((r:any)=>r.status==='Enabled')){
 let candidates:any[]=[];
 if(rule.type==='New lead')candidates=leads.filter((l:any)=>!['Converted','Disqualified','Archived'].includes(l.status));
 if(rule.type==='Proposal follow-up')candidates=deals.filter((d:any)=>d.status==='Proposal/Price Quote');
 if(rule.type==='Closed won')candidates=deals.filter((d:any)=>d.status==='Closed Won'&&!events.some((e:any)=>e.dealId===d.id));
 if(rule.type==='Event preparation')candidates=events.filter((e:any)=>e.dueDate>=t&&e.dueDate<=dateOffset(rule.days)&&!['Completed','Cancelled'].includes(e.status)&&checks.some((c:any)=>c.eventId===e.id&&c.status!=='Completed'));
 if(rule.type==='Overdue payment')candidates=events.filter((e:any)=>e.paymentDueDate&&e.paymentDueDate<t&&e.value>payments.filter((p:any)=>p.eventId===e.id&&p.status==='Received').reduce((s:number,p:any)=>s+p.value,0));
 if(rule.type==='Inactive lead')candidates=leads.filter((l:any)=>!['Converted','Disqualified','Archived'].includes(l.status)&&(l.lastContact||l.createdAt.slice(0,10))<dateOffset(-rule.days));
 if(rule.type==='Event follow-up')candidates=events.filter((e:any)=>e.status==='Completed');
 if(rule.type==='Repeat customer')candidates=orgs.filter((o:any)=>['Active Customer','Repeat Customer'].includes(o.status)&&events.some((e:any)=>e.organizationId===o.id&&e.status==='Completed')&&!events.some((e:any)=>e.organizationId===o.id&&e.dueDate>dateOffset(-rule.days)));
 for(const r of candidates){const dedupe=`${rule.id}:${r.id}:${['Inactive lead','Overdue payment','Event preparation'].includes(rule.type)?t:'once'}`;const found=await db().prepare('SELECT id FROM automation_logs WHERE workspace=? AND dedupe=?').bind(user.workspace,dedupe).first();if(found)continue;
 const entity=['New lead','Inactive lead'].includes(rule.type)?'leads':['Proposal follow-up','Closed won'].includes(rule.type)?'deals':rule.type==='Repeat customer'?'organizations':'events';
 const stmts=[insert('automationLogs',base(user.workspace,`${rule.name}: ${r.name}`,'Executed',{ruleId:rule.id,dedupe,demo:r.demo})),insert('notifications',base(user.workspace,`${rule.name}: ${r.name}`,'Unread',{owner:r.owner,entity,recordId:r.id,dueDate:t,demo:r.demo}))];
 if(['New lead','Proposal follow-up','Event follow-up','Overdue payment','Repeat customer'].includes(rule.type))stmts.push(insert('tasks',base(user.workspace,`${rule.name}: ${r.name}`,'To Do',{owner:r.owner,demo:r.demo,dueDate:dateOffset(rule.days),[entity==='leads'?'leadId':entity==='deals'?'dealId':entity==='events'?'eventId':'organizationId']:r.id})));
 try{await db().batch(stmts);}catch(e){if(!String(e).includes('UNIQUE'))throw e;}
 }
 }
 const proposals=await rows('proposals',user.workspace);const activities=await rows('activities',user.workspace);
 const reminders=[...activities.filter((a:any)=>a.status==='Scheduled'&&a.dueDate&&a.dueDate>=today()&&a.dueDate<=dateOffset(2)).map((r:any)=>({record:r,entity:'activities',label:'Upcoming meeting or activity'})),...events.filter((e:any)=>!['Completed','Cancelled'].includes(e.status)&&e.dueDate>=today()&&e.dueDate<=dateOffset(3)).map((r:any)=>({record:r,entity:'events',label:'Upcoming event'})),...proposals.filter((p:any)=>['Draft','Sent'].includes(p.status)&&p.dueDate&&p.dueDate<=dateOffset(3)).map((r:any)=>({record:r,entity:'proposals',label:'Proposal deadline'}))];
 for(const {record:r,entity,label} of reminders){const dedupe=`reminder:${entity}:${r.id}:${r.dueDate}`;const exists=await db().prepare('SELECT id FROM automation_logs WHERE workspace=? AND dedupe=?').bind(user.workspace,dedupe).first();if(!exists){try{await db().batch([insert('automationLogs',base(user.workspace,`${label}: ${r.name}`,'Executed',{dedupe,demo:r.demo})),insert('notifications',base(user.workspace,`${label}: ${r.name}`,'Unread',{entity,recordId:r.id,owner:r.owner,demo:r.demo,dueDate:r.dueDate}))]);}catch(e){if(!String(e).includes('UNIQUE'))throw e;}}}
 for(const task of tasks.filter((t:any)=>t.dueDate&&t.dueDate<today()&&!['Completed','Cancelled'].includes(t.status))){const dedupe=`task-overdue:${task.id}:${task.dueDate}`;const found=await db().prepare('SELECT id FROM automation_logs WHERE workspace=? AND dedupe=?').bind(user.workspace,dedupe).first();if(!found){try{await db().batch([insert('automationLogs',base(user.workspace,`Overdue task: ${task.name}`,'Executed',{dedupe,demo:task.demo})),insert('notifications',base(user.workspace,`Overdue task: ${task.name}`,'Unread',{entity:'tasks',recordId:task.id,owner:task.owner,demo:task.demo}))]);}catch(e){if(!String(e).includes('UNIQUE'))throw e;}}}
}
