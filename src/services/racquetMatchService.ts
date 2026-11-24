import type { FixtureSetScoreDto } from "../components/types/FixtureDetails";
import {
  readLocalAppData,
  updateLocalAppData,
} from "./localAppStore";
import { advanceSeriesBracket } from "./SeriesService";
import { assertRacquetSetCanGoLive } from "../utils/localRacquetSports";

// Racquet match data is persisted in local storage and mirrored in memory for synchronous reads.

// How often other screens/browsers pick up changes made somewhere else.
const SYNC_INTERVAL_MS = 5000;

export const BADMINTON_LOCAL_FIXTURE_CHANGED_EVENT =
  "crickbuzz-badminton-local-fixture-changed";
export const BADMINTON_LOCAL_SCORE_CHANGED_EVENT =
  "crickbuzz-badminton-local-score-changed";
const LIVE_FEEDS_REFRESH_EVENT = "crickbuzz-live-feeds-refresh";

export interface RacquetMatchFixture {
  status: string;
  phase: string;
  statusValue: number;
  phaseValue: number;
  scheduledAtUtc: string;
  battingTeamId: string | null;
  sportId: string;
  homeTeamId: string;
  awayTeamId: string;
  homeTeamName: string;
  awayTeamName: string;
  winningTeamId?: string | null;
}

export interface RacquetMatchScore {
  currentSet: number;
  isLive: boolean;
  sets: FixtureSetScoreDto[];
  // Doubles: { "<playerId>": { 1: 5, 2: 3 } } = points per player per game.
  playerPoints: Record<string, Record<number, number>>;
  gamesWonA?: number;
  gamesWonB?: number;
  isMatchComplete?: boolean;
}

export interface RacquetMatch {
  fixtureId: string;
  sport: string;
  fixture: RacquetMatchFixture;
  score: RacquetMatchScore;
}

const cache = new Map<string, RacquetMatch>();

// When each fixture was last saved from this browser (used to ignore older background reloads).
// ---------- Reading (from the cache) ----------

export function getCachedRacquetMatch(fixtureId: string): RacquetMatch | null {
  const cached = cache.get(fixtureId);
  if (cached) return cached;
  const match =
    readLocalAppData().racquetMatches.find((item) => item.fixtureId === fixtureId) ??
    null;
  if (match) cache.set(fixtureId, match);
  return match;
}

export function getAllCachedRacquetMatches(): RacquetMatch[] {
  const matches = readLocalAppData().racquetMatches;
  matches.forEach(putInCache);
  return matches;
}

// ---------- Loading from local storage ----------

let loadAllPromise: Promise<void> | null = null;

// Loads every saved Badminton/Pickleball match into the cache.
export function loadRacquetMatches(): Promise<void> {
  if (!loadAllPromise) {
    loadAllPromise = Promise.resolve().then(() => {
      const matches = readLocalAppData().racquetMatches;
      const ids = new Set(matches.map((match) => match.fixtureId));
      for (const fixtureId of [...cache.keys()]) {
        if (!ids.has(fixtureId)) removeFromCache(fixtureId);
      }
      matches.forEach(putInCache);
    }).finally(() => {
        loadAllPromise = null;
      });
  }
  return loadAllPromise;
}

// Loads one match into the cache. Returns null when it has not been created yet.
export async function loadRacquetMatch(fixtureId: string): Promise<RacquetMatch | null> {
  const match =
    readLocalAppData().racquetMatches.find((item) => item.fixtureId === fixtureId) ??
    null;
  if (match) putInCache(match);
  else removeFromCache(fixtureId);
  return match;
}

// Keeps all screens and browsers in sync: reload now and every few seconds.
let syncStarted = false;
export function startRacquetMatchSync() {
  if (syncStarted) return;
  syncStarted = true;

  const sync = () => {
    loadRacquetMatches().catch((error: unknown) =>
      console.error("Failed to load racquet matches", error),
    );
  };

  sync();
  window.setInterval(sync, SYNC_INTERVAL_MS);
  window.addEventListener("focus", sync);
}

// ---------- Saving to local storage ----------

// Saves for the same fixture run one after another, so quick clicks never overtake each other.
const saveQueues = new Map<string, Promise<unknown>>();

