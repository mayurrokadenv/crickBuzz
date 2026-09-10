import "./MatchSummary.css";

import useScoreUpdateFeed from "../../hooks/useScoreUpdateFeed";
import type {
  MatchHeaderModel,
  MatchLiveModel,
} from "../types/MatchDetailsModel";

type MatchSummaryProps = {
  header: MatchHeaderModel;
  live: MatchLiveModel;
};

function MatchSummary({ header, live }: MatchSummaryProps) {
  const fixtureId = header.matchId || "";
  const { scoreByMatch } = useScoreUpdateFeed(String(fixtureId));

  console.log("MatchSummary: Score updates in MatchSummary:====================>", scoreByMatch);
  const realtime = fixtureId ? scoreByMatch[String(fixtureId)] : undefined;

  console.log("MatchSummary: Realtime score for fixtureId in MatchSummary==============>", fixtureId, ":", realtime);

  const innings = live.matchScoreDetails.inningsScoreList;

  const team1Scores = innings.filter(
    (inning) => inning.batTeamId === header.team1.id,
  );

  const team2Scores = innings.filter(
    (inning) => inning.batTeamId === header.team2.id,
  );

  const formatScore = (teamInnings: typeof innings, teamId: string) => {
    const homeScoreValue =
      realtime?.homeScore ?? live?.batTeam?.homeScore ?? live?.batTeam?.teamScore ?? null;
    const awayScoreValue =
      realtime?.awayScore ?? live?.batTeam?.awayScore ?? null;

    const liveScoreForTeam =
      teamId === header.team1.id
        ? homeScoreValue !== null
          ? `${homeScoreValue}/${realtime?.homeWickets ?? live?.batTeam?.homeWickets ?? 0}`
          : undefined
        : teamId === header.team2.id
          ? awayScoreValue !== null
            ? `${awayScoreValue}/${realtime?.awayWickets ?? live?.batTeam?.awayWickets ?? 0}`
            : undefined
          : undefined;

    const homeOvers =
      realtime?.homeOvers ?? live?.batTeam?.homeOvers ?? live?.overs ?? null;
    const awayOvers =
      realtime?.awayOvers ?? live?.batTeam?.awayOvers ?? null;
    const currentOversForTeam =
      teamId === header.team1.id ? homeOvers : awayOvers;

    if (liveScoreForTeam) {
      return `${liveScoreForTeam} (${currentOversForTeam ?? 0})`;
    }

    if (teamInnings.length === 0) {
      const battingTeamId = live?.batTeam?.teamId;

      if (battingTeamId === teamId) {
        return `${live?.batTeam?.teamScore ?? 0}/${live?.batTeam?.teamWkts ?? 0} (${homeOvers ?? 0})`;
      }

      return "Yet to bat";
    }

    return teamInnings
      .map((inning) => `${inning.score}/${inning.wickets} (${inning.overs})`)
      .join(" & ");
  };

  return (
    <section className="match-summary">
      <div className="match-summary__teams">
        <div className="match-summary__team">
          <span className="match-summary__team-name">{header.team1.name}</span>

          <span className="match-summary__score">
            {formatScore(team1Scores, header.team1.id)}
          </span>
        </div>

        <div className="match-summary__team">
          <span className="match-summary__team-name">{header.team2.name}</span>

          <span className="match-summary__score">
            {formatScore(team2Scores, header.team2.id)}
          </span>
        </div>
      </div>

      <div className="match-summary__footer">
        <span>{header.status}</span>
      </div>

      <div className="match-summary__result">
        {header.result.winningTeam
          ? `Winner: ${header.result.winningTeam}`
          : header.status}
      </div>
    </section>
  );
}

export default MatchSummary;
