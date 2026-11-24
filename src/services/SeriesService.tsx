import { createLocalId, readLocalAppData, updateLocalAppData } from "./localAppStore";
import type { LocalAppData, LocalFixtureRecord } from "./localAppStore";
import type { Player, TeamFormat } from "./TeamService";
import {
  getRacquetFirstRoundMatchCount,
  getRacquetRoundMatchCount,
  isLocalRacquetSport,
} from "../utils/localRacquetSports";

export interface CreateSeriesRequest {
  name: string;
  sportId: string;
  teamIds: string[];
  startDate: string;
  endDate: string;
  venue: string;
  format?: SeriesFormat;
}

export type SeriesFormat = "Single" | "Double" | "Mixed Double";

export interface SeriesTeam {
  teamId: string;
  teamName: string;
}

export interface SeriesBracketRound {
  roundNumber: number;
  name: string;
  fixtureIds: string[];
  byeTeamIds: string[];
}

export interface SeriesBracket {
  totalRounds: number;
  rounds: SeriesBracketRound[];
  championTeamId?: string;
  isComplete: boolean;
}

export interface Series {
  id: string;
  name: string;
  sportId: string;
  sportName: string;
  startDate?: string;
  endDate?: string;
  venue?: string;
  format?: SeriesFormat;
  teams: SeriesTeam[];
  bracket?: SeriesBracket;
}

export interface SeriesTeamDetails extends SeriesTeam {
  color: string;
  format?: TeamFormat;
  players: Player[];
  status: string;
  played: number;
}

export interface SeriesDetails {
  series: Series;
  teams: SeriesTeamDetails[];
  fixtures: LocalFixtureRecord[];
}

function getTeamStatus(fixtures: LocalFixtureRecord[]): string {
  if (fixtures.some((fixture) => ["live", "inprogress"].includes(fixture.status.toLowerCase()))) {
    return "Live";
  }
  if (fixtures.some((fixture) => fixture.status.toLowerCase() === "scheduled")) {
    return "Scheduled";
  }
  if (fixtures.length > 0 && fixtures.every((fixture) => fixture.status.toLowerCase() === "completed")) {
    return "Completed";
  }
  return fixtures[fixtures.length - 1]?.status ?? "Not Started";
}

function getBracketSize(teamCount: number) {
  let size = 1;
  while (size < teamCount) size *= 2;
  return size;
}

function getTotalRounds(teamCount: number) {
  return 1 + Math.log2(getBracketSize(teamCount) / 2);
}

function getRoundName(teamCount: number, isInitialRound: boolean) {
  if (teamCount === 2) return "Final";
  if (isInitialRound) return "Round 1";
  if (teamCount === 3) return "Semi-final";
  if (teamCount === 4) return "Semi-finals";
  if (teamCount === 8) return "Quarter-finals";
  return `Round of ${teamCount}`;
}

function getRoundScheduledAt(
  series: Series,
  roundNumber: number,
  totalRounds: number,
  matchIndex: number,
) {
  const today = new Date().toISOString().slice(0, 10);
  const startDate = series.startDate ?? today;
  const endDate = series.endDate ?? startDate;
  const start = new Date(`${startDate}T09:00:00.000Z`);
  const end = new Date(`${endDate}T09:00:00.000Z`);
  const progress =
    totalRounds === 1 ? 1 : (roundNumber - 1) / (totalRounds - 1);
  const scheduledAt = new Date(
    start.getTime() + (end.getTime() - start.getTime()) * progress,
  );
  scheduledAt.setUTCHours(9 + matchIndex * 2, 0, 0, 0);
  return scheduledAt.toISOString();
}

function getFixtureWinnerId(fixture: LocalFixtureRecord) {
  const winnerId = fixture.winningTeamId;
  if (
    winnerId &&
    (winnerId === fixture.homeTeamId || winnerId === fixture.awayTeamId)
  ) {
    return winnerId;
  }
  if (fixture.homeScore > fixture.awayScore) return fixture.homeTeamId;
  if (fixture.awayScore > fixture.homeScore) return fixture.awayTeamId;
  return null;
}

