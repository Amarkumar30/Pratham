import type { VerificationState } from '../../shared/types';

export const verifiedSnapshots = new Set([
  'Nexora Systems|Applied AI Engineer', 'Kairo Labs|Data Product Intern',
  'Asterline Digital|Cloud Engineering Associate', 'BharatGrid|Full-stack Developer',
]);

export function verifyRole(company: string, title: string): VerificationState {
  return verifiedSnapshots.has(`${company}|${title}`) ? 'Verified' : 'Checking…';
}
