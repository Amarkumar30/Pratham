export type StudentProfile={skills:string[];years:number};
export type MatchRole={skills?:string[];requiredYears?:number;postedAt?:number;applied:number;cap:number};
export const defaultStudent:StudentProfile={skills:['Python','LLMs','MLOps','React','TypeScript','SQL','Tableau','AWS'],years:0};
const normalise=(x:string)=>x.toLowerCase().replace(/[^a-z0-9+#.]/g,'');
export function computeMatch(student:StudentProfile,role:MatchRole){
 const have=new Set(student.skills.map(normalise)), need=(role.skills||[]).map(normalise); const matched=(role.skills||[]).filter(x=>have.has(normalise(x))); const missing=(role.skills||[]).filter(x=>!have.has(normalise(x)));
 const skills=need.length?Math.round(matched.length/need.length*100):0;
 const distance=Math.abs(student.years-(role.requiredYears||0)); const experience=Math.max(35,100-distance*30);
 const minutes=role.postedAt?Math.max(1,(Date.now()-role.postedAt)/60000):30; const freshness=Math.max(0,100-minutes/180*100); const availability=Math.max(0,100-(role.applied/Math.max(1,role.cap))*100); const timing=Math.round(freshness*.55+availability*.45);
 const score=Math.round(skills*.58+experience*.25+timing*.17); const tier=score>=90?'Exceptional':score>=75?'Strong':score>=55?'Potential':'Growth';
 return {skills,experience,timing,score,tier,matched,missing};
}
export function computeEligibility(student:StudentProfile,archetypes:{id:string;name:string;skills:string[];requiredYears:number}[]){return archetypes.map(a=>{const match=computeMatch(student,{...a,applied:0,cap:100,postedAt:Date.now()});return {...a,...match,status:match.score>=75?'Eligible':match.score>=55?'Close':'Not yet ready'}}).sort((a,b)=>b.score-a.score)}
