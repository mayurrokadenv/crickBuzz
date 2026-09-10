export type MatchSource = "cricbuzz" | "internal";

export interface MatchCardModel {
  id: string;
  fixtureId?: string;
  source: MatchSource;

  sport: string;
  status: string;
  shortStatus: string;

  team1Name: string;
  team2Name: string;

  team1Score: number | null;
  team1Wickets: number | null;

  team2Score: number | null;
  team2Wickets: number | null;
  homeOvers?: string | null;
  awayOvers?: string | null;
  overs: number | null;
}