function createBracketFixture(
  data: LocalAppData,
  series: Series,
  homeTeamId: string,
  awayTeamId: string,
  roundNumber: number,
  roundName: string,
  matchIndex: number,
  totalRounds: number,
): LocalFixtureRecord {
  const homeTeam = data.teams.find((team) => team.id === homeTeamId);
  const awayTeam = data.teams.find((team) => team.id === awayTeamId);
  if (!homeTeam || !awayTeam) {
    throw new Error("A bracket team no longer exists in local data.");
  }

  const sportName = series.sportName.toLowerCase();
  const phase =
    sportName === "badminton" || sportName === "pickleball"
      ? "Set1"
      : sportName === "football" || sportName === "hockey"
        ? "FirstHalf"
        : "FirstInnings";

  return {
    id: createLocalId("fixture"),
    seriesId: series.id,
    bracketRound: roundNumber,
    bracketRoundName: roundName,
    homeTeamId: homeTeam.id,
    homeTeamName: homeTeam.teamName,
    awayTeamId: awayTeam.id,
    awayTeamName: awayTeam.teamName,
    sport: series.sportName,
    sportId: series.sportId,
    scheduledAtUtc: getRoundScheduledAt(series, roundNumber, totalRounds, matchIndex),
    status: "Scheduled",
    homeScore: 0,
    homeWickets: 0,
    homeOvers: "0.0",
    awayScore: 0,
    awayWickets: 0,
    awayOvers: "0.0",
    phase,
    battingTeamId: homeTeam.id,
    totalOvers: sportName === "cricket" ? "20" : undefined,
  };
}

function createBracketRoundFixtures(
  data: LocalAppData,
  series: Series,
  teamIds: string[],
  roundNumber: number,
  roundName: string,
  totalRounds: number,
  matchCountOverride?: number,
) {
  const fixtureIds: string[] = [];
  const byeTeamIds: string[] = [];
  const matchCount =
    matchCountOverride ??
    (isLocalRacquetSport(series.sportName)
      ? getRacquetRoundMatchCount(teamIds.length)
      : Math.floor(teamIds.length / 2));

  for (let index = 0; index < matchCount; index += 1) {
    const fixture = createBracketFixture(
      data,
      series,
      teamIds[index * 2],
      teamIds[index * 2 + 1],
      roundNumber,
      roundName,
      index,
      totalRounds,
    );
    data.fixtures.unshift(fixture);
    fixtureIds.push(fixture.id);
  }

  byeTeamIds.push(...teamIds.slice(matchCount * 2));
  return { fixtureIds, byeTeamIds };
}

