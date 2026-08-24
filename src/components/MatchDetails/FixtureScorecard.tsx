import { useMemo, useState } from "react";
import "./ScoreCard.css"; // <-- external CSS
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
  const [activeSide, setActiveSide] = useState<"All" | "Home" | "Away">("All");
  const { scoreByMatch } = useScoreUpdateFeed(fixture?.id ?? "");
  // If we have a realtime score for this fixture, prefer it for display.
  const realtime = fixture?.id ? scoreByMatch[fixture.id] : undefined;

  if (!fixture) {
    return (
      <section className="score-card">
        <div className="score-card__empty">Scorecard is not available yet.</div>
      </section>
    );
  }

  const filteredCommentary = useMemo(() => {
    const sorted = [...(fixture.commentary ?? [])].sort(
      (a, b) =>
        new Date(b.createdAtUtc).getTime() - new Date(a.createdAtUtc).getTime(),
    );
    if (activeSide === "All") return sorted;
    return sorted.filter((c) => c.side === activeSide);
  }, [fixture.commentary, activeSide]);

  const topPerformers = fixture.topPerformers ?? [];
  const isLive = fixture.status?.toLowerCase() === "live";

  return (
    <section className="score-card">
      {/* HEADER */}
      <div className="score-card__header">
        <div>
          <h2>
            {fixture.homeTeamName} v {fixture.awayTeamName}
          </h2>
          <div className="score-card__innings-label">{fixture.sport}</div>
        </div>
        <span
          className={`score-card__badge ${isLive ? "score-card__badge--live" : ""}`}
        >
          {isLive && <span className="score-card__status-dot" />}
          {fixture.status}
        </span>
      </div>

      {/* TEAM SCORES */}
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

      {/* TOP PERFORMERS */}
      <div className="score-card__section">
        <h3>Top performers</h3>
        <div className="score-card__table-wrapper">
          <table className="score-card__table">
            <thead>
              <tr>
                <th className="score-card__player-column">Player</th>
                <th>Team</th>
                <th>Runs</th>
              </tr>
            </thead>
            <tbody>
              {topPerformers.length === 0 ? (
                <tr>
                  <td
                    colSpan={3}
                    style={{ textAlign: "center", color: "#9fb0ca" }}
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
                    <td className="score-card__highlight">{p.runsScored}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* COMMENTARY */}
      <div className="score-card__section">
        <h3>Commentary</h3>
        <div className="score-card-tabs">
          {(["All", "Home", "Away"] as const).map((side) => (
            <button
              key={side}
              type="button"
              className={`score-card-tab ${activeSide === side ? "active" : ""}`}
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
              <span style={{ color: "#9fb0ca" }}>No commentary yet</span>
            </div>
          ) : (
            filteredCommentary.map((entry) => {
              const isWicket = entry.action === "Wicket";
              const isBoundary =
                entry.action === "Four" || entry.action === "Six";
              const label = ACTION_LABEL[entry.action] ?? entry.action;
              const time = new Date(entry.createdAtUtc).toLocaleString(
                undefined,
                {
                  month: "short",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                },
              );

              return (
                <div className="score-card__detail-item" key={entry.id}>
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
                      <span style={{ color: "#98a6c0", fontSize: "13px" }}>
                        ({entry.side})
                      </span>
                    </div>
                    {entry.note && (
                      <div style={{ fontSize: "12px", color: "#96a4be" }}>
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
