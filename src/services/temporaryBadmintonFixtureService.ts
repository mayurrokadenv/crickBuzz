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

export const BADMINTON_LOCAL_FIXTURE_CHANGED_EVENT =
  "crickbuzz-badminton-local-fixture-changed";

const STORAGE_KEY_PREFIX = "crickbuzz:badminton-fixture:v1:";

function isValidDetails(value: unknown): value is TemporaryBadmintonFixtureDetails {
  if (typeof value !== "object" || value === null) return false;

  const details = value as Record<string, unknown>;
  return (
    typeof details.status === "string" &&
    typeof details.phase === "string" &&
    typeof details.statusValue === "number" &&
    Number.isInteger(details.statusValue) &&
    details.statusValue >= 0 &&
    details.statusValue <= 4 &&
    typeof details.phaseValue === "number" &&
    Number.isInteger(details.phaseValue) &&
    [2, 3, 5].includes(details.phaseValue) &&
    typeof details.scheduledAtUtc === "string" &&
    (typeof details.battingTeamId === "string" ||
      details.battingTeamId === null) &&
    (details.sport === undefined || typeof details.sport === "string") &&
    (details.sportId === undefined || typeof details.sportId === "string") &&
    (details.homeTeamId === undefined ||
      typeof details.homeTeamId === "string") &&
    (details.awayTeamId === undefined ||
      typeof details.awayTeamId === "string") &&
    (details.homeTeamName === undefined ||
      typeof details.homeTeamName === "string") &&
    (details.awayTeamName === undefined ||
      typeof details.awayTeamName === "string")
  );
}

function getStorageKey(fixtureId: string) {
  return `${STORAGE_KEY_PREFIX}${fixtureId}`;
}

export function getTemporaryBadmintonFixtureDetails(
  fixtureId: string,
): TemporaryBadmintonFixtureDetails | null {
  let storedValue: string | null;
  try {
    storedValue = window.localStorage.getItem(getStorageKey(fixtureId));
  } catch {
    throw new Error("Unable to read racquet fixture details from local storage.");
  }

  if (storedValue === null) return null;

  let parsedValue: unknown;
  try {
    parsedValue = JSON.parse(storedValue);
  } catch {
    throw new Error("Saved racquet fixture details are invalid.");
  }

  if (!isValidDetails(parsedValue)) {
    throw new Error("Saved racquet fixture details have an invalid format.");
  }

  return parsedValue;
}

export function getAllTemporaryBadmintonFixtureDetails(): StoredTemporaryBadmintonFixture[] {
  const fixtures: StoredTemporaryBadmintonFixture[] = [];

  try {
    for (let index = 0; index < window.localStorage.length; index += 1) {
      const key = window.localStorage.key(index);
      if (!key?.startsWith(STORAGE_KEY_PREFIX)) continue;

      const fixtureId = key.slice(STORAGE_KEY_PREFIX.length);
      const details = getTemporaryBadmintonFixtureDetails(fixtureId);
      if (details) fixtures.push({ fixtureId, details });
    }
  } catch {
    throw new Error("Unable to read saved racquet fixtures from local storage.");
  }

  return fixtures;
}

export function saveTemporaryBadmintonFixtureDetails(
  fixtureId: string,
  details: TemporaryBadmintonFixtureDetails,
) {
  if (!isValidDetails(details)) {
    throw new Error("Cannot save racquet fixture details with an invalid format.");
  }

  try {
    window.localStorage.setItem(
      getStorageKey(fixtureId),
      JSON.stringify(details),
    );
  } catch {
    throw new Error("Unable to save racquet fixture details to local storage.");
  }

  window.dispatchEvent(
    new CustomEvent(BADMINTON_LOCAL_FIXTURE_CHANGED_EVENT, {
      detail: { fixtureId },
    }),
  );
}