export function rebuildSeriesBracket(
  data: LocalAppData,
  series: Series,
): string[] {
  const teamIds = Array.from(new Set(series.teams.map((team) => team.teamId)));
  if (teamIds.length < 2) {
    throw new Error("A series bracket requires at least two teams.");
  }

  const selectedTeams = teamIds.map((teamId) => {
    const team = data.teams.find((item) => item.id === teamId);
    if (!team) throw new Error("A series team no longer exists in local data.");
    if (team.sportId !== series.sportId) {
      throw new Error("All series teams must play the series sport.");
    }
    if (
      ["badminton", "pickleball"].includes(series.sportName.toLowerCase()) &&
      team.format !== series.format
    ) {
      throw new Error("All racquet-sport teams must match the series format.");
    }
    return team;
  });
  series.teams = selectedTeams.map((team) => ({
    teamId: team.id,
    teamName: team.teamName,
  }));

  const bracketFixtureIds = new Set(
    series.bracket?.rounds.flatMap((round) => round.fixtureIds) ?? [],
  );
  const removedFixtureIds = data.fixtures
    .filter(
      (fixture) =>
        fixture.seriesId === series.id || bracketFixtureIds.has(fixture.id),
    )
    .map((fixture) => fixture.id);
  const removedIds = new Set(removedFixtureIds);
  data.fixtures = data.fixtures.filter((fixture) => !removedIds.has(fixture.id));
  data.racquetMatches = data.racquetMatches.filter(
    (match) => !removedIds.has(match.fixtureId),
  );
  removedFixtureIds.forEach((fixtureId) => {
    delete data.commentaryByFixture[fixtureId];
    delete data.scorecardsByFixture[fixtureId];
  });

  const bracket: SeriesBracket = {
    totalRounds: getTotalRounds(selectedTeams.length),
    rounds: [],
    isComplete: false,
  };
  series.bracket = bracket;

  let firstRoundTeams: typeof selectedTeams;
  let byeTeamIds: string[] = [];
  let firstRoundMatchCountOverride: number | undefined;
  if (isLocalRacquetSport(series.sportName)) {
    const firstRoundMatchCount = getRacquetFirstRoundMatchCount(
      selectedTeams.length,
    );
    firstRoundMatchCountOverride =
      selectedTeams.length === 2 ? 1 : firstRoundMatchCount;
    const firstRoundTeamCount =
      selectedTeams.length === 2 ? selectedTeams.length : firstRoundMatchCount * 2;
    firstRoundTeams = selectedTeams.slice(0, firstRoundTeamCount);
    byeTeamIds = selectedTeams
      .slice(firstRoundTeamCount)
      .map((team) => team.id);
  } else {
    const firstRoundMatchCount =
      selectedTeams.length - getBracketSize(selectedTeams.length) / 2;
    firstRoundTeams = selectedTeams.slice(0, firstRoundMatchCount * 2);
    byeTeamIds = selectedTeams
      .slice(firstRoundMatchCount * 2)
      .map((team) => team.id);
  }

  const roundName = getRoundName(selectedTeams.length, true);
  const firstRound = createBracketRoundFixtures(
    data,
    series,
    firstRoundTeams.map((team) => team.id),
    1,
    roundName,
    bracket.totalRounds,
    firstRoundMatchCountOverride,
  );
  bracket.rounds.push({
    roundNumber: 1,
    name: roundName,
    fixtureIds: firstRound.fixtureIds,
    byeTeamIds: [...firstRound.byeTeamIds, ...byeTeamIds],
  });

  return removedFixtureIds;
}

export function advanceSeriesBracket(data: LocalAppData, fixtureId: string) {
  for (const series of data.series) {
    const bracket = series.bracket;
    if (!bracket || bracket.isComplete) continue;

    const currentRound = bracket.rounds[bracket.rounds.length - 1];
    if (!currentRound?.fixtureIds.includes(fixtureId)) continue;

    const completedFixtures = currentRound.fixtureIds.map((id) =>
      data.fixtures.find((fixture) => fixture.id === id),
    );
    if (
      completedFixtures.some(
        (fixture) =>
          !fixture ||
          fixture.status.toLowerCase() !== "completed" ||
          !getFixtureWinnerId(fixture),
      )
    ) {
      continue;
    }

    const advancingTeamIds = [
      ...completedFixtures.map((fixture) => getFixtureWinnerId(fixture!)),
      ...currentRound.byeTeamIds,
    ].filter((teamId): teamId is string => teamId !== null);

    if (advancingTeamIds.length === 1) {
      bracket.championTeamId = advancingTeamIds[0];
      bracket.isComplete = true;
      continue;
    }

    if (advancingTeamIds.length < 2) continue;
    const roundNumber = currentRound.roundNumber + 1;
    const roundName = getRoundName(advancingTeamIds.length, false);
    const nextRound = createBracketRoundFixtures(
      data,
      series,
      advancingTeamIds,
      roundNumber,
      roundName,
      bracket.totalRounds,
    );
    bracket.rounds.push({
      roundNumber,
      name: roundName,
      ...nextRound,
    });
  }
}

export const getSeries = async (): Promise<Series[]> => {
  return readLocalAppData().series;
};

