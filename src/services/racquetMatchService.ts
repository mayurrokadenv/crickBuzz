import type { FixtureSetScoreDto } from "../components/types/FixtureDetails";
import axios from "axios";

const api = axios.create({ baseURL: import.meta.env.VITE_API_BASE_URL || "/api" });
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) config.headers.set("Authorization", `Bearer ${token}`);
  return config;
});

// Scores are persisted by the API. This cache supports synchronous UI reads.

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
  version?: string;
}

const cache = new Map<string, RacquetMatch>();

// ---------- Reading (from the cache) ----------

export function getCachedRacquetMatch(fixtureId: string): RacquetMatch | null {
  return cache.get(fixtureId) ?? null;
}

export function getAllCachedRacquetMatches(): RacquetMatch[] {
  return [...cache.values()];
}

let loadAllPromise: Promise<void> | null = null;

export function loadRacquetMatches(): Promise<void> {
  if (!loadAllPromise) {
    loadAllPromise = api.get<RacquetMatch[]>("/racquet-matches").then(({ data }) => {
      const ids = new Set(data.map(match => match.fixtureId));
      for (const id of cache.keys()) {
        if (!ids.has(id) && !saveQueues.has(id)) removeFromCache(id);
      }
      data.forEach(putInCache);
    }).finally(() => { loadAllPromise = null; });
  }
  return loadAllPromise;
}

export async function loadRacquetMatch(fixtureId: string): Promise<RacquetMatch | null> {
  const { status, data } = await api.get<RacquetMatch>(`/racquet-matches/${fixtureId}`, {
    validateStatus: (status) => status === 200 || status === 404,
  });
  if (status === 404) {
    removeFromCache(fixtureId);
    return null;
  }
  putInCache(data);
  return data;
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

// ---------- Saving to the API ----------

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
      const saved = await loadRacquetMatch(fixtureId);
      const body = { ...change(saved ?? (await newRacquetMatch(fixtureId))), version: saved?.version };
      const { data } = saved
        ? await api.put<RacquetMatch>(`/racquet-matches/${fixtureId}`, body)
        : await api.post<RacquetMatch>("/racquet-matches", body);
      putInCache(data);
      return data;
    });

  saveQueues.set(fixtureId, next);
  const clearQueue = () => {
    if (saveQueues.get(fixtureId) === next) saveQueues.delete(fixtureId);
  };
  void next.then(clearQueue, clearQueue);
  return next;
}

export async function deleteRacquetMatch(fixtureId: string): Promise<void> {
  await api.delete(`/racquet-matches/${fixtureId}`);
  removeFromCache(fixtureId);
}

export function clearRacquetMatchCache(fixtureIds: string[]) {
  fixtureIds.forEach(removeFromCache);
}

// ---------- Helpers ----------

function putInCache(match: RacquetMatch) {
  const before = cache.get(match.fixtureId);
  if (before?.version && match.version && new Date(before.version) > new Date(match.version)) return;
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
  const { data: details } = await api.get<import("./fixturesservice").Fixture>(`/fixtures/${fixtureId}`);

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
