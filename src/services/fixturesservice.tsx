import {
  type LocalFixtureRecord,
  createLocalId,
  readLocalAppData,
  updateLocalAppData,
} from "./localAppStore";
import {
  advanceSeriesBracket,
  rebuildSeriesBracket,
} from "./SeriesService";
import { clearRacquetMatchCache } from "./racquetMatchService";
import {
  assertRacquetSetCanGoLive,
  isLocalRacquetSport,
} from "../utils/localRacquetSports";

export interface SportRole {
  roleId: string;
  roleName: string;
  description: string;
}

export interface Sport {
  id: string;
  name: string;
  description: string;
  sportRoles: SportRole[];
}

export interface Fixture {
  id: string;
  homeTeamId: string;
  homeTeamName: string;
  awayTeamId: string;
  awayTeamName: string;
  sport: string;
  sportId?: string;
  scheduledAtUtc: string;
  status: string;
  homeScore: number;
  homeWickets: number;
  homeOvers?: string;
  awayScore: number;
  awayWickets: number;
  awayOvers?: string;
  phase: string;
  battingTeamId: string;
}

export const sportService = {
  getSports: async (): Promise<Sport[]> => {
    return readLocalAppData().sports;
  },
};

export interface CreateFixtureRequest {
  homeTeamId: string;
  awayTeamId: string;
  scheduledAtUtc?: string;
  totalOvers?: string;
  seriesId?: string | null;
}

export interface CreateFixtureResult {
  fixture: Fixture;
  bracketRebuilt: boolean;
  addedTeamCount: number;
}

function getStatusName(status: number) {
  return ["Scheduled", "Live", "Completed", "Postponed", "Cancelled"][status] ?? "Scheduled";
}

function getPhaseName(sport: string, phase: number) {
  const phases: Record<string, string[]> = {
    cricket: ["FirstInnings", "SecondInnings"],
    football: ["", "", "FirstHalf", "SecondHalf", "ExtraTime", "PenaltyShootout"],
    hockey: ["", "", "FirstHalf", "SecondHalf", "", "Shootout"],
    badminton: ["", "", "Set1", "Set2", "", "Set3"],
    pickleball: ["", "", "Set1", "Set2", "", "Set3"],
  };
  return phases[sport.toLowerCase()]?.[phase] || "FirstInnings";
}

function getLocalDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function isSeriesStarted(
  series: {
    id: string;
    sportId: string;
    startDate?: string;
    teams: { teamId: string }[];
    bracket?: { rounds: { fixtureIds: string[] }[] };
  },
  fixtures: LocalFixtureRecord[],
) {
  const teamIds = new Set(series.teams.map((team) => team.teamId));
  const seriesFixtures = fixtures.filter((fixture) => {
    const belongsToSeries =
      fixture.seriesId === series.id ||
      (!fixture.seriesId &&
        fixture.sportId === series.sportId &&
        teamIds.has(fixture.homeTeamId) &&
        teamIds.has(fixture.awayTeamId));
    return belongsToSeries;
  });
  const bracketFixtureIds = new Set(
    series.bracket?.rounds.flatMap((round) => round.fixtureIds) ?? [],
  );
  const scheduledBracketFixtures = series.bracket
    ? seriesFixtures.filter((fixture) => bracketFixtureIds.has(fixture.id))
    : seriesFixtures;
  if (
    scheduledBracketFixtures.some((fixture) =>
      ["live", "inprogress", "completed"].includes(fixture.status.toLowerCase()),
    )
  ) {
    return true;
  }

  if (!series.startDate) return false;
  const today = getLocalDateKey(new Date());
  if (series.startDate < today) return true;
  if (series.startDate > today) return false;

  const nextScheduledAt = scheduledBracketFixtures
    .map((fixture) => Date.parse(fixture.scheduledAtUtc))
    .filter((timestamp) => !Number.isNaN(timestamp))
    .sort((first, second) => first - second)[0];
  return nextScheduledAt !== undefined && nextScheduledAt <= Date.now();
}

