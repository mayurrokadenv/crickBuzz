import "./LiveMatchDetails.css";

import React from "react";
import type { MatchLiveModel } from "../types/MatchDetailsModel";
import useScoreUpdateFeed from "../../hooks/useScoreUpdateFeed";

// Types matching your scorecards JSON
interface BattingFigure {
  playerId: string;
  playerName: string;
  runs: number;
  balls: number;
  fours: number;
  sixes: number;
  strikeRate: number;
}

interface BowlingFigure {
  playerId: string;
  playerName: string;
  overs: string;
  maidens: number;
  runs: number;
  wickets: number;
  noBalls: number;
  wides: number;
  economy: number;
}

interface Innings {
  id: string;
  fixtureId: string;
  inningsNo: number;
  battingTeamId: string;
  bowlingTeamId: string;
  battingFigures: BattingFigure[];
  bowlingFigures: BowlingFigure[];
}

type LiveMatchDetailsProps = {
  live: MatchLiveModel;
  fixtureId?: string;
  scorecards?: Innings[];   // initial scorecards from parent
};

function LiveMatchDetails({ live, fixtureId, scorecards }: LiveMatchDetailsProps) {
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

  const realtime = fixtureId ? scoreByMatch[fixtureId] : undefined;

  // ============================================================
  // PRIORITIZE REALTIME SCORECARDS OVER INITIAL PROP
  // ============================================================
  const activeScorecards = realtime?.scorecards || scorecards || live.scorecards;
  const hasScorecards = activeScorecards && activeScorecards.length > 0;
  
  const sortedInnings = hasScorecards
    ? [...activeScorecards].sort((a, b) => a.inningsNo - b.inningsNo)
    : [];

  // Determine the current innings to figure out which team is batting
  const currentInnings = sortedInnings.length > 0 ? sortedInnings[sortedInnings.length - 1] : null;

  // Determine if the home team is batting based on the current innings or fallback
  const isHomeBatting = (batTeam as any)?.isHome ?? 
    (currentInnings ? currentInnings.battingTeamId === (live as any)?.homeTeamId : true);

  // Format the current score dynamically
  const displayScore = realtime
    ? isHomeBatting
      ? `${realtime.homeScore}/${realtime.homeWickets ?? 0}`
      : `${realtime.awayScore}/${realtime.awayWickets ?? 0}`
    : `${batTeam?.teamScore ?? 0}/${batTeam?.teamWkts ?? 0}`;

  // Format the current overs dynamically
  const displayOvers = realtime
    ? isHomeBatting
      ? realtime.homeOvers ?? "0.0"
      : realtime.awayOvers ?? "0.0"
    : overs ?? (batTeam as any)?.homeOvers ?? "0.0";

  return (
    <section className="live-match-details">
      {/* ----- Current Score (from live feed) ----- */}
      <div className="live-match-details__score">
        <div>
          <span className="live-match-details__label">Current Score</span>
          <h2>{displayScore}</h2>
          <span>{displayOvers} Overs</span>
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

      {/* ----- Match Status (from live) ----- */}
      <div className="live-match-details__status">{status}</div>

      {/* ----- Full Scorecards (if provided) ----- */}
      {hasScorecards ? (
        sortedInnings.map((innings) => (
          <div key={innings.id} className="live-match-details__innings">
            <h3>
              Innings {innings.inningsNo}
              {innings.inningsNo === 1 ? " (1st)" : " (2nd)"}
            </h3>

            {/* Batting figures */}
            <div className="live-match-details__section">
              <h4>Batting</h4>
              <div className="live-match-details__table">
                <div className="live-match-details__table-header">
                  <span>Batter</span>
                  <span>R</span>
                  <span>B</span>
                  <span>4s</span>
                  <span>6s</span>
                  <span>SR</span>
                </div>
                {innings.battingFigures.map((batter) => (
                  <div key={batter.playerId} className="live-match-details__table-row">
                    <span>{batter.playerName}</span>
                    <span>{batter.runs}</span>
                    <span>{batter.balls}</span>
                    <span>{batter.fours}</span>
                    <span>{batter.sixes}</span>
                    <span>{batter.strikeRate}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="live-match-details__section">
              <h4>Bowling</h4>
              <div className="live-match-details__table">
                <div className="live-match-details__bowling-header">
                  <span>Bowler</span>
                  <span>O</span>
                  <span>M</span>
                  <span>R</span>
                  <span>W</span>
                  <span>ECO</span>
                </div>
                {innings.bowlingFigures.map((bowler) => (
                  <div key={bowler.playerId} className="live-match-details__bowling-row">
                    <span>{bowler.playerName}</span>
                    <span>{bowler.overs}</span>
                    <span>{bowler.maidens}</span>
                    <span>{bowler.runs}</span>
                    <span>{bowler.wickets}</span>
                    <span>{bowler.economy}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))
      ) : (
        // ----- Fallback: show only current batsmen and bowler (live) -----
        <>
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
        </>
      )}

      {/* ----- Partnership, Last Wicket, Recent Overs (always from live) ----- */}
      {partnerShip && (
        <div className="live-match-details__info-row">
          <span>Partnership</span>
          <strong>
            {partnerShip.runs} runs ({partnerShip.balls} balls)
          </strong>
        </div>
      )}

      {lastWicket && (
        <div className="live-match-details__info-row">
          <span>Last Wicket</span>
          <strong>{lastWicket}</strong>
        </div>
      )}

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