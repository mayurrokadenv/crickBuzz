import type { FixtureSetScoreDto } from "../components/types/FixtureDetails";

export interface TemporaryBadmintonScore {
  currentSet: number;
  sets: FixtureSetScoreDto[];
  isLive?: boolean;
  playerPoints?: Record<string, Record<number, number>>;
}

export const BADMINTON_LOCAL_SCORE_CHANGED_EVENT =
  "crickbuzz-badminton-local-score-changed";

const STORAGE_KEY_PREFIX = "crickbuzz:badminton-score:v1:";

export function getTemporaryBadmintonScoreStorageKey(fixtureId: string) {
  return `${STORAGE_KEY_PREFIX}${fixtureId}`;
}

function isValidScore(value: unknown): value is TemporaryBadmintonScore {
  if (typeof value !== "object" || value === null) return false;

  const score = value as Record<string, unknown>;
  const currentSet = score.currentSet;
  const sets = score.sets;
  const isLive = score.isLive;
  const playerPoints = score.playerPoints;
  if (
    typeof currentSet !== "number" ||
    !Number.isInteger(currentSet) ||
    currentSet < 1 ||
    currentSet > 3 ||
    !Array.isArray(sets) ||
    sets.length !== 3 ||
    (isLive !== undefined && typeof isLive !== "boolean") ||
    (playerPoints !== undefined &&
      (typeof playerPoints !== "object" ||
        playerPoints === null ||
        Array.isArray(playerPoints) ||
        !Object.values(playerPoints).every(
          (points) =>
            typeof points === "object" &&
            points !== null &&
            !Array.isArray(points) &&
            Object.entries(points).every(
              ([gameNumber, value]) =>
                ["1", "2", "3"].includes(gameNumber) &&
                typeof value === "number" &&
                Number.isInteger(value) &&
                value >= 0,
            ),
        )))
  ) {
    return false;
  }

  return [1, 2, 3].every((setNumber) => {
    const set = sets.find(
      (candidate: unknown) =>
        typeof candidate === "object" &&
        candidate !== null &&
        (candidate as Record<string, unknown>).setNumber === setNumber,
    ) as Record<string, unknown> | undefined;

    return (
      set !== undefined &&
      typeof set.teamA === "number" &&
      Number.isInteger(set.teamA) &&
      set.teamA >= 0 &&
      typeof set.teamB === "number" &&
      Number.isInteger(set.teamB) &&
      set.teamB >= 0
    );
  });
}

export function getTemporaryBadmintonScore(
  fixtureId: string,
): TemporaryBadmintonScore | null {
  let storedValue: string | null;
  try {
    storedValue = window.localStorage.getItem(
      getTemporaryBadmintonScoreStorageKey(fixtureId),
    );
  } catch {
    throw new Error("Unable to read temporary racquet scores from local storage.");
  }

  if (storedValue === null) return null;

  let parsedValue: unknown;
  try {
    parsedValue = JSON.parse(storedValue);
  } catch {
    throw new Error("Saved racquet score data is invalid.");
  }

  if (!isValidScore(parsedValue)) {
    throw new Error("Saved racquet score data has an invalid format.");
  }

  return {
    currentSet: parsedValue.currentSet,
    isLive: parsedValue.isLive,
    playerPoints: parsedValue.playerPoints ?? {},
    sets: [1, 2, 3].map((setNumber) => {
      const set = parsedValue.sets.find(
        (candidate) => candidate.setNumber === setNumber,
      );
      if (!set) {
        throw new Error("Saved racquet score data is incomplete.");
      }
      return { ...set };
    }),
  };
}

export function saveTemporaryBadmintonScore(
  fixtureId: string,
  score: TemporaryBadmintonScore,
) {
  if (!isValidScore(score)) {
    throw new Error("Cannot save racquet scores with an invalid format.");
  }

  try {
    window.localStorage.setItem(
      getTemporaryBadmintonScoreStorageKey(fixtureId),
      JSON.stringify(score),
    );
  } catch {
    throw new Error("Unable to save temporary racquet scores to local storage.");
  }

  window.dispatchEvent(
    new CustomEvent(BADMINTON_LOCAL_SCORE_CHANGED_EVENT, {
      detail: { fixtureId },
    }),
  );
}
