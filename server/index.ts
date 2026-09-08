import express from 'express';
import rateLimit from 'express-rate-limit';
import Database from 'better-sqlite3';
import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import type { Notification, Role, StudentProfile } from '../shared/types';
import { matchNewPosting, type CrawlPosting } from './crawler';
import { verifyRole } from '../src/lib/verification';

const CRAWL_INTERVAL_MS = 30_000;
const defaultStudent: StudentProfile = { id: 'demo-student', name: 'Babita Boro', education: [], skills: ['Python', 'LLMs', 'MLOps', 'React', 'TypeScript', 'SQL', 'Tableau', 'AWS'].map((name) => ({ name })), experience: [], certifications: [], projects: [], years: 0 };
const seedRoles: Omit<Role, 'postedAt'>[] = [
  { id: 'r1', company: 'Nexora Systems', initials: 'NS', title: 'Applied AI Engineer', location: 'Bengaluru · Hybrid', skills: ['Python', 'LLMs', 'MLOps', 'Docker'], requiredYears: 0, applied: 3412, cap: 5000, verification: 'Verified', intent: 6 },
  { id: 'r2', company: 'Kairo Labs', initials: 'KL', title: 'Data Product Intern', location: 'Pune · On-site', skills: ['SQL', 'Python', 'Tableau', 'Excel'], requiredYears: 0, applied: 627, cap: 1000, verification: 'Verified', intent: 4 },
  { id: 'r3', company: 'Asterline Digital', initials: 'AD', title: 'Cloud Engineering Associate', location: 'Hyderabad · Hybrid', skills: ['AWS', 'Docker', 'React', 'TypeScript'], requiredYears: 1, applied: 942, cap: 1500, verification: 'Checking…', intent: 3 },
  { id: 'r4', company: 'BharatGrid', initials: 'BG', title: 'Full-stack Developer', location: 'Chennai · Remote', skills: ['React', 'Node.js', 'TypeScript', 'PostgreSQL'], requiredYears: 0, applied: 112, cap: 700, verification: 'Verified', intent: 8 },
  { id: 'r5', company: 'OrbitWorks', initials: 'OW', title: 'Business Intelligence Analyst', location: 'Mumbai · Hybrid', skills: ['Power BI', 'SQL', 'Excel', 'Python'], requiredYears: 0, applied: 778, cap: 1200, verification: 'Could not verify', intent: 2 },
];
const cycle: Omit<CrawlPosting, 'key'>[] = [
  { company: 'Nexora Systems', title: 'Applied AI Engineer', archetypeId: 'ml-engineer', roleId: 'r1' },
  { company: 'BharatGrid', title: 'Full-stack Developer', archetypeId: 'frontend-engineer', roleId: 'r4' },
  { company: 'Kairo Labs', title: 'Data Product Intern', archetypeId: 'data-analyst', roleId: 'r2' },
];

