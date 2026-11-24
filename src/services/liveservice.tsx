import {
  createLocalId,
  readLocalAppData,
  updateLocalAppData,
} from "./localAppStore";

export interface LiveMatchResponse {
  id: string;
  homeTeamId: string;
  homeTeamName: string;
  awayTeamId: string;
  awayTeamName: string;
  sport: string;
  scheduledAtUtc: string;
  status: string;
  homeScore: number;
  homeWickets: number;
  homeOvers?: string;
  awayScore: number;
  awayWickets: number;
  awayOvers?: string;
}

export interface FeedingMatch {
  id: number;
  fixtureId?: string;
  sport: string;
  team1: string;
  team2: string;
  score: string;
  stage: string;
  progress: string;
  homeOvers?: string;
  awayOvers?: string;
}

export interface CommentaryRequest {
  side: 0 | 1;
  playerId: string;
  action: number;
  note?: string;
  currentball?: string;
}

export interface ScoreUpdate {
  side: 0 | 1;
  fixtureId: string;
  runsDelta: number;
  wicketsDelta: number;
  overs?: string;
}

export interface CommentaryEntry {
  id: string;
  fixtureId: string;
  side: string;
  playerId: string;
  playerName: string;
  action: string;
  note: string;
  createdAtUtc: string;
  homeScore: number;
  homeWickets: number;
  awayScore: number;
  awayWickets: number;
  fixtureName: string;
  sportName: string;
}

export async function getLiveMatches(): Promise<FeedingMatch[]> {
  const fixtures = readLocalAppData().fixtures.filter(
    (fixture) => fixture.status.toLowerCase() === "live",
  );
  return mapLiveMatchesToFeedingMatches(fixtures);
}

function mapLiveMatchesToFeedingMatches(
  liveMatches: LiveMatchResponse[],
): FeedingMatch[] {
  return liveMatches.map((match, index) => {
    let score = "";
    let stage = "";
    let progress = "";

    if (match.sport.toLowerCase() === "cricket") {
      score = `${match.homeScore}/${match.homeWickets} (${match.homeOvers ?? "0.0"})`;
      stage = match.status === "Live" ? "Live" : "Completed";
      progress = getCricketProgress(match);
    } else if (match.sport.toLowerCase() === "football") {
      score = `${match.homeScore} - ${match.awayScore}`;
      stage = match.status === "Live" ? "Live" : "Completed";
      progress = getFootballProgress(match);
    } else {
      score = `${match.homeScore} - ${match.awayScore}`;
      stage = match.status || "In Progress";
      progress = "In Progress";
    }

    return {
      id: index + 1,
      fixtureId: match.id,
      sport: match.sport,
      team1: match.homeTeamName,
      team2: match.awayTeamName,
      score: score,
      stage: stage,
      progress: progress,
      homeOvers: match.homeOvers,
      awayOvers: match.awayOvers,
    };
  });
}

function getCricketProgress(match: LiveMatchResponse): string {
  if (match.status === "Live") {
    return "In Progress";
  }
  return "Completed";
}

function getFootballProgress(match: LiveMatchResponse): string {
  if (match.status === "Live") {
    return "In Progress";
  }
  return "Full Time";
}

export async function getLiveMatchesWithOriginalIds(): Promise<FeedingMatch[]> {
  return readLocalAppData().fixtures
    .filter((fixture) => fixture.status.toLowerCase() === "live")
    .map((match, index) => ({
      id: Number.parseInt(match.id.replace(/\D/g, "").slice(0, 8), 10) || index + 1,
      fixtureId: match.id,
      sport: match.sport,
      team1: match.homeTeamName,
      team2: match.awayTeamName,
      score: `${match.homeScore}/${match.homeWickets} (${match.homeOvers ?? "0.0"})`,
      stage: match.status,
      progress: "In Progress",
      homeOvers: match.homeOvers,
      awayOvers: match.awayOvers,
    }));
}

