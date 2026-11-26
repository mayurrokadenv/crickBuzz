import api from "./fixturesservice";
import type { CricbuzzMatchDetailsResponse } from "../components/types/CricbuzzLiveMatchInfo";
import type { CricbuzzMatchItem } from "../components/types/Matches";
import type { FixtureDetailsDto, TopPerformerDto } from "../components/types/FixtureDetails";
import type {
  FixtureScorecard,
  FixtureScorecardsByInnings,
} from "../components/MatchDetails/FixtureScorecard";
import { readLocalAppData } from "./localAppStore";
import type { Fixture as DashboardFixture } from "../components/types/Fixture";

function numericId(id: string) {
  const hash = [...id].reduce(
    (value, character) => (value * 31 + character.charCodeAt(0)) >>> 0,
    7,
  );
  return (hash % 900_000) + 100_000;
}

function getLocalFixture(fixtureId: string) {
  const data = readLocalAppData();
  const fixture = data.fixtures.find((item) => item.id === fixtureId);
  if (!fixture) throw new Error("Fixture not found in local data.");
  return { data, fixture };
}

function toCricbuzzMatch(fixture: ReturnType<typeof getLocalFixture>["fixture"]): CricbuzzMatchItem {
  const team1Id = numericId(fixture.homeTeamId);
  const team2Id = numericId(fixture.awayTeamId);
  const matchStart = new Date(fixture.scheduledAtUtc).getTime();
  return {
    match: {
      matchInfo: {
        matchId: numericId(fixture.id),
        seriesId: numericId(fixture.sportId ?? "local-series"),
        seriesName: "Local Cricket Cup",
        matchDesc: "Local match",
        matchFormat: fixture.totalOvers === "20" ? "T20" : "Cricket",
        startDate: matchStart,
        endDate: matchStart + 4 * 60 * 60 * 1000,
        state: fixture.status === "Live" ? "In Progress" : fixture.status,
        status: fixture.status,
        team1: {
          teamId: team1Id,
          teamName: fixture.homeTeamName,
          teamSName: fixture.homeTeamName.slice(0, 3).toUpperCase(),
          imageId: 0,
        },
        team2: {
          teamId: team2Id,
          teamName: fixture.awayTeamName,
          teamSName: fixture.awayTeamName.slice(0, 3).toUpperCase(),
          imageId: 0,
        },
        venueInfo: {
          id: 1,
          ground: "Local Ground",
          city: "Local",
          timezone: "UTC",
        },
        currBatTeamId: team1Id,
        stateTitle: fixture.status,
        matchType: "League",
        shortStatus: `${fixture.homeScore}/${fixture.homeWickets} (${fixture.homeOvers ?? "0.0"})`,
      },
      matchScore: {
        team1Score: {
          inngs1: {
            inningsId: 1,
            runs: fixture.homeScore,
            wickets: fixture.homeWickets,
            overs: Number(fixture.homeOvers ?? "0"),
            isDeclared: false,
          },
          inngs2: null,
        },
        team2Score: {
          inngs1: {
            inningsId: 2,
            runs: fixture.awayScore,
            wickets: fixture.awayWickets,
            overs: Number(fixture.awayOvers ?? "0"),
            isDeclared: false,
          },
          inngs2: null,
        },
      },
    },
  };
}

function getCricketFixtures() {
  return readLocalAppData().fixtures.filter(
    (fixture) => fixture.sport.toLowerCase() === "cricket",
  );
}

export const getCurrentMatches = async () => ({
  matches: getCricketFixtures().map(toCricbuzzMatch),
  responseLastUpdated: Date.now(),
});

export const getMatchDetails = async (matchId: string) =>
  getFixtureMatchDetails(matchId);

