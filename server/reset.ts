import { existsSync, rmSync } from 'node:fs';

const database = process.env.DB_PATH || 'pratham-demo.db';
for (const path of [database, `${database}-wal`, `${database}-shm`]) {
  if (existsSync(path)) rmSync(path);
}
console.log(`Removed ${database} and SQLite sidecar files. Run npm run dev to create a clean seeded demo.`);
