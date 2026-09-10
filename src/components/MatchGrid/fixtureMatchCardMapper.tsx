import type { Fixture } from "../types/Fixture";

import type { MatchCardModel } from "../types/MatchCardModel";

export function mapFixtureToMatchCard(fixture: Fixture): MatchCardModel {
  return {
    id: fixture.id,
    fixtureId: fixture.id,
    source: "internal",

    sport: fixture.sport,
    status: fixture.status,
    shortStatus: fixture.status,

    team1Name: fixture.homeTeamName,
    team2Name: fixture.awayTeamName,

    team1Score: fixture.homeScore,
    team1Wickets: fixture.homeWickets,

    team2Score: fixture.awayScore,
    team2Wickets: fixture.awayWickets,
    homeOvers: fixture.homeOvers,
    awayOvers: fixture.awayOvers,
    overs: null,
  };
}
