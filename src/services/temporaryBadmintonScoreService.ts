// Badminton / Pickleball game scores (and doubles player points).
// Same functions as before, but the data now comes from the server (/api/racquet-matches)
// through racquetMatchService instead of browser local storage.
import type { FixtureSetScoreDto } from "../components/types/FixtureDetails";
import { getCachedRacquetMatch, saveRacquetMatch } from "./racquetMatchService";

export { BADMINTON_LOCAL_SCORE_CHANGED_EVENT } from "./racquetMatchService";

export interface TemporaryBadmintonScore {
  currentSet: number;
  sets: FixtureSetScoreDto[];
  isLive?: boolean;
  playerPoints?: Record<string, Record<number, number>>;
}

// Kept only so existing "storage" listeners compile; scores are no longer in local storage.
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

// Saves the game scores on the server. The server checks the sport rules and decides
// currentSet / isLive itself. Throws with the server's message when the score is rejected.
export async function saveTemporaryBadmintonScore(
  fixtureId: string,
  score: TemporaryBadmintonScore,
): Promise<void> {
  await saveRacquetMatch(fixtureId, (current) => ({
    ...current,
    score: {
      ...current.score,
      sets: score.sets,
      playerPoints: score.playerPoints ?? current.score.playerPoints,
    },
  }));
}
