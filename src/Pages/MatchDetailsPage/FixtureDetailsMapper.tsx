import type { FixtureDetailsDto } from "../../components/types/FixtureDetails";
import type {
  MatchCommentaryModel,
  MatchDetailsModel,
} from "../../components/types/MatchDetailsModel";

function mapFixtureBatter(
  performer: FixtureDetailsDto["topPerformers"][number],
  commentary: FixtureDetailsDto["commentary"],
) {
  const playerCommentary = commentary.filter(
    (item) => item.playerId === performer.playerId,
  );
  const balls = playerCommentary.length;
  const fours = playerCommentary.filter(
    (item) => item.action === "Four",
  ).length;
  const sixes = playerCommentary.filter((item) => item.action === "Six").length;
  const runs = performer.runsScored ?? 0;

  return {
    id: performer.playerId,
    name: performer.playerName,
    runs,
    balls,
    fours,
    sixes,
    strikeRate: balls > 0 ? ((runs / balls) * 100).toFixed(2) : "0.00",
    playerUrl: "",
    playerMatchHighlightsUrl: "",
  };
}

function calculateRunRate(score: number, oversValue: unknown): number {
  const oversText = String(oversValue ?? "0");
  const [completedOversText, ballsText = "0"] = oversText.split(".");
  const completedOvers = Number(completedOversText) || 0;
  const balls = Number(ballsText) || 0;
  const legalBalls = completedOvers * 6 + balls;

  return legalBalls > 0 ? Number(((score / legalBalls) * 6).toFixed(2)) : 0;
}

function getFixtureActionRuns(action: string): number {
  switch (action.toLowerCase()) {
    case "single":
      return 1;
    case "two":
      return 2;
    case "three":
      return 3;
    case "four":
      return 4;
    case "six":
      return 6;
    default:
      return 0;
  }
}

function getFixtureBallResult(action: string): string {
  switch (action.toLowerCase()) {
    case "six":
      return "6";
    case "four":
      return "4";
    case "single":
      return "1";
    case "two":
      return "2";
    case "three":
      return "3";
    case "wicket":
      return "W";
    case "wide":
      return "Wd";
    case "no_ball":
      return "Nb";
    default:
      return "0";
  }
}

