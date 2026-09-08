export interface CrawlPosting { key: string; company: string; title: string; archetypeId: string; roleId: string | null; }
export interface ActiveWatch { id: string; company: string; archetypeId: string; }

export function matchNewPosting(posting: CrawlPosting, seenKeys: Set<string>, watches: ActiveWatch[]) {
  if (seenKeys.has(posting.key)) return [];
  return watches.filter((watch) => watch.company === posting.company && watch.archetypeId === posting.archetypeId);
}
