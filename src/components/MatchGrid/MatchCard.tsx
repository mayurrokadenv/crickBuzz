import "./MatchGrid.css";
import type { MatchCardModel } from "../types/MatchCardModel";
import { useLocation, useNavigate } from "react-router-dom";
import useScoreUpdateFeed, { getScoreForFixture } from "../../hooks/useScoreUpdateFeed";

type MatchCardProps = {
  match: MatchCardModel;
  isSelected: boolean;

  onClick: () => void;
};

function MatchCard({ match, isSelected, onClick }: MatchCardProps) {
  const fixtureId = (match.source === "internal" ? match.fixtureId : undefined) ?? match.id;
  console.log("MatchCard: Fixture ID for match in MatchCard====================>", fixtureId);
  const { scoreByMatch } = useScoreUpdateFeed(fixtureId ?? "");

  const realtime = fixtureId ? getScoreForFixture(scoreByMatch, fixtureId) : undefined;
  console.log("MatchCard: Realtime score for fixtureId in MatchCard==============>", fixtureId, ":", realtime);
  console.log("MatchCard: Score updates in MatchCard:====================>", scoreByMatch);

  const route =
    match.source === "cricbuzz" ? `/match/${match.id}` : `/fixture/${match.id}`;
  const navigate = useNavigate();
  const location = useLocation();
  const dashboard = location.pathname === "/nvian" ? "nvian" : "live";

  const displayHomeScore = realtime
    ? `${realtime.homeScore}/${realtime.homeWickets ?? 0}`
    : match.team1Score !== null
      ? `${match.team1Score}/${match.team1Wickets ?? 0}`
      : "-";

  const displayAwayScore = realtime
    ? `${realtime.awayScore}/${realtime.awayWickets ?? 0}`
    : match.team2Score !== null
      ? `${match.team2Score}/${match.team2Wickets ?? 0}`
      : "-";

  const homeOvers = realtime?.homeOvers ?? match.homeOvers ?? null;
  const awayOvers = realtime?.awayOvers ?? match.awayOvers ?? null;
  const currentInningsNo = realtime?.phase?.toLowerCase().includes("second")
    ? 2
    : 1;
  const currentInnings = Array.isArray(realtime?.scorecards)
    ? realtime.scorecards.find((innings) => innings.inningsNo === currentInningsNo)
    : realtime?.scorecards?.[`innings${currentInningsNo}`];
  const battingTeamId = realtime?.battingTeamId ?? currentInnings?.battingTeamId;
  const isHomeBatting = battingTeamId
    ? battingTeamId === realtime?.homeTeamId
    : homeOvers !== "0.0" || awayOvers === "0.0";
  const currentOvers = isHomeBatting ? homeOvers : awayOvers;
  const activeStatus = realtime?.status ?? match.status;

        const isLive =
          activeStatus === "Live" ||
          activeStatus === "In Progress";

  return (
    <article
      className={`match-card ${isSelected ? "match-card--selected" : ""}`}
      onClick={onClick}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onClick();
        }
      }}
      role="button"
      tabIndex={0}
      aria-pressed={isSelected}
    >
      <div className="match-card__header">
        <span className="match-card__sport">{match.sport}</span>

        <span
            className={`match-card__status ${
                isLive
                    ? "match-card__status--live"
                    : activeStatus === "Preview"
                        ? "match-card__status--preview"
                      : activeStatus === "Complete"
                            ? "match-card__status--complete"
                            : ""
            }`}
        >
            {isLive && <span className="match-card__live-dot" />}

            {isLive ? "LIVE" : activeStatus}
        </span>
        <button
          type="button"
          className="match-card__view-button"
          onClick={(event) => {
            event.stopPropagation();
            navigate(route, { state: { dashboard } });
          }}
        >
          View
        </button>
      </div>

      <div className="match-card__teams">
        <div className="match-card__team">
          <div className="match-card__team-info">
            <span className="orange-dot" />
            <span>{match.team1Name}</span>
          </div>

          <span className="match-card__score">{displayHomeScore}</span>
        </div>

        <div className="match-card__team">
          <div className="match-card__team-info">
            <span className="blue-dot" />
            <span>{match.team2Name}</span>
          </div>

          <span className="match-card__score">{displayAwayScore}</span>
        </div>
      </div>

      <div className="match-card__footer">
        <span>{activeStatus}</span>

        {currentOvers !== null && <span>{currentOvers} Overs</span>}
      </div>
    </article>
  );
}

export default MatchCard;
