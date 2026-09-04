import "./LiveMatchDetails.css";

import React from "react";
import type { MatchLiveModel } from "../types/MatchDetailsModel";

import useScoreUpdateFeed from "../../hooks/useScoreUpdateFeed";

type LiveMatchDetailsProps = {
  live: MatchLiveModel;
  fixtureId?: string;
};

function LiveMatchDetails({ live, fixtureId }: LiveMatchDetailsProps) {
  const {
    batTeam,
    batsmanStriker,
    batsmanNonStriker,
    bowlerStriker,
    overs,
    currentRunRate,
    requiredRunRate,
    partnerShip,
    lastWicket,
    recentOvsStats,
    status,
  } = live;

  const { scoreByMatch } = useScoreUpdateFeed(fixtureId ?? "");
  // If we have a realtime score for this fixture, prefer it for display.
  const realtime = fixtureId ? scoreByMatch[fixtureId] : undefined;
  return (
    <section className="live-match-details">
      {/* Current Score */}
      <div className="live-match-details__score">
        <div>
          <span className="live-match-details__label">Current Score</span>

          <h2>
            {realtime
              ? `${realtime.homeScore}/${realtime.homeWickets ?? 0}`
              : `${batTeam?.teamScore ?? 0}/${batTeam?.teamWkts ?? 0}`}
          </h2>

          <span>
            {/* Prefer overs from live dashboard if provided */}
            {overs
              ? `${overs} Overs`
              : realtime
                ? `${realtime.homeOvers ?? 0} Overs`
                : (() => {
                    // If batTeam indicates which side is batting use that, otherwise default to homeOvers
                    const isHomeBatting = (batTeam as any)?.isHome ?? true;
                    return isHomeBatting
                      ? `${batTeam?.homeOvers ?? 0} Overs`
                      : `${(batTeam as any)?.awayOvers ?? 0} Overs`;
                  })()}
          </span>
        </div>

        <div className="live-match-details__rates">
          <div>
            <span>CRR</span>
            <strong>{currentRunRate}</strong>
          </div>

          {requiredRunRate > 0 && (
            <div>
              <span>RRR</span>
              <strong>{requiredRunRate}</strong>
            </div>
          )}
        </div>
      </div>

      {/* Match Status */}
      <div className="live-match-details__status">{status}</div>

      {/* Current Batsmen */}
      <div className="live-match-details__section">
        <h3>Batting</h3>

        <div className="live-match-details__table">
          <div className="live-match-details__table-header">
            <span>Batter</span>
            <span>R</span>
            <span>B</span>
            <span>4s</span>
            <span>6s</span>
            <span>SR</span>
          </div>

          {batsmanStriker && (
            <div className="live-match-details__table-row">
              <span>{batsmanStriker.name} *</span>

              <span>{batsmanStriker.runs}</span>
              <span>{batsmanStriker.balls}</span>
              <span>{batsmanStriker.fours}</span>
              <span>{batsmanStriker.sixes}</span>
              <span>{batsmanStriker.strikeRate}</span>
            </div>
          )}

          {batsmanNonStriker && (
            <div className="live-match-details__table-row">
              <span>{batsmanNonStriker.name}</span>

              <span>{batsmanNonStriker.runs}</span>
              <span>{batsmanNonStriker.balls}</span>
              <span>{batsmanNonStriker.fours}</span>
              <span>{batsmanNonStriker.sixes}</span>
              <span>{batsmanNonStriker.strikeRate}</span>
            </div>
          )}
        </div>
      </div>

      {/* Current Bowler */}
      {bowlerStriker && (
        <div className="live-match-details__section">
          <h3>Bowling</h3>

          <div className="live-match-details__table">
            <div className="live-match-details__bowling-header">
              <span>Bowler</span>
              <span>O</span>
              <span>M</span>
              <span>R</span>
              <span>W</span>
              <span>ECO</span>
            </div>

            <div className="live-match-details__bowling-row">
              <span>{bowlerStriker.name}</span>
              <span>{bowlerStriker.overs}</span>
              <span>{bowlerStriker.maidens}</span>
              <span>{bowlerStriker.runs}</span>
              <span>{bowlerStriker.wickets}</span>
              <span>{bowlerStriker.economy}</span>
            </div>
          </div>
        </div>
      )}

      {/* Partnership */}
      {partnerShip && (
        <div className="live-match-details__info-row">
          <span>Partnership</span>

          <strong>
            {partnerShip.runs} runs ({partnerShip.balls} balls)
          </strong>
        </div>
      )}

      {/* Last Wicket */}
      {lastWicket && (
        <div className="live-match-details__info-row">
          <span>Last Wicket</span>

          <strong>{lastWicket}</strong>
        </div>
      )}

      {/* Recent Overs */}
      {recentOvsStats && (
        <div className="live-match-details__recent">
          <h3>Recent Overs</h3>

          <p>{recentOvsStats}</p>
        </div>
      )}
    </section>
  );
}

export default LiveMatchDetails;
