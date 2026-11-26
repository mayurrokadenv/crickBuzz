import { useEffect, useState } from "react";
import { HubConnectionState } from "@microsoft/signalr";
import { fixtureService } from "../services/fixturesservice";

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

type FixtureEventHandler = (fixture: Fixture) => void;
export type FixtureEvent = "created" | "updated";

const eventHandlers: Record<FixtureEvent, Set<FixtureEventHandler>> = {
  created: new Set(),
  updated: new Set(),
};

export function onFixtureEvent(
  event: FixtureEvent,
  handler: FixtureEventHandler,
): () => void {
  eventHandlers[event].add(handler);
  return () => eventHandlers[event].delete(handler);
}

async function readFixtureFeed() {
  const fixtures = (await fixtureService.getLiveFixtures()).map((fixture) => ({
    ...fixture,
    fixtureId: fixture.id,
    totalOvers: fixture.totalOvers ? Number(fixture.totalOvers) : undefined,
  }));
  const fixturesById: Record<string, Fixture> = {};
  fixtures.forEach((fixture) => {
    fixturesById[fixture.id] = fixture;
    fixturesById[fixture.id.toLowerCase()] = fixture;
  });
  return { fixtures, fixturesById };
}

export function useFixtureFeed() {
  const [feed, setFeed] = useState<Awaited<ReturnType<typeof readFixtureFeed>>>({ fixtures: [], fixturesById: {} });

  useEffect(() => {
    let active = true;
    const refresh = async () => {
      try {
        const next = await readFixtureFeed();
        if (active) setFeed(next);
      } catch (error: unknown) {
        if (active) console.error("Unable to refresh fixture feed", error);
      }
    };
    void refresh();
    const timer = window.setInterval(refresh, 10000);
    window.addEventListener("crickbuzz-live-feeds-refresh", refresh);
    return () => {
      active = false;
      window.clearInterval(timer);
      window.removeEventListener("crickbuzz-live-feeds-refresh", refresh);
    };
  }, []);

  return {
    fixturesById: feed.fixturesById,
    createdFixtures: feed.fixtures,
    updatedFixtures: [],
    connectionState: HubConnectionState.Disconnected,
    feedVersion: feed.fixtures.length,
    debug: {
      lastRawCreated: null,
      lastRawUpdated: null,
      lastEventAt: null,
      receivedCreatedCount: 0,
      receivedUpdatedCount: 0,
    },
  };
}

export default useFixtureFeed;
