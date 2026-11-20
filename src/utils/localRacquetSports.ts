export type LocalRacquetSport = "badminton" | "pickleball";

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