export function createPrathamApp(dbPath = process.env.DB_PATH || 'pratham-demo.db') {
  const db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  db.exec(`CREATE TABLE IF NOT EXISTS roles (id TEXT PRIMARY KEY, company TEXT NOT NULL, initials TEXT NOT NULL, title TEXT NOT NULL, location TEXT NOT NULL, skills TEXT NOT NULL, requiredYears INTEGER NOT NULL, applied INTEGER NOT NULL, cap INTEGER NOT NULL, verification TEXT NOT NULL, intent INTEGER NOT NULL, postedAt INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS opportunities (id TEXT PRIMARY KEY, title TEXT NOT NULL, kind TEXT NOT NULL, deadline TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS watches (id TEXT PRIMARY KEY, studentId TEXT NOT NULL, company TEXT NOT NULL, archetypeId TEXT NOT NULL, createdAt INTEGER NOT NULL, active INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS notifications (id TEXT PRIMARY KEY, studentId TEXT NOT NULL, postingId TEXT NOT NULL, roleId TEXT, message TEXT NOT NULL, createdAt INTEGER NOT NULL, read INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS crawler_seen (postingKey TEXT PRIMARY KEY, seenAt INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS students (id TEXT PRIMARY KEY, skills TEXT NOT NULL, years INTEGER NOT NULL);`);
  try { db.exec('ALTER TABLE students ADD COLUMN profile TEXT'); } catch { /* existing databases already have the column */ }
  try { db.exec('ALTER TABLE watches ADD COLUMN score INTEGER'); } catch { /* existing databases already have the column */ }
  if ((db.prepare('SELECT COUNT(*) AS count FROM roles').get() as { count: number }).count === 0) {
    const insert = db.prepare('INSERT INTO roles VALUES (@id,@company,@initials,@title,@location,@skills,@requiredYears,@applied,@cap,@verification,@intent,@postedAt)');
    seedRoles.forEach((role, index) => insert.run({ ...role, skills: JSON.stringify(role.skills), postedAt: Date.now() - (index + 1) * 10 * 60_000 }));
  }
  if (!(db.prepare('SELECT COUNT(*) AS count FROM students').get() as { count: number }).count) db.prepare('INSERT INTO students (id,skills,years,profile) VALUES (@id,@skills,@years,@profile)').run({ id: defaultStudent.id, skills: JSON.stringify(defaultStudent.skills.map((skill) => skill.name)), years: defaultStudent.years, profile: JSON.stringify(defaultStudent) });
  if (!(db.prepare('SELECT COUNT(*) AS count FROM opportunities').get() as { count: number }).count) {
    const insert = db.prepare('INSERT INTO opportunities VALUES (@id,@title,@kind,@deadline)');
    [['o1', 'Faculty Development Programme - Applied GenAI', 'FDP', '18 Sep'], ['o2', 'Smart manufacturing consultancy call', 'Consultancy', '22 Sep'], ['o3', 'Human-centred AI research fellowship', 'Research', '26 Sep']].forEach(([id, title, kind, deadline]) => insert.run({ id, title, kind, deadline }));
  }
  const toRole = (row: Record<string, unknown>): Role => ({ ...row, skills: JSON.parse(String(row.skills)), verification: row.verification as Role['verification'] } as Role);
  const app = express();
  app.use(express.json({ limit: '256kb' }));
  app.use(rateLimit({ windowMs: 60_000, limit: 120, standardHeaders: 'draft-8', legacyHeaders: false }));
  app.use((req, res, next) => { const started = Date.now(); res.on('finish', () => console.log(`[${new Date().toISOString()}] ${req.method} ${req.path} ${res.statusCode} ${Date.now() - started}ms`)); next(); });
  // The API listens on 5174; make a direct browser visit helpful instead of returning Express's "Cannot GET /" response.
  app.get('/', (_, res) => res.redirect(302, 'http://localhost:5173/'));
  let lastCrawlAt: number | null = null;
  app.get('/api/health', (_, res) => res.json({ ok: true, crawlerIntervalMs: CRAWL_INTERVAL_MS, lastCrawlAt, nextCrawlAt: lastCrawlAt ? lastCrawlAt + CRAWL_INTERVAL_MS : Date.now() + CRAWL_INTERVAL_MS }));
  app.get('/api/roles', (_, res) => res.json((db.prepare('SELECT * FROM roles ORDER BY postedAt DESC').all() as Record<string, unknown>[]).map(toRole)));
  app.post('/api/roles', (req, res) => { const { title, company, skills, location, requiredYears, cap } = req.body; if (!String(title || '').trim() || !String(company || '').trim() || !Array.isArray(skills) || !skills.length) return res.status(400).json({ error: 'Title, company and at least one skill are required.' }); const role: Role = { id: randomUUID(), title: title.trim(), company: company.trim(), initials: company.trim().split(/\s+/).map((word: string) => word[0]).join('').slice(0, 2).toUpperCase(), skills: skills.map((skill: string) => skill.trim()).filter(Boolean), location: String(location || 'India · Hybrid'), requiredYears: Math.max(0, Number(requiredYears) || 0), cap: Math.max(1, Number(cap) || 500), applied: 0, verification: verifyRole(company.trim(), title.trim()), intent: 1, postedAt: Date.now() }; db.prepare('INSERT INTO roles VALUES (@id,@company,@initials,@title,@location,@skills,@requiredYears,@applied,@cap,@verification,@intent,@postedAt)').run({ ...role, skills: JSON.stringify(role.skills) }); res.status(201).json(role); });
  app.get('/api/student', (_, res) => { const row = db.prepare('SELECT * FROM students WHERE id=?').get(defaultStudent.id) as Record<string, unknown>; const stored = row.profile ? JSON.parse(String(row.profile)) : { ...defaultStudent, skills: JSON.parse(String(row.skills)).map((name: string) => ({ name })), years: Number(row.years) }; res.json(stored); });
  app.put('/api/student', (req, res) => { const skills = Array.isArray(req.body.skills) ? req.body.skills.filter((skill: unknown): skill is { name: string } => typeof skill === 'object' && skill !== null && typeof (skill as { name?: unknown }).name === 'string' && (skill as { name: string }).name.trim().length <= 80).slice(0, 80) : null; if (!skills) return res.status(400).json({ error: 'Skills must be a structured skill array.' }); const cleanText = (value: unknown, max: number) => typeof value === 'string' ? value.trim().slice(0, max) : undefined; const student: StudentProfile = { ...defaultStudent, ...req.body, id: defaultStudent.id, name: cleanText(req.body.name, 100), skills: skills.map((skill: { name: string }) => ({ name: skill.name.trim() })), years: Math.max(0, Math.min(60, Number(req.body.years) || 0)) }; db.prepare('UPDATE students SET skills=@skills, years=@years, profile=@profile WHERE id=@id').run({ id: student.id, skills: JSON.stringify(student.skills.map((skill) => skill.name)), years: student.years, profile: JSON.stringify(student) }); res.json(student); });
  app.get('/api/opportunities', (_, res) => res.json(db.prepare('SELECT * FROM opportunities ORDER BY deadline').all()));
  app.post('/api/opportunities', (req, res) => { const { title, kind, deadline } = req.body; if (!String(title || '').trim() || !String(kind || '').trim()) return res.status(400).json({ error: 'Title and opportunity type are required.' }); const item = { id: randomUUID(), title: title.trim(), kind: kind.trim(), deadline: String(deadline || 'Open') }; db.prepare('INSERT INTO opportunities VALUES (@id,@title,@kind,@deadline)').run(item); res.status(201).json(item); });
  app.get('/api/institution-stats', (_, res) => res.json({ readiness: 84, roleFit: 18, fdp: 214, partners: 38, placements: [62, 71, 68, 79, 86, 91], gaps: [{ department: 'CSE', skill: 'Cloud architecture', value: 72 }, { department: 'ECE', skill: 'Data fluency', value: 61 }, { department: 'ME', skill: 'Industrial AI', value: 48 }, { department: 'MBA', skill: 'Product analytics', value: 69 }], fdpParticipation: [{ name: 'CSE', value: 88 }, { name: 'ECE', value: 67 }, { name: 'ME', value: 0 }, { name: 'MBA', value: 54 }] }));
  app.get('/api/watches', (_, res) => res.json((db.prepare('SELECT * FROM watches WHERE studentId=? ORDER BY createdAt DESC').all(defaultStudent.id) as Record<string, unknown>[]).map((row) => ({ ...row, active: Boolean(row.active) }))));
  app.post('/api/watches', (req, res) => { const { company, archetypeId, score } = req.body; if (!company || !archetypeId) return res.status(400).json({ error: 'Choose a company and target role.' }); const watch = { id: randomUUID(), studentId: defaultStudent.id, company, archetypeId, createdAt: Date.now(), active: 1, score: Number(score) || null }; db.prepare('INSERT INTO watches (id,studentId,company,archetypeId,createdAt,active,score) VALUES (@id,@studentId,@company,@archetypeId,@createdAt,@active,@score)').run(watch); res.status(201).json({ ...watch, active: true }); });
  app.patch('/api/watches/:id', (req, res) => { db.prepare('UPDATE watches SET active=? WHERE id=? AND studentId=?').run(req.body.active ? 1 : 0, req.params.id, defaultStudent.id); res.status(204).end(); });
  app.delete('/api/watches/:id', (req, res) => { db.prepare('DELETE FROM watches WHERE id=? AND studentId=?').run(req.params.id, defaultStudent.id); res.status(204).end(); });
  app.get('/api/notifications', (_, res) => res.json((db.prepare('SELECT * FROM notifications WHERE studentId=? ORDER BY createdAt DESC').all(defaultStudent.id) as Record<string, unknown>[]).map((row) => ({ ...row, read: Boolean(row.read) }))));
  app.post('/api/notifications/:id/read', (req, res) => { db.prepare('UPDATE notifications SET read=1 WHERE id=? AND studentId=?').run(req.params.id, defaultStudent.id); res.status(204).end(); });
  const clients = new Set<express.Response>(); app.get('/api/events', (req, res) => { res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' }); clients.add(res); req.on('close', () => clients.delete(res)); });
  let cycleIndex = 0; const runCrawler = () => { lastCrawlAt = Date.now(); const revision = Math.floor(cycleIndex / cycle.length); const template = cycle[cycleIndex++ % cycle.length]; const posting: CrawlPosting = { ...template, key: `${template.company}|${template.title}|${revision}` }; const seen = new Set((db.prepare('SELECT postingKey FROM crawler_seen').all() as { postingKey: string }[]).map((row) => row.postingKey)); const watches = db.prepare('SELECT id,company,archetypeId FROM watches WHERE active=1').all() as { id: string; company: string; archetypeId: string }[]; const matches = matchNewPosting(posting, seen, watches); console.log(`[${new Date().toISOString()}] crawler checked ${posting.key}; ${matches.length} matching active watches`); if (!seen.has(posting.key)) db.prepare('INSERT INTO crawler_seen VALUES (?,?)').run(posting.key, Date.now()); for (const _watch of matches) { const notification: Notification = { id: randomUUID(), studentId: defaultStudent.id, postingId: posting.key, roleId: posting.roleId, message: `Watch Bot found ${posting.title} at ${posting.company}.`, createdAt: Date.now(), read: false }; db.prepare('INSERT INTO notifications VALUES (@id,@studentId,@postingId,@roleId,@message,@createdAt,@read)').run({ ...notification, read: 0 }); for (const client of clients) client.write(`data: ${JSON.stringify(notification)}\n\n`); } return matches.length; };
  return { app, db, runCrawler, close: () => db.close() };
}

const server = createPrathamApp();
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) { setInterval(server.runCrawler, CRAWL_INTERVAL_MS); server.app.listen(5174, () => console.log(`Pratham API running at http://localhost:5174 (crawler every ${CRAWL_INTERVAL_MS / 1000}s)`)); }
