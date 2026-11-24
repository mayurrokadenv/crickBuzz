import type { Fixture as FixtureRecord, Sport as FixtureSport } from "./fixturesservice";
import type { Player, Team, TeamFormat } from "./TeamService";
import type { SportRole } from "./SportService";
import type { Series } from "./SeriesService";
import type { CommentaryEntry } from "./liveservice";
import type { RacquetMatch } from "./racquetMatchService";
import type { AdminApprovalRequest } from "./adminservice";
import type { Scorecard } from "../hooks/useScoreUpdateFeed";
import { getRacquetRoundMatchCount } from "../utils/localRacquetSports";

const STORAGE_KEY = "crickbuzz.local-app.v1";
export const LOCAL_APP_DATA_CHANGED_EVENT = "crickbuzz-local-app-data-changed";

export interface LocalAccount {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  role: "admin" | "superadmin";
  approved: boolean;
}

export type LocalFixtureRecord = FixtureRecord & {
  totalOvers?: string;
  seriesId?: string | null;
  winningTeamId?: string | null;
  bracketRound?: number;
  bracketRoundName?: string;
};

export interface LocalAppData {
  version: 1;
  racquetStarterDataVersion?: number;
  sports: FixtureSport[];
  sportRoles: SportRole[];
  teams: Team[];
  fixtures: LocalFixtureRecord[];
  series: Series[];
  accounts: LocalAccount[];
  approvals: AdminApprovalRequest[];
  commentaryByFixture: Record<string, CommentaryEntry[]>;
  scorecardsByFixture: Record<string, Scorecard[]>;
  racquetMatches: RacquetMatch[];
}

function createId(prefix: string) {
  const suffix =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  return `${prefix}-${suffix}`;
}

