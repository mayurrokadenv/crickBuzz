import type { Scorecard } from "../../hooks/useScoreUpdateFeed";

export interface MatchDetailsModel {
  source: MatchSource;
  header: MatchHeaderModel;
  live: MatchLiveModel | null;
  commentary: Record<string, MatchCommentaryModel>;

  enableNoContent: boolean;
  matchVideos: unknown[];
  page: string;
  responseLastUpdated: number;
}

// ======================================================
// HEADER
// ======================================================
export type MatchSource = "cricbuzz" | "fixture";

export interface MatchHeaderModel {
  matchId: string;

  matchDescription: string;
  matchFormat: string;
  matchType: string;

  complete: boolean;
  domestic: boolean;

  matchStartTimestamp: number;

  matchStartTimeIST: string;
  matchStartTimeGMT: string;
  matchStartTimeLocal: string;

  matchCompleteTimeIST: string;
  matchCompleteTimeGMT: string;
  matchCompleteTimeLocal: string;

  dayNight: boolean;
  year: number;

  state: string;
  status: string;

  tossResults: MatchTossResultModel;
  result: MatchResultModel;
  revisedTarget: MatchRevisedTargetModel;

  playersOfTheMatch: unknown[];
  playersOfTheSeries: unknown[];

  matchTeamInfo: MatchTeamInfoModel[];

  team1: MatchTeamModel;
  team2: MatchTeamModel;

  seriesDesc: string;
  seriesId: string;
  seriesName: string;

  alertType: string;
  isMatchNotCovered: boolean;
  livestreamEnabled: boolean;
}

export interface MatchTossResultModel {
  tossWinnerId: string;
  tossWinnerName: string;
  decision: string;
}

export interface MatchResultModel {
  resultType: string | null;
  winningTeam: string | null;
  winningTeamId: string | null;
  winningMargin: number | null;
  winByRuns: boolean | null;
  winByInnings: boolean | null;
}

export interface MatchRevisedTargetModel {
  reason: number | null;
  revisedTarget: number | null;
  revisedOvers: number | null;
}

export interface MatchTeamInfoModel {
  battingTeamId: string;
  battingTeamShortName: string;

  bowlingTeamId: string;
  bowlingTeamShortName: string;
}

export interface MatchTeamModel {
  id: string;
  name: string;
  shortName: string;
  homeOvers?: string | null;
  awayOvers?: string | null;
  playerDetails: unknown[];
}

// ======================================================
// LIVE
// ======================================================

export interface MatchLiveModel {
  inningsId: number;

  batTeam: MatchBatTeamModel;

  status: string;

  batsmanStriker: MatchBatsmanModel | null;
  batsmanNonStriker: MatchBatsmanModel | null;

  bowlerStriker: MatchBowlerModel | null;
  bowlerNonStriker: MatchBowlerModel | null;

  overs: number;
  target: number | null;

  partnerShip: MatchPartnershipModel | null;

  currentRunRate: number;
  requiredRunRate: number;

  runsPerBall: number;
  requiredRunsPerBall: number;

  matchScoreDetails: MatchScoreDetailsModel;

  lastWicket: string;

  remRunsToWin: number;
  oversRem: number;

  responseLastUpdated: number;

  latestPerformance: unknown[];

  recentOvsStats: string;
  event: string;

  batTeamScoreObj: MatchTeamScoreObjectModel;
  bowlTeamScoreObj: MatchTeamScoreObjectModel;

  matchUdrs: unknown | null;

  scorecards?: Scorecard[];
}

export interface MatchBatTeamModel {
  teamId: string;
  teamScore: number;
  teamWkts: number;
  homeScore?: number | null;
  homeWickets?: number | null;
  awayScore?: number | null;
  awayWickets?: number | null;
  homeOvers?: string | null;
  awayOvers?: string | null;
}

export interface MatchPartnershipModel {
  balls: number;
  runs: number;
}

export interface MatchBatsmanModel {
  id: string;

  name: string;

  runs: number;
  balls: number;

  fours: number;
  sixes: number;

  strikeRate: string;

  playerUrl: string;
  playerMatchHighlightsUrl: string;
}

export interface MatchBowlerModel {
  id: string;

  name: string;

  overs: number;
  maidens: number;

  economy: number;

  runs: number;
  wickets: number;

  playerUrl: string;
  playerMatchHighlightsUrl: string;
}

export interface MatchScoreDetailsModel {
  matchId: string;

  inningsScoreList: MatchInningsScoreModel[];

  isMatchNotCovered: boolean;

  matchFormat: string;

  customStatus: string;

  state: string;
}

export interface MatchInningsScoreModel {
  inningsId: number;

  batTeamId: string;

  batTeamName: string;

  score: number;

  wickets: number;

  overs: number;

  isDeclared: boolean;
  isFollowOn: boolean;

  ballNbr: number;
}

export interface MatchTeamScoreObjectModel {
  teamName: string;

  teamInningsArray: MatchInningsScoreModel[];
}

// ======================================================
// COMMENTARY
// ======================================================

export interface MatchCommentaryModel {
  matchId: string;

  commType: string;
  commText: string;

  inningsId: number;

  event: string[];

  ballMetric: number | null;

  teamName: string;

  timestamp: number;

  overSeparator: MatchOverSeparatorModel | null;

  batsmanDetails: MatchCommentaryPlayerModel;
  bowlerDetails: MatchCommentaryPlayerModel;
}

export interface MatchCommentaryPlayerModel {
  playerId: string;
  playerName: string;
}

export interface MatchOverSeparatorModel {
  timestamp: number;

  overNumber: number;

  overSummary: string;

  overRuns: number;

  batTeamObj: {
    teamName: string;
    teamScore: string;
  };

  batStrikerObj: MatchOverPlayerModel;
  batNonStrikerObj: MatchOverPlayerModel;
  bowlerObj: MatchOverPlayerModel;
}

export interface MatchOverPlayerModel {
  playerId: string;
  playerName: string;
  playerScore: string;
}
