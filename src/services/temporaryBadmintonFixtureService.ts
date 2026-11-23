// Badminton / Pickleball fixture status and phase.
// Same functions as before, but the data now comes from the server (/api/racquet-matches)
// through racquetMatchService instead of browser local storage.
import {
  getAllCachedRacquetMatches,
  getCachedRacquetMatch,
  saveRacquetMatch,
  type RacquetMatch,
} from "./racquetMatchService";

export { BADMINTON_LOCAL_FIXTURE_CHANGED_EVENT } from "./racquetMatchService";

export interface TemporaryBadmintonFixtureDetails {
  status: string;
  phase: string;
  statusValue: number;
  phaseValue: number;
  scheduledAtUtc: string;
  battingTeamId: string | null;
  sport?: string;
  sportId?: string;
  homeTeamId?: string;
  awayTeamId?: string;
  homeTeamName?: string;
  awayTeamName?: string;
}

export interface StoredTemporaryBadmintonFixture {
  fixtureId: string;
  details: TemporaryBadmintonFixtureDetails;
}

function toDetails(match: RacquetMatch): TemporaryBadmintonFixtureDetails {
  return {
    ...match.fixture,
    battingTeamId: null,
    sport: match.sport,
  };
}

// Returns null when this fixture has no saved racquet match yet.
export function getTemporaryBadmintonFixtureDetails(
  fixtureId: string,
): TemporaryBadmintonFixtureDetails | null {
  const match = getCachedRacquetMatch(fixtureId);
  return match ? toDetails(match) : null;
}

export function getAllTemporaryBadmintonFixtureDetails(): StoredTemporaryBadmintonFixture[] {
  return getAllCachedRacquetMatches().map((match) => ({
    fixtureId: match.fixtureId,
    details: toDetails(match),
  }));
}

// Saves the status (Live, Completed, ...) and phase (Set1/Set2/Set3) on the server.
// Throws with the server's message when the change is not allowed.
export async function saveTemporaryBadmintonFixtureDetails(
  fixtureId: string,
  details: TemporaryBadmintonFixtureDetails,
): Promise<void> {
  await saveRacquetMatch(fixtureId, (current) => ({
    ...current,
    fixture: {
      ...current.fixture,
      statusValue: details.statusValue,
      phaseValue: details.phaseValue,
    },
  }));
}
