// src/hooks/useFixtureFeed.ts
import { useEffect, useState } from "react";
import { HubConnectionState, type HubConnection } from "@microsoft/signalr";
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

// --- Shape received from backend SignalR (loose, we normalize below) ---
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

// If your REST API for seeding is different, change this.
const FIXTURES_REST_URL = "/api/fixtures";

type FixtureFeedListener = () => void;

let sharedConnection: HubConnection | null = null;
let sharedConnectionPromise: Promise<void> | null = null;
let sharedConnectionState = HubConnectionState.Disconnected;

// Shared state across all hook consumers
let sharedFixturesById: Record<string, Fixture> = {};
let sharedCreatedFixtures: Fixture[] = [];
let sharedUpdatedFixtures: Fixture[] = [];

// Debug breadcrumbs so any component can see what the last raw payload was
let lastRawCreated: unknown = null;
let lastRawUpdated: unknown = null;
let lastEventAt: string | null = null;
let receivedCreatedCount = 0;
let receivedUpdatedCount = 0;

const fixtureFeedListeners = new Set<FixtureFeedListener>();

function notifyFixtureFeedListeners() {
  fixtureFeedListeners.forEach((listener) => listener());
}

function getValue<T>(
  payload: Record<string, unknown>,
  camelCase: string,
  pascalCase: string,
): T | undefined {
  return (payload[camelCase] ?? payload[pascalCase]) as T | undefined;
}

function normalizeFixture(raw: BackendFixturePayload): Fixture | null {
  if (!raw || typeof raw !== "object") return null;

  const id =
    getValue<string>(raw, "id", "Id") ??
    getValue<string>(raw, "fixtureId", "FixtureId");

  if (!id) return null;

  const normalized: Fixture = {
    ...raw,
    id,
    fixtureId: getValue<string>(raw, "fixtureId", "FixtureId") ?? id,
    updatedAtUtc: getValue<string>(raw, "updatedAtUtc", "UpdatedAtUtc"),
  };

  return normalized;
}

function upsertFixture(fixture: Fixture) {
  sharedFixturesById = {
    ...sharedFixturesById,
    [fixture.id]: fixture,
    [fixture.id.toLowerCase()]: fixture,
  };
}

// --- Public event API (optional) ---
export type FixtureEvent = "created" | "updated";
type FixtureEventHandler = (fixture: Fixture) => void;

