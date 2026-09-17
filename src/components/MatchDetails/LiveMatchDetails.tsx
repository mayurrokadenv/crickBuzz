import "./LiveMatchDetails.css";

import React from "react";
import type { MatchLiveModel } from "../types/MatchDetailsModel";
import useScoreUpdateFeed from "../../hooks/useScoreUpdateFeed";

type LiveMatchDetailsProps = {
  live: MatchLiveModel;
  fixtureId?: string;
};

/** Phase -> scorecard innings number. Extend for SuperOver / Break etc. */
const PHASE_TO_INNINGS_NO: Record<string, number> = {
  FirstInnings: 1,
  SecondInnings: 2,
};

const PHASE_LABEL: Record<string, string> = {
  FirstInnings: "1st Innings",
  SecondInnings: "2nd Innings",
};

type MappedBatter = {
  id: string;
  name: string;
  runs: number;
  balls: number;
  fours: number;
  sixes: number;
  strikeRate: string;
};

type MappedBowler = {
  id: string;
  name: string;
  overs: string;
  maidens: number;
  runs: number;
  wickets: number;
  economy: string;
};

/** First value that is neither null nor undefined (0 and "" are valid). */
function firstDefined<T>(...values: (T | null | undefined)[]): T | undefined {
  for (const v of values) {
    if (v !== undefined && v !== null) return v;
  }
  return undefined;
}

/** "1" -> "1.0", "0.2" stays "0.2", missing -> "0.0". */
function normalizeOvers(value: unknown): string {
  if (value === undefined || value === null || value === "") return "0.0";
  const s = String(value);
  return s.includes(".") ? s : `${s}.0`;
}

function calculateCRR(runs: number, oversStr: string): string {
  const [o, b] = oversStr.split(".").map(Number);
  const totalOvers = (Number.isNaN(o) ? 0 : o) + (Number.isNaN(b) ? 0 : b) / 6;
  if (totalOvers <= 0) return "0.00";
  return (runs / totalOvers).toFixed(2);
}

function mapBattingFigure(player: any): MappedBatter {
  return {
    id: player?.playerId ?? player?.id ?? "",
    name: player?.playerName ?? player?.name ?? "",
    runs: player?.runs ?? 0,
    balls: player?.balls ?? 0,
    fours: player?.fours ?? 0,
    sixes: player?.sixes ?? 0,
    strikeRate:
      typeof player?.strikeRate === "number"
        ? player.strikeRate.toFixed(2)
        : String(player?.strikeRate ?? "0.00"),
  };
}

function mapBowlingFigure(player: any): MappedBowler {
  return {
    id: player?.playerId ?? player?.id ?? "",
    name: player?.playerName ?? player?.name ?? "",
    overs: normalizeOvers(player?.overs),
    maidens: player?.maidens ?? 0,
    runs: player?.runs ?? 0,
    wickets: player?.wickets ?? 0,
    economy:
      typeof player?.economy === "number"
        ? player.economy.toFixed(2)
        : String(player?.economy ?? "0.00"),
  };
}

