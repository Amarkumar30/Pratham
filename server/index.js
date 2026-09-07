import express from 'express';
import Database from 'better-sqlite3';

const app = express();
const db = new Database('pratham-demo.db');
app.use(express.json());
app.use((_, res, next) => setTimeout(next, 260));
db.exec(`CREATE TABLE IF NOT EXISTS roles (id TEXT PRIMARY KEY, company TEXT, initials TEXT, title TEXT, location TEXT, skills TEXT, requiredYears INTEGER, applied INTEGER, cap INTEGER, verification TEXT, intent INTEGER, postedAt INTEGER);
CREATE TABLE IF NOT EXISTS opportunities (id TEXT PRIMARY KEY, title TEXT, kind TEXT, deadline TEXT);
CREATE TABLE IF NOT EXISTS watches (id TEXT PRIMARY KEY, studentId TEXT, company TEXT, archetypeId TEXT, createdAt INTEGER, active INTEGER);
CREATE TABLE IF NOT EXISTS notifications (id TEXT PRIMARY KEY, studentId TEXT, postingId TEXT, message TEXT, createdAt INTEGER, read INTEGER);`);
const count = db.prepare('SELECT COUNT(*) count FROM roles').get().count;
if (!count) {
  const insert = db.prepare('INSERT INTO roles VALUES (@id,@company,@initials,@title,@location,@skills,@requiredYears,@applied,@cap,@verification,@intent,@postedAt)');
  [
    ['r1','Nexora Systems','NS','Applied AI Engineer','Bengaluru · Hybrid',['Python','LLMs','MLOps','Docker'],0,3412,5000,'Verified',6,14],
    ['r2','Kairo Labs','KL','Data Product Intern','Pune · On-site',['SQL','Python','Tableau','Excel'],0,627,1000,'Verified',4,29],
    ['r3','Asterline Digital','AD','Cloud Engineering Associate','Hyderabad · Hybrid',['AWS','Docker','React','TypeScript'],1,942,1500,'Checking…',3,42],
    ['r4','BharatGrid','BG','Full-stack Developer','Chennai · Remote',['React','Node.js','TypeScript','PostgreSQL'],0,112,700,'Verified',8,53],
    ['r5','OrbitWorks','OW','Business Intelligence Analyst','Mumbai · Hybrid',['Power BI','SQL','Excel','Python'],0,778,1200,'Checking…',0,64]
  ].forEach(([id,company,initials,title,location,skills,requiredYears,applied,cap,verification,intent,mins])=>insert.run({id,company,initials,title,location,skills:JSON.stringify(skills),requiredYears,applied,cap,verification,intent,postedAt:Date.now()-mins*60000}));
}
const toRole = row => ({...row, skills: JSON.parse(row.skills), verified: row.verification, posted: `${Math.max(1, Math.round((Date.now()-row.postedAt)/60000))}m ago`});
app.get('/api/health', (_,res)=>res.json({ok:true}));
// Simplified verification state machine: seeded career-page snapshots verify known
// company/title pairs; a newly published role remains Checking until a real connector exists.
const snapshots=new Set(['Nexora Systems|Applied AI Engineer','Kairo Labs|Data Product Intern','Asterline Digital|Cloud Engineering Associate','BharatGrid|Full-stack Developer']);
app.get('/api/roles', (_,res)=>{db.prepare("SELECT * FROM roles WHERE verification='Checking…'").all().forEach(r=>{if(snapshots.has(`${r.company}|${r.title}`))db.prepare("UPDATE roles SET verification='Verified' WHERE id=?").run(r.id)});res.json(db.prepare('SELECT * FROM roles ORDER BY postedAt DESC').all().map(toRole))});
app.post('/api/roles', (req,res)=>{
  const r=req.body; if(!r.title||!r.company||!Array.isArray(r.skills)||!r.skills.length)return res.status(400).json({error:'Title, company and at least one skill are required.'});
  const initials=r.company.split(/\s+/).map(x=>x[0]).join('').slice(0,2).toUpperCase();
  const role={id:crypto.randomUUID(),company:r.company,initials,title:r.title,location:r.location||'India · Hybrid',skills:JSON.stringify(r.skills),requiredYears:Number(r.requiredYears)||0,applied:0,cap:Number(r.cap)||500,verification:'Checking…',intent:0,postedAt:Date.now()};
  db.prepare('INSERT INTO roles VALUES (@id,@company,@initials,@title,@location,@skills,@requiredYears,@applied,@cap,@verification,@intent,@postedAt)').run(role);
  res.status(201).json(toRole(role));
});
app.get('/api/opportunities',(_,res)=>res.json(db.prepare('SELECT * FROM opportunities').all()));
app.get('/api/institution-stats',(_,res)=>res.json({readiness:84,roleFit:18,fdp:214,partners:38}));
app.get('/api/watches',(_,res)=>res.json(db.prepare('SELECT * FROM watches WHERE active=1 ORDER BY createdAt DESC').all()));
app.post('/api/watches',(req,res)=>{const{company,archetypeId}=req.body;if(!company||!archetypeId)return res.status(400).json({error:'Choose a company and target role.'});const watch={id:crypto.randomUUID(),studentId:'demo-student',company,archetypeId,createdAt:Date.now(),active:1};db.prepare('INSERT INTO watches VALUES (@id,@studentId,@company,@archetypeId,@createdAt,@active)').run(watch);res.status(201).json(watch)});
app.delete('/api/watches/:id',(req,res)=>{db.prepare('UPDATE watches SET active=0 WHERE id=?').run(req.params.id);res.status(204).end()});
app.get('/api/notifications',(_,res)=>res.json(db.prepare('SELECT * FROM notifications ORDER BY createdAt DESC').all()));
app.post('/api/notifications/:id/read',(req,res)=>{db.prepare('UPDATE notifications SET read=1 WHERE id=?').run(req.params.id);res.status(204).end()});
const clients=new Set();app.get('/api/events',(req,res)=>{res.writeHead(200,{'Content-Type':'text/event-stream','Cache-Control':'no-cache','Connection':'keep-alive'});clients.add(res);req.on('close',()=>clients.delete(res))});
const CRAWL_INTERVAL_MS=30000; // compressed demo cadence; production target is continuous/hour-window scanning
let crawl=0;const mockPostingCycle=[['Nexora Systems','Applied AI Engineer',['Python','LLMs','MLOps']],['BharatGrid','Full-stack Developer',['React','Node.js','TypeScript']],['Kairo Labs','Data Product Intern',['SQL','Python','Tableau']]];
setInterval(()=>{const[sourceCompany,title,skills]=mockPostingCycle[crawl++%mockPostingCycle.length];const watches=db.prepare('SELECT * FROM watches WHERE active=1 AND company=?').all(sourceCompany);for(const w of watches){const n={id:crypto.randomUUID(),studentId:w.studentId,postingId:`crawl-${crawl}`,message:`Watch Bot found ${title} at ${sourceCompany} within the demo alert window.`,createdAt:Date.now(),read:0};db.prepare('INSERT INTO notifications VALUES (@id,@studentId,@postingId,@message,@createdAt,@read)').run(n);for(const client of clients)client.write(`data: ${JSON.stringify(n)}\n\n`)}},CRAWL_INTERVAL_MS);
app.listen(5174,()=>console.log('Pratham API running at http://localhost:5174'));
