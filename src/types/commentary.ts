export interface CommentaryUpdate {
  ball: string | undefined;
  id: string;
  fixtureId: string;
  action: string;
  note: string;
  playerName: string;
  side: string;
  fixtureName: string;
  createdAtUtc: string;
  homeScore: number;
  homeWickets: number;
  awayScore: number;
  awayWickets: number;
}
