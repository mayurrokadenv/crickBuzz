// src/hooks/useFixtureFeed.ts
 
import { useEffect, useState } from "react";
import {
  HubConnectionState,
  type HubConnection,
} from "@microsoft/signalr";
 
import { createCommentaryHubConnection } from "../lib/signalrClient";
 
// --- Shape used by UI ---
 
export interface Fixture {
  id: string;
  fixtureId?: string;
  homeTeamId?: string;
  homeTeamName?: string;
  awayTeamId?: string;
  awayTeamName?: string;
  status?: string;
  startTimeUtc?: string;
  scheduledAtUtc?: string;
  venue?: string;
  totalOvers?: number;
  seriesId?: string | null;
  updatedAtUtc?: string;
  [key: string]: unknown;
}
 
export interface FixtureFeedState {
  fixturesById: Record<string, Fixture>;
  createdFixtures: Fixture[];
  updatedFixtures: Fixture[];
}
 
// --- Shape received from backend SignalR ---
 
interface BackendFixturePayload {
  id?: string;
  Id?: string;
  fixtureId?: string;
  FixtureId?: string;
  updatedAtUtc?: string;
  UpdatedAtUtc?: string;
  [key: string]: unknown;
}
 
const FIXTURE_CREATED_EVENT = "FixtureCreated";
const FIXTURE_UPDATED_EVENT = "FixtureUpdated";
 
const FIXTURES_REST_URL = "/api/fixtures";
 
type FixtureFeedListener = () => void;
 
// --- Shared SignalR connection ---
 
let sharedConnection: HubConnection | null = null;
 
let sharedConnectionPromise: Promise<void> | null = null;
 
let sharedConnectionState =
  HubConnectionState.Disconnected;
 
// --- Shared state across all hook consumers ---
 
let sharedFixturesById: Record<string, Fixture> = {};
 
let sharedCreatedFixtures: Fixture[] = [];
 
let sharedUpdatedFixtures: Fixture[] = [];
 
// --- Debug breadcrumbs ---
 
let lastRawCreated: unknown = null;
 
let lastRawUpdated: unknown = null;
 
let lastEventAt: string | null = null;
 
let receivedCreatedCount = 0;
 
let receivedUpdatedCount = 0;
 
// --- Subscribers ---
 
const fixtureFeedListeners =
  new Set<FixtureFeedListener>();
 
function notifyFixtureFeedListeners() {
  fixtureFeedListeners.forEach((listener) => {
    listener();
  });
}
 
// --- Generic property reader ---
 
function getValue<T>(
  payload: Record<string, unknown>,
  camelCase: string,
  pascalCase: string,
): T | undefined {
  return (
    payload[camelCase] ??
    payload[pascalCase]
  ) as T | undefined;
}
 
// --- Normalize fixture ---
 
function normalizeFixture(
  raw: BackendFixturePayload,
): Fixture | null {
  if (!raw || typeof raw !== "object") {
    return null;
  }
 
  const id =
    getValue<string>(raw, "id", "Id") ??
    getValue<string>(
      raw,
      "fixtureId",
      "FixtureId",
    );
 
  if (!id) {
    return null;
  }
 
  const normalized: Fixture = {
    ...raw,
 
    id,
 
    fixtureId:
      getValue<string>(
        raw,
        "fixtureId",
        "FixtureId",
      ) ?? id,
 
    updatedAtUtc:
      getValue<string>(
        raw,
        "updatedAtUtc",
        "UpdatedAtUtc",
      ),
  };
 
  return normalized;
}
 
// --- Upsert fixture ---
 
function upsertFixture(fixture: Fixture) {
  sharedFixturesById = {
    ...sharedFixturesById,
 
    [fixture.id]: fixture,
 
    [fixture.id.toLowerCase()]: fixture,
  };
}
 
// --- Public event API ---
 
export type FixtureEvent =
  | "created"
  | "updated";
 
type FixtureEventHandler = (
  fixture: Fixture,
) => void;
 
const fixtureEventHandlers: Record<
  FixtureEvent,
  Set<FixtureEventHandler>
> = {
  created: new Set(),
 
  updated: new Set(),
};
 
export function onFixtureEvent(
  event: FixtureEvent,
  handler: FixtureEventHandler,
): () => void {
  fixtureEventHandlers[event].add(handler);
 
  return () => {
    fixtureEventHandlers[event].delete(handler);
  };
}
 
// =========================================================
// REST SEED
// =========================================================
 
