import "./MatchGrid.css";
import type { MatchCardModel } from "../types/MatchCardModel";
import { useLocation, useNavigate } from "react-router-dom";
import useScoreUpdateFeed, { getScoreForFixture } from "../../hooks/useScoreUpdateFeed";
import {
  getLocalRacquetSport,
  isLocalRacquetSport,
} from "../../utils/localRacquetSports";

type MatchCardProps = {
  match: MatchCardModel;
  isSelected: boolean;

  onClick: () => void;
};

function MatchCard({ match, isSelected, onClick }: MatchCardProps) {
  const fixtureId = (match.source === "internal" ? match.fixtureId : undefined) ?? match.id;
  console.log("MatchCard: Fixture ID for match in MatchCard====================>", fixtureId);
  const { scoreByMatch } = useScoreUpdateFeed(fixtureId ?? "");

  const isLocalRacquet = isLocalRacquetSport(match.sport);
  const realtime =
    fixtureId && !isLocalRacquet
      ? getScoreForFixture(scoreByMatch, fixtureId)
      : undefined;
  console.log("MatchCard: Realtime score for fixtureId in MatchCard==============>", fixtureId, ":", realtime);
  console.log("MatchCard: Score updates in MatchCard:====================>", scoreByMatch);

  const route =
    match.source === "cricbuzz" ? `/match/${match.id}` : `/fixture/${match.id}`;
  const navigate = useNavigate();
  const location = useLocation();
  const dashboard = location.pathname === "/nvian" ? "nvian" : "live";

  const racquetSets =
    match.sets?.length === 3
      ? match.sets
      : [1, 2, 3].map((setNumber) => ({
          setNumber,
          teamA:
            setNumber === (match.currentSet ?? 1) ? match.team1Score ?? 0 : 0,
          teamB:
            setNumber === (match.currentSet ?? 1) ? match.team2Score ?? 0 : 0,
        }));
  const displayHomeScore = realtime
    ? `${realtime.homeScore}/${realtime.homeWickets ?? 0}`
    : isLocalRacquet
      ? racquetSets.map((set) => set.teamA).join(" - ")
      : match.team1Score !== null
        ? `${match.team1Score}/${match.team1Wickets ?? 0}`
        : "-";

  const displayAwayScore = realtime
    ? `${realtime.awayScore}/${realtime.awayWickets ?? 0}`
    : isLocalRacquet
      ? racquetSets.map((set) => set.teamB).join(" - ")
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

  const isLive = activeStatus === "Live" || activeStatus === "In Progress";
  const normalizedStatus = activeStatus.toLowerCase().replace(/[\s_-]/g, "");
  const isCompleted = normalizedStatus === "complete" || normalizedStatus === "completed";
  const isPickleball = getLocalRacquetSport(match.sport) === "pickleball";
  const homeGamesWon = racquetSets.filter((set) => {
    const highScore = Math.max(set.teamA, set.teamB);
    const lead = Math.abs(set.teamA - set.teamB);
    return isPickleball
      ? highScore >= 11 && lead >= 2 && set.teamA > set.teamB
      : ((highScore >= 21 && lead >= 2) || highScore >= 30) &&
          set.teamA > set.teamB;
  }).length;
  const awayGamesWon = racquetSets.filter((set) => {
    const highScore = Math.max(set.teamA, set.teamB);
    const lead = Math.abs(set.teamA - set.teamB);
    return isPickleball
      ? highScore >= 11 && lead >= 2 && set.teamB > set.teamA
      : ((highScore >= 21 && lead >= 2) || highScore >= 30) &&
          set.teamB > set.teamA;
  }).length;
  const winningTeam =
    homeGamesWon >= 2
      ? match.team1Name
      : awayGamesWon >= 2
        ? match.team2Name
        : null;

  return (
    <article
      className={`match-card ${isSelected ? "match-card--selected" : ""} ${
        isLocalRacquet ? "match-card--racquet" : ""
      }`}
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
                            : normalizedStatus === "cancelled" ||
                                normalizedStatus === "canceled"
                              ? "match-card__status--cancelled"
                              : normalizedStatus === "scheduled"
                                ? "match-card__status--scheduled"
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

        {isLocalRacquet ? (
          isCompleted && winningTeam ? (
            <span className="match-card__winner">
              {winningTeam} won the match
            </span>
          ) : (
            <span>
              {isLive
                ? `Current set ${match.currentSet ?? 1}`
                : "Best of 3 sets"}
            </span>
          )
        ) : (
          currentOvers !== null && <span>{currentOvers} Overs</span>
        )}
      </div>
    </article>
  );
}

export default MatchCard;
