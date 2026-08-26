export interface FeedingMatchs {
  id: number;
  fixtureId?: string;
  sport: string;
  team1: string;
  team2: string;
  score: string;
  stage: string;
  progress: string;
  totalOvers?: string;
  homeOvers?: string;
  awayOvers?: string;
}
