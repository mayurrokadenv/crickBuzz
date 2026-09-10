import { useEffect, useRef, useState } from "react";
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
  homeScore: number;
  homeWickets?: number;
  homeOvers?: string;
  awayOvers?: string;
  awayScore: number;
  awayWickets?: number;
  updatedAtUtc?: string;
  scorecards?: Scorecard[]; // <-- Added this
}

// Shape received from backend SignalR
interface BackendScoreUpdate {
  fixtureId: string;
  homeRuns: number;
  homeOvers?: string;
  awayOvers?: string;
  homeWickets?: number;
  awayRuns: number;
  awayWickets?: number;
  updatedAtUtc?: string;
  scorecards?: Scorecard[]; // <-- Added this
}

const SCORE_EVENT = "ScoreUpdated";

export function useScoreUpdateFeed(fixtureId: string) {
  const [scoreByMatch, setScoreByMatch] = useState<Record<string, ScoreUpdate>>(
    {},
  );

  const [connectionState, setConnectionState] = useState<HubConnectionState>(
    HubConnectionState.Disconnected,
  );

  const connectionRef = useRef<HubConnection | null>(null);
  const joinedFixtureRef = useRef<string | null>(null);

  // ==================================================
  // 1. CREATE SIGNALR CONNECTION
  // ==================================================

  useEffect(() => {
    let cancelled = false;

    const connection = createCommentaryHubConnection();

    connectionRef.current = connection;

    // ==================================================
    // RECEIVE SCORE UPDATE
    // ==================================================

    connection.on(SCORE_EVENT, (update: BackendScoreUpdate) => {
      if (cancelled) return;

      console.log("ScoreUpdated received from SignalR:", update);

      // Backend DTO -> Frontend UI model
      const scoreUpdate: ScoreUpdate = {
        fixtureId: update.fixtureId,
        homeScore: update.homeRuns,
        homeWickets: update.homeWickets,
        awayScore: update.awayRuns,
        awayWickets: update.awayWickets,
        homeOvers: update.homeOvers,
        awayOvers: update.awayOvers,
        updatedAtUtc: update.updatedAtUtc,
        scorecards: update.scorecards, // <-- Added this to pass the payload forward
      };

      setScoreByMatch((previous) => ({
        ...previous,
        [scoreUpdate.fixtureId]: scoreUpdate,
      }));

      console.log("ScoreUpdated applied to scoreByMatch state:", scoreUpdate, "New state:", {
        ...scoreByMatch,
        [scoreUpdate.fixtureId]: scoreUpdate,
      });
    });

    // ==================================================
    // RECONNECTING
    // ==================================================

    connection.onreconnecting(() => {
      if (cancelled) return;

      console.log("Score SignalR reconnecting...");

      setConnectionState(HubConnectionState.Reconnecting);
    });

    // ==================================================
    // RECONNECTED
    // ==================================================

    connection.onreconnected(() => {
      if (cancelled) return;

      console.log("Score SignalR reconnected");

      setConnectionState(HubConnectionState.Connected);
    });

    // ==================================================
    // CONNECTION CLOSED
    // ==================================================

    connection.onclose(() => {
      if (cancelled) return;

      console.log("Score SignalR disconnected");

      setConnectionState(HubConnectionState.Disconnected);
    });

    // ==================================================
    // START CONNECTION
    // ==================================================

    connection
      .start()
      .then(() => {
        if (cancelled) return;

        console.log("Score SignalR connected");

        setConnectionState(HubConnectionState.Connected);
      })
      .catch((error) => {
        if (cancelled) return;

        console.error("Failed to connect to score hub", error);

        setConnectionState(HubConnectionState.Disconnected);
      });

    // ==================================================
    // CLEANUP
    // ==================================================

    return () => {
      cancelled = true;

      connectionRef.current = null;
      joinedFixtureRef.current = null;

      connection.off(SCORE_EVENT);

      if (connection.state !== HubConnectionState.Disconnected) {
        connection.stop();
      }
    };
  }, []);

  // ==================================================
  // 2. JOIN FIXTURE GROUP
  // ==================================================

  useEffect(() => {
    const connection = connectionRef.current;

    if (
      !connection ||
      !fixtureId ||
      connectionState !== HubConnectionState.Connected
    ) {
      return;
    }

    const previousFixtureId = joinedFixtureRef.current;

    const switchGroup = async () => {
      try {
        // Leave previous fixture group
        if (previousFixtureId && previousFixtureId !== fixtureId) {
          await connection.invoke("LeaveFixtureGroup", previousFixtureId);

          console.log("Left score fixture group:", previousFixtureId);
        }

        // Join current fixture group
        await connection.invoke("JoinFixtureGroup", fixtureId);

        joinedFixtureRef.current = fixtureId;

        console.log("Joined score fixture group:", fixtureId);
      } catch (error) {
        console.error("Failed to switch fixture group for score feed", error);
      }
    };

    switchGroup();
  }, [fixtureId, connectionState]);

  // ==================================================
  // RETURN
  // ==================================================

  return {
    scoreByMatch,
    connectionState,
  };
}

export default useScoreUpdateFeed;