export const fixtureService = {
  getLiveFixtures: async (): Promise<Fixture[]> => {
    return readLocalAppData().fixtures;
  },
  createFixture: async (
    request: CreateFixtureRequest,
  ): Promise<CreateFixtureResult> => {
    let replacedBracketFixtureIds: string[] = [];
    const result = updateLocalAppData((data): CreateFixtureResult => {
      const homeTeam = data.teams.find((team) => team.id === request.homeTeamId);
      const awayTeam = data.teams.find((team) => team.id === request.awayTeamId);
      if (!homeTeam || !awayTeam) {
        throw new Error("Both selected teams must exist in local data.");
      }
      if (homeTeam.id === awayTeam.id) {
        throw new Error("Fixture teams must be different.");
      }
      if (homeTeam.sportId !== awayTeam.sportId) {
        throw new Error("Fixture teams must play the same sport.");
      }
      const sport = data.sports.find((item) => item.id === homeTeam.sportId);
      if (!sport) throw new Error("The selected sport is missing from local data.");

      const series = request.seriesId
        ? data.series.find((item) => item.id === request.seriesId)
        : undefined;
      if (request.seriesId && !series) {
        throw new Error("The selected series does not exist.");
      }
      if (series && series.sportId !== sport.id) {
        throw new Error("The selected series must use the fixture sport.");
      }

      const selectedTeams = [homeTeam, awayTeam];
      const newTeams = series
        ? selectedTeams.filter(
            (team) =>
              !series.teams.some((seriesTeam) => seriesTeam.teamId === team.id),
          )
        : [];
      const isRacquetSport = isLocalRacquetSport(sport.name);
      if (series && isRacquetSport && newTeams.length > 0) {
        if (isSeriesStarted(series, data.fixtures)) {
          throw new Error("Teams cannot be added after this series has started.");
        }

        for (const team of newTeams) {
          series.teams.push({ teamId: team.id, teamName: team.teamName });
        }
        replacedBracketFixtureIds = rebuildSeriesBracket(data, series);
        const firstRoundFixtureId = series.bracket?.rounds[0]?.fixtureIds[0];
        const firstRoundFixture = data.fixtures.find(
          (fixture) => fixture.id === firstRoundFixtureId,
        );
        if (!firstRoundFixture) {
          throw new Error("The series schedule could not be rebuilt.");
        }
        return {
          fixture: firstRoundFixture,
          bracketRebuilt: true,
          addedTeamCount: newTeams.length,
        };
      }
      if (series && isRacquetSport) {
        throw new Error(
          "The selected teams are already in this series. Its bracket schedule already includes them; additional series fixtures are not created.",
        );
      }
      if (series) {
        for (const team of newTeams) {
          series.teams.push({ teamId: team.id, teamName: team.teamName });
        }
      }

      const localPhase = ["football", "hockey", "badminton", "pickleball"].includes(
        sport.name.toLowerCase(),
      )
        ? 2
        : 0;
      if (
        !request.scheduledAtUtc ||
        Number.isNaN(Date.parse(request.scheduledAtUtc))
      ) {
        throw new Error("Please select a valid scheduled date and time.");
      }
      const fixture: LocalFixtureRecord = {
        id: createLocalId("fixture"),
        seriesId: request.seriesId ?? null,
        homeTeamId: homeTeam.id,
        homeTeamName: homeTeam.teamName,
        awayTeamId: awayTeam.id,
        awayTeamName: awayTeam.teamName,
        sport: sport.name,
        sportId: sport.id,
        scheduledAtUtc: request.scheduledAtUtc,
        status: "Scheduled",
        homeScore: 0,
        homeWickets: 0,
        homeOvers: "0.0",
        awayScore: 0,
        awayWickets: 0,
        awayOvers: "0.0",
        phase: getPhaseName(sport.name, localPhase),
        battingTeamId: homeTeam.id,
        totalOvers: request.totalOvers,
      };
      data.fixtures.unshift(fixture);
      return { fixture, bracketRebuilt: false, addedTeamCount: 0 };
    });
    if (replacedBracketFixtureIds.length > 0) {
      clearRacquetMatchCache(replacedBracketFixtureIds);
    }
    return result;
  },
  async updateFixture(
    id: string,
    status: number,
    phase: number,
    scheduledAtUtc: string,
    battingTeamId: string | null,
    winningTeamId?: string | null, // NEW
  ): Promise<Fixture> {
    return updateLocalAppData((data) => {
      const fixture = data.fixtures.find((item) => item.id === id);
      if (!fixture) throw new Error("Fixture not found in local data.");
      const nextStatus = getStatusName(status);
      const nextPhase = getPhaseName(fixture.sport, phase);
      if (
        fixture.status.toLowerCase() === "completed" &&
        nextStatus === "Live"
      ) {
        throw new Error("A completed match cannot be set live again.");
      }
      if (isLocalRacquetSport(fixture.sport)) {
        const score = data.racquetMatches.find(
          (match) => match.fixtureId === fixture.id,
        )?.score.sets ?? [];
        assertRacquetSetCanGoLive(
          fixture.sport,
          nextStatus,
          nextPhase,
          score,
        );
      }
      Object.assign(fixture, {
        status: nextStatus,
        phase: nextPhase,
        scheduledAtUtc,
        battingTeamId: battingTeamId ?? "",
        winningTeamId: winningTeamId ?? fixture.winningTeamId ?? null,
      });
      advanceSeriesBracket(data, fixture.id);
      return fixture;
    });
  },
  async deleteFixture(id: string): Promise<void> {
    updateLocalAppData((data) => {
      data.fixtures = data.fixtures.filter((fixture) => fixture.id !== id);
      delete data.commentaryByFixture[id];
      delete data.scorecardsByFixture[id];
      data.racquetMatches = data.racquetMatches.filter(
        (match) => match.fixtureId !== id,
      );
    });
  },
};
