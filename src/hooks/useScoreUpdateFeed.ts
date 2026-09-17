import { useEffect, useState } from "react";
import { HubConnectionState, type HubConnection } from "@microsoft/signalr";
import { createCommentaryHubConnection } from "../lib/signalrClient";

// --- Add these interfaces for the nested scorecard data ---
export interface BattingFigure {
  playerId: string;
  playerName: string;
  runs: number;
  balls: number;
  fours: number;
  sixes: number;
  strikeRate: number;
}

export interface BowlingFigure {
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
  battingFigures: BattingFigure[];
  bowlingFigures: BowlingFigure[];
}

// Shape used by UI
export interface ScoreUpdate {
  fixtureId: string;
  battingTeamId?: string;
  homeScore: number;
  homeWickets?: number;
  homeOvers?: string;
  awayOvers?: string;
  awayScore: number;
  awayWickets?: number;
  updatedAtUtc?: string;
  scorecards?: Scorecard[]; // <-- Added this
  partnerShip?: {
    runs: number;
    balls: number;
  };
  recentOvsStats?: string;
}

// Shape received from backend SignalR
interface BackendScoreUpdate {
  fixtureId: string;
  battingTeamId?: string;
  homeRuns: number;
  homeOvers?: string;
  awayOvers?: string;
  homeWickets?: number;
  awayRuns: number;
  awayWickets?: number;
  updatedAtUtc?: string;
  scorecards?: Scorecard[]; // <-- Added this
  partnerShip?: {
    runs: number;
    balls: number;
  };
  recentOvsStats?: string;
}

const SCORE_EVENT = "ScoreUpdated";

type ScoreFeedListener = () => void;

let sharedConnection: HubConnection | null = null;
let sharedConnectionPromise: Promise<void> | null = null;
let sharedConnectionState = HubConnectionState.Disconnected;
let sharedScoreByMatch: Record<string, ScoreUpdate> = {};
const scoreFeedListeners = new Set<ScoreFeedListener>();
const fixtureSubscribers = new Map<string, number>();

function notifyScoreFeedListeners() {
  scoreFeedListeners.forEach((listener) => listener());
}

function getUpdateValue<T>(update: BackendScoreUpdate, camelCase: keyof BackendScoreUpdate, pascalCase: string): T | undefined {
  const payload = update as unknown as Record<string, unknown>;
  return (payload[camelCase] ?? payload[pascalCase]) as T | undefined;
}

function ensureSharedConnection() {
  if (sharedConnectionPromise) return sharedConnectionPromise;

  const connection = createCommentaryHubConnection();
  sharedConnection = connection;

  connection.on(SCORE_EVENT, (update: BackendScoreUpdate) => {
    const fixtureId = getUpdateValue<string>(update, "fixtureId", "FixtureId");
    if (!fixtureId) return;

    console.debug("ScoreUpdated received for fixture:", fixtureId, update);

    const scoreUpdate: ScoreUpdate = {
      fixtureId,
      battingTeamId: getUpdateValue<string>(update, "battingTeamId", "BattingTeamId"),
      homeScore: getUpdateValue<number>(update, "homeRuns", "HomeRuns") ?? 0,
      homeWickets: getUpdateValue<number>(update, "homeWickets", "HomeWickets"),
      awayScore: getUpdateValue<number>(update, "awayRuns", "AwayRuns") ?? 0,
      awayWickets: getUpdateValue<number>(update, "awayWickets", "AwayWickets"),
      homeOvers: getUpdateValue<string>(update, "homeOvers", "HomeOvers"),
      awayOvers: getUpdateValue<string>(update, "awayOvers", "AwayOvers"),
      updatedAtUtc: getUpdateValue<string>(update, "updatedAtUtc", "UpdatedAtUtc"),
      scorecards: getUpdateValue<Scorecard[]>(update, "scorecards", "Scorecards"),
      partnerShip: getUpdateValue<ScoreUpdate["partnerShip"]>(update, "partnerShip", "PartnerShip"),
      recentOvsStats: getUpdateValue<string>(update, "recentOvsStats", "RecentOvsStats"),
    };

    sharedScoreByMatch = {
      ...sharedScoreByMatch,
      [fixtureId]: scoreUpdate,
      [fixtureId.toLowerCase()]: scoreUpdate,
    };
    notifyScoreFeedListeners();
  });

  sharedConnectionPromise = connection
    .start()
    .then(() => {
      sharedConnectionState = HubConnectionState.Connected;
      notifyScoreFeedListeners();
    })
    .catch((error) => {
      sharedConnectionState = HubConnectionState.Disconnected;
      sharedConnectionPromise = null;
      console.error("Failed to connect to score hub", error);
      throw error;
    });

  connection.onreconnecting(() => {
    sharedConnectionState = HubConnectionState.Reconnecting;
    notifyScoreFeedListeners();
  });

  connection.onreconnected(() => {
    sharedConnectionState = HubConnectionState.Connected;
    notifyScoreFeedListeners();
    fixtureSubscribers.forEach((_count, fixtureId) => {
      void connection.invoke("JoinFixtureGroup", fixtureId);
    });
  });

  connection.onclose(() => {
    sharedConnectionState = HubConnectionState.Disconnected;
    sharedConnectionPromise = null;
    notifyScoreFeedListeners();
  });

  return sharedConnectionPromise;
}

function subscribeToScoreFeed(listener: ScoreFeedListener) {
  scoreFeedListeners.add(listener);
  return () => {
    scoreFeedListeners.delete(listener);
  };
}

async function joinFixtureGroup(fixtureId: string) {
  const connection = sharedConnection ?? undefined;
  if (!connection || !fixtureId) return;

  await ensureSharedConnection();
  if (connection.state === HubConnectionState.Connected) {
    await connection.invoke("JoinFixtureGroup", fixtureId);
    console.debug("Joined score fixture group:", fixtureId);
  }
}

export function useScoreUpdateFeed(fixtureId: string) {
  const [feedVersion, setFeedVersion] = useState(0);

  useEffect(() => {
    return subscribeToScoreFeed(() => setFeedVersion((version) => version + 1));
  }, []);

  useEffect(() => {
    if (!fixtureId) return;

    fixtureSubscribers.set(fixtureId, (fixtureSubscribers.get(fixtureId) ?? 0) + 1);
    void ensureSharedConnection()
      .then(() => joinFixtureGroup(fixtureId))
      .catch(() => undefined);

    return () => {
      const count = fixtureSubscribers.get(fixtureId) ?? 0;
      if (count <= 1) {
        fixtureSubscribers.delete(fixtureId);
        if (sharedConnection?.state === HubConnectionState.Connected) {
          void sharedConnection.invoke("LeaveFixtureGroup", fixtureId).catch(() => undefined);
        }
      } else {
        fixtureSubscribers.set(fixtureId, count - 1);
      }
    };
  }, [fixtureId]);

  return {
    scoreByMatch: sharedScoreByMatch,
    connectionState: sharedConnectionState,
    feedVersion,
  };
}

export default useScoreUpdateFeed;