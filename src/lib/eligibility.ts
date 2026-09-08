import { computeMatch } from './matching';
import type { StudentProfile } from '../../shared/types';

export function computeEligibility(student: StudentProfile, archetypes: { id: string; name: string; skills: string[]; requiredYears: number }[]) {
  return archetypes.map((archetype) => {
    const match = computeMatch(student, { ...archetype, applied: 0, cap: 100, postedAt: Date.now() });
    return { ...archetype, ...match, status: match.score >= 75 ? 'Eligible' : match.score >= 55 ? 'Close' : 'Not yet ready' };
  }).sort((a, b) => b.score - a.score);
}