const fixtureEventHandlers: Record<FixtureEvent, Set<FixtureEventHandler>> = {
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

async function seedFixturesFromRest() {
  try {
    const res = await fetch(FIXTURES_REST_URL, {
      headers: { Accept: "application/json" },
    });
    if (!res.ok) {
      console.warn("[FixtureFeed] REST seed failed with status", res.status);
      return;
    }

    const list = (await res.json()) as BackendFixturePayload[] | { items?: BackendFixturePayload[] };
    const arr: BackendFixturePayload[] = Array.isArray(list)
      ? list
      : Array.isArray((list as any)?.items)
        ? (list as any).items
        : [];

    console.log("[FixtureFeed] REST seed received", arr.length, "fixtures");

    for (const raw of arr) {
      const f = normalizeFixture(raw);
      if (f) upsertFixture(f);
    }

    notifyFixtureFeedListeners();
  } catch (err) {
    console.warn("[FixtureFeed] REST seed failed", err);
  }
}

function ensureSharedConnection() {
  if (sharedConnectionPromise) return sharedConnectionPromise;

  const connection = createCommentaryHubConnection();
  sharedConnection = connection;

  // ---------- FixtureCreated ----------
  connection.on(FIXTURE_CREATED_EVENT, (raw: BackendFixturePayload) => {
    // 👇 Log FIRST so we see the payload even if normalize returns null
    console.log("[RAW] FixtureCreated ←", raw);

    lastRawCreated = raw;
    lastEventAt = new Date().toISOString();
    receivedCreatedCount += 1;

    const fixture = normalizeFixture(raw);
    if (!fixture) {
      console.warn(
        "[FixtureFeed] FixtureCreated could not be normalized (missing id/fixtureId). Raw payload:",
        raw,
      );
      return;
    }

    upsertFixture(fixture);

    // Prepend new fixture to created list
    sharedCreatedFixtures = [fixture, ...sharedCreatedFixtures].slice(0, 100);

    // Fire external handlers
    fixtureEventHandlers.created.forEach((h) => {
      try {
        h(fixture);
      } catch (e) {
        console.error("[FixtureFeed] created handler threw", e);
      }
    });

    console.log("[FixtureFeed] FixtureCreated applied:", fixture.id);
    notifyFixtureFeedListeners();
  });

  // ---------- FixtureUpdated ----------
  connection.on(FIXTURE_UPDATED_EVENT, (raw: BackendFixturePayload) => {
    // 👇 Log FIRST
    console.log("[RAW] FixtureUpdated ←", raw);

    lastRawUpdated = raw;
    lastEventAt = new Date().toISOString();
    receivedUpdatedCount += 1;

    const fixture = normalizeFixture(raw);
    if (!fixture) {
      console.warn(
        "[FixtureFeed] FixtureUpdated could not be normalized (missing id/fixtureId). Raw payload:",
        raw,
      );
      return;
    }

    upsertFixture(fixture);

    // Replace existing entry for the same fixture, keep most recent first
    sharedUpdatedFixtures = [
      fixture,
      ...sharedUpdatedFixtures.filter((f) => f.id !== fixture.id),
    ].slice(0, 100);

    fixtureEventHandlers.updated.forEach((h) => {
      try {
        h(fixture);
      } catch (e) {
        console.error("[FixtureFeed] updated handler threw", e);
      }
    });

    console.log("[FixtureFeed] FixtureUpdated applied:", fixture.id);
    notifyFixtureFeedListeners();
  });

  sharedConnectionPromise = connection
    .start()
    .then(async () => {
      sharedConnectionState = HubConnectionState.Connected;
      console.log("[FixtureFeed] SignalR connected to hub");

      // Seed from REST — do NOT await blocking the connect flow; let it run.
      // We do await here so the caller knows connection is ready, but
      // failures are swallowed inside seedFixturesFromRest.
      await seedFixturesFromRest();

      notifyFixtureFeedListeners();
    })
    .catch((error) => {
      sharedConnectionState = HubConnectionState.Disconnected;
      sharedConnectionPromise = null;
      console.error("[FixtureFeed] Failed to connect to fixture hub", error);
      throw error;
    });

  connection.onreconnecting((err) => {
    sharedConnectionState = HubConnectionState.Reconnecting;
    console.warn("[FixtureFeed] Reconnecting…", err);
    notifyFixtureFeedListeners();
  });

  connection.onreconnected(async () => {
    sharedConnectionState = HubConnectionState.Connected;
    console.log("[FixtureFeed] Reconnected");
    // Re-seed in case we missed events during the outage
    await seedFixturesFromRest();
    notifyFixtureFeedListeners();
  });

  connection.onclose((err) => {
    sharedConnectionState = HubConnectionState.Disconnected;
    sharedConnectionPromise = null;
    console.warn("[FixtureFeed] Connection closed", err);
    notifyFixtureFeedListeners();
  });

  return sharedConnectionPromise;
}

function subscribeToFixtureFeed(listener: FixtureFeedListener) {
  fixtureFeedListeners.add(listener);
  return () => {
    fixtureFeedListeners.delete(listener);
  };
}

export function useFixtureFeed() {
  const [feedVersion, setFeedVersion] = useState(0);

  useEffect(() => {
    return subscribeToFixtureFeed(() => setFeedVersion((v) => v + 1));
  }, []);

  useEffect(() => {
    void ensureSharedConnection().catch(() => undefined);
  }, []);

  return {
    fixturesById: sharedFixturesById,
    createdFixtures: sharedCreatedFixtures,
    updatedFixtures: sharedUpdatedFixtures,
    connectionState: sharedConnectionState,
    feedVersion,

    // Debug info — handy in the FixtureForm console.log
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