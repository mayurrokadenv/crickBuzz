import { useMemo, useState } from "react";
import "./ScoreCard.css";
import useScoreUpdateFeed from "../../hooks/useScoreUpdateFeed";

export type CommentaryEntry = {
  id: string;
  fixtureId: string;
  side: "Home" | "Away";
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
};

export type TopPerformer = {
  playerId: string;
  playerName: string;
  teamId: string;
  teamName: string;
  runsScored: number;
};

/* =========================
   SCORECARD TYPES
========================= */

export type BattingFigure = {
  id: string;
  playerId: string;
  playerName: string;
  runs: number;
  balls: number;
  fours: number;
  sixes: number;
  strikeRate: number;
};

export type BowlingFigure = {
  id: string;
  playerId: string;
  playerName: string;
  overs: string;
  maidens: number;
  runs: number;
  wickets: number;
  noBalls: number;
  wides: number;
  economy: number;
};

export type FixtureScorecardInnings = {
  id: string;
  fixtureId: string;
  inningsNo: number;
  battingTeamId: string;
  bowlingTeamId: string;
  battingFigures: BattingFigure[];
  bowlingFigures: BowlingFigure[];
};

export type FixtureScorecard = {
  id: string;
  homeTeamId: string;
  homeTeamName: string;
  awayTeamId: string;
  awayTeamName: string;
  sport: string;
  scheduledAtUtc: string;
  status: string;
  phase: string | null;

  homeScore: number;
  homeWickets: number;
  homeOvers: string;

  awayScore: number;
  awayWickets: number;
  awayOvers: string;

  totalOvers: string;

  commentary: CommentaryEntry[];

  topPerformers: TopPerformer[];

  /* NEW */
  scorecards: FixtureScorecardInnings[];
};

type ScoreCardProps = {
  fixture: FixtureScorecard;
};

const ACTION_LABEL: Record<string, string> = {
  Four: "Four",
  Six: "Six",
  Wicket: "Wicket",
  Wide: "Wide",
  Single: "Single",
  Two: "Two runs",
};