async function seedFixturesFromRest() {
  try {
    const res = await fetch(
      FIXTURES_REST_URL,
      {
        headers: {
          Accept: "application/json",
        },
      },
    );
 
    if (!res.ok) {
      console.warn(
        "[FixtureFeed] REST seed failed with status",
        res.status,
      );
 
      return;
    }
 
    const list =
      (await res.json()) as
        | BackendFixturePayload[]
        | {
            items?: BackendFixturePayload[];
          };
 
    const arr: BackendFixturePayload[] =
      Array.isArray(list)
        ? list
        : Array.isArray(
              (list as any)?.items,
            )
          ? (list as any).items
          : [];
 
    console.log(
      "[FixtureFeed] REST seed received",
      arr.length,
      "fixtures",
    );
 
    for (const raw of arr) {
      const fixture =
        normalizeFixture(raw);
 
      if (fixture) {
        upsertFixture(fixture);
      }
    }
 
    notifyFixtureFeedListeners();
  } catch (error) {
    console.warn(
      "[FixtureFeed] REST seed failed",
      error,
    );
  }
}
 
// =========================================================
// JOIN FIXTURE GROUPS
// =========================================================
 
async function joinAllFixtureGroups() {
  const connection = sharedConnection;
 
  if (!connection) {
    console.warn(
      "[FixtureFeed] Cannot join groups: connection missing",
    );
 
    return;
  }
 
  if (
    connection.state !==
    HubConnectionState.Connected
  ) {
    console.warn(
      "[FixtureFeed] Cannot join groups: connection is not connected",
      connection.state,
    );
 
    return;
  }
 
  // Because fixturesById contains both original and lowercase keys,
  // use a case-insensitive Map to avoid duplicate joins.
 
  const uniqueFixtureIds = new Map<
    string,
    string
>();
 
  Object.values(sharedFixturesById).forEach(
    (fixture) => {
      const fixtureId =
        fixture.fixtureId ?? fixture.id;
 
      if (!fixtureId) {
        return;
      }
 
      const normalizedId =
        fixtureId.toLowerCase();
 
      if (
        !uniqueFixtureIds.has(normalizedId)
      ) {
        uniqueFixtureIds.set(
          normalizedId,
          fixtureId,
        );
      }
    },
  );
 
  console.log(
    "[FixtureFeed] Joining fixture groups:",
    [...uniqueFixtureIds.values()],
  );
 
  for (const fixtureId of uniqueFixtureIds.values()) {
    try {
      await connection.invoke(
        "JoinFixtureGroup",
        fixtureId,
      );
 
      console.log(
        "[FixtureFeed] Joined fixture group:",
        fixtureId,
      );
    } catch (error) {
      console.error(
        "[FixtureFeed] Failed to join fixture group:",
        fixtureId,
        error,
      );
    }
  }
}
 
// =========================================================
// SHARED CONNECTION
// =========================================================
 
