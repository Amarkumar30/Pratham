export type RoleArchetype={id:string;name:string;skills:string[];requiredYears:number};
export const roleArchetypes:RoleArchetype[]=[
 {id:'ml-engineer',name:'ML Engineer',skills:['Python','Machine Learning','LLMs','MLOps'],requiredYears:0},
 {id:'frontend-engineer',name:'Frontend Engineer',skills:['React','TypeScript','JavaScript','CSS'],requiredYears:0},
 {id:'backend-engineer',name:'Backend Engineer',skills:['Node.js','Express','SQL','PostgreSQL'],requiredYears:1},
 {id:'data-analyst',name:'Data Analyst',skills:['SQL','Python','Tableau','Excel'],requiredYears:0},
 {id:'devops-engineer',name:'DevOps Engineer',skills:['Docker','Kubernetes','AWS','Linux'],requiredYears:1},
 {id:'qa-engineer',name:'QA Engineer',skills:['JavaScript','SQL','REST API','Agile'],requiredYears:0}
];