function needsRacquetScheduleRepair(series: Series) {
  if (!isLocalRacquetSport(series.sportName)) return false;

  const teamCount = new Set(series.teams.map((team) => team.teamId)).size;
  if (teamCount < 2) return false;

  let bracketSize = 1;
  while (bracketSize < teamCount) bracketSize *= 2;
  const expectedMatchCount =
    teamCount === 2 ? 1 : getRacquetFirstRoundMatchCount(teamCount);
  const expectedByeCount = teamCount === 2 ? 0 : bracketSize - teamCount;
  const firstRound = series.bracket?.rounds.find(
    (round) => round.roundNumber === 1,
  );

  return (
    firstRound?.fixtureIds.length !== expectedMatchCount ||
    firstRound.byeTeamIds.length !== expectedByeCount
  );
}

function isSafeToRepairRacquetSchedule(
  data: LocalAppData,
  series: Series,
) {
  const teamIds = new Set(series.teams.map((team) => team.teamId));
  const teams = data.teams.filter((team) => teamIds.has(team.id));
  if (
    teams.length !== teamIds.size ||
    teams.some(
      (team) =>
        team.sportId !== series.sportId || team.format !== series.format,
    )
  ) {
    return false;
  }

  const fixtureIds = new Set([
    ...data.fixtures
      .filter((fixture) => fixture.seriesId === series.id)
      .map((fixture) => fixture.id),
    ...(series.bracket?.rounds.flatMap((round) => round.fixtureIds) ?? []),
  ]);
  return Array.from(fixtureIds).every((fixtureId) => {
    const fixture = data.fixtures.find((item) => item.id === fixtureId);
    const match = data.racquetMatches.find(
      (item) => item.fixtureId === fixtureId,
    );
    return (
      fixture !== undefined &&
      fixture.status.toLowerCase() === "scheduled" &&
      fixture.homeScore === 0 &&
      fixture.awayScore === 0 &&
      !data.commentaryByFixture[fixtureId]?.length &&
      !data.scorecardsByFixture[fixtureId]?.length &&
      (!match ||
        (!match.score.isLive &&
          !match.score.isMatchComplete &&
          !Object.keys(match.score.playerPoints).length &&
          match.score.sets.every(
            (set) => set.teamA === 0 && set.teamB === 0,
          )))
    );
  });
}

export const getSeriesDetails = async (seriesId: string): Promise<SeriesDetails> => {
  let data = readLocalAppData();
  let series = data.series.find((item) => item.id === seriesId);
  if (!series) throw new Error("Series not found in local data.");

  if (
    needsRacquetScheduleRepair(series) &&
    isSafeToRepairRacquetSchedule(data, series)
  ) {
    updateLocalAppData((currentData) => {
      const currentSeries = currentData.series.find(
        (item) => item.id === seriesId,
      );
      if (
        currentSeries &&
        needsRacquetScheduleRepair(currentSeries) &&
        isSafeToRepairRacquetSchedule(currentData, currentSeries)
      ) {
        rebuildSeriesBracket(currentData, currentSeries);
      }
    });
    data = readLocalAppData();
    series = data.series.find((item) => item.id === seriesId);
    if (!series) throw new Error("Series not found in local data.");
  }

  const bracketFixtureIds = new Set(
    series.bracket?.rounds.flatMap((round) => round.fixtureIds) ?? [],
  );
  const fixtures = data.fixtures
    .filter(
      (fixture) =>
        fixture.seriesId === series.id || bracketFixtureIds.has(fixture.id),
    )
    .sort((first, second) => first.scheduledAtUtc.localeCompare(second.scheduledAtUtc));

  const seriesTeams = new Map(
    series.teams.map((team) => [team.teamId, team.teamName]),
  );
  fixtures.forEach((fixture) => {
    seriesTeams.set(fixture.homeTeamId, fixture.homeTeamName);
    seriesTeams.set(fixture.awayTeamId, fixture.awayTeamName);
  });

  const teams = Array.from(seriesTeams, ([teamId, storedTeamName]) => {
    const team = data.teams.find((item) => item.id === teamId);
    const teamFixtures = fixtures.filter(
      (fixture) =>
        fixture.homeTeamId === teamId ||
        fixture.awayTeamId === teamId,
    );
    return {
      teamId,
      teamName: team?.teamName ?? storedTeamName,
      color: team?.color ?? "#64748b",
      format: team?.format,
      players: team?.players ?? [],
      status:
        teamFixtures.length === 0 &&
        series.bracket?.rounds.some((round) => round.byeTeamIds.includes(teamId))
          ? "Bye"
          : getTeamStatus(teamFixtures),
      played: teamFixtures.filter((fixture) => fixture.status.toLowerCase() === "completed").length,
    };
  });

  return { series, teams, fixtures };
};