export const fetchLiveTeams = async () => {
  const data = readLocalAppData();
  return data.teams.map((team) => ({
    ...team,
    sport: {
      name: team.sportName,
      description:
        data.sports.find((sport) => sport.id === team.sportId)?.description ?? "",
    },
  }));
};

export const liveFixtures = async () => {
  return readLocalAppData().fixtures;
};

export async function postCommentary(
  fixtureId: string,
  data: CommentaryRequest,
) {
  return updateLocalAppData((store) => {
    const fixture = store.fixtures.find((item) => item.id === fixtureId);
    if (!fixture) throw new Error("Fixture not found in local data.");
    const player = store.teams
      .flatMap((team) => team.players)
      .find((item) => item.playerId === data.playerId);
    const side = data.side === 0 ? "Home" : "Away";
    const entry: CommentaryEntry = {
      id: createLocalId("commentary"),
      fixtureId,
      side,
      playerId: data.playerId,
      playerName: player?.playerName ?? "Player",
      action: getActionName(data.action),
      note: data.note ?? "",
      createdAtUtc: new Date().toISOString(),
      homeScore: fixture.homeScore,
      homeWickets: fixture.homeWickets,
      awayScore: fixture.awayScore,
      awayWickets: fixture.awayWickets,
      fixtureName: `${fixture.homeTeamName} vs ${fixture.awayTeamName}`,
      sportName: fixture.sport,
    };
    (store.commentaryByFixture[fixtureId] ??= []).unshift(entry);
    return entry;
  });
}

export const updateScoreFixtures = async (
  fixtureId: string,
  data: {
    side: 0 | 1;
    battingPlayerId: string;
    bowlingPlayerId: string;
    action:number;
    runsDelta?: number;
    wicketsDelta?: number;
    overs?: string;
    bowlerOver?: string;
  },
) => {
  return updateLocalAppData((store) => {
    const fixture = store.fixtures.find((item) => item.id === fixtureId);
    if (!fixture) throw new Error("Fixture not found in local data.");
    const home = data.side === 0;
    const scoreKey = home ? "homeScore" : "awayScore";
    const wicketKey = home ? "homeWickets" : "awayWickets";
    const oversKey = home ? "homeOvers" : "awayOvers";
    fixture[scoreKey] += data.runsDelta ?? 0;
    fixture[wicketKey] += data.wicketsDelta ?? 0;
    if (data.overs !== undefined) fixture[oversKey] = data.overs;
    fixture.battingTeamId = home ? fixture.homeTeamId : fixture.awayTeamId;

    const latest = store.commentaryByFixture[fixtureId]?.[0];
    if (latest) {
      latest.homeScore = fixture.homeScore;
      latest.homeWickets = fixture.homeWickets;
      latest.awayScore = fixture.awayScore;
      latest.awayWickets = fixture.awayWickets;
    }

    return fixture;
  });
};

export async function getCommentary(
  fixtureId: string,
): Promise<CommentaryEntry[]> {
  return readLocalAppData().commentaryByFixture[fixtureId] ?? [];
}

export const updateCommentary = async (
  fixtureId: string,
  commentaryId: string,
  data: { note: string },
) => {
  return updateLocalAppData((store) => {
    const entry = store.commentaryByFixture[fixtureId]?.find(
      (item) => item.id === commentaryId,
    );
    if (!entry) throw new Error("Commentary entry not found.");
    entry.note = data.note;
    return entry;
  });
};

function getActionName(action: number) {
  const actions: Record<number, string> = {
    0: "Six",
    1: "Four",
    2: "Single",
    3: "Wicket",
    4: "Wide",
    5: "Two",
    6: "Three",
    7: "Goal",
    8: "Assist",
    9: "Yellow Card",
    10: "Red Card",
    11: "Substitution",
    12: "Penalty",
    13: "Free Kick",
    14: "Corner",
    15: "Offside",
    16: "Save",
    17: "No Ball",
    18: "Byes",
    19: "Dot Ball",
  };
  return actions[action] ?? "Event";
}
