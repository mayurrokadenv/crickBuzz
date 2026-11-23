import axios from "axios";
import type { FixtureDetailsDto, FixtureSetScoreDto } from "../components/types/FixtureDetails";

// Badminton / Pickleball fixture status, phase and scores, saved on the server
// (/api/racquet-matches) instead of browser local storage.
//
// Screens read synchronously from an in-memory copy (cache) of the server data.
// The cache is filled from the API, and every change fires the same window events the
// screens already listen to, so they re-render with the new values.

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "/api";
const api = axios.create({
  baseURL: `${API_BASE_URL}/racquet-matches`,
  headers: { Accept: "*/*" },
});

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
const lastSavedAt = new Map<string, number>();

// ---------- Reading (from the cache) ----------

export function getCachedRacquetMatch(fixtureId: string): RacquetMatch | null {
  return cache.get(fixtureId) ?? null;
}

export function getAllCachedRacquetMatches(): RacquetMatch[] {
  return [...cache.values()];
}

// ---------- Loading from the server ----------

let loadAllPromise: Promise<void> | null = null;

// Loads every saved Badminton/Pickleball match into the cache.
export function loadRacquetMatches(): Promise<void> {
  if (!loadAllPromise) {
    const startedAt = Date.now();
    // A fixture saved while this request was running already has newer data in the cache.
    const savedSinceStart = (fixtureId: string) =>
      (lastSavedAt.get(fixtureId) ?? 0) >= startedAt;

    loadAllPromise = api
      .get<RacquetMatch[]>("")
      .then((response) => {
        const ids = new Set(response.data.map((match) => match.fixtureId));
        for (const fixtureId of [...cache.keys()]) {
          if (!ids.has(fixtureId) && !savedSinceStart(fixtureId)) removeFromCache(fixtureId);
        }
        response.data
          .filter((match) => !savedSinceStart(match.fixtureId))
          .forEach(putInCache);
      })
      .finally(() => {
        loadAllPromise = null;
      });
  }
  return loadAllPromise;
}

// Loads one match into the cache. Returns null when it has not been created yet (404).
export async function loadRacquetMatch(fixtureId: string): Promise<RacquetMatch | null> {
  try {
    const response = await api.get<RacquetMatch>(`/${fixtureId}`);
    putInCache(response.data);
    return response.data;
  } catch (error: unknown) {
    if (axios.isAxiosError(error) && error.response?.status === 404) {
      removeFromCache(fixtureId);
      return null;
    }
    throw error;
  }
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

// ---------- Saving to the server ----------

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
      const isNew = saved === null;
      const body = change(saved ?? (await newRacquetMatch(fixtureId)));

      try {
        const response = isNew
          ? await api.post<RacquetMatch>("", body)
          : await api.put<RacquetMatch>(`/${fixtureId}`, body);
        lastSavedAt.set(fixtureId, Date.now());
        putInCache(response.data);
        return response.data;
      } catch (error: unknown) {
        // Show the server's values again (the save was rejected), then report the reason.
        await loadRacquetMatch(fixtureId).catch(() => null);
        throw new Error(getErrorMessage(error));
      }
    });

  saveQueues.set(fixtureId, next);
  return next;
}

export async function deleteRacquetMatch(fixtureId: string): Promise<void> {
  await api.delete(`/${fixtureId}`);
  removeFromCache(fixtureId);
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
  const response = await axios.get<FixtureDetailsDto>(`${API_BASE_URL}/fixtures/${fixtureId}`);
  const details = response.data;

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
      sportId: details.sportId,
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

function getErrorMessage(error: unknown) {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as
      | { detail?: string; errors?: Record<string, string[]> }
      | undefined;
    if (data?.errors) return Object.values(data.errors).flat().join(" ");
    if (data?.detail) return data.detail;
  }
  return error instanceof Error ? error.message : "Unable to save the match.";
}
