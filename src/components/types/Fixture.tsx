import type { FixtureSetScoreDto } from "./FixtureDetails";

export interface Fixture {
  id: string;

  homeTeamId: string;
  homeTeamName: string;

  awayTeamId: string;
  awayTeamName: string;

  sport: string;
  scheduledAtUtc: string;
  status: string;

  homeScore: number;
  homeWickets: number;
  homeOvers: string;
  awayOvers: string;
  awayScore: number;
  awayWickets: number;
  sportId: string;
  currentSet?: number;
  sets?: FixtureSetScoreDto[];
}