export function mapFixtureMatchDetails(
  response: FixtureDetailsDto,
): MatchDetailsModel {
  const commentary: Record<string, MatchCommentaryModel> = {};

  response.commentary?.forEach((item) => {
    commentary[item.id] = {
      matchId: response.id,

      commType: item.action,
      commText: item.note && item.note.trim() !== "" ? item.note : item.action,

      inningsId: 1,

      event: [],

      ballMetric: null,

      teamName: item.side,

      timestamp: new Date(item.createdAtUtc).getTime(),

      overSeparator: null,

      batsmanDetails: {
        playerId: item.playerId,
        playerName: item.playerName,
      },

      bowlerDetails: {
        playerId: "",
        playerName: "",
      },
    };
  });
  const fixtureCommentary = response.commentary ?? [];
  const performers = response.topPerformers ?? [];
  const batterSource =
    performers.length > 0
      ? performers
      : fixtureCommentary
          .filter(
            (item, index, items) =>
              items.findIndex(
                (candidate) => candidate.playerId === item.playerId,
              ) === index,
          )
          .map((item) => ({
            playerId: item.playerId,
            playerName: item.playerName,
            teamId: "",
            teamName: item.side,
            runsScored: 0,
          }));
  const latestCommentaryPlayerId = [...fixtureCommentary].sort(
    (first, second) =>
      new Date(second.createdAtUtc).getTime() -
      new Date(first.createdAtUtc).getTime(),
  )[0]?.playerId;
  const orderedBatterSource = latestCommentaryPlayerId
    ? [...batterSource].sort((first, second) => {
        if (first.playerId === latestCommentaryPlayerId) return -1;
        if (second.playerId === latestCommentaryPlayerId) return 1;
        return 0;
      })
    : batterSource;
  const batters = orderedBatterSource
    .slice(0, 2)
    .map((performer) => mapFixtureBatter(performer, fixtureCommentary));
  const sortedCommentary = [...fixtureCommentary].sort(
    (first, second) =>
      new Date(first.createdAtUtc).getTime() -
      new Date(second.createdAtUtc).getTime(),
  );
  let lastWicketIndex = -1;
  for (let index = sortedCommentary.length - 1; index >= 0; index -= 1) {
    if (sortedCommentary[index].action.toLowerCase() === "wicket") {
      lastWicketIndex = index;
      break;
    }
  }
  const lastWicket =
    lastWicketIndex >= 0 ? sortedCommentary[lastWicketIndex] : null;
  const lastWicketNote = lastWicket?.note?.trim();
  const lastWicketDescription = lastWicket
    ? lastWicketNote &&
      lastWicketNote.replace(/[:\s]/g, "").toLowerCase() !== "wicket"
      ? lastWicketNote
      : `${lastWicket.playerName} dismissed (${response.homeScore}/${response.homeWickets ?? 0})`
    : "No wicket yet";
  const currentPartnership = sortedCommentary.slice(lastWicketIndex + 1);
  const partnership = {
    runs: currentPartnership.reduce(
      (total, item) => total + getFixtureActionRuns(item.action),
      0,
    ),
    balls: currentPartnership.filter(
      (item) => !["wide", "no_ball"].includes(item.action.toLowerCase()),
    ).length,
  };
  const recentOvers = (() => {
    const grouped = new Map<string, string[]>();

    sortedCommentary.forEach((item) => {
      const action = item.action.toLowerCase();
      const ball = String(item.ball ?? "");
      const over = ball.includes(".") ? ball.split(".")[0] : "recent";
      const results = grouped.get(over) ?? [];
      const result = getFixtureBallResult(item.action);
      if (["wide", "no_ball"].includes(action) && results.length > 0) {
        results[results.length - 1] =
          `${results[results.length - 1]} ${result}`;
      } else {
        results.push(result);
      }
      grouped.set(over, results);
    });

    return Array.from(grouped.values())
      .slice(-3)
      .map((over) => over.join(" "))
      .join(" | ");
  })();

  return {
    source: "fixture",

    header: {
      matchId: response.id,

      matchDescription: `${response.homeTeamName} vs ${response.awayTeamName}`,

      matchFormat: response.sport,

      matchType: "",

      complete: response.status.toLowerCase() === "completed",

      domestic: false,

      matchStartTimestamp: new Date(response.scheduledAtUtc).getTime(),

      matchStartTimeIST: "",
      matchStartTimeGMT: "",
      matchStartTimeLocal: "",

      matchCompleteTimeIST: "",
      matchCompleteTimeGMT: "",
      matchCompleteTimeLocal: "",

      dayNight: false,

      year: new Date(response.scheduledAtUtc).getFullYear(),

      state: response.phase ?? "",

      status: response.status,

      tossResults: {
        tossWinnerId: "",
        tossWinnerName: "",
        decision: "",
      },

      result: {
        resultType: null,
        winningTeam: null,
        winningTeamId: null,
        winningMargin: null,
        winByRuns: null,
        winByInnings: null,
      },

      revisedTarget: {
        reason: null,
        revisedTarget: null,
        revisedOvers: null,
      },

      playersOfTheMatch: [],

      playersOfTheSeries: [],

      matchTeamInfo: [],

      team1: {
        id: response.homeTeamId,
        name: response.homeTeamName,
        shortName: response.homeTeamName,
        playerDetails: [],
      },

      team2: {
        id: response.awayTeamId,
        name: response.awayTeamName,
        shortName: response.awayTeamName,
        playerDetails: [],
      },

      seriesDesc: "",

      seriesId: "",

      seriesName: response.sport,

      alertType: "",

      isMatchNotCovered: false,

      livestreamEnabled: false,
    },

    live: {
      inningsId: 1,

      batTeam: {
        teamId: response.homeTeamId,
        teamScore: response.homeScore,
        homeOvers: response.homeOvers,
        awayOvers: response.awayOvers,
        teamWkts: response.homeWickets ?? 0,
      },

      status: response.status,

      batsmanStriker: batters[0] ?? null,
      batsmanNonStriker: batters[1] ?? null,

      bowlerStriker: null,
      bowlerNonStriker: null,

      overs: 0,

      target: null,

      partnerShip: partnership,

      currentRunRate: calculateRunRate(response.homeScore, response.homeOvers),

      requiredRunRate: 0,

      runsPerBall: 0,

      requiredRunsPerBall: 0,

      matchScoreDetails: {
        matchId: response.id,

        inningsScoreList: [],

        isMatchNotCovered: false,

        matchFormat: response.sport,

        customStatus: "",

        state: response.status,
      },

      lastWicket: lastWicketDescription,

      remRunsToWin: 0,

      oversRem: 0,

      responseLastUpdated: Date.now(),

      latestPerformance: [],

      recentOvsStats: recentOvers,

      event: "",

      batTeamScoreObj: {
        teamName: response.homeTeamName,
        teamInningsArray: [],
      },

      bowlTeamScoreObj: {
        teamName: response.awayTeamName,
        teamInningsArray: [],
      },

      matchUdrs: null,
    },

    commentary,

    enableNoContent: false,

    matchVideos: [],

    page: "",

    responseLastUpdated: Date.now(),
  };
}
