import "./MatchGrid.css";
import { Link } from "react-router-dom";
import type { MatchCardModel } from "../types/MatchCardModel";
import { useNavigate } from "react-router-dom";
import useScoreUpdateFeed from "../../hooks/useScoreUpdateFeed";

type MatchCardProps = {
  match: MatchCardModel;
  isSelected: boolean;

  onClick: () => void;
};

function MatchCard({ match, isSelected, onClick }: MatchCardProps) {
  // Subscribe to realtime score updates for this fixture (if any)
  const { scoreByMatch } = useScoreUpdateFeed(match.id || "");
  const realtime = match.id ? scoreByMatch[String(match.id)] : undefined;

  const route =
    match.source === "cricbuzz" ? `/match/${match.id}` : `/fixture/${match.id}`;
  const navigate = useNavigate();

  const battingTeam =
    (realtime as any)?.battingTeam ?? (match as any)?.battingTeam ?? "home";
  const homeOvers = (realtime as any)?.homeOvers ?? match.homeOvers ?? null;
  const awayOvers =
    (realtime as any)?.awayOvers ?? (match as any)?.awayOvers ?? null;
  const currentOvers =
    battingTeam === "home"
      ? homeOvers
      : battingTeam === "away"
        ? awayOvers
        : (homeOvers ?? awayOvers);

        // console.log("Match status===========================:", match.status);

        const isLive =
          match.status === "Live" ||
          match.status === "In Progress";

  return (
    <article
      className={`match-card ${isSelected ? "match-card--selected" : ""}`}
      onClick={() => {
        onClick();
      }}
    >
      <div className="match-card__header">
        <span className="match-card__sport">{match.sport}</span>

        <span
            className={`match-card__status ${
                isLive
                    ? "match-card__status--live"
                    : match.status === "Preview"
                        ? "match-card__status--preview"
                        : match.status === "Complete"
                            ? "match-card__status--complete"
                            : ""
            }`}
        >
            {isLive && <span className="match-card__live-dot" />}

            {isLive ? "LIVE" : match.status}
        </span>
        <button
          className="match-card__view-button"
          onClick={() => navigate(route)}
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

          <span className="match-card__score">
            {realtime
              ? `${realtime.homeScore}/${realtime.homeWickets ?? 0}`
              : match.team1Score !== null
                ? `${match.team1Score}/${match.team1Wickets ?? 0}`
                : "-"}
          </span>
        </div>

        <div className="match-card__team">
          <div className="match-card__team-info">
            <span className="blue-dot" />
            <span>{match.team2Name}</span>
          </div>

          <span className="match-card__score">
            {realtime
              ? `${realtime.awayScore}/${realtime.awayWickets ?? 0}`
              : match.team2Score !== null
                ? `${match.team2Score}/${match.team2Wickets ?? 0}`
                : "-"}
          </span>
        </div>
      </div>

      <div className="match-card__footer">
        <span>{match.shortStatus}</span>

        {currentOvers !== null && <span>{currentOvers} Overs</span>}
      </div>
    </article>
  );
}

export default MatchCard;
