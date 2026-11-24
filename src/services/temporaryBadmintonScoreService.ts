// Badminton / Pickleball game scores (and doubles player points).
// Racquet scores are stored in local storage through racquetMatchService.
import type { FixtureSetScoreDto } from "../components/types/FixtureDetails";
import { getCachedRacquetMatch, saveRacquetMatch } from "./racquetMatchService";
import { isRacquetGameComplete } from "../utils/localRacquetSports";

export { BADMINTON_LOCAL_SCORE_CHANGED_EVENT } from "./racquetMatchService";

export interface TemporaryBadmintonScore {
  currentSet: number;
  sets: FixtureSetScoreDto[];
  isLive?: boolean;
  playerPoints?: Record<string, Record<number, number>>;
}

// Preserve the storage key used by existing score listeners.
export function getTemporaryBadmintonScoreStorageKey(fixtureId: string) {
  return `crickbuzz:badminton-score:v1:${fixtureId}`;
}

// Returns null when this fixture has no saved racquet match yet.
export function getTemporaryBadmintonScore(
  fixtureId: string,
): TemporaryBadmintonScore | null {
  const match = getCachedRacquetMatch(fixtureId);
  if (!match) return null;

  return {
    currentSet: match.score.currentSet,
    isLive: match.score.isLive,
    playerPoints: match.score.playerPoints ?? {},
    sets: [1, 2, 3].map((setNumber) => {
      const set = match.score.sets.find((s) => s.setNumber === setNumber);
      return { setNumber, teamA: set?.teamA ?? 0, teamB: set?.teamB ?? 0 };
    }),
  };
}

// Saves the game scores and active game state locally.
export async function saveTemporaryBadmintonScore(
  fixtureId: string,
  score: TemporaryBadmintonScore,
): Promise<void> {
  await saveRacquetMatch(fixtureId, (current) => {
    const completedScores = score.sets.filter((set) =>
      isRacquetGameComplete(set.teamA, set.teamB, current.sport),
    );
    const gamesWonA = completedScores.filter(
      (set) => set.teamA > set.teamB,
    ).length;
    const gamesWonB = completedScores.filter(
      (set) => set.teamB > set.teamA,
    ).length;
    const isMatchComplete = gamesWonA >= 2 || gamesWonB >= 2;
    const winningTeamId = isMatchComplete
      ? gamesWonA > gamesWonB
        ? current.fixture.homeTeamId
        : current.fixture.awayTeamId
      : current.fixture.winningTeamId;

    return {
      ...current,
      fixture: isMatchComplete
        ? {
            ...current.fixture,
            status: "Completed",
            statusValue: 2,
            winningTeamId,
          }
        : current.fixture,
      score: {
        ...current.score,
        currentSet: score.currentSet,
        isLive: score.isLive ?? current.score.isLive,
        sets: score.sets,
        playerPoints: score.playerPoints ?? current.score.playerPoints,
        gamesWonA,
        gamesWonB,
        isMatchComplete,
      },
    };
  });
}
