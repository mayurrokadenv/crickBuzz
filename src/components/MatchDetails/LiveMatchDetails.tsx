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
  out?: boolean;
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

type LiveMatchDetailsProps = {
  live: MatchLiveModel;
  fixtureId?: string;
};

function LiveMatchDetails({ live, fixtureId }: LiveMatchDetailsProps) {
  const { scoreByMatch } = useScoreUpdateFeed(fixtureId ?? "");
  const realtime = fixtureId ? scoreByMatch[fixtureId] : undefined;

  // 1. Determine the source of truth (SignalR realtime vs initial API live prop)
  const scorecards = realtime?.scorecards?.length 
    ? realtime.scorecards 
    : (live as any)?.scorecards || [];
    
  // Sort by inningsNo descending to get the CURRENT innings
  const sortedInnings = scorecards.length > 0 
    ? [...scorecards].sort((a: any, b: any) => (b?.inningsNo ?? 0) - (a?.inningsNo ?? 0))
    : [];
  const currentInnings = sortedInnings[0];

  // 2. Robust Team Context Extraction
  const homeTeamId = (live as any)?.homeTeamId ?? (live as any)?.batTeam?.homeTeamId;
  const awayTeamId = (live as any)?.awayTeamId ?? (live as any)?.batTeam?.awayTeamId;
  const homeTeamName = (live as any)?.homeTeamName ?? (live as any)?.batTeam?.homeTeamName;
  const awayTeamName = (live as any)?.awayTeamName ?? (live as any)?.batTeam?.awayTeamName;

  // Determine who is batting right now
  const battingTeamId = currentInnings?.battingTeamId || (live as any)?.battingTeamId;
  
  let isHomeBatting = true;
  if (battingTeamId && homeTeamId) {
    isHomeBatting = battingTeamId === homeTeamId;
  } else if ((live as any)?.batTeam && typeof (live as any).batTeam.isHome === 'boolean') {
    // Fallback to the explicit isHome flag if IDs are missing
    isHomeBatting = (live as any).batTeam.isHome;
  }

  const battingTeamName = isHomeBatting ? homeTeamName : awayTeamName;

  // 3. Safe Score and Overs Extraction (Handles realtime vs API fallback)
  let currentRuns = 0;
  let currentWickets = 0;
  let currentOvers = "0.0";

  if (realtime) {
    // Use SignalR data
    currentRuns = isHomeBatting ? (realtime.homeScore ?? 0) : (realtime.awayScore ?? 0);
    currentWickets = isHomeBatting ? (realtime.homeWickets ?? 0) : (realtime.awayWickets ?? 0);
    currentOvers = isHomeBatting ? (realtime.homeOvers ?? "0.0") : (realtime.awayOvers ?? "0.0");
  } else if (live) {
    // Fallback to API response data
    const apiRuns = isHomeBatting ? (live as any).homeScore : (live as any).awayScore;
    const apiWickets = isHomeBatting ? (live as any).homeWickets : (live as any).awayWickets;
    const apiOvers = isHomeBatting ? (live as any).homeOvers : (live as any).awayOvers;

    if (apiRuns !== undefined && apiRuns !== null) {
      currentRuns = apiRuns;
      currentWickets = apiWickets ?? 0;
      currentOvers = apiOvers ?? "0.0";
    } else if ((live as any).batTeam) {
      // Ultimate fallback if root properties are missing
      currentRuns = (live as any).batTeam.teamScore ?? 0;
      currentWickets = (live as any).batTeam.teamWkts ?? 0;
      currentOvers = (live as any).batTeam.overs ?? (live as any).overs ?? "0.0";
    }
  }

  const displayScore = `${currentRuns}/${currentWickets}`;
  const displayOvers = currentOvers;

  // Calculate CRR dynamically (handles the cricket over format like "1.1")
  const calculateCRR = (runs: number, oversStr: string) => {
    if (!oversStr || oversStr === "0.0") return "0.00";
    const [overs, balls] = oversStr.split('.').map(Number);
    const totalOvers = overs + (balls / 6);
    return totalOvers > 0 ? (runs / totalOvers).toFixed(2) : "0.00";
  };
  
  const displayCRR = calculateCRR(currentRuns, currentOvers);
  const displayRRR = (live as any).requiredRunRate && (live as any).requiredRunRate > 0 
    ? (live as any).requiredRunRate.toFixed(2) 
    : null;

  // 4. Map Figures (Avoiding Duplicates and Out Players)
  const mapBattingFigure = (player: any) => ({
    id: player?.playerId ?? player?.id ?? "",
    name: player?.playerName ?? player?.name ?? "",
    runs: player?.runs ?? 0,
    balls: player?.balls ?? 0,
    fours: player?.fours ?? 0,
    sixes: player?.sixes ?? 0,
    strikeRate: typeof player?.strikeRate === 'number' ? player.strikeRate.toFixed(2) : player?.strikeRate ?? "0.00",
    playerUrl: "",
    playerMatchHighlightsUrl: "",
  });

  const mapBowlingFigure = (player: any) => ({
    id: player?.playerId ?? player?.id ?? "",
    name: player?.playerName ?? player?.name ?? "",
    overs: player?.overs ?? "0.0",
    maidens: player?.maidens ?? 0,
    runs: player?.runs ?? 0,
    wickets: player?.wickets ?? 0,
    economy: typeof player?.economy === 'number' ? player.economy.toFixed(2) : player?.economy ?? "0.00",
    playerUrl: "",
    playerMatchHighlightsUrl: "",
  });

  // Extract Batting Figures from the CURRENT innings
  const battingFigures = (currentInnings?.battingFigures ?? []) as any[];

  // Deduplicate and filter out dismissed players (out: true)
  const uniqueBattingFigures = Array.from(
    new Map(battingFigures.map((f: any) => [f.playerId || f.id, f])).values(),
  ) as any[];

  const activeBatsmen = uniqueBattingFigures.filter((f: any) => f.out !== true);
  const mappedActiveBatsmen = activeBatsmen.map(mapBattingFigure);

  // Assign Striker and Non-Striker from active players
  let liveBatsmanStriker: ReturnType<typeof mapBattingFigure> | null =
    mappedActiveBatsmen[0] || null;
  let liveBatsmanNonStriker: ReturnType<typeof mapBattingFigure> | null =
    mappedActiveBatsmen[1] || null;

  // Fallback to live props ONLY if they are not marked as out in the latest scorecard
  if (!liveBatsmanStriker && (live as any).batsmanStriker) {
    const isOut = uniqueBattingFigures.find(
      (f: any) => (f.playerId || f.id) === ((live as any).batsmanStriker?.playerId || (live as any).batsmanStriker?.id)
    )?.out;
    if (!isOut) liveBatsmanStriker = mapBattingFigure((live as any).batsmanStriker);
  }
  
  if (!liveBatsmanNonStriker && (live as any).batsmanNonStriker) {
    const isOut = uniqueBattingFigures.find(
      (f: any) => (f.playerId || f.id) === ((live as any).batsmanNonStriker?.playerId || (live as any).batsmanNonStriker?.id)
    )?.out;
    if (!isOut) liveBatsmanNonStriker = mapBattingFigure((live as any).batsmanNonStriker);
  }

  // Prevent duplicate names in UI
  if (liveBatsmanStriker && liveBatsmanNonStriker && liveBatsmanStriker.id === liveBatsmanNonStriker.id) {
    liveBatsmanNonStriker = null;
  }

  // Extract Bowling Figures from the CURRENT innings
  const bowlingFigures = (currentInnings?.bowlingFigures ?? []) as any[];
  const uniqueBowlingFigures = Array.from(
    new Map(bowlingFigures.map((f: any) => [f.playerId || f.id, f])).values(),
  ) as any[];
  
  // The latest bowler is typically the last one in the array (most recent over)
  const latestBowler = uniqueBowlingFigures.length > 0 
    ? uniqueBowlingFigures[uniqueBowlingFigures.length - 1] 
    : null;
    
  const liveBowlerStriker = latestBowler 
    ? mapBowlingFigure(latestBowler) 
    : ((live as any).bowlerStriker ? mapBowlingFigure((live as any).bowlerStriker) : null);

  // 5. Dynamic Last Wicket (Only show if someone got out in the CURRENT innings)
  const dismissedBatsman = battingFigures.find((f: any) => f.out === true);
  const lastWicketDisplay = dismissedBatsman 
    ? `${dismissedBatsman.playerName} dismissed` 
    : null;

  return (
    <section className="live-match-details">
      <div className="live-match-details__score">
        <div>
          <span className="live-match-details__label">
            {battingTeamName ? `${battingTeamName} — Current Score` : "Current Score"}
          </span>
          <h2>{displayScore}</h2>
          <span>{displayOvers} Overs</span>
        </div>

        <div className="live-match-details__rates">
          <div>
            <span>CRR</span>
            <strong>{displayCRR}</strong>
          </div>
          {displayRRR && (
            <div>
              <span>RRR</span>
              <strong>{displayRRR}</strong>
            </div>
          )}
        </div>
      </div>

      <div className="live-match-details__status">{live.status}</div>

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
          {liveBatsmanStriker && (
            <div className="live-match-details__table-row">
              <span>{liveBatsmanStriker.name} *</span>
              <span>{liveBatsmanStriker.runs}</span>
              <span>{liveBatsmanStriker.balls}</span>
              <span>{liveBatsmanStriker.fours}</span>
              <span>{liveBatsmanStriker.sixes}</span>
              <span>{liveBatsmanStriker.strikeRate}</span>
            </div>
          )}
          {liveBatsmanNonStriker && (
            <div className="live-match-details__table-row">
              <span>{liveBatsmanNonStriker.name}</span>
              <span>{liveBatsmanNonStriker.runs}</span>
              <span>{liveBatsmanNonStriker.balls}</span>
              <span>{liveBatsmanNonStriker.fours}</span>
              <span>{liveBatsmanNonStriker.sixes}</span>
              <span>{liveBatsmanNonStriker.strikeRate}</span>
            </div>
          )}
        </div>
      </div>

      {liveBowlerStriker && (
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
              <span>{liveBowlerStriker.name}</span>
              <span>{liveBowlerStriker.overs}</span>
              <span>{liveBowlerStriker.maidens}</span>
              <span>{liveBowlerStriker.runs}</span>
              <span>{liveBowlerStriker.wickets}</span>
              <span>{liveBowlerStriker.economy}</span>
            </div>
          </div>
        </div>
      )}

      {(live as any).partnerShip && (
        <div className="live-match-details__info-row">
          <span>Partnership</span>
          <strong>{(live as any).partnerShip.runs} runs ({(live as any).partnerShip.balls} balls)</strong>
        </div>
      )}

      {/* Dynamic Last Wicket - Only shows if someone is out in the current innings */}
      {lastWicketDisplay && (
        <div className="live-match-details__info-row">
          <span>Last Wicket</span>
          <strong>{lastWicketDisplay}</strong>
        </div>
      )}

      {(live as any).recentOvsStats && (
        <div className="live-match-details__recent">
          <h3>Recent Overs</h3>
          <p>{(live as any).recentOvsStats}</p>
        </div>
      )}
    </section>
  );
}

export default LiveMatchDetails;