function ensureSharedConnection() {
  if (sharedConnectionPromise) {
    return sharedConnectionPromise;
  }
 
  const connection =
    createCommentaryHubConnection();
 
  sharedConnection = connection;
 
  // =======================================================
  // FIXTURE CREATED
  // Existing logic intentionally kept unchanged
  // =======================================================
 
  connection.on(
    FIXTURE_CREATED_EVENT,
    (raw: BackendFixturePayload) => {
      console.log(
        "[RAW] FixtureCreated ←",
        raw,
      );
 
      lastRawCreated = raw;
 
      lastEventAt =
        new Date().toISOString();
 
      receivedCreatedCount += 1;
 
      const fixture =
        normalizeFixture(raw);
 
      if (!fixture) {
        console.warn(
          "[FixtureFeed] FixtureCreated could not be normalized (missing id/fixtureId). Raw payload:",
          raw,
        );
 
        return;
      }
 
      upsertFixture(fixture);
 
      sharedCreatedFixtures = [
        fixture,
        ...sharedCreatedFixtures,
      ].slice(0, 100);
 
      fixtureEventHandlers.created.forEach(
        (handler) => {
          try {
            handler(fixture);
          } catch (error) {
            console.error(
              "[FixtureFeed] created handler threw",
              error,
            );
          }
        },
      );
 
      console.log(
        "[FixtureFeed] FixtureCreated applied:",
        fixture.id,
      );
 
      notifyFixtureFeedListeners();
    },
  );
 
  // =======================================================
  // FIXTURE UPDATED
  // =======================================================
 
  connection.on(
    FIXTURE_UPDATED_EVENT,
    (raw: BackendFixturePayload) => {
      // Log FIRST to confirm whether event reached frontend
 
      console.log(
        "[RAW] FixtureUpdated ←",
        raw,
      );
 
      lastRawUpdated = raw;
 
      lastEventAt =
        new Date().toISOString();
 
      receivedUpdatedCount += 1;
 
      const fixture =
        normalizeFixture(raw);
 
      if (!fixture) {
        console.warn(
          "[FixtureFeed] FixtureUpdated could not be normalized (missing id/fixtureId). Raw payload:",
          raw,
        );
 
        return;
      }
 
      upsertFixture(fixture);
 
      sharedUpdatedFixtures = [
        fixture,
 
        ...sharedUpdatedFixtures.filter(
          (existingFixture) =>
            existingFixture.id.toLowerCase() !==
            fixture.id.toLowerCase(),
        ),
      ].slice(0, 100);
 
      fixtureEventHandlers.updated.forEach(
        (handler) => {
          try {
            handler(fixture);
          } catch (error) {
            console.error(
              "[FixtureFeed] updated handler threw",
              error,
            );
          }
        },
      );
 
      console.log(
        "[FixtureFeed] FixtureUpdated applied:",
        fixture.id,
      );
 
      notifyFixtureFeedListeners();
    },
  );
 
  // =======================================================
  // START CONNECTION
  // =======================================================
 
  sharedConnectionPromise = connection
    .start()
    .then(async () => {
      sharedConnectionState =
        HubConnectionState.Connected;
 
      console.log(
        "[FixtureFeed] SignalR connected to hub",
      );
 
      // 1. Load existing fixtures from REST
      await seedFixturesFromRest();
 
      // 2. Join groups of existing fixtures
      await joinAllFixtureGroups();
 
      notifyFixtureFeedListeners();
    })
    .catch((error) => {
      sharedConnectionState =
        HubConnectionState.Disconnected;
 
      sharedConnectionPromise = null;
 
      console.error(
        "[FixtureFeed] Failed to connect to fixture hub",
        error,
      );
 
      throw error;
    });
 
  // =======================================================
  // RECONNECTING
  // =======================================================
 
  connection.onreconnecting((error) => {
    sharedConnectionState =
      HubConnectionState.Reconnecting;
 
    console.warn(
      "[FixtureFeed] Reconnecting…",
      error,
    );
 
    notifyFixtureFeedListeners();
  });
 
  // =======================================================
  // RECONNECTED
  // =======================================================
 
  connection.onreconnected(async () => {
    sharedConnectionState =
      HubConnectionState.Connected;
 
    console.log(
      "[FixtureFeed] Reconnected",
    );
 
    // Refresh fixture data
    await seedFixturesFromRest();
 
    // Rejoin fixture groups after reconnect
    await joinAllFixtureGroups();
 
    notifyFixtureFeedListeners();
  });
 
  // =======================================================
  // CONNECTION CLOSED
  // =======================================================
 
  connection.onclose((error) => {
    sharedConnectionState =
      HubConnectionState.Disconnected;
 
    sharedConnectionPromise = null;
 
    console.warn(
      "[FixtureFeed] Connection closed",
      error,
    );
 
    notifyFixtureFeedListeners();
  });
 
  return sharedConnectionPromise;
}
 
// =========================================================
// SUBSCRIBE
// =========================================================
 
function subscribeToFixtureFeed(
  listener: FixtureFeedListener,
) {
  fixtureFeedListeners.add(listener);
 
  return () => {
    fixtureFeedListeners.delete(listener);
  };
}
 
// =========================================================
// HOOK
// =========================================================
 
export function useFixtureFeed() {
  const [feedVersion, setFeedVersion] =
    useState(0);
 
  useEffect(() => {
    return subscribeToFixtureFeed(() => {
      setFeedVersion(
        (version) => version + 1,
      );
    });
  }, []);
 
  useEffect(() => {
    void ensureSharedConnection().catch(
      () => undefined,
    );
  }, []);
 
  return {
    fixturesById: sharedFixturesById,
 
    createdFixtures: sharedCreatedFixtures,
 
    updatedFixtures: sharedUpdatedFixtures,
 
    connectionState: sharedConnectionState,
 
    feedVersion,
 
    debug: {
      lastRawCreated,
 
      lastRawUpdated,
 
      lastEventAt,
 
      receivedCreatedCount,
 
      receivedUpdatedCount,
    },
  };
}
 
export default useFixtureFeed;