export const getCricbuzzMatchInfo = async (
  matchId: string,
): Promise<CricbuzzMatchDetailsResponse> => {
  const fixture = getCricketFixtures().find(
    (item) => String(numericId(item.id)) === String(matchId),
  );
  if (!fixture) throw new Error("Local match not found.");

  const numericMatchId = numericId(fixture.id);
  const team1Id = numericId(fixture.homeTeamId);
  const team2Id = numericId(fixture.awayTeamId);
  const now = Date.now();
  const inningsScoreList = [
    {
      inningsId: 1,
      batTeamId: team1Id,
      batTeamName: fixture.homeTeamName,
      score: fixture.homeScore,
      wickets: fixture.homeWickets,
      overs: Number(fixture.homeOvers ?? "0"),
      isDeclared: false,
      isFollowOn: false,
      ballNbr: 0,
    },
    {
      inningsId: 2,
      batTeamId: team2Id,
      batTeamName: fixture.awayTeamName,
      score: fixture.awayScore,
      wickets: fixture.awayWickets,
      overs: Number(fixture.awayOvers ?? "0"),
      isDeclared: false,
      isFollowOn: false,
      ballNbr: 0,
    },
  ];
  const noBatsman = {
    id: 0,
    name: "",
    runs: 0,
    balls: 0,
    fours: 0,
    sixes: 0,
    strikeRate: "0",
    playerUrl: "",
    playerMatchHighlightsUrl: "",
  };
  const noBowler = {
    id: 0,
    name: "",
    overs: 0,
    maidens: 0,
    economy: 0,
    runs: 0,
    wickets: 0,
    playerUrl: "",
    playerMatchHighlightsUrl: "",
  };
  const teamScore = {
    teamId: team1Id,
    teamScore: fixture.homeScore,
    teamWkts: fixture.homeWickets,
  };
  const team1 = {
    id: team1Id,
    name: fixture.homeTeamName,
    shortName: fixture.homeTeamName.slice(0, 3).toUpperCase(),
    playerDetails: [],
  };
  const team2 = {
    id: team2Id,
    name: fixture.awayTeamName,
    shortName: fixture.awayTeamName.slice(0, 3).toUpperCase(),
    playerDetails: [],
  };
  const matchHeader = {
    matchId: numericMatchId,
    matchDescription: "Local match",
    matchFormat: fixture.totalOvers === "20" ? "T20" : "Cricket",
    matchType: "League",
    complete: fixture.status === "Completed",
    domestic: true,
    matchStartTimestamp: new Date(fixture.scheduledAtUtc).getTime(),
    matchStartTimeIST: "",
    matchStartTimeGMT: "",
    matchStartTimeLocal: "",
    matchCompleteTimeIST: "",
    matchCompleteTimeGMT: "",
    matchCompleteTimeLocal: "",
    dayNight: false,
    year: new Date(fixture.scheduledAtUtc).getFullYear(),
    state: fixture.status,
    status: fixture.status,
    tossResults: { tossWinnerId: team1Id, tossWinnerName: fixture.homeTeamName, decision: "" },
    result: {
      resultType: null,
      winningTeam: null,
      winningTeamId: null,
      winningMargin: null,
      winByRuns: null,
      winByInnings: null,
    },
    revisedTarget: { reason: null, revisedTarget: null, revisedOvers: null },
    playersOfTheMatch: [],
    playersOfTheSeries: [],
    matchTeamInfo: [
      {
        battingTeamId: team1Id,
        battingTeamShortName: team1.shortName,
        bowlingTeamId: team2Id,
        bowlingTeamShortName: team2.shortName,
      },
    ],
    team1,
    team2,
    seriesDesc: "Local demo series",
    seriesId: numericId(fixture.sportId ?? "local-series"),
    seriesName: "Local Cricket Cup",
    alertType: "",
    isMatchNotCovered: false,
    livestreamEnabled: false,
  };
  const matchScoreDetails = {
    matchId: numericMatchId,
    inningsScoreList,
    isMatchNotCovered: false,
    matchFormat: "T20",
    customStatus: fixture.status,
    state: fixture.status,
  };
  const scoreObject = (name: string, innings: typeof inningsScoreList[number]) => ({
    teamName: name,
    teamInningsArray: [innings],
  });
  const commentary = Object.fromEntries(
    (readLocalAppData().commentaryByFixture[fixture.id] ?? []).map((entry) => [
      entry.id,
      {
        matchId: numericMatchId,
        commType: entry.action,
        commText: entry.note || entry.action,
        inningsId: 1,
        event: [],
        ballMetric: null,
        teamName: entry.side,
        timestamp: new Date(entry.createdAtUtc).getTime(),
        overSeparator: null,
        batsmanDetails: {
          playerId: numericId(entry.playerId),
          playerName: entry.playerName,
        },
        bowlerDetails: { playerId: 0, playerName: "" },
      },
    ]),
  );

  return {
    matchCommentary: commentary,
    miniscore: {
      inningsId: 1,
      batTeam: teamScore,
      status: fixture.status,
      batsmanStriker: noBatsman,
      batsmanNonStriker: noBatsman,
      bowlerStriker: noBowler,
      bowlerNonStriker: noBowler,
      overs: Number(fixture.homeOvers ?? "0"),
      target: null,
      partnerShip: { balls: 0, runs: 0 },
      currentRunRate: 0,
      requiredRunRate: 0,
      runsPerBall: 0,
      requiredRunsPerBall: 0,
      matchScoreDetails,
      lastWicket: "No wicket yet",
      remRunsToWin: 0,
      oversRem: 0,
      responseLastUpdated: now,
      latestPerformance: [],
      recentOvsStats: "",
      event: "",
      batTeamScoreObj: scoreObject(fixture.homeTeamName, inningsScoreList[0]),
      bowlTeamScoreObj: scoreObject(fixture.awayTeamName, inningsScoreList[1]),
      matchUdrs: null,
    },
    enableNoContent: false,
    matchHeader,
    matchVideos: [],
    page: "",
    responseLastUpdated: now,
  };
};