export const createSeries = async (
  request: CreateSeriesRequest
): Promise<string> => {
  return updateLocalAppData((data) => {
    const sport = data.sports.find((item) => item.id === request.sportId);
    if (!sport) throw new Error("The selected sport does not exist.");
    if (!request.startDate || !request.endDate || !request.venue.trim()) {
      throw new Error("Start date, end date, and venue are required.");
    }
    if (request.endDate < request.startDate) {
      throw new Error("End date cannot be before the start date.");
    }
    if (
      ["badminton", "pickleball"].includes(sport.name.toLowerCase()) &&
      !["Single", "Double", "Mixed Double"].includes(request.format ?? "")
    ) {
      throw new Error("Select a format for Badminton or Pickleball series.");
    }
    const selectedTeams = Array.from(new Set(request.teamIds)).map((teamId) => {
      const team = data.teams.find((item) => item.id === teamId);
      if (!team) throw new Error("One or more selected teams no longer exist.");
      return team;
    });
    if (selectedTeams.length < 2) throw new Error("Select at least two local teams.");
    if (selectedTeams.some((team) => team.sportId !== sport.id)) {
      throw new Error("All selected teams must play the series sport.");
    }
    if (
      ["badminton", "pickleball"].includes(sport.name.toLowerCase()) &&
      selectedTeams.some((team) => team.format !== request.format)
    ) {
      throw new Error("All racquet-sport teams must match the selected series format.");
    }
    const id = createLocalId("series");
    const series: Series = {
      id,
      name: request.name,
      sportId: sport.id,
      sportName: sport.name,
      startDate: request.startDate,
      endDate: request.endDate,
      venue: request.venue.trim(),
      format: request.format,
      teams: selectedTeams.map((team) => ({
        teamId: team.id,
        teamName: team.teamName,
      })),
    };
    data.series.push(series);
    rebuildSeriesBracket(data, series);
    return id;
  });
};

export const getPointsTable = async (seriesId: string): Promise<any> => {
  const data = readLocalAppData();
  const series = data.series.find((item) => item.id === seriesId);
  if (!series) throw new Error("Series not found in local data.");

  return series.teams
    .map((team) => {
      const completedFixtures = data.fixtures.filter(
        (fixture) =>
          fixture.status.toLowerCase() === "completed" &&
          (fixture.homeTeamId === team.teamId || fixture.awayTeamId === team.teamId) &&
          (fixture.sportId === series.sportId ||
            fixture.seriesId === series.id),
      );
      const won = completedFixtures.filter((fixture) => {
        const winnerId =
          fixture.winningTeamId ??
          (fixture.homeScore > fixture.awayScore
            ? fixture.homeTeamId
            : fixture.awayScore > fixture.homeScore
              ? fixture.awayTeamId
              : null);
        return winnerId === team.teamId;
      }).length;
      return {
        teamId: team.teamId,
        teamName: team.teamName,
        played: completedFixtures.length,
        won,
        lost: completedFixtures.length - won,
        points: won * 2,
      };
    })
    .sort((first, second) => second.points - first.points);
};

export const deleteSeries = async (seriesId: string): Promise<void> => {
  updateLocalAppData((data) => {
    data.series = data.series.filter((series) => series.id !== seriesId);
  });
};