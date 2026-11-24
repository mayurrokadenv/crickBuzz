export type LocalRacquetSport = "badminton" | "pickleball";

export interface LocalRacquetSetScore {
  setNumber: number;
  teamA: number;
  teamB: number;
}

export function getLocalRacquetSport(
  sport?: string | null,
): LocalRacquetSport | null {
  if (!sport) return null;
  if (/pickleball/i.test(sport)) return "pickleball";
  if (/badminton|bedminton/i.test(sport)) return "badminton";
  return null;
}

export function isLocalRacquetSport(sport?: string | null) {
  return getLocalRacquetSport(sport) !== null;
}

export function getRacquetRoundMatchCount(teamCount: number) {
  if (teamCount < 2) return 0;
  const bracketSize = 2 ** Math.ceil(Math.log2(teamCount));
  return teamCount - bracketSize / 2;
}

export function getRacquetFirstRoundMatchCount(teamCount: number) {
  return teamCount === 2 ? 0 : getRacquetRoundMatchCount(teamCount);
}

export function isRacquetGameComplete(
  teamA: number,
  teamB: number,
  sport?: string | null,
) {
  const highScore = Math.max(teamA, teamB);
  const lead = Math.abs(teamA - teamB);
  if (getLocalRacquetSport(sport) === "pickleball") {
    return highScore >= 11 && lead >= 2;
  }
  return (highScore >= 21 && lead >= 2) || highScore >= 30;
}

export function assertRacquetSetCanGoLive(
  sport: string,
  status: string,
  phase: string,
  sets: LocalRacquetSetScore[],
) {
  if (!isLocalRacquetSport(sport) || status.toLowerCase() !== "live") return;

  const completedSets = sets.filter(
    (set) =>
      set.teamA !== set.teamB &&
      isRacquetGameComplete(set.teamA, set.teamB, sport),
  );
  const teamAWins = completedSets.filter((set) => set.teamA > set.teamB).length;
  const teamBWins = completedSets.filter((set) => set.teamB > set.teamA).length;
  if (teamAWins >= 2 || teamBWins >= 2) {
    throw new Error("A completed match cannot be set live again.");
  }

  const normalizedPhase = phase.toLowerCase().replace(/[\s_-]/g, "");
  const targetSet =
    normalizedPhase === "set2" || normalizedPhase === "secondset"
      ? 2
      : normalizedPhase === "set3" || normalizedPhase === "thirdset"
        ? 3
        : 1;
  if (targetSet === 1) return;

  let earlierSetWinsA = 0;
  let earlierSetWinsB = 0;
  for (let setNumber = 1; setNumber < targetSet; setNumber += 1) {
    const set = sets.find((item) => item.setNumber === setNumber);
    if (
      !set ||
      set.teamA === set.teamB ||
      !isRacquetGameComplete(set.teamA, set.teamB, sport)
    ) {
      throw new Error(
        `Complete Set ${setNumber} before setting Set ${targetSet} live.`,
      );
    }

    if (set.teamA > set.teamB) earlierSetWinsA += 1;
    else earlierSetWinsB += 1;
  }

  if (targetSet === 3 && (earlierSetWinsA !== 1 || earlierSetWinsB !== 1)) {
    throw new Error("Set 3 can go live only when Sets 1 and 2 are split 1-1.");
  }
}
