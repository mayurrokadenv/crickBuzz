export interface FixtureDetailsDto {
  awayOvers: string;
  homeOvers: string;
  id: string;
  homeTeamId: string;
  homeTeamName: string;
  awayTeamId: string;
  awayTeamName: string;
  sport: string;
  scheduledAtUtc: string;
  status: string;
  phase: string | null;
  homeScore: number;
  homeWickets: number;
  awayScore: number;
  awayWickets: number;
  commentary: CommentaryDto[];
  topPerformers: TopPerformerDto[];
  totalOvers: string;
  sportId: string;
}

export interface CommentaryDto {
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
