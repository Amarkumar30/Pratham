import type { StudentProfile } from '../../shared/types';
import { defaultStudent } from './matching';
import { extractSkills } from './extractSkills';

const section = (text: string, names: string[]) => {
  const lines = text.split(/\r?\n/).map(line => line.trim()).filter(Boolean);
  const start = lines.findIndex(line => names.some(name => new RegExp(`^${name}`, 'i').test(line)));
  if (start < 0) return [];
  return lines.slice(start + 1).filter(line => !/^(education|experience|skills|projects|certifications?|achievements?|summary)$/i.test(line));
};

/** Rule-based parser: section headings, line heuristics, and the local skills taxonomy. */
export function parseResume(text: string): StudentProfile {
  const lines = text.split(/\r?\n/).map(line => line.trim()).filter(Boolean);
  const experienceLines = section(text, ['experience', 'work experience', 'employment']);
  const educationLines = section(text, ['education', 'academic background']);
  const projectLines = section(text, ['projects?', 'academic projects?']);
  const certificationLines = section(text, ['certifications?', 'credentials?']);
  const name = lines.find(line => /^[A-Za-z][A-Za-z .'-]{2,50}$/.test(line) && !/resume|curriculum/i.test(line));
  const experiences = experienceLines.slice(0, 5).map(line => {
    const duration = line.match(/(\d+(?:\.\d+)?)\s*(years?|yrs?|months?)/i);
    const months = duration ? Math.round(Number(duration[1]) * (/month/i.test(duration[2]) ? 1 : 12)) : undefined;
    const [title, org] = line.split(/\s+(?:at|[-|])\s+/i);
    return { title, org, durationMonths: months };
  });
  const years = Math.round(experiences.reduce((total, item) => total + (item.durationMonths || 0), 0) / 12);
  return { ...defaultStudent, name, skills: extractSkills(text).map(skill => ({ name: skill, evidenceSnippet: lines.find(line => line.toLowerCase().includes(skill.toLowerCase())) })), education: educationLines.slice(0, 3).map(line => ({ degree: line.match(/B\.?Tech|B\.?E|M\.?Tech|BCA|MCA|MBA|BSc|MSc/i)?.[0], field: line, institution: line.split(/[-|,]/)[1]?.trim(), year: line.match(/20\d{2}/)?.[0] })), experience: experiences, certifications: certificationLines.slice(0, 6), projects: projectLines.slice(0, 5).map(line => { const [title, description] = line.split(/[-:]/, 2); return { title, description }; }), years };
}

export const sampleResume = `Aarav Mehta\n\nEducation\nB.Tech Computer Science, South Assam University, 2026\n\nSkills\nPython, SQL, React, TypeScript, Tableau, AWS, Docker, Machine Learning\n\nExperience\nData Analytics Intern at Nexora Systems - 6 months\n\nProjects\nPlacement Insight Dashboard - Built a Tableau and SQL dashboard for campus placement data\nRecommendation Engine - Python machine learning project\n\nCertifications\nAWS Cloud Foundations\nGoogle Data Analytics`;