function LiveMatchDetails({ live, fixtureId }: LiveMatchDetailsProps) {
  const { scoreByMatch } = useScoreUpdateFeed(fixtureId ?? "");
  const realtime = (fixtureId ? scoreByMatch[fixtureId] : undefined) as any;
  const liveAny = live as any;

  /* ------------------------------------------------------------------ */
  /* 1. Normalize scorecards (old array shape OR { innings1, innings2 }) */
  /* ------------------------------------------------------------------ */
  const rawScorecards = realtime?.scorecards ?? liveAny?.scorecards ?? null;

  const scorecardsArray: any[] = Array.isArray(rawScorecards)
    ? rawScorecards.filter(Boolean)
    : rawScorecards && typeof rawScorecards === "object"
      ? Object.values(rawScorecards).filter(Boolean)
      : [];

  /* ------------------------------------------------------------------ */
  /* 2. Team context                                                     */
  /* ------------------------------------------------------------------ */
  const homeTeamId = firstDefined<string>(
    realtime?.homeTeamId,
    liveAny?.homeTeamId,
    liveAny?.batTeam?.homeTeamId,
  );
  const awayTeamId = firstDefined<string>(
    realtime?.awayTeamId,
    liveAny?.awayTeamId,
    liveAny?.batTeam?.awayTeamId,
  );
  const homeTeamName = firstDefined<string>(
    realtime?.homeTeamName,
    liveAny?.homeTeamName,
    liveAny?.batTeam?.homeTeamName,
  );
  const awayTeamName = firstDefined<string>(
    realtime?.awayTeamName,
    liveAny?.awayTeamName,
    liveAny?.batTeam?.awayTeamName,
  );

  /* ------------------------------------------------------------------ */
  /* 3. Phase -> current innings                                         */
  /* ------------------------------------------------------------------ */
  const phase = firstDefined<string>(realtime?.phase, liveAny?.phase);
  const expectedInningsNo = phase ? PHASE_TO_INNINGS_NO[phase] : undefined;

  // Always fresh, straight from the top-level payload.
  const topBattingTeamId = firstDefined<string>(
    realtime?.battingTeamId,
    liveAny?.battingTeamId,
  );

  let currentInnings: any = null;

  // a) Preferred: match by phase -> inningsNo
  if (expectedInningsNo !== undefined) {
    currentInnings =
      scorecardsArray.find((inn) => inn?.inningsNo === expectedInningsNo) ?? null;
  }

  // b) Fallback: match by the team currently batting
  if (!currentInnings && topBattingTeamId) {
    currentInnings =
      scorecardsArray.find((inn) => inn?.battingTeamId === topBattingTeamId) ?? null;
  }

  // c) Only when we have NO phase and NO batting team, fall back to last innings
  if (!currentInnings && expectedInningsNo === undefined && !topBattingTeamId) {
    currentInnings = scorecardsArray[scorecardsArray.length - 1] ?? null;
  }

  /* ------------------------------------------------------------------ */
  /* 4. Which side is batting                                            */
  /* ------------------------------------------------------------------ */
  const battingTeamId = firstDefined<string>(
    topBattingTeamId,
    currentInnings?.battingTeamId,
  );

  let isHomeBatting = true;
  if (battingTeamId && homeTeamId) {
    isHomeBatting = battingTeamId === homeTeamId;
  } else if (typeof liveAny?.batTeam?.isHome === "boolean") {
    isHomeBatting = liveAny.batTeam.isHome;
  }

  const battingTeamName = isHomeBatting ? homeTeamName : awayTeamName;
  const bowlingTeamName = isHomeBatting ? awayTeamName : homeTeamName;

  /* ------------------------------------------------------------------ */
  /* 5. Score + overs — merge realtime / live FIELD BY FIELD             */
  /* ------------------------------------------------------------------ */
  const runs =
    firstDefined<number>(
      isHomeBatting ? realtime?.homeScore : realtime?.awayScore,
      isHomeBatting ? liveAny?.homeScore : liveAny?.awayScore,
      liveAny?.batTeam?.teamScore,
    ) ?? 0;

  const wickets =
    firstDefined<number>(
      isHomeBatting ? realtime?.homeWickets : realtime?.awayWickets,
      isHomeBatting ? liveAny?.homeWickets : liveAny?.awayWickets,
      liveAny?.batTeam?.teamWkts,
    ) ?? 0;

  const overs = normalizeOvers(
    firstDefined<string | number>(
      isHomeBatting ? realtime?.homeOvers : realtime?.awayOvers,
      isHomeBatting ? liveAny?.homeOvers : liveAny?.awayOvers,
      liveAny?.batTeam?.overs,
      liveAny?.overs,
    ),
  );

  const displayScore = `${runs}/${wickets}`;
  const displayCRR = calculateCRR(runs, overs);

  const requiredRunRate = firstDefined<number>(
    realtime?.requiredRunRate,
    liveAny?.requiredRunRate,
  );
  const displayRRR =
    requiredRunRate && requiredRunRate > 0 ? requiredRunRate.toFixed(2) : null;

  /* ------------------------------------------------------------------ */
  /* 6. Batting figures -> ONLY the 2 batsmen at the crease              */
  /* ------------------------------------------------------------------ */
  const battingFigures: any[] = currentInnings?.battingFigures ?? [];

  const uniqueBattingFigures = Array.from(
    new Map(battingFigures.map((f: any) => [f.playerId ?? f.id, f])).values(),
  ) as any[];

  const outPlayerIds = new Set(
    uniqueBattingFigures
      .filter((f: any) => f.out === true)
      .map((f: any) => f.playerId ?? f.id),
  );

  const liveStriker = liveAny?.batsmanStriker
    ? mapBattingFigure(liveAny.batsmanStriker)
    : null;
  const liveNonStriker = liveAny?.batsmanNonStriker
    ? mapBattingFigure(liveAny.batsmanNonStriker)
    : null;

  const scorecardCrease = uniqueBattingFigures
    .filter((f: any) => f.out !== true)
    .map(mapBattingFigure);

  // Live payload first (freshest), then anyone still at the crease per scorecard.
  // Anyone marked out on the scorecard is dropped even if a stale live field names them.
  const orderedCandidates = [liveStriker, liveNonStriker, ...scorecardCrease].filter(
    (b): b is MappedBatter => !!b && !!b.id && !outPlayerIds.has(b.id),
  );

  const crease: MappedBatter[] = [];
  const seenIds = new Set<string>();
  for (const b of orderedCandidates) {
    if (seenIds.has(b.id)) continue;
    seenIds.add(b.id);
    crease.push(b);
    if (crease.length === 2) break; // hard cap at 2
  }

  const striker = crease[0] ?? null;
  const nonStriker = crease[1] ?? null;

  /* ------------------------------------------------------------------ */
  /* 7. Bowling figures -> ONLY the current bowler                       */
  /* ------------------------------------------------------------------ */
  const bowlingFigures: any[] = currentInnings?.bowlingFigures ?? [];

  const uniqueBowlingFigures = Array.from(
    new Map(bowlingFigures.map((f: any) => [f.playerId ?? f.id, f])).values(),
  ) as any[];

  const latestBowlerFigure =
    uniqueBowlingFigures.length > 0
      ? uniqueBowlingFigures[uniqueBowlingFigures.length - 1]
      : null;

  const currentBowlerSource =
    latestBowlerFigure ?? liveAny?.bowlerStriker ?? realtime?.bowlerStriker ?? null;

  const currentBowler = currentBowlerSource
    ? mapBowlingFigure(currentBowlerSource)
    : null;

  /* ------------------------------------------------------------------ */
  /* 8. Last wicket (batting side only)                                  */
  /* ------------------------------------------------------------------ */
  const commentary: any[] = liveAny?.commentary ?? realtime?.commentary ?? [];
  const battingSide = isHomeBatting ? "Home" : "Away";

  const lastWicketEvent = commentary
    .filter((c: any) => c?.action === "Wicket" && c?.side === battingSide)
    .sort(
      (a: any, b: any) =>
        new Date(b.createdAtUtc).getTime() - new Date(a.createdAtUtc).getTime(),
    )[0];

  const scorecardLastOut = uniqueBattingFigures
    .filter((f: any) => f.out === true)
    .pop();

  const lastWicketDisplay = lastWicketEvent
    ? `${lastWicketEvent.playerName} (${lastWicketEvent.ball})`
    : scorecardLastOut
      ? `${scorecardLastOut.playerName ?? scorecardLastOut.name}`
      : null;

  /* ------------------------------------------------------------------ */
  /* Render                                                              */
  /* ------------------------------------------------------------------ */
  return (
    <section className="live-match-details">
      <div className="live-match-details__score">
        <div>
          <span className="live-match-details__label">
            {battingTeamName ? `${battingTeamName} — Current Score` : "Current Score"}
          </span>
          <h2>{displayScore}</h2>
          <span>{overs} Overs</span>
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

      <div className="live-match-details__status">
        {live.status}
        {phase && PHASE_LABEL[phase] ? ` • ${PHASE_LABEL[phase]}` : ""}
        {bowlingTeamName ? ` • ${bowlingTeamName} bowling` : ""}
      </div>

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
          {striker && (
            <div className="live-match-details__table-row">
              <span>{striker.name} *</span>
              <span>{striker.runs}</span>
              <span>{striker.balls}</span>
              <span>{striker.fours}</span>
              <span>{striker.sixes}</span>
              <span>{striker.strikeRate}</span>
            </div>
          )}
          {nonStriker && (
            <div className="live-match-details__table-row">
              <span>{nonStriker.name}</span>
              <span>{nonStriker.runs}</span>
              <span>{nonStriker.balls}</span>
              <span>{nonStriker.fours}</span>
              <span>{nonStriker.sixes}</span>
              <span>{nonStriker.strikeRate}</span>
            </div>
          )}
        </div>
      </div>

      {currentBowler && (
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
              <span>{currentBowler.name}</span>
              <span>{currentBowler.overs}</span>
              <span>{currentBowler.maidens}</span>
              <span>{currentBowler.runs}</span>
              <span>{currentBowler.wickets}</span>
              <span>{currentBowler.economy}</span>
            </div>
          </div>
        </div>
      )}

      {liveAny.partnerShip && (
        <div className="live-match-details__info-row">
          <span>Partnership</span>
          <strong>
            {liveAny.partnerShip.runs} runs ({liveAny.partnerShip.balls} balls)
          </strong>
        </div>
      )}

      {lastWicketDisplay && (
        <div className="live-match-details__info-row">
          <span>Last Wicket</span>
          <strong>{lastWicketDisplay}</strong>
        </div>
      )}

      {liveAny.recentOvsStats && (
        <div className="live-match-details__recent">
          <h3>Recent Overs</h3>
          <p>{liveAny.recentOvsStats}</p>
        </div>
      )}
    </section>
  );
}

export default LiveMatchDetails;