// Creates the record (POST) the first time, then updates it (PUT) with the full resource.
// "change" receives the latest saved match and returns what should be saved.
export function saveRacquetMatch(
  fixtureId: string,
  change: (current: RacquetMatch) => RacquetMatch,
): Promise<RacquetMatch> {
  const previous = saveQueues.get(fixtureId) ?? Promise.resolve();

  const next = previous
    .catch(() => undefined)
    .then(async () => {
      const saved = cache.get(fixtureId) ?? (await loadRacquetMatch(fixtureId));
      const body = change(saved ?? (await newRacquetMatch(fixtureId)));
      if (
        saved?.fixture.status.toLowerCase() === "completed" &&
        body.fixture.status.toLowerCase() === "live"
      ) {
        throw new Error("A completed match cannot be set live again.");
      }
      assertRacquetSetCanGoLive(
        body.sport,
        body.fixture.status,
        body.fixture.phase,
        body.score.sets,
      );
      const stored = updateLocalAppData((data) => {
        const index = data.racquetMatches.findIndex(
          (match) => match.fixtureId === fixtureId,
        );
        if (index >= 0) data.racquetMatches[index] = body;
        else data.racquetMatches.push(body);

        const fixture = data.fixtures.find((item) => item.id === fixtureId);
        if (fixture) {
          const activeSet = body.score.sets.find(
            (set) => set.setNumber === body.score.currentSet,
          );
          Object.assign(fixture, {
            status: body.fixture.status,
            phase: body.fixture.phase,
            scheduledAtUtc: body.fixture.scheduledAtUtc,
            battingTeamId: body.fixture.battingTeamId ?? fixture.battingTeamId,
            winningTeamId: body.fixture.winningTeamId ?? fixture.winningTeamId,
            homeScore: activeSet?.teamA ?? fixture.homeScore,
            awayScore: activeSet?.teamB ?? fixture.awayScore,
          });
          advanceSeriesBracket(data, fixtureId);
        }
        return body;
      });
      putInCache(stored);
      return stored;
    });

  saveQueues.set(fixtureId, next);
  return next;
}

export async function deleteRacquetMatch(fixtureId: string): Promise<void> {
  updateLocalAppData((data) => {
    data.racquetMatches = data.racquetMatches.filter(
      (match) => match.fixtureId !== fixtureId,
    );
  });
  removeFromCache(fixtureId);
}

export function clearRacquetMatchCache(fixtureIds: string[]) {
  fixtureIds.forEach(removeFromCache);
}

// ---------- Helpers ----------

function putInCache(match: RacquetMatch) {
  const before = cache.get(match.fixtureId);
  cache.set(match.fixtureId, match);

  if (!before || JSON.stringify(before.fixture) !== JSON.stringify(match.fixture)) {
    notify(BADMINTON_LOCAL_FIXTURE_CHANGED_EVENT, match.fixtureId);
    window.dispatchEvent(new CustomEvent(LIVE_FEEDS_REFRESH_EVENT));
  }
  if (!before || JSON.stringify(before.score) !== JSON.stringify(match.score)) {
    notify(BADMINTON_LOCAL_SCORE_CHANGED_EVENT, match.fixtureId);
  }
}

function removeFromCache(fixtureId: string) {
  if (!cache.delete(fixtureId)) return;
  notify(BADMINTON_LOCAL_FIXTURE_CHANGED_EVENT, fixtureId);
  notify(BADMINTON_LOCAL_SCORE_CHANGED_EVENT, fixtureId);
}

function notify(eventName: string, fixtureId: string) {
  window.dispatchEvent(new CustomEvent(eventName, { detail: { fixtureId } }));
}

// First save of a fixture: start from the fixture's current status/phase and 0-0 in all games.
async function newRacquetMatch(fixtureId: string): Promise<RacquetMatch> {
  const details = readLocalAppData().fixtures.find(
    (fixture) => fixture.id === fixtureId,
  );
  if (!details) throw new Error("Fixture not found in local data.");

  return {
    fixtureId,
    sport: details.sport,
    fixture: {
      status: details.status,
      phase: "Set1",
      statusValue: toStatusValue(details.status),
      phaseValue: toPhaseValue(details.phase),
      scheduledAtUtc: details.scheduledAtUtc,
      battingTeamId: null,
      sportId: details.sportId ?? "",
      homeTeamId: details.homeTeamId,
      awayTeamId: details.awayTeamId,
      homeTeamName: details.homeTeamName,
      awayTeamName: details.awayTeamName,
    },
    score: {
      currentSet: 1,
      isLive: false,
      sets: [1, 2, 3].map((setNumber) => ({ setNumber, teamA: 0, teamB: 0 })),
      playerPoints: {},
    },
  };
}

function toStatusValue(status?: string | null) {
  const statuses = ["scheduled", "live", "completed", "postponed", "cancelled"];
  const index = statuses.indexOf((status ?? "").toLowerCase());
  return index >= 0 ? index : 0;
}

// Set1 / FirstSet -> 2, Set2 / SecondSet -> 3, Set3 / ThirdSet -> 5.
function toPhaseValue(phase?: string | null) {
  const normalized = (phase ?? "").toLowerCase().replace(/[\s_-]/g, "");
  if (normalized === "set2" || normalized === "secondset") return 3;
  if (normalized === "set3" || normalized === "thirdset") return 5;
  return 2;
}