export const getCricbuzzScorecard = async (_matchId: number) => ({
  scoreCard: [],
  matchHeader: null,
  status: "Local demo scorecard",
  videos: [],
  responseLastUpdated: Date.now(),
  isMatchComplete: false,
});

export async function getFixtureScorecard(fixtureId: string): Promise<FixtureScorecard> {
  const { data, fixture } = getLocalFixture(fixtureId);
  const scorecards = data.scorecardsByFixture[fixtureId] ?? [];
  const commentary = (data.commentaryByFixture[fixtureId] ?? []).map((entry) => ({
    ...entry,
    side: entry.side === "Away" ? "Away" as const : "Home" as const,
  }));
  const scorecardsByInnings = Object.fromEntries(
    scorecards.map((scorecard) => [`innings${scorecard.inningsNo}`, scorecard]),
  ) as FixtureScorecardsByInnings;
  return {
    id: fixture.id,
    homeTeamId: fixture.homeTeamId,
    homeTeamName: fixture.homeTeamName,
    awayTeamId: fixture.awayTeamId,
    awayTeamName: fixture.awayTeamName,
    sport: fixture.sport,
    scheduledAtUtc: fixture.scheduledAtUtc,
    status: fixture.status,
    phase: fixture.phase,
    homeScore: fixture.homeScore,
    homeWickets: fixture.homeWickets,
    homeOvers: fixture.homeOvers ?? "0.0",
    awayScore: fixture.awayScore,
    awayWickets: fixture.awayWickets,
    awayOvers: fixture.awayOvers ?? "0.0",
    totalOvers: fixture.totalOvers ?? "20",
    commentary,
    topPerformers: getTopPerformersFromData(fixtureId),
    scorecards: scorecardsByInnings,
  };
}

function toDashboardFixture(
  fixture: ReturnType<typeof readLocalAppData>["fixtures"][number],
): DashboardFixture {
  return {
    ...fixture,
    homeOvers: fixture.homeOvers ?? "0.0",
    awayOvers: fixture.awayOvers ?? "0.0",
    sportId: fixture.sportId ?? "",
  };
}

export const getLiveFixtures = async () =>
  { return (await api.get<DashboardFixture[]>("/fixtures/all")).data; };

export const searchCurrentMatches = async (searchText: string) => {
  const term = searchText.trim().toLowerCase();
  const matches = getCricketFixtures()
    .map(toCricbuzzMatch)
    .filter((item) =>
      `${item.match.matchInfo.team1.teamName} ${item.match.matchInfo.team2.teamName}`
        .toLowerCase()
        .includes(term),
    );
  return { matches, responseLastUpdated: Date.now() };
};

function getTopPerformersFromData(fixtureId: string): TopPerformerDto[] {
  const { data, fixture } = getLocalFixture(fixtureId);
  const players = new Map<string, TopPerformerDto>();
  (data.commentaryByFixture[fixtureId] ?? []).forEach((entry) => {
    const runs =
      entry.action.toLowerCase() === "six"
        ? 6
        : entry.action.toLowerCase() === "four"
          ? 4
          : entry.action.toLowerCase() === "single"
            ? 1
            : entry.action.toLowerCase() === "two"
              ? 2
              : entry.action.toLowerCase() === "three"
                ? 3
                : 0;
    const current = players.get(entry.playerId) ?? {
      playerId: entry.playerId,
      playerName: entry.playerName,
      teamId: entry.side === "Home" ? fixture.homeTeamId : fixture.awayTeamId,
      teamName: entry.side === "Home" ? fixture.homeTeamName : fixture.awayTeamName,
      runsScored: 0,
    };
    current.runsScored += runs;
    players.set(entry.playerId, current);
  });
  return [...players.values()].sort((first, second) => second.runsScored - first.runsScored);
}

export const getTopPerformers = async (fixtureId: string) =>
  getTopPerformersFromData(fixtureId);

export const searchLiveFixtures = async (searchText: string) => {
   const term = searchText.trim().toLowerCase();
   const fixtures = await getLiveFixtures();
   return fixtures.filter(fixture =>
     [fixture.sport, fixture.homeTeamName, fixture.awayTeamName].join(" ").toLowerCase().includes(term));
 };

export async function getFixtureMatchDetails(fixtureId: string): Promise<FixtureDetailsDto> { return (await api.get<FixtureDetailsDto>("/fixtures/" + encodeURIComponent(fixtureId))).data; }