function makePlayer(
  teamId: string,
  name: string,
  role: string,
  roleId: string,
): Player {
  return {
    playerId: `${teamId}-${name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
    playerName: name,
    role,
    roleId,
    teamId,
  };
}

function makeTeam(
  id: string,
  teamName: string,
  sportId: string,
  sportName: string,
  roleIds: string[],
): Team {
  const roles = ["Batter", "Bowler", "All-rounder"];
  return {
    id,
    teamName,
    sportId,
    sportName,
    color: "#3b82f6",
    players: ["Alex Morgan", "Sam Taylor", "Jordan Lee"].map((name, index) =>
      makePlayer(id, name, roles[index], roleIds[index] ?? roleIds[0]),
    ),
  };
}

function makeRacquetTeam(
  id: string,
  teamName: string,
  sport: FixtureSport,
  format: TeamFormat,
  playerNames: string[],
): Team {
  const roleId = sport.sportRoles[0]?.roleId;
  if (!roleId) throw new Error(`${sport.name} is missing its player role.`);
  return {
    id,
    teamName,
    sportId: sport.id,
    sportName: sport.name,
    color: "#3b82f6",
    format,
    players: playerNames.map((name) =>
      makePlayer(id, name, "Player", roleId),
    ),
  };
}

function createRacquetStarterTeams(sports: FixtureSport[]) {
  const teams: Team[] = [];
  for (const sport of sports) {
    const sportName = sport.name.toLowerCase();
    if (sportName !== "badminton" && sportName !== "pickleball") continue;

    const sportKey = sportName;
    const displayName = sport.name;
    for (const format of ["Single", "Double"] as const) {
      const formatKey = format === "Single" ? "singles" : "doubles";
      for (const teamLetter of ["A", "B", "C", "D", "E"] as const) {
        const playerNames =
          format === "Single"
            ? [`${displayName} Singles Player ${teamLetter}`]
            : [
                `${displayName} Doubles ${teamLetter}1`,
                `${displayName} Doubles ${teamLetter}2`,
              ];
        teams.push(
          makeRacquetTeam(
            `local-team-${sportKey}-${formatKey}-${teamLetter.toLowerCase()}`,
            `NV ${displayName} ${formatKey === "singles" ? "Singles" : "Doubles"} ${teamLetter}`,
            sport,
            format,
            playerNames,
          ),
        );
      }
    }
  }
  return teams;
}

function makeFixture(
  id: string,
  home: Team,
  away: Team,
  sport: string,
  scheduledAtUtc: string,
  status: string,
  phase: string,
  scores: {
    homeScore: number;
    homeWickets: number;
    homeOvers: string;
    awayScore: number;
    awayWickets: number;
    awayOvers: string;
  },
): LocalFixtureRecord {
  return {
    id,
    homeTeamId: home.id,
    homeTeamName: home.teamName,
    awayTeamId: away.id,
    awayTeamName: away.teamName,
    sport,
    sportId: home.sportId,
    scheduledAtUtc,
    status,
    homeScore: scores.homeScore,
    homeWickets: scores.homeWickets,
    homeOvers: scores.homeOvers,
    awayScore: scores.awayScore,
    awayWickets: scores.awayWickets,
    awayOvers: scores.awayOvers,
    phase,
    battingTeamId: home.id,
    totalOvers: sport.toLowerCase() === "cricket" ? "20" : undefined,
  };
}

function createRacquetStarterSeries(
  sports: FixtureSport[],
  teams: Team[],
  now: number,
) {
  const startDate = new Date(now + 7 * 86_400_000).toISOString().slice(0, 10);
  const series: Series[] = [];
  const fixtures: LocalFixtureRecord[] = [];

  for (const sport of sports) {
    const sportKey = sport.name.toLowerCase();
    if (sportKey !== "badminton" && sportKey !== "pickleball") continue;

    for (const format of ["Single", "Double"] as const) {
      const formatKey = format === "Single" ? "singles" : "doubles";
      const seriesTeams = ["a", "b", "c", "d", "e"].map((teamLetter) =>
        teams.find(
          (team) =>
            team.id === `local-team-${sportKey}-${formatKey}-${teamLetter}`,
        ),
      );
      if (seriesTeams.some((team) => !team)) {
        throw new Error(`Starter teams for ${sport.name} ${format} are missing.`);
      }
      const validTeams = seriesTeams.filter(
        (team): team is Team => team !== undefined,
      );
      const seriesId = `local-series-${sportKey}-${formatKey}`;
      const fixtureIds: string[] = [];
      const firstRoundMatchCount = getRacquetRoundMatchCount(validTeams.length);
      const firstRoundTeams = validTeams.slice(0, firstRoundMatchCount * 2);
      for (let index = 0; index < firstRoundTeams.length; index += 2) {
        const fixtureId =
          index === 0
            ? `local-fixture-v6-${sportKey}-${formatKey}-series`
            : `local-fixture-v6-${sportKey}-${formatKey}-series-${index / 2 + 1}`;
        const scheduledAt = new Date(`${startDate}T09:00:00.000Z`);
        scheduledAt.setUTCHours(9 + (index / 2) * 2, 0, 0, 0);
        const fixture = makeFixture(
          fixtureId,
          firstRoundTeams[index],
          firstRoundTeams[index + 1],
          sport.name,
          scheduledAt.toISOString(),
          "Scheduled",
          "Set1",
          {
            homeScore: 0,
            homeWickets: 0,
            homeOvers: "0.0",
            awayScore: 0,
            awayWickets: 0,
            awayOvers: "0.0",
          },
        );
        fixture.seriesId = seriesId;
        fixture.bracketRound = 1;
        fixture.bracketRoundName = "Round 1";
        fixtures.push(fixture);
        fixtureIds.push(fixtureId);
      }

      series.push({
        id: seriesId,
        name: `${sport.name} ${format} Series`,
        sportId: sport.id,
        sportName: sport.name,
        startDate,
        endDate: startDate,
        venue: `Local ${sport.name} Court`,
        format,
        teams: validTeams.map((team) => ({
          teamId: team.id,
          teamName: team.teamName,
        })),
        bracket: {
          totalRounds: 3,
          rounds: [
            {
              roundNumber: 1,
              name: "Round 1",
              fixtureIds,
              byeTeamIds: validTeams
                .slice(firstRoundTeams.length)
                .map((team) => team.id),
            },
          ],
          isComplete: false,
        },
      });
    }
  }

  return { series, fixtures };
}

function makeRacquetMatch(fixture: LocalFixtureRecord): RacquetMatch {
  return {
    fixtureId: fixture.id,
    sport: fixture.sport,
    fixture: {
      status: fixture.status,
      phase: fixture.phase,
      statusValue: 0,
      phaseValue: 2,
      scheduledAtUtc: fixture.scheduledAtUtc,
      battingTeamId: null,
      sportId: fixture.sportId ?? "",
      homeTeamId: fixture.homeTeamId,
      awayTeamId: fixture.awayTeamId,
      homeTeamName: fixture.homeTeamName,
      awayTeamName: fixture.awayTeamName,
    },
    score: {
      currentSet: 1,
      isLive: false,
      sets: [1, 2, 3].map((setNumber) => ({ setNumber, teamA: 0, teamB: 0 })),
      playerPoints: {},
    },
  };
}

function createStarterData(): LocalAppData {
  const sportNames = ["Cricket", "Football", "Hockey", "Badminton", "Pickleball"];
  const sports = sportNames.map((name) => {
    const sportId = `local-sport-${name.toLowerCase()}`;
    const sportRoles: FixtureSport["sportRoles"] = [
      { roleId: `${sportId}-player`, roleName: "Player", description: `${name} player` },
    ];
    return {
      id: sportId,
      name,
      description: `${name} fixtures`,
      sportRoles,
    };
  });

  const sportRoles: SportRole[] = sports.flatMap((sport) =>
    sport.sportRoles.map((role) => ({
      ...role,
      sportId: sport.id,
    })),
  );
  const cricketRoles = sports[0].sportRoles.map((role) => role.roleId);
  const teams = [
    makeTeam("local-team-cricket-a", "NV Cricket A", sports[0].id, "Cricket", cricketRoles),
    makeTeam("local-team-cricket-b", "NV Cricket B", sports[0].id, "Cricket", cricketRoles),
    makeTeam("local-team-football-a", "NV Football A", sports[1].id, "Football", [sportRoles[1].roleId]),
    makeTeam("local-team-football-b", "NV Football B", sports[1].id, "Football", [sportRoles[1].roleId]),
    makeTeam("local-team-hockey-a", "NV Hockey A", sports[2].id, "Hockey", [sportRoles[2].roleId]),
    makeTeam("local-team-hockey-b", "NV Hockey B", sports[2].id, "Hockey", [sportRoles[2].roleId]),
    makeTeam("local-team-badminton-a", "NV Badminton A", sports[3].id, "Badminton", [sportRoles[3].roleId]),
    makeTeam("local-team-badminton-b", "NV Badminton B", sports[3].id, "Badminton", [sportRoles[3].roleId]),
    makeTeam("local-team-pickleball-a", "NV Pickleball A", sports[4].id, "Pickleball", [sportRoles[4].roleId]),
    makeTeam("local-team-pickleball-b", "NV Pickleball B", sports[4].id, "Pickleball", [sportRoles[4].roleId]),
    ...createRacquetStarterTeams(sports),
  ];

  const now = Date.now();
  const cricketLive = makeFixture(
    "local-fixture-cricket-live",
    teams[0],
    teams[1],
    "Cricket",
    new Date(now - 30 * 60_000).toISOString(),
    "Live",
    "FirstInnings",
    { homeScore: 84, homeWickets: 2, homeOvers: "10.2", awayScore: 0, awayWickets: 0, awayOvers: "0.0" },
  );
  const cricketCompleted = makeFixture(
    "local-fixture-cricket-completed",
    teams[0],
    teams[1],
    "Cricket",
    new Date(now - 86_400_000).toISOString(),
    "Completed",
    "SecondInnings",
    { homeScore: 142, homeWickets: 8, homeOvers: "20.0", awayScore: 143, awayWickets: 5, awayOvers: "18.4" },
  );
  const fixtures = [
    cricketLive,
    cricketCompleted,
    makeFixture(
      "local-fixture-cricket-scheduled",
      teams[0],
      teams[1],
      "Cricket",
      new Date(now + 86_400_000).toISOString(),
      "Scheduled",
      "FirstInnings",
      { homeScore: 0, homeWickets: 0, homeOvers: "0.0", awayScore: 0, awayWickets: 0, awayOvers: "0.0" },
    ),
    makeFixture(
      "local-fixture-football",
      teams[2],
      teams[3],
      "Football",
      new Date(now + 2 * 86_400_000).toISOString(),
      "Scheduled",
      "FirstHalf",
      { homeScore: 0, homeWickets: 0, homeOvers: "0.0", awayScore: 0, awayWickets: 0, awayOvers: "0.0" },
    ),
    makeFixture(
      "local-fixture-badminton",
      teams[6],
      teams[7],
      "Badminton",
      new Date(now + 3 * 86_400_000).toISOString(),
      "Scheduled",
      "Set1",
      { homeScore: 0, homeWickets: 0, homeOvers: "0.0", awayScore: 0, awayWickets: 0, awayOvers: "0.0" },
    ),
    makeFixture(
      "local-fixture-pickleball",
      teams[8],
      teams[9],
      "Pickleball",
      new Date(now + 4 * 86_400_000).toISOString(),
      "Scheduled",
      "Set1",
      { homeScore: 0, homeWickets: 0, homeOvers: "0.0", awayScore: 0, awayWickets: 0, awayOvers: "0.0" },
    ),
  ];

  const series: Series[] = [
    {
      id: "local-series-cricket-cup",
      name: "Local Cricket Cup",
      sportId: sports[0].id,
      sportName: "Cricket",
      teams: teams.slice(0, 2).map((team) => ({
        teamId: team.id,
        teamName: team.teamName,
      })),
    },
  ];
  const racquetStarterData = createRacquetStarterSeries(sports, teams, now);
  series.push(...racquetStarterData.series);
  fixtures.unshift(...racquetStarterData.fixtures);

  const commentary: CommentaryEntry[] = [
    {
      id: "local-commentary-seed-1",
      fixtureId: cricketLive.id,
      side: "Home",
      playerId: teams[0].players[0].playerId,
      playerName: teams[0].players[0].playerName,
      action: "Four",
      note: "Driven through the covers",
      createdAtUtc: new Date(now - 2 * 60_000).toISOString(),
      homeScore: cricketLive.homeScore,
      homeWickets: cricketLive.homeWickets,
      awayScore: cricketLive.awayScore,
      awayWickets: cricketLive.awayWickets,
      fixtureName: `${cricketLive.homeTeamName} vs ${cricketLive.awayTeamName}`,
      sportName: "Cricket",
    },
  ];

  const racquetMatches: RacquetMatch[] = fixtures
    .filter((fixture) => ["badminton", "pickleball"].includes(fixture.sport.toLowerCase()))
    .map(makeRacquetMatch);

  const scorecardsByFixture: Record<string, Scorecard[]> = {
    [cricketLive.id]: [
      {
        id: "local-scorecard-live-1",
        fixtureId: cricketLive.id,
        inningsNo: 1,
        battingTeamId: cricketLive.homeTeamId,
        bowlingTeamId: cricketLive.awayTeamId,
        battingFigures: [
          {
            playerId: teams[0].players[0].playerId,
            playerName: teams[0].players[0].playerName,
            runs: 38,
            balls: 27,
            fours: 4,
            sixes: 1,
            strikeRate: 140.74,
          },
        ],
        bowlingFigures: [],
      },
    ],
  };

  return {
    version: 1,
    racquetStarterDataVersion: 8,
    sports,
    sportRoles,
    teams,
    fixtures,
    series,
    accounts: [
      {
        id: "local-superadmin",
        firstName: "Local",
        lastName: "Super Admin",
        email: "superadmin@newvision-software.com",
        password: "Demo@123",
        role: "superadmin",
        approved: true,
      },
    ],
    approvals: [],
    commentaryByFixture: { [cricketLive.id]: commentary },
    scorecardsByFixture,
    racquetMatches,
  };
}

function isLocalAppData(value: unknown): value is LocalAppData {
  if (value === null || typeof value !== "object") return false;
  const data = value as LocalAppData;
  return (
    data.version === 1 &&
    Array.isArray(data.sports) &&
    Array.isArray(data.sportRoles) &&
    Array.isArray(data.teams) &&
    Array.isArray(data.fixtures) &&
    Array.isArray(data.series) &&
    Array.isArray(data.accounts) &&
    Array.isArray(data.approvals) &&
    Array.isArray(data.racquetMatches) &&
    typeof data.commentaryByFixture === "object" &&
    typeof data.scorecardsByFixture === "object"
  );
}

function replaceRacquetSeriesWithStarterData(data: LocalAppData) {
  for (const team of createRacquetStarterTeams(data.sports)) {
    if (data.teams.some((existing) => existing.id === team.id)) continue;
    data.teams.push(team);
  }

  const racquetSportIds = new Set(
    data.sports
      .filter((sport) =>
        ["badminton", "pickleball"].includes(sport.name.toLowerCase()),
      )
      .map((sport) => sport.id),
  );
  const racquetSeriesIds = new Set(
    data.series
      .filter(
        (series) =>
          racquetSportIds.has(series.sportId) ||
          ["badminton", "pickleball"].includes(series.sportName.toLowerCase()),
      )
      .map((series) => series.id),
  );
  const legacyFixtureIds = new Set(
    data.fixtures
      .filter(
        (fixture) =>
          fixture.seriesId !== undefined &&
          fixture.seriesId !== null &&
          racquetSeriesIds.has(fixture.seriesId),
      )
      .map((fixture) => fixture.id),
  );
  data.series
    .filter((series) => racquetSeriesIds.has(series.id))
    .flatMap(
      (series) =>
        series.bracket?.rounds.flatMap((round) => round.fixtureIds) ?? [],
    )
    .forEach((fixtureId) => legacyFixtureIds.add(fixtureId));
  legacyFixtureIds.forEach((fixtureId) => {
    delete data.commentaryByFixture[fixtureId];
    delete data.scorecardsByFixture[fixtureId];
  });
  data.fixtures = data.fixtures.filter((fixture) => {
    const isRacquetSeriesFixture =
      (fixture.seriesId !== undefined &&
        fixture.seriesId !== null &&
        racquetSeriesIds.has(fixture.seriesId)) ||
      legacyFixtureIds.has(fixture.id);
    if (isRacquetSeriesFixture) {
      delete data.commentaryByFixture[fixture.id];
      delete data.scorecardsByFixture[fixture.id];
    }
    return !isRacquetSeriesFixture;
  });
  data.racquetMatches = data.racquetMatches.filter(
    (match) => !legacyFixtureIds.has(match.fixtureId),
  );
  data.series = data.series.filter(
    (series) => !racquetSeriesIds.has(series.id),
  );

  const seeded = createRacquetStarterSeries(data.sports, data.teams, Date.now());
  data.series.push(...seeded.series);
  data.fixtures.unshift(...seeded.fixtures);
  data.racquetMatches.push(...seeded.fixtures.map(makeRacquetMatch));
}

export function readLocalAppData(): LocalAppData {
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    const starterData = createStarterData();
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(starterData));
    return starterData;
  }

  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    throw new Error("Local application data is corrupted.");
  }

  if (!isLocalAppData(value)) {
    throw new Error("Local application data has an unsupported format.");
  }
  if ((value.racquetStarterDataVersion ?? 0) < 8) {
    replaceRacquetSeriesWithStarterData(value);
    value.racquetStarterDataVersion = 8;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
  }
  return value;
}

export function updateLocalAppData<T>(
  update: (data: LocalAppData) => T,
): T {
  const data = readLocalAppData();
  const result = update(data);
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  window.dispatchEvent(
    new CustomEvent(LOCAL_APP_DATA_CHANGED_EVENT, { detail: { data } }),
  );
  return result;
}

export function createLocalId(prefix: string) {
  return createId(`local-${prefix}`);
}
