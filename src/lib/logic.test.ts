import { describe, expect, it } from 'vitest';
import { computeMatch } from './matching';
import { computeEligibility } from './eligibility';
import { verifyRole } from './verification';
import { roleArchetypes } from './roleArchetypes';

describe('match and eligibility logic', () => {
  const student = { id: 'test', education: [], skills: [{ name: 'Python' }, { name: 'SQL' }], experience: [], certifications: [], projects: [], years: 0 };
  const role = { skills: ['Python', 'SQL', 'Docker'], requiredYears: 0, applied: 0, cap: 100, postedAt: Date.now() };

  it('reports matched and missing skills from one score calculation', () => {
    const result = computeMatch(student, role);
    expect(result.skills).toBe(67);
    expect(result.matched).toEqual(['Python', 'SQL']);
    expect(result.missing).toEqual(['Docker']);
  });

  it('assigns deterministic eligibility states', () => {
    const result = computeEligibility(student, roleArchetypes);
    expect(result[0].status).toMatch(/Eligible|Close|Not yet ready/);
    expect(result).toHaveLength(roleArchetypes.length);
  });
});

describe('verification', () => {
  it('verifies only known career snapshots', () => {
    expect(verifyRole('Nexora Systems', 'Applied AI Engineer')).toBe('Verified');
    expect(verifyRole('Unknown', 'Unknown role')).toBe('Checking…');
  });
});
