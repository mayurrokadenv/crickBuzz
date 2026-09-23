import "./LiveMatchDetails.css";

import React from "react";
import type { MatchLiveModel } from "../types/MatchDetailsModel";
import useScoreUpdateFeed, { getScoreForFixture } from "../../hooks/useScoreUpdateFeed";

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

/** Ball-event action -> short display symbol for the "recent overs" strip. */
const RUN_EVENT_DISPLAY: Record<string, string> = {
  Dot: "0",
  Single: "1",
  Double: "2",
  Triple: "3",
  Four: "4",
  Six: "6",
  Wicket: "W",
  Wide: "Wd",
  NoBall: "Nb",
  Bye: "B",
  LegBye: "Lb",
};

function commentaryEventToDisplay(event: any): string {
  if (!event) return "";
  if (RUN_EVENT_DISPLAY[event.action]) return RUN_EVENT_DISPLAY[event.action];
  // fallback: pull a digit out of the note text, else first letter of the action
  const match = String(event.note ?? "").match(/\d+/);
  return match ? match[0] : (event.action ?? "").charAt(0).toUpperCase();
}

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
  const realtime = (fixtureId ? getScoreForFixture(scoreByMatch, fixtureId) : undefined) as any;

  console.log("LiveMatchDetails: Score updates in LiveMatchDetails:====================>", scoreByMatch);
  console.log("LiveMatchDetails: Realtime score for fixtureId in LiveMatchDetails==============>", fixtureId, ":", realtime);
  const liveAny = live as any;

  /* ------------------------------------------------------------------ */
  /* 1. Scorecards — merge PER INNINGS, not as one whole object.         */
  /* ------------------------------------------------------------------ */
  const realtimeScorecards = realtime?.scorecards ?? null;
  const liveScorecards = liveAny?.scorecards ?? null;

  const normalizeScorecards = (scorecards: any): Record<string, any> => {
    if (Array.isArray(scorecards)) {
      return scorecards.reduce((byInnings, innings) => {
        if (innings?.inningsNo) {
          byInnings[`innings${innings.inningsNo}`] = innings;
        }
        return byInnings;
      }, {} as Record<string, any>);
    }

    return scorecards ?? {};
  };

  const normalizedRealtimeScorecards = normalizeScorecards(realtimeScorecards);
  const normalizedLiveScorecards = normalizeScorecards(liveScorecards);

  const scorecardsObj = {
    innings1: normalizedRealtimeScorecards.innings1 ?? normalizedLiveScorecards.innings1 ?? null,
    innings2: normalizedRealtimeScorecards.innings2 ?? normalizedLiveScorecards.innings2 ?? null,
  };

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
  /* 3. Phase -> current innings (STRICT: phase alone decides)           */
  /* ------------------------------------------------------------------ */
  const phase = firstDefined<string>(realtime?.phase, liveAny?.phase);
  const mappedInningsNo = phase ? PHASE_TO_INNINGS_NO[phase] : undefined;

  const isKnownPhase = mappedInningsNo !== undefined;
  const expectedInningsNo = isKnownPhase
    ? mappedInningsNo
    : scorecardsObj.innings2
      ? 2
      : 1;

  const currentInnings =
    expectedInningsNo === 2
      ? scorecardsObj.innings2
      : scorecardsObj.innings1;

  /* ------------------------------------------------------------------ */
  /* 4. Which side is batting — SOURCE OF TRUTH: currentInnings only.    */
  /*    currentInnings is already deterministically correct (picked by   */
  /*    phase above), so its battingTeamId is trusted exclusively.       */
  /*    Top-level battingTeamId fields are only used when there is no    */
  /*    currentInnings at all (the innings-break window).                */
  /* ------------------------------------------------------------------ */
  const resolvedBattingTeamId: string | undefined =
    currentInnings?.battingTeamId ??
    firstDefined<string>(realtime?.battingTeamId, liveAny?.battingTeamId);

  let isHomeBatting = true;
  if (resolvedBattingTeamId && homeTeamId && awayTeamId) {
    if (resolvedBattingTeamId === homeTeamId) {
      isHomeBatting = true;
    } else if (resolvedBattingTeamId === awayTeamId) {
      isHomeBatting = false;
    } else {
      console.warn(
        "[LiveMatchDetails] battingTeamId matched neither home nor away team id",
        { resolvedBattingTeamId, homeTeamId, awayTeamId },
      );
    }
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
  /* Commentary + batting side — needed by recent overs, batting crease  */
  /* and last wicket, so this is declared once, up front.                */
  /* ------------------------------------------------------------------ */
  const commentary: any[] = liveAny?.commentary ?? realtime?.commentary ?? [];
  const battingSide = isHomeBatting ? "Home" : "Away";

  /* ------------------------------------------------------------------ */
  /* 6. Batting figures -> ONLY the 2 batsmen at the crease              */
  /* ------------------------------------------------------------------ */
  const battingFigures: any[] = currentInnings?.battingFigures ?? [];

  const uniqueBattingFigures = Array.from(
    new Map(battingFigures.map((f: any) => [f.playerId ?? f.id, f])).values(),
  ) as any[];

  // Some backends never send an explicit `out` flag on battingFigures.
  // Fall back to inferring dismissals from the Wicket commentary events.
  const wicketPlayerIdsFromCommentary = new Set(
    commentary
      .filter((c: any) => c?.action === "Wicket" && c?.side === battingSide)
      .map((c: any) => c.playerId),
  );

  const outPlayerIds = new Set(
    uniqueBattingFigures
      .filter(
        (f: any) =>
          f.out === true || wicketPlayerIdsFromCommentary.has(f.playerId ?? f.id),
      )
      .map((f: any) => f.playerId ?? f.id),
  );

  const battingFigureIds = new Set(
    uniqueBattingFigures.map((f: any) => f.playerId ?? f.id),
  );

  const rawLiveStriker = liveAny?.batsmanStriker
    ? mapBattingFigure(liveAny.batsmanStriker)
    : null;
  const rawLiveNonStriker = liveAny?.batsmanNonStriker
    ? mapBattingFigure(liveAny.batsmanNonStriker)
    : null;

  const liveStriker =
    rawLiveStriker && battingFigureIds.has(rawLiveStriker.id) ? rawLiveStriker : null;
  const liveNonStriker =
    rawLiveNonStriker && battingFigureIds.has(rawLiveNonStriker.id)
      ? rawLiveNonStriker
      : null;

  const scorecardCrease = uniqueBattingFigures
    .filter((f: any) => !outPlayerIds.has(f.playerId ?? f.id))
    .map(mapBattingFigure);

  // Fresh scorecard data (from realtime) takes priority over the stale
  // `live` snapshot's striker/non-striker, which only fill gaps.
  const orderedCandidates = [...scorecardCrease, liveStriker, liveNonStriker].filter(
    (b): b is MappedBatter => !!b && !!b.id && !outPlayerIds.has(b.id),
  );

  const crease: MappedBatter[] = [];
  const seenIds = new Set<string>();
  for (const b of orderedCandidates) {
    if (seenIds.has(b.id)) continue;
    seenIds.add(b.id);
    crease.push(b);
    if (crease.length === 2) break;
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

  const bowlingFigureIds = new Set(
    uniqueBowlingFigures.map((f: any) => f.playerId ?? f.id),
  );
  const rawLiveBowler = liveAny?.bowlerStriker ?? realtime?.bowlerStriker ?? null;
  const rawLiveBowlerId = rawLiveBowler?.playerId ?? rawLiveBowler?.id ?? null;
  const liveBowler =
    rawLiveBowler && rawLiveBowlerId && bowlingFigureIds.has(rawLiveBowlerId)
      ? rawLiveBowler
      : null;

  const currentBowlerSource = latestBowlerFigure ?? liveBowler ?? null;

  const currentBowler = currentBowlerSource
    ? mapBowlingFigure(currentBowlerSource)
    : null;

  /* ------------------------------------------------------------------ */
  /* Partnership — computed from fresh battingFigures, live field is     */
  /* only a last-resort fallback (it never updates over SignalR).        */
  /* ------------------------------------------------------------------ */
  const computedPartnership =
    battingFigures.length > 0
      ? {
          runs: battingFigures
            .filter((f: any) => !outPlayerIds.has(f.playerId ?? f.id))
            .reduce((t: number, f: any) => t + (f.runs ?? 0), 0),
          balls: battingFigures
            .filter((f: any) => !outPlayerIds.has(f.playerId ?? f.id))
            .reduce((t: number, f: any) => t + (f.balls ?? 0), 0),
        }
      : null;

  const currentPartnership =
    computedPartnership ?? firstDefined(realtime?.partnerShip, liveAny?.partnerShip);

  /* ------------------------------------------------------------------ */
  /* Recent overs — computed client-side from commentary (fresh data),   */
  /* since the backend does not send recentOvsStats over SignalR.        */
  /* ------------------------------------------------------------------ */
  const battingSideCommentary = commentary.filter((c: any) => c?.side === battingSide);

  const latestBall = [...battingSideCommentary].sort(
    (a: any, b: any) => new Date(b.createdAtUtc).getTime() - new Date(a.createdAtUtc).getTime(),
  )[0];

  const latestOverNo = latestBall ? Math.floor(Number(latestBall.ball)) : null;

  const currentOverEvents =
    latestOverNo !== null
      ? battingSideCommentary
          .filter((c: any) => Math.floor(Number(c.ball)) === latestOverNo)
          .sort((a: any, b: any) => Number(a.ball) - Number(b.ball))
      : [];

  const computedRecentOvers =
    currentOverEvents.length > 0
      ? currentOverEvents.map(commentaryEventToDisplay).join(" ")
      : null;

  const recentOvers = firstDefined<string>(
    computedRecentOvers,
    realtime?.recentOvsStats,
    liveAny?.recentOvsStats,
  );

  /* ------------------------------------------------------------------ */
  /* 8. Last wicket (batting side only)                                  */
  /* ------------------------------------------------------------------ */
  const lastWicketEvent = commentary
    .filter((c: any) => c?.action === "Wicket" && c?.side === battingSide)
    .sort(
      (a: any, b: any) =>
        new Date(b.createdAtUtc).getTime() - new Date(a.createdAtUtc).getTime(),
    )[0];

  const scorecardLastOut = uniqueBattingFigures
    .filter((f: any) => outPlayerIds.has(f.playerId ?? f.id))
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

      {!currentInnings && expectedInningsNo === 2 && (
        <div className="live-match-details__status">
          Innings break — 2nd innings starting soon
        </div>
      )}

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

      {currentPartnership && (
        <div className="live-match-details__info-row">
          <span>Partnership</span>
          <strong>
            {currentPartnership.runs} runs ({currentPartnership.balls} balls)
          </strong>
        </div>
      )}

      {/* {recentOvers && (
        <div className="live-match-details__recent">
          <h3>Recent Overs</h3>
          <p>{recentOvers}</p>
        </div>
      )} */}

      {lastWicketDisplay && (
        <div className="live-match-details__info-row">
          <span>Last Wicket</span>
          <strong>{lastWicketDisplay}</strong>
        </div>
      )}
    </section>
  );
}

export default LiveMatchDetails;