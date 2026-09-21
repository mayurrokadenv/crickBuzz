import { useEffect, useState } from "react";
import { HubConnectionState, type HubConnection } from "@microsoft/signalr";
import { createCommentaryHubConnection } from "../lib/signalrClient";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "/api";

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
  phase?: string;
  homeRuns: number;
  homeOvers?: string;
  awayOvers?: string;
  homeWickets?: number;
  awayRuns: number;
  awayWickets?: number;
  updatedAtUtc?: string;
  scorecards?: Scorecard[] | Record<string, Scorecard | null>;
  commentary?: unknown[];
  topPerformers?: unknown[];
  status?: string;
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

/**
 * Merges a partial update into the cached snapshot for a fixture.
 *
 * IMPORTANT: every field here falls back to `previous` explicitly with `??`.
 * Do NOT rely on `{...previous, ...update}` alone for identity/structural
 * fields (battingTeamId, phase, scorecards, ...) — if a given push omits a
 * field, or explicitly sends it as undefined, a naive spread will either
 * silently keep the stale value (key absent) or wipe out a good value with
 * undefined (key present but empty). Both have bitten us: `battingTeamId`
 * got stuck on the 1st-innings team because refreshFixtureSnapshot never
 * included the key at all, so the innings never appeared to "reset".
 */
function mergeScoreUpdate(fixtureId: string, update: Partial<ScoreUpdate>): ScoreUpdate {
  const previous = sharedScoreByMatch[fixtureId] ?? sharedScoreByMatch[fixtureId.toLowerCase()];
  return {
    ...previous,
    ...update,
    fixtureId,
    homeScore: update.homeScore ?? previous?.homeScore ?? 0,
    awayScore: update.awayScore ?? previous?.awayScore ?? 0,
    homeWickets: update.homeWickets ?? previous?.homeWickets,
    awayWickets: update.awayWickets ?? previous?.awayWickets,
    homeOvers: update.homeOvers ?? previous?.homeOvers,
    awayOvers: update.awayOvers ?? previous?.awayOvers,
    battingTeamId: update.battingTeamId ?? previous?.battingTeamId,
    phase: update.phase ?? previous?.phase,
    status: update.status ?? previous?.status,
    scorecards: update.scorecards ?? previous?.scorecards,
    commentary: update.commentary ?? previous?.commentary,
    topPerformers: update.topPerformers ?? previous?.topPerformers,
    partnerShip: update.partnerShip ?? previous?.partnerShip,
    recentOvsStats: update.recentOvsStats ?? previous?.recentOvsStats,
    updatedAtUtc: update.updatedAtUtc ?? previous?.updatedAtUtc,
  };
}

async function refreshFixtureSnapshot(fixtureId: string) {
  try {
    const response = await fetch(`${API_BASE_URL}/fixtures/${fixtureId}`, {
      headers: { Accept: "application/json" },
    });
    if (!response.ok) return;

    const raw = (await response.json()) as Record<string, unknown>;
    const snapshot = mergeScoreUpdate(fixtureId, {
      fixtureId,
      battingTeamId: (raw.battingTeamId ?? raw.BattingTeamId) as string | undefined,
      phase: (raw.phase ?? raw.Phase) as string | undefined,
      homeScore: getUpdateValue<number>(raw as unknown as BackendScoreUpdate, "homeRuns", "HomeRuns") ??
        (raw.homeScore as number | undefined),
      awayScore: getUpdateValue<number>(raw as unknown as BackendScoreUpdate, "awayRuns", "AwayRuns") ??
        (raw.awayScore as number | undefined),
      homeWickets: (raw.homeWickets ?? raw.HomeWickets) as number | undefined,
      awayWickets: (raw.awayWickets ?? raw.AwayWickets) as number | undefined,
      homeOvers: (raw.homeOvers ?? raw.HomeOvers) as string | undefined,
      awayOvers: (raw.awayOvers ?? raw.AwayOvers) as string | undefined,
      scorecards: (raw.scorecards ?? raw.Scorecards) as ScoreUpdate["scorecards"],
      commentary: (raw.commentary ?? raw.Commentary) as unknown[] | undefined,
      topPerformers: (raw.topPerformers ?? raw.TopPerformers) as unknown[] | undefined,
      status: (raw.status ?? raw.Status) as string | undefined,
      partnerShip: (raw.partnerShip ?? raw.PartnerShip) as ScoreUpdate["partnerShip"],
      recentOvsStats: (raw.recentOvsStats ?? raw.RecentOvsStats) as string | undefined,
    });

    sharedScoreByMatch = {
      ...sharedScoreByMatch,
      [fixtureId]: snapshot,
      [fixtureId.toLowerCase()]: snapshot,
    };
    notifyScoreFeedListeners();
  } catch (error) {
    console.debug("Unable to refresh fixture snapshot:", fixtureId, error);
  }
}

function ensureSharedConnection() {
  if (sharedConnectionPromise) return sharedConnectionPromise;

  const connection = createCommentaryHubConnection();
  sharedConnection = connection;

  connection.on(SCORE_EVENT, (update: BackendScoreUpdate) => {
    const fixtureId = getUpdateValue<string>(update, "fixtureId", "FixtureId");
    if (!fixtureId) return;

    console.debug("ScoreUpdated received for fixture:", fixtureId, update);

    const scoreUpdate = mergeScoreUpdate(fixtureId, {
      fixtureId,
      battingTeamId: getUpdateValue<string>(update, "battingTeamId", "BattingTeamId"),
      phase: getUpdateValue<string>(update, "phase", "Phase"),
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
      commentary: getUpdateValue<unknown[]>(update, "commentary", "Commentary"),
      topPerformers: getUpdateValue<unknown[]>(update, "topPerformers", "TopPerformers"),
      status: getUpdateValue<string>(update, "status", "Status"),
    });

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
      void joinFixtureGroup(fixtureId).then(() => refreshFixtureSnapshot(fixtureId));
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
      .then(() => refreshFixtureSnapshot(fixtureId))
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