export type VerificationState = 'Verified' | 'Checking…' | 'Could not verify';

export interface Role {
  id: string;
  company: string;
  initials: string;
  title: string;
  location: string;
  skills: string[];
  requiredYears: number;
  applied: number;
  cap: number;
  verification: VerificationState;
  intent: number;
  postedAt: number;
}

export interface ProfileSkill { name: string; evidenceSnippet?: string; }
export interface Education { degree?: string; field?: string; institution?: string; year?: string; }
export interface Experience { title?: string; org?: string; durationMonths?: number; }
export interface Project { title?: string; description?: string; }
export interface StudentProfile { id: string; name?: string; education: Education[]; skills: ProfileSkill[]; experience: Experience[]; certifications: string[]; projects: Project[]; years: number; }
export interface Watch { id: string; studentId: string; company: string; archetypeId: string; createdAt: number; active: boolean; score?: number; }
export interface Notification { id: string; studentId: string; postingId: string; roleId: string | null; message: string; createdAt: number; read: boolean; }
export interface Opportunity { id: string; title: string; kind: string; deadline: string; }
export interface InstitutionStats { readiness: number; roleFit: number; fdp: number; partners: number; placements: number[]; gaps: { department: string; skill: string; value: number }[]; fdpParticipation: { name: string; value: number }[]; }
export interface SystemHealth { ok: boolean; crawlerIntervalMs: number; lastCrawlAt: number | null; nextCrawlAt: number; }
export interface ApiError { error: string; }
