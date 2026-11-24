import { useEffect, useState } from "react";
import { HubConnectionState } from "@microsoft/signalr";
import {
  LOCAL_APP_DATA_CHANGED_EVENT,
  readLocalAppData,
} from "../services/localAppStore";

export interface BattingFigure {
  id?: string;
  playerId: string;
  playerName: string;
  runs: number;
  balls: number;
  fours: number;
  sixes: number;
  strikeRate: number;
}

export interface BowlingFigure {
  id?: string;
  playerId: string;
  playerName: string;
  overs: string;
  maidens: number;
  runs: number;
  wickets: number;
  noBalls: number;
  wides: number;
  economy: number;
}

export interface Scorecard {
  id: string;
  fixtureId: string;
  inningsNo: number;
  battingTeamId: string;
  bowlingTeamId: string;
  winningTeamId?: string;
  battingFigures: BattingFigure[];
  bowlingFigures: BowlingFigure[];
}

export interface ScoreUpdate {
  fixtureId: string;
  homeTeamId?: string;
  awayTeamId?: string;
  battingTeamId?: string;
  phase?: string;
  homeScore: number;
  homeWickets?: number;
  homeOvers?: string;
  awayOvers?: string;
  awayScore: number;
  awayWickets?: number;
  updatedAtUtc?: string;
  scorecards?: Scorecard[] | Record<string, Scorecard | null>;
  commentary?: unknown[];
  topPerformers?: unknown[];
  status?: string;
  partnerShip?: { runs: number; balls: number };
  recentOvsStats?: string;
  sportId?: string;
  homeTeamName?: string;
  awayTeamName?: string;
}

export function getScoreForFixture(
  scoreByMatch: Record<string, ScoreUpdate>,
  fixtureId: string,
): ScoreUpdate | undefined {
  const normalizedId = fixtureId.toLowerCase();
  return (
    scoreByMatch[fixtureId] ??
    scoreByMatch[normalizedId] ??
    Object.entries(scoreByMatch).find(
      ([key]) => key.toLowerCase() === normalizedId,
    )?.[1]
  );
}

function readLocalScores() {
  const data = readLocalAppData();
  return data.fixtures.reduce<Record<string, ScoreUpdate>>((scores, fixture) => {
    const snapshot: ScoreUpdate = {
      fixtureId: fixture.id,
      homeTeamId: fixture.homeTeamId,
      awayTeamId: fixture.awayTeamId,
      battingTeamId: fixture.battingTeamId,
      phase: fixture.phase,
      homeScore: fixture.homeScore,
      homeWickets: fixture.homeWickets,
      homeOvers: fixture.homeOvers,
      awayScore: fixture.awayScore,
      awayWickets: fixture.awayWickets,
      awayOvers: fixture.awayOvers,
      scorecards: data.scorecardsByFixture[fixture.id] ?? [],
      commentary: data.commentaryByFixture[fixture.id] ?? [],
      status: fixture.status,
      sportId: fixture.sportId,
      homeTeamName: fixture.homeTeamName,
      awayTeamName: fixture.awayTeamName,
    };
    scores[fixture.id] = snapshot;
    scores[fixture.id.toLowerCase()] = snapshot;
    return scores;
  }, {});
}

export function useScoreUpdateFeed(_fixtureId: string) {
  const [scoreByMatch, setScoreByMatch] = useState(readLocalScores);

  useEffect(() => {
    const refresh = () => {
      try {
        setScoreByMatch(readLocalScores());
      } catch (error: unknown) {
        console.error("Unable to refresh local score data", error);
      }
    };
    window.addEventListener(LOCAL_APP_DATA_CHANGED_EVENT, refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener(LOCAL_APP_DATA_CHANGED_EVENT, refresh);
      window.removeEventListener("storage", refresh);
    };
  }, []);

  return {
    scoreByMatch,
    connectionState: HubConnectionState.Disconnected,
    feedVersion: Object.keys(scoreByMatch).length,
  };
}

export default useScoreUpdateFeed;
