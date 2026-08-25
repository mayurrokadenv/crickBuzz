export interface FixtureDetailsDto {
  awayOvers: any;
  homeOvers: any;
  id: string;
  homeTeamId: string;
  homeTeamName: string;
  awayTeamId: string;
  awayTeamName: string;
  sport: string;
  ball?: string;
  scheduledAtUtc: string;
  status: string;
  phase: string | null;
  homeScore: number;
  homeWickets: number | null;
  awayScore: number;
  awayWickets: number | null;
  commentary: CommentaryDto[];
  topPerformers: TopPerformerDto[];
  totalOvers?: string;
  sportId: string;
}

export interface CommentaryDto {
  ball: any;
  id: string;
  fixtureId: string;
  side: string;
  playerId: string;
  playerName: string;
  action: string;
  note: string | null;
  createdAtUtc: string;
  homeScore: number;
  homeWickets: number | null;
  awayScore: number;
  awayWickets: number | null;
  fixtureName: string;
  sportName: string;
}

export interface TopPerformerDto {
  playerId: string;
  playerName: string;
  teamId: string;
  teamName: string;
  runsScored: number;
}