function FixtureScoreCard({ fixture }: ScoreCardProps) {
  const [activeSide, setActiveSide] = useState<"All" | "Home" | "Away">(
    "All",
  );

  const { scoreByMatch } = useScoreUpdateFeed(fixture?.id ?? "");

  const realtime = fixture?.id ? scoreByMatch[fixture.id] : undefined;

  const filteredCommentary = useMemo(() => {
    const sorted = [...(fixture?.commentary ?? [])].sort(
      (a, b) =>
        new Date(b.createdAtUtc).getTime() -
        new Date(a.createdAtUtc).getTime(),
    );

    if (activeSide === "All") {
      return sorted;
    }

    return sorted.filter((c) => c.side === activeSide);
  }, [fixture?.commentary, activeSide]);

  if (!fixture) {
    return (
      <section className="score-card">
        <div className="score-card__empty">
          Scorecard is not available yet.
        </div>
      </section>
    );
  }

  const topPerformers = fixture.topPerformers ?? [];

  const scorecards = fixture.scorecards ?? [];

  const isLive = fixture.status?.toLowerCase() === "live";

  return (
    <section className="score-card">
      {/* =========================================
          HEADER
      ========================================= */}

      <div className="score-card__header">
        <div>
          <h2>
            {fixture.homeTeamName} v {fixture.awayTeamName}
          </h2>

          <div className="score-card__innings-label">
            {fixture.sport}
          </div>
        </div>

        <span
          className={`score-card__badge ${
            isLive ? "score-card__badge--live" : ""
          }`}
        >
          {isLive && <span className="score-card__status-dot" />}

          {fixture.status}
        </span>
      </div>

      {/* =========================================
          TEAM SCORES
      ========================================= */}

      <div className="score-card__summary-row score-card__summary-row--home">
        <span>{fixture.homeTeamName}</span>

        <strong>
          {realtime
            ? `${realtime.homeScore}/${realtime.homeWickets}`
            : `${fixture.homeScore}/${fixture.homeWickets}`}
        </strong>

        <span className="score-card__summary-detail">
          {realtime
            ? `${realtime.homeOvers} overs`
            : fixture.homeOvers
              ? `${fixture.homeOvers} overs`
              : "Yet to bat"}
        </span>
      </div>

      <div className="score-card__summary-row score-card__summary-row--away">
        <span>{fixture.awayTeamName}</span>

        <strong>
          {realtime
            ? `${realtime.awayScore}/${realtime.awayWickets}`
            : `${fixture.awayScore}/${fixture.awayWickets}`}
        </strong>

        <span className="score-card__summary-detail">
          {realtime
            ? `${realtime.awayOvers} overs`
            : fixture.awayOvers
              ? `${fixture.awayOvers} overs`
              : "Yet to bat"}
        </span>
      </div>

      {/* =========================================
          PROPER CRICKET SCORECARD
      ========================================= */}

      <div className="score-card__section">
        <h3>Scorecard</h3>

        {scorecards.length === 0 ? (
          <div className="score-card__empty-scorecard">
            No scorecard data available yet.
          </div>
        ) : (
          scorecards.map((innings) => {
            const battingTeam =
              innings.battingTeamId === fixture.homeTeamId
                ? fixture.homeTeamName
                : fixture.awayTeamName;

            const bowlingTeam =
              innings.bowlingTeamId === fixture.homeTeamId
                ? fixture.homeTeamName
                : fixture.awayTeamName;

            return (
              <div
                className="score-card__innings"
                key={innings.id}
              >
                {/* INNINGS HEADER */}

                <div className="score-card__innings-header">
                  <div>
                    <span className="score-card__innings-number">
                      {innings.inningsNo === 1
                        ? "1st Innings : "
                        : `${innings.inningsNo}th Innings`}
                    </span>

                    <strong>{battingTeam}</strong>
                  </div>

                  <span className="score-card__innings-team">
                    Batting
                  </span>
                </div>

                {/* =================================
                    BATTING TABLE
                ================================= */}

                <div className="score-card__table-wrapper">
                  <table className="score-card__table score-card__batting-table">
                    <thead>
                      <tr>
                        <th className="score-card__player-column">
                          Batter
                        </th>

                        <th>R</th>
                        <th>B</th>
                        <th>4s</th>
                        <th>6s</th>
                        <th>SR</th>
                      </tr>
                    </thead>

                    <tbody>
                      {innings.battingFigures.length === 0 ? (
                        <tr>
                          <td
                            colSpan={6}
                            className="score-card__no-data"
                          >
                            No batting data
                          </td>
                        </tr>
                      ) : (
                        innings.battingFigures.map((player) => (
                          <tr key={player.id}>
                            <td className="score-card__player">
                              <div className="score-card__player-name">
                                {player.playerName}
                              </div>
                            </td>

                            <td className="score-card__highlight">
                              {player.runs}
                            </td>

                            <td>{player.balls}</td>

                            <td>{player.fours}</td>

                            <td>{player.sixes}</td>

                            <td>
                              {Number(player.strikeRate).toFixed(2)}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                {/* =================================
                    BOWLING HEADER
                ================================= */}

                <div className="score-card__bowling-header">
                  <div>
                    <span>Bowling</span>
                    <strong>{bowlingTeam}</strong>
                  </div>
                </div>

                {/* =================================
                    BOWLING TABLE
                ================================= */}

                <div className="score-card__table-wrapper">
                  <table className="score-card__table score-card__bowling-table">
                    <thead>
                      <tr>
                        <th className="score-card__player-column">
                          Bowler
                        </th>

                        <th>O</th>
                        <th>M</th>
                        <th>R</th>
                        <th>W</th>
                        <th>NB</th>
                        <th>WD</th>
                        <th>ECO</th>
                      </tr>
                    </thead>

                    <tbody>
                      {innings.bowlingFigures.length === 0 ? (
                        <tr>
                          <td
                            colSpan={8}
                            className="score-card__no-data"
                          >
                            No bowling data
                          </td>
                        </tr>
                      ) : (
                        innings.bowlingFigures.map((player) => (
                          <tr key={player.id}>
                            <td className="score-card__player">
                              <div className="score-card__player-name">
                                {player.playerName}
                              </div>
                            </td>

                            <td>{player.overs}</td>

                            <td>{player.maidens}</td>

                            <td>{player.runs}</td>

                            <td className="score-card__highlight">
                              {player.wickets}
                            </td>

                            <td>{player.noBalls}</td>

                            <td>{player.wides}</td>

                            <td>
                              {Number(player.economy).toFixed(2)}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* =========================================
          TOP PERFORMERS
      ========================================= */}

      <div className="score-card__section">
        <h3>Top performers</h3>

        <div className="score-card__table-wrapper">
          <table className="score-card__table">
            <thead>
              <tr>
                <th className="score-card__player-column">
                  Player
                </th>

                <th>Team</th>

                <th>Runs</th>
              </tr>
            </thead>

            <tbody>
              {topPerformers.length === 0 ? (
                <tr>
                  <td
                    colSpan={3}
                    className="score-card__no-data"
                  >
                    No data yet
                  </td>
                </tr>
              ) : (
                topPerformers.map((p) => (
                  <tr key={p.playerId}>
                    <td className="score-card__player">
                      <div className="score-card__player-name">
                        {p.playerName}
                      </div>
                    </td>

                    <td>{p.teamName}</td>

                    <td className="score-card__highlight">
                      {p.runsScored}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* =========================================
          COMMENTARY
      ========================================= */}

      <div className="score-card__section">
        <h3>Commentary</h3>

        <div className="score-card-tabs">
          {(["All", "Home", "Away"] as const).map((side) => (
            <button
              key={side}
              type="button"
              className={`score-card-tab ${
                activeSide === side ? "active" : ""
              }`}
              onClick={() => setActiveSide(side)}
            >
              {side === "All"
                ? "All"
                : side === "Home"
                  ? fixture.homeTeamName
                  : fixture.awayTeamName}
            </button>
          ))}
        </div>

        <div className="score-card__details-block">
          {filteredCommentary.length === 0 ? (
            <div
              className="score-card__detail-item"
              style={{ justifyContent: "center" }}
            >
              <span className="score-card__muted">
                No commentary yet
              </span>
            </div>
          ) : (
            filteredCommentary.map((entry) => {
              const isWicket = entry.action === "Wicket";

              const isBoundary =
                entry.action === "Four" ||
                entry.action === "Six";

              const label =
                ACTION_LABEL[entry.action] ?? entry.action;

              const time = new Date(
                entry.createdAtUtc,
              ).toLocaleString(undefined, {
                month: "short",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              });

              return (
                <div
                  className="score-card__detail-item"
                  key={entry.id}
                >
                  <span
                    className={
                      isWicket
                        ? "score-card__ball-action--wicket"
                        : isBoundary
                          ? "score-card__ball-action--boundary"
                          : ""
                    }
                    style={{ fontWeight: 600 }}
                  >
                    {label}
                  </span>

                  <div>
                    <div>
                      {entry.playerName}{" "}
                      <span
                        style={{
                          color: "#98a6c0",
                          fontSize: "13px",
                        }}
                      >
                        ({entry.side})
                      </span>
                    </div>

                    {entry.note && (
                      <div
                        style={{
                          fontSize: "12px",
                          color: "#96a4be",
                        }}
                      >
                        {entry.note}
                      </div>
                    )}
                  </div>

                  <span
                    style={{
                      color: "#9fb0ca",
                      fontSize: "12px",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {time}
                  </span>
                </div>
              );
            })
          )}
        </div>
      </div>
    </section>
  );
}

export default FixtureScoreCard;