import { afterEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import { createPrathamApp } from './index';

const instances: ReturnType<typeof createPrathamApp>[] = [];
afterEach(() => instances.splice(0).forEach(instance => instance.close()));
const app = () => { const instance = createPrathamApp(':memory:'); instances.push(instance); return instance; };

describe('core API persistence', () => {
  it('persists the reviewed resume profile used by the results scorer', async () => {
    const instance = app();
    const profile = await request(instance.app).get('/api/student').expect(200);
    const saved = await request(instance.app).put('/api/student').send({ ...profile.body, name: 'Edited Resume Name', skills: [{ name: 'Python' }, { name: 'Docker' }], years: 2 }).expect(200);
    expect(saved.body.name).toBe('Edited Resume Name');
    expect(saved.body.skills).toEqual([{ name: 'Python' }, { name: 'Docker' }]);
    expect((await request(instance.app).get('/api/student').expect(200)).body.years).toBe(2);
  });

  it('publishes a role that is returned by the shared feed', async () => {
    const instance = app();
    const created = await request(instance.app).post('/api/roles').send({ title: 'Platform Intern', company: 'Test Systems', skills: ['TypeScript'] }).expect(201);
    const feed = await request(instance.app).get('/api/roles').expect(200);
    expect(feed.body.some((role: { id: string }) => role.id === created.body.id)).toBe(true);
  });

  it('creates a watch and produces one notification for a new matching crawl posting', async () => {
    const instance = app();
    await request(instance.app).post('/api/watches').send({ company: 'Nexora Systems', archetypeId: 'ml-engineer', score: 91 }).expect(201);
    expect(instance.runCrawler()).toBe(1);
    expect(instance.runCrawler()).toBe(0);
    const notifications = await request(instance.app).get('/api/notifications').expect(200);
    expect(notifications.body).toHaveLength(1);
    expect(notifications.body[0].message).toContain('Nexora Systems');
  });
});
