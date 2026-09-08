import { describe, expect, it } from 'vitest';
import { matchNewPosting } from './crawler';

const posting = { key: 'nexora-ai-1', company: 'Nexora Systems', title: 'Applied AI Engineer', archetypeId: 'ml-engineer', roleId: 'r1' };

describe('crawler matching', () => {
  it('matches only active watches for the same company and archetype', () => {
    const watches = [{ id: 'yes', company: 'Nexora Systems', archetypeId: 'ml-engineer' }, { id: 'other-company', company: 'Kairo Labs', archetypeId: 'ml-engineer' }, { id: 'other-role', company: 'Nexora Systems', archetypeId: 'data-analyst' }];
    expect(matchNewPosting(posting, new Set(), watches).map((watch) => watch.id)).toEqual(['yes']);
  });

  it('does not send an alert for a previously seen posting', () => {
    expect(matchNewPosting(posting, new Set([posting.key]), [{ id: 'yes', company: 'Nexora Systems', archetypeId: 'ml-engineer' }])).toEqual([]);
  });
});
