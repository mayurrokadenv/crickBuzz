import React, { useState, useEffect, useRef } from "react";
import type { FeedingMatchs } from "../../services/match.types";
import {
  fetchLiveTeams,
  liveFixtures,
  postCommentary,
  updateScoreFixtures,
} from "../../services/liveservice";
import { fixtureService } from "../../services/fixturesservice";
import "./AddCommentary.css";
import { showError, showSuccess } from "../../services/common/AlertService";

// Add phase and scorecards to FeedingMatchs interface
interface ExtendedFeedingMatchs extends FeedingMatchs {
  phase?: string;
  scorecards?: any[];
}

interface Player {
  playerId: string;
  playerName: string;
  role: string;
  roleId: string;
}

interface Team {
  id: string;
  teamName: string;
  sportId: string;
  color: string;
  sport: { name: string; description: string };
  players: Player[];
}

interface LiveFixture {
  id: string;
  homeTeamId: string;
  homeTeamName: string;
  awayTeamId: string;
  awayTeamName: string;
  sport: string;
  status: string;
  phase?: string;
  scheduledAtUtc?: string;
  homeScore: number;
  homeWickets: number | null;
  awayScore: number;
  awayWickets: number | null;
  homeOvers?: string;
  awayOvers?: string;
  totalOvers?: string;
  scorecards?: any[];
  battingTeamId?: string | null;
}

interface AddCommentaryProps {
  selectedMatch?: ExtendedFeedingMatchs | null;
  onFixtureIdChange?: (fixtureId: string | null) => void;
  onCommentaryPosted?: () => void;
  onScoreUpdated?: (updatedMatch: FeedingMatchs) => void;
}

// Cricket Action Map
const CRICKET_ACTION_MAP: Record<string, number> = {
  six: 0, four: 1, single: 2, wicket: 3, wide: 4, two: 5, three: 6,
  no_ball: 17, byes: 18, dot_ball: 19,
};

// Football Action Map
const FOOTBALL_ACTION_MAP: Record<string, number> = {
  goal: 7, assist: 8, yellow_card: 9, red_card: 10, substitution: 11,
  penalty: 12, free_kick: 13, corner: 14, offside: 15, save: 16,
};

const cricketQuickActions = [
  { label: "SIX", runs: 6, type: "six", icon: "🚀", color: "#8B5CF6", bgColor: "#EDE9FE", borderColor: "#8B5CF6", selectedBg: "#8B5CF6", selectedColor: "#FFFFFF" },
  { label: "FOUR", runs: 4, type: "four", icon: "🏏", color: "#059669", bgColor: "#D1FAE5", borderColor: "#059669", selectedBg: "#059669", selectedColor: "#FFFFFF" },
  { label: "Single", runs: 1, type: "single", icon: "➡️", color: "#D97706", bgColor: "#FEF3C7", borderColor: "#D97706", selectedBg: "#D97706", selectedColor: "#FFFFFF" },
  { label: "Wicket", runs: 0, type: "wicket", icon: "🔴", color: "#DC2626", bgColor: "#FEE2E2", borderColor: "#DC2626", selectedBg: "#DC2626", selectedColor: "#FFFFFF" },
  { label: "Wide", runs: 1, type: "wide", icon: "↗️", color: "#2563EB", bgColor: "#DBEAFE", borderColor: "#2563EB", selectedBg: "#2563EB", selectedColor: "#FFFFFF" },
  { label: "Two", runs: 2, type: "two", icon: "✌🏻", color: "#eff0e7", bgColor: "#ace05e", borderColor: "#deeb25", selectedBg: "#d3cd97", selectedColor: "#FFFFFF" },
  { label: "Three", runs: 3, type: "three", icon: "👌🏻", color: "#eff0e7", bgColor: "#b66565", borderColor: "#ed4426", selectedBg: "#9a3725", selectedColor: "#FFFFFF" },
  { label: "No Ball", runs: 1, type: "no_ball", icon: "🙅🏻‍♂️", color: "#6B7280", bgColor: "#E5E7EB", borderColor: "#6B7280", selectedBg: "#6B7280", selectedColor: "#FFFFFF" },
  { label: "Byes", runs: 1, type: "byes", icon: "0️⃣", color: "#6B7280", bgColor: "#E5E7EB", borderColor: "#6B7280", selectedBg: "#6B7280", selectedColor: "#FFFFFF" },
  { label: "Dot ball", runs: 0, type: "dot_ball", icon: "🔯", color: "#eff0e7", bgColor: "#92a675", borderColor: "#555b06", selectedBg: "#d3cd97", selectedColor: "#FFFFFF" },
];

const footballQuickActions = [
  { label: "⚽ Goal", type: "goal", icon: "⚽", color: "#059669", bgColor: "#D1FAE5", borderColor: "#059669", selectedBg: "#059669", selectedColor: "#FFFFFF" },
  { label: "🅰️ Assist", type: "assist", icon: "🅰️", color: "#2563EB", bgColor: "#DBEAFE", borderColor: "#2563EB", selectedBg: "#2563EB", selectedColor: "#FFFFFF" },
  { label: "🟨 Yellow Card", type: "yellow_card", icon: "🟨", color: "#D97706", bgColor: "#FEF3C7", borderColor: "#D97706", selectedBg: "#D97706", selectedColor: "#FFFFFF" },
  { label: "🟥 Red Card", type: "red_card", icon: "🟥", color: "#DC2626", bgColor: "#FEE2E2", borderColor: "#DC2626", selectedBg: "#DC2626", selectedColor: "#FFFFFF" },
  { label: "🔄 Substitution", type: "substitution", icon: "🔄", color: "#8B5CF6", bgColor: "#EDE9FE", borderColor: "#8B5CF6", selectedBg: "#8B5CF6", selectedColor: "#FFFFFF" },
  { label: "⚡ Penalty", type: "penalty", icon: "⚡", color: "#EF4444", bgColor: "#FEE2E2", borderColor: "#EF4444", selectedBg: "#EF4444", selectedColor: "#FFFFFF" },
  { label: "🎯 Free Kick", type: "free_kick", icon: "🎯", color: "#F59E0B", bgColor: "#FEF3C7", borderColor: "#F59E0B", selectedBg: "#F59E0B", selectedColor: "#FFFFFF" },
  { label: "🚩 Corner", type: "corner", icon: "🚩", color: "#3B82F6", bgColor: "#DBEAFE", borderColor: "#3B82F6", selectedBg: "#3B82F6", selectedColor: "#FFFFFF" },
  { label: "🚫 Offside", type: "offside", icon: "🚫", color: "#6B7280", bgColor: "#E5E7EB", borderColor: "#6B7280", selectedBg: "#6B7280", selectedColor: "#FFFFFF" },
  { label: "🧤 Save", type: "save", icon: "🧤", color: "#10B981", bgColor: "#D1FAE5", borderColor: "#10B981", selectedBg: "#10B981", selectedColor: "#FFFFFF" },
];

const MAX_WICKETS = 10; // fallback only

interface WinnerResult {
  isMatchOver: boolean;
  winningTeamId: string | null;
  text: string;
}

const oversToBalls = (oversStr?: string): number => {
  const parts = (oversStr || "0.0").split(".");
  const o = parseInt(parts[0] || "0", 10) || 0;
  const b = parseInt(parts[1] || "0", 10) || 0;
  return o * 6 + b;
};

function determineWinner(
  fixture: LiveFixture | undefined,
  matchTeams: Team[]
): WinnerResult | null {
  if (!fixture || matchTeams.length !== 2 || !fixture.battingTeamId) return null;

  const secondTeam = matchTeams.find((t) => t.id === fixture.battingTeamId);
  const firstTeam = matchTeams.find((t) => t.id !== fixture.battingTeamId);
  if (!secondTeam || !firstTeam) return null;

  const firstIsHome = fixture.homeTeamId === firstTeam.id;
  const firstRuns = (firstIsHome ? fixture.homeScore : fixture.awayScore) || 0;
  const firstWkts = (firstIsHome ? fixture.homeWickets : fixture.awayWickets) ?? 0;
  const firstOvers = firstIsHome ? fixture.homeOvers : fixture.awayOvers;

  const secondRuns = (firstIsHome ? fixture.awayScore : fixture.homeScore) || 0;
  const secondWkts = (firstIsHome ? fixture.awayWickets : fixture.homeWickets) ?? 0;
  const secondOvers = firstIsHome ? fixture.awayOvers : fixture.homeOvers;

  const firstTeamHasBatted =
    firstRuns > 0 || firstWkts > 0 || oversToBalls(firstOvers) > 0;
  if (!firstTeamHasBatted) return null; // still first innings

  const totalOversLimit = fixture.totalOvers ? parseFloat(fixture.totalOvers) : null;
  const target = firstRuns + 1;
  const secondTeamMaxWickets = secondTeam.players?.length || MAX_WICKETS;
  const isAllOut = secondWkts >= secondTeamMaxWickets;
  const isOversDone =
    totalOversLimit !== null && oversToBalls(secondOvers) >= totalOversLimit * 6;

  if (secondRuns >= target) {
    const wicketsInHand = Math.max(0, secondTeamMaxWickets - secondWkts);
    return {
      isMatchOver: true,
      winningTeamId: secondTeam.id,
      text: `${secondTeam.teamName} won by ${wicketsInHand} wicket${wicketsInHand === 1 ? "" : "s"}`,
    };
  }

  if (isAllOut || isOversDone) {
    const runsShort = target - 1 - secondRuns;
    if (runsShort > 0) {
      return {
        isMatchOver: true,
        winningTeamId: firstTeam.id,
        text: `${firstTeam.teamName} won by ${runsShort} run${runsShort === 1 ? "" : "s"}`,
      };
    }
    return { isMatchOver: true, winningTeamId: null, text: "Match Tied" };
  }

  return { isMatchOver: false, winningTeamId: null, text: "" };
}

function AddCommentary({
  selectedMatch,
  onFixtureIdChange,
  onCommentaryPosted,
  onScoreUpdated,
}: AddCommentaryProps) {
  const [selectedTeamName, setSelectedTeamName] = useState<string>("");
  // ⭐ Persist selectedBatterId from localStorage
  const [selectedBatterId, setSelectedBatterId] = useState<string>(() => {
    return localStorage.getItem("selectedBatterId") || "";
  });
  const [selectedBowlerId, setSelectedBowlerId] = useState<string>("");
  const [note, setNote] = useState("");
  const [selectedActionType, setSelectedActionType] = useState<string | null>(null);
  const [allTeams, setAllTeams] = useState<Team[]>([]);
  const [liveFixturesList, setLiveFixturesList] = useState<LiveFixture[]>([]);
  const [matchTeams, setMatchTeams] = useState<Team[]>([]);
  const [selectedFixtureId, setSelectedFixtureId] = useState<string | null>(null);
  const [matchStatus, setMatchStatus] = useState<string>("");
  const [scores, setScores] = useState<Record<string, { runs: number; wkts: number }>>({});
  const [overs, setOvers] = useState<Record<string, string>>({});
  const [totalOversLimit, setTotalOversLimit] = useState<number | null>(null);
  const [isPosting, setIsPosting] = useState<boolean>(false);
  const [postStatus, setPostStatus] = useState<"idle" | "success" | "error">("idle");
  const [selectedExtraRuns, setSelectedExtraRuns] = useState<number>(0);
  const [bowlerOvers, setBowlerOvers] = useState<Record<string, string>>({});
  const prevMatchIdRef = useRef<string | null>(null);

  const [winnerInfo, setWinnerInfo] = useState<{ isMatchOver: boolean; text: string } | null>(null);
  const [winningTeamId, setWinningTeamId] = useState<string | null>(null);
  const [battingTeamId, setBattingTeamId] = useState<string | null>(null);

  const autoInningsSwitchRef = useRef<string | null>(null);
  const autoCompleteMatchRef = useRef<string | null>(null);

  const EXTRA_RUNS_ELIGIBLE_ACTIONS = new Set(["wide", "no_ball"]);
  const EXTRA_RUNS_OPTIONS = [0, 1, 2, 3, 4, 6];

  const getSportType = (): "cricket" | "football" => {
    if (
      selectedMatch?.sport?.toLowerCase().includes("football") ||
      selectedMatch?.sport?.toLowerCase().includes("soccer")
    ) {
      return "football";
    }
    return "cricket";
  };

  const isFootball = getSportType() === "football";
  const quickActions = isFootball ? footballQuickActions : cricketQuickActions;
  const ACTION_MAP = isFootball ? FOOTBALL_ACTION_MAP : CRICKET_ACTION_MAP;
  const isMatchLive = matchStatus?.toLowerCase() === "live";

  const effectivelyLive = isMatchLive && !winnerInfo?.isMatchOver;

  const getMaxWicketsForTeam = (teamName: string): number => {
    const team = matchTeams.find(
      (t) => t.teamName.toLowerCase() === teamName.toLowerCase()
    );
    return team?.players?.length || MAX_WICKETS;
  };

  const isAtMaxWickets = (teamName: string) => {
    const teamScore = scores[teamName] || { runs: 0, wkts: 0 };
    return teamScore.wkts >= getMaxWicketsForTeam(teamName);
  };

  const parseOvers = (oversStr: string) => {
    const parts = oversStr.split(".");
    return {
      overs: parseInt(parts[0] || "0"),
      balls: parseInt(parts[1] || "0"),
    };
  };

  const formatOvers = (overs: number, balls: number) => `${overs}.${balls}`;

  const addBall = (currentOvers: string): string => {
    let { overs: o, balls: b } = parseOvers(currentOvers);
    if (totalOversLimit !== null) {
      const currentTotal = o * 6 + b;
      const maxTotal = totalOversLimit * 6;
      if (currentTotal + 1 > maxTotal) return currentOvers;
    }
    b += 1;
    if (b === 6) {
      o += 1;
      b = 0;
    }
    return formatOvers(o, b);
  };

  const currentFixture = liveFixturesList.find((f) => f.id === selectedFixtureId);
  const effectiveScorecards: any[] =
    currentFixture?.scorecards && currentFixture.scorecards.length > 0
      ? currentFixture.scorecards
      : selectedMatch?.scorecards || [];

  // ============================================================
  // ⭐ NEW: BOWLER RESTRICTION HELPERS
  // ============================================================
  const getLastOverBowlerId = (): string | null => {
    if (isFootball || !effectiveScorecards || effectiveScorecards.length === 0) return null;
    
    if (!selectedTeamName) return null;
    const currentOvers = overs[selectedTeamName] || "0.0";
    const { overs: o, balls: b } = parseOvers(currentOvers);
    if (o === 0 && b === 0) return null;

    const sorted = [...effectiveScorecards].sort((a: any, b: any) => (b?.inningsNo ?? 0) - (a?.inningsNo ?? 0));
    const currentInnings = sorted[0];
    const bowlingFigures = currentInnings?.bowlingFigures || [];
    if (bowlingFigures.length === 0) return null;

    let maxBalls = -1;
    let lastBowlerId: string | null = null;
    bowlingFigures.forEach((fig: any) => {
      const { overs: fo, balls: fb } = parseOvers(fig.overs || "0.0");
      const totalBalls = fo * 6 + fb;
      if (totalBalls >= maxBalls) {
        maxBalls = totalBalls;
        lastBowlerId = fig.playerId || null;
      }
    });
    return lastBowlerId;
  };

  const isStartOfNewOver = (): boolean => {
    if (isFootball || !selectedTeamName) return false;
    const currentOvers = overs[selectedTeamName] || "0.0";
    const { balls } = parseOvers(currentOvers);
    return balls === 0;
  };

  const isBowlerRestricted = (bowlerId: string): boolean => {
    if (isFootball || !bowlerId) return false;
    const lastBowlerId = getLastOverBowlerId();
    if (!lastBowlerId) return false;
    return isStartOfNewOver() && bowlerId === lastBowlerId;
  };
  // ============================================================

  // ============================================================
  // ⭐ NEW: HELPERS FOR CURRENT BATSMEN HIGHLIGHT
  // ============================================================
  const getCurrentBatsmenIds = (teamId: string): Set<string> => {
    const currentIds = new Set<string>();
    if (!teamId || !effectiveScorecards.length) return currentIds;

    const teamInnings = effectiveScorecards
      .filter((s: any) => s?.battingTeamId === teamId)
      .sort((a: any, b: any) => (b?.inningsNo ?? 0) - (a?.inningsNo ?? 0));

    if (!teamInnings.length) return currentIds;

    const latestInnings = teamInnings[0];
    (latestInnings?.battingFigures || []).forEach((fig: any) => {
      if (fig?.out !== true && fig?.playerId) {
        currentIds.add(fig.playerId);
      }
    });
    return currentIds;
  };
  // ============================================================

  const getOutPlayerIdsForTeam = (teamId: string): Set<string> => {
    const outIds = new Set<string>();
    if (!teamId || !effectiveScorecards.length) return outIds;

    const teamInnings = effectiveScorecards
      .filter((s: any) => s?.battingTeamId === teamId)
      .sort((a: any, b: any) => (b?.inningsNo ?? 0) - (a?.inningsNo ?? 0));

    if (!teamInnings.length) return outIds;

    const latestInnings = teamInnings[0];
    (latestInnings?.battingFigures || []).forEach((fig: any) => {
      if (fig?.out === true && fig?.playerId) {
        outIds.add(fig.playerId);
      }
    });
    return outIds;
  };

  const getEligibleBatters = (teamName: string): Player[] => {
    const team = matchTeams.find(
      (t) => t.teamName.toLowerCase() === teamName.toLowerCase()
    );
    if (!team) return [];
    const outIds = getOutPlayerIdsForTeam(team.id);
    return team.players.filter((p) => !outIds.has(p.playerId));
  };

  const fetchTeams = async () => {
    try {
      const res = await fetchLiveTeams();
      setAllTeams(res);
    } catch (e) {
      console.error("AddCommentary: Error fetching teams:", e);
    }
  };

  const getFixtures = async () => {
    try {
      const res = await liveFixtures();
      setLiveFixturesList(res);
      if (selectedFixtureId) {
        const fixture = res.find((f: { id: string }) => f.id === selectedFixtureId);
        if (fixture && matchTeams.length === 2) {
          updateLocalScoresAndOvers(fixture, matchTeams);
          setBattingTeamId(fixture.battingTeamId ?? null);
        }
      }
    } catch (e) {
      console.error("AddCommentary: Error fetching live fixtures:", e);
    }
  };

  const updateLocalScoresAndOvers = (fixture: LiveFixture, teams: Team[]) => {
    const homeTeam = teams.find((t) => t.teamName === fixture.homeTeamName);
    const awayTeam = teams.find((t) => t.teamName === fixture.awayTeamName);
    if (!homeTeam || !awayTeam) return;

    const newScores: Record<string, { runs: number; wkts: number }> = {};
    const newOvers: Record<string, string> = {};

    if (isFootball) {
      newScores[homeTeam.teamName] = { runs: fixture.homeScore || 0, wkts: 0 };
      newScores[awayTeam.teamName] = { runs: fixture.awayScore || 0, wkts: 0 };
      setTotalOversLimit(null);
    } else {
      newScores[homeTeam.teamName] = { runs: fixture.homeScore || 0, wkts: fixture.homeWickets || 0 };
      newScores[awayTeam.teamName] = { runs: fixture.awayScore || 0, wkts: fixture.awayWickets || 0 };
      newOvers[homeTeam.teamName] = fixture.homeOvers || "0.0";
      newOvers[awayTeam.teamName] = fixture.awayOvers || "0.0";

      let limit: number | null = null;
      if (fixture.totalOvers) limit = parseFloat(fixture.totalOvers);
      else if (selectedMatch?.totalOvers) limit = parseFloat(selectedMatch.totalOvers);
      else limit = 20;
      setTotalOversLimit(limit);
    }

    setScores(newScores);
    if (!isFootball) setOvers(newOvers);
  };

  const isAtMaxOvers = (teamName: string) => {
    if (totalOversLimit === null) return false;
    const current = overs[teamName] || "0.0";
    const { overs: o, balls: b } = parseOvers(current);
    return o * 6 + b >= totalOversLimit * 6;
  };

  const isInningsOverForTeam = (teamName: string) => {
    return !isFootball && isAtMaxOvers(teamName);
  };

  const isBowlerLocked = (): boolean => {
    if (isFootball || !selectedBowlerId) return false;
    const currentBowlerOver = bowlerOvers[selectedBowlerId] || "0.0";
    const { balls } = parseOvers(currentBowlerOver);
    return balls > 0;
  };

  useEffect(() => {
    fetchTeams();
    getFixtures();
  }, []);

  useEffect(() => {
    const currentMatchId = selectedMatch?.id != null ? String(selectedMatch.id) : null;
    const matchChanged = prevMatchIdRef.current !== currentMatchId;

    if (selectedMatch && allTeams.length > 0 && liveFixturesList.length > 0) {
      const previousSelectedTeamName = selectedTeamName;
      const team1 = allTeams.find((t) => t.teamName.toLowerCase() === selectedMatch.team1.toLowerCase());
      const team2 = allTeams.find((t) => t.teamName.toLowerCase() === selectedMatch.team2.toLowerCase());
      const foundTeams = [team1, team2].filter(Boolean) as Team[];
      setMatchTeams(foundTeams);

      const fixture = liveFixturesList.find(
        (f) =>
          (f.homeTeamName.toLowerCase() === selectedMatch.team1.toLowerCase() &&
            f.awayTeamName.toLowerCase() === selectedMatch.team2.toLowerCase()) ||
          (f.homeTeamName.toLowerCase() === selectedMatch.team2.toLowerCase() &&
            f.awayTeamName.toLowerCase() === selectedMatch.team1.toLowerCase())
      );

      if (fixture) {
        setSelectedFixtureId(fixture.id);
        setMatchStatus(fixture.status);
        setBattingTeamId(fixture.battingTeamId ?? null);
        onFixtureIdChange?.(fixture.id);
        if (foundTeams.length === 2) {
          updateLocalScoresAndOvers(fixture, foundTeams);
        }
      } else {
        setSelectedFixtureId(null);
        setMatchStatus("");
        setBattingTeamId(null);
        onFixtureIdChange?.(null);
        setScores({});
        setOvers({});
        setTotalOversLimit(null);
      }

      setSelectedActionType(null);
      setSelectedExtraRuns(0);
      setNote("");

      if (matchChanged) {
        setSelectedBatterId("");
        localStorage.removeItem("selectedBatterId");
        setSelectedBowlerId("");
        setBowlerOvers({});
      }

      if (foundTeams.length > 0) {
        const teamStillExists =
          previousSelectedTeamName &&
          foundTeams.some((team) => team.teamName.toLowerCase() === previousSelectedTeamName.toLowerCase());

        let defaultTeamName = foundTeams[0].teamName;
        if (fixture?.battingTeamId) {
          const battingTeam = foundTeams.find((t) => t.id === fixture.battingTeamId);
          if (battingTeam) defaultTeamName = battingTeam.teamName;
        }

        setSelectedTeamName(teamStillExists ? previousSelectedTeamName : defaultTeamName);
      }
    } else {
      setMatchTeams([]);
      setSelectedTeamName("");
      setSelectedFixtureId(null);
      setMatchStatus("");
      setBattingTeamId(null);
      onFixtureIdChange?.(null);
      setScores({});
      setOvers({});
      setTotalOversLimit(null);
      setSelectedActionType(null);
      setSelectedExtraRuns(0);
      setNote("");
      setSelectedBatterId("");
      localStorage.removeItem("selectedBatterId");
      setSelectedBowlerId("");
      setBowlerOvers({});
    }
    prevMatchIdRef.current = currentMatchId;
  }, [selectedMatch, allTeams, liveFixturesList]);

  useEffect(() => {
    if (!battingTeamId || matchTeams.length !== 2) return;
    const battingTeam = matchTeams.find((t) => t.id === battingTeamId);
    if (battingTeam && selectedTeamName !== battingTeam.teamName) {
      setSelectedTeamName(battingTeam.teamName);
      setSelectedActionType(null);
      setSelectedExtraRuns(0);
    }
  }, [battingTeamId, matchTeams]);

  useEffect(() => {
    autoInningsSwitchRef.current = null;
    autoCompleteMatchRef.current = null;
  }, [selectedFixtureId]);

  useEffect(() => {
    if (isFootball) {
      setWinnerInfo(null);
      setWinningTeamId(null);
      return;
    }

    const result = determineWinner(currentFixture, matchTeams);

    if (result && result.isMatchOver) {
      setWinnerInfo({ isMatchOver: true, text: result.text });
      setWinningTeamId(result.winningTeamId);
    } else {
      setWinnerInfo(null);
      setWinningTeamId(null);
    }
  }, [isFootball, currentFixture, matchTeams]);

  // ============================================================
  // ⭐ UPDATED: BATTER / BOWLER SELECTION WITH PERSISTENCE
  // ============================================================
  useEffect(() => {
    if (!selectedTeamName || matchTeams.length !== 2) {
      setSelectedBatterId("");
      setSelectedBowlerId("");
      return;
    }

    const bowlingTeam = matchTeams.find(
      (team) => team.teamName.toLowerCase() !== selectedTeamName.toLowerCase()
    );

    const eligibleBatters = getEligibleBatters(selectedTeamName);
    const currentBatterIsValid =
      selectedBatterId && eligibleBatters.some((player) => player.playerId === selectedBatterId);

    if (eligibleBatters.length > 0) {
      const newBatterId = currentBatterIsValid ? selectedBatterId : eligibleBatters[0].playerId;
      setSelectedBatterId(newBatterId);
      localStorage.setItem("selectedBatterId", newBatterId);
    } else {
      setSelectedBatterId("");
      localStorage.removeItem("selectedBatterId");
    }

    // Bowler selection logic with restriction
    const getAvailableBowlers = () => {
      if (!bowlingTeam?.players) return [];
      const lastBowlerId = getLastOverBowlerId();
      const startOfNewOver = isStartOfNewOver();
      return bowlingTeam.players.filter(p => !(startOfNewOver && p.playerId === lastBowlerId));
    };

    const availableBowlers = getAvailableBowlers();
    const currentBowlerIsValid = selectedBowlerId && availableBowlers.some((player) => player.playerId === selectedBowlerId);

    if (availableBowlers.length > 0) {
      const newBowlerId = currentBowlerIsValid ? selectedBowlerId : availableBowlers[0].playerId;
      setSelectedBowlerId(newBowlerId);
      if (newBowlerId && !bowlerOvers[newBowlerId]) {
        setBowlerOvers((prev) => ({ ...prev, [newBowlerId]: "0.0" }));
      }
    } else {
      setSelectedBowlerId("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    selectedTeamName,
    matchTeams,
    selectedBatterId,
    selectedBowlerId,
    effectiveScorecards,
    liveFixturesList,
    overs,
  ]);

  useEffect(() => {
    if (!effectiveScorecards || effectiveScorecards.length === 0) return;

    const sorted = [...effectiveScorecards].sort(
      (a: any, b: any) => (b?.inningsNo ?? 0) - (a?.inningsNo ?? 0)
    );
    const latest = sorted[0];
    const bowlingFigures = latest?.bowlingFigures || [];
    if (!bowlingFigures.length) return;

    const ballsOf = (s: string) => {
      const { overs, balls } = parseOvers(s || "0.0");
      return overs * 6 + balls;
    };

    setBowlerOvers((prev) => {
      const merged = { ...prev };
      let changed = false;

      bowlingFigures.forEach((fig: any) => {
        const pid = fig?.playerId;
        if (!pid) return;

        const backendVal = fig.overs || "0.0";
        const currentVal = merged[pid];

        if (!currentVal || ballsOf(backendVal) > ballsOf(currentVal)) {
          if (currentVal !== backendVal) changed = true;
          merged[pid] = backendVal;
        }
      });

      return changed ? merged : prev;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [effectiveScorecards]);

  useEffect(() => {
    if (
      isFootball ||
      !isMatchLive ||
      !selectedFixtureId ||
      matchTeams.length !== 2 ||
      !battingTeamId ||
      winnerInfo?.isMatchOver
    ) {
      return;
    }

    const phaseStr = (selectedMatch?.phase || "").toLowerCase().replace(/\s+/g, "");
    const isFirstInnings =
      phaseStr === "firstinnings" || phaseStr === "1stinnings" || phaseStr === "innings1";
    if (!isFirstInnings) return;

    const battingTeamLocal = matchTeams.find((t) => t.id === battingTeamId);
    const battingTeamNameLocal = battingTeamLocal?.teamName || "";
    if (!battingTeamLocal || !battingTeamNameLocal) return;

    const teamScore = scores[battingTeamNameLocal];
    if (!teamScore) return;

    const teamHasPlayed = effectiveScorecards.some(
      (s: any) => s?.battingTeamId === battingTeamId
    );

    const allOut = teamScore.wkts >= getMaxWicketsForTeam(battingTeamNameLocal);
    const oversDone = isAtMaxOvers(battingTeamNameLocal);
    const rosterSize = battingTeamLocal.players?.length || 0;
    const noEligibleBatters =
      rosterSize > 0 &&
      teamHasPlayed &&
      getEligibleBatters(battingTeamNameLocal).length === 0;

    const inningsComplete = allOut || oversDone || noEligibleBatters;
    if (!inningsComplete) {
      autoInningsSwitchRef.current = null;
      return;
    }

    if (autoInningsSwitchRef.current === selectedFixtureId) return;
    autoInningsSwitchRef.current = selectedFixtureId;

    const otherTeam = matchTeams.find((t) => t.id !== battingTeamId);
    if (!otherTeam) return;

    (async () => {
      try {
        await fixtureService.updateFixture(
          selectedFixtureId,
          1, // status = Live
          1, // phase  = SecondInnings
          currentFixture?.scheduledAtUtc || "",
          otherTeam.id, // next batting team
        );

        showSuccess(
          "Innings Complete",
          `${battingTeamNameLocal} innings over. ${otherTeam.teamName} now batting.`,
        );

        await getFixtures();
        window.dispatchEvent(new CustomEvent("crickbuzz-live-feeds-refresh"));
      } catch (err) {
        console.error("Auto innings switch failed:", err);
        autoInningsSwitchRef.current = null; // allow retry
        showError("Error", "Failed to switch innings automatically.");
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    isFootball,
    isMatchLive,
    selectedFixtureId,
    matchTeams,
    battingTeamId,
    winnerInfo?.isMatchOver,
    scores,
    overs,
    effectiveScorecards,
    selectedMatch?.phase,
    currentFixture?.scheduledAtUtc,
  ]);

  useEffect(() => {
    if (isFootball) return;
    if (!selectedFixtureId) return;
    if (!winnerInfo?.isMatchOver) return;

    if ((matchStatus || "").toLowerCase() === "completed") return;

    if (autoCompleteMatchRef.current === selectedFixtureId) return;
    autoCompleteMatchRef.current = selectedFixtureId;

    (async () => {
      try {
        await fixtureService.updateFixture(
          selectedFixtureId,
          2, // status = Completed
          1, // phase  = SecondInnings (keep)
          currentFixture?.scheduledAtUtc || "",
          winningTeamId ?? battingTeamId ?? "",
        );

        showSuccess("Match Completed", winnerInfo.text);

        await getFixtures();
        window.dispatchEvent(new CustomEvent("crickbuzz-live-feeds-refresh"));
      } catch (err) {
        console.error("Auto match completion failed:", err);
        autoCompleteMatchRef.current = null; // allow retry
        showError("Error", "Failed to mark match as completed.");
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    isFootball,
    selectedFixtureId,
    winnerInfo?.isMatchOver,
    winnerInfo?.text,
    winningTeamId,
    matchStatus,
    battingTeamId,
    currentFixture?.scheduledAtUtc,
  ]);

  const getSide = (teamName: string): 0 | 1 | null => {
    if (!selectedFixtureId || !liveFixturesList.length) return null;
    const fixture = liveFixturesList.find((f) => f.id === selectedFixtureId);
    if (!fixture) return null;
    if (fixture.homeTeamName.toLowerCase() === teamName.toLowerCase()) return 0;
    if (fixture.awayTeamName.toLowerCase() === teamName.toLowerCase()) return 1;
    return null;
  };

  const handleOversChange = async () => {
    if (!effectivelyLive) {
      showError("Error", "Cannot update overs for a match that is not live or is already over");
      return;
    }
  };

  const battingTeamName = matchTeams.find((t) => t.id === battingTeamId)?.teamName || "";
  const isBattingTeamSelected = !battingTeamId || selectedTeamName === battingTeamName;

  const handleActionSelect = (actionType: string) => {
    if (!effectivelyLive) {
      showError("Error", "Cannot post commentary for a match that is not live or is already over");
      return;
    }

    if (!isBattingTeamSelected) {
      showError("Error", `Only the batting team (${battingTeamName}) can post actions right now.`);
      return;
    }

    if (isInningsOverForTeam(selectedTeamName)) {
      showError("Error", `${selectedTeamName} has completed their overs. No more actions allowed.`);
      return;
    }

    if (!isFootball && actionType === "wicket" && isAtMaxWickets(selectedTeamName)) {
      showError(
        "Error",
        `${selectedTeamName} is already all out (${getMaxWicketsForTeam(selectedTeamName)} wickets).`
      );
      return;
    }

    setSelectedActionType((prev) => (prev === actionType ? null : actionType));
    setSelectedExtraRuns(0);
    setPostStatus("idle");
  };

  const BALL_CONSUMING_ACTIONS = new Set(["six", "four", "single", "wicket", "two", "three", "byes", "dot_ball"]);

  const handlePostCommentary = async () => {
    if (!effectivelyLive) {
      showError("Error", "Cannot post commentary for a match that is not live or is already over");
      return;
    }

    if (!isBattingTeamSelected) {
      showError("Error", `Only the batting team (${battingTeamName}) can post actions right now.`);
      return;
    }

    if (isInningsOverForTeam(selectedTeamName)) {
      showError("Error", `${selectedTeamName} has completed their overs. No more actions allowed.`);
      return;
    }

    if (!selectedActionType) {
      alert("Please select an action");
      return;
    }

    if (!selectedFixtureId) {
      alert("No fixture selected. Please select a match first.");
      return;
    }

    if (!selectedBatterId || !selectedBowlerId || !selectedTeamName) {
      alert("Please select a batter, bowler, and team.");
      return;
    }

    // ⭐ NEW: Guard against consecutive overs
    if (isBowlerRestricted(selectedBowlerId)) {
      showError("Error", "This bowler cannot bowl consecutive overs. Please select a different bowler.");
      return;
    }

    {
      const team = matchTeams.find(
        (t) => t.teamName.toLowerCase() === selectedTeamName.toLowerCase()
      );
      if (team) {
        const outIds = getOutPlayerIdsForTeam(team.id);
        if (outIds.has(selectedBatterId)) {
          showError("Error", "This batter is already out. Please select another batter.");
          setSelectedActionType(null);
          return;
        }
      }
    }

    const side = getSide(selectedTeamName);
    if (side === null) {
      alert("Could not determine side for the selected team.");
      return;
    }

    if (!isFootball && selectedActionType === "wicket") {
      const currentWkts = scores[selectedTeamName]?.wkts || 0;
      const maxWkts = getMaxWicketsForTeam(selectedTeamName);
      if (currentWkts >= maxWkts) {
        showError(
          "Error",
          `${selectedTeamName} is already all out (${maxWkts} wickets). Cannot add another wicket.`
        );
        setSelectedActionType(null);
        return;
      }
    }

    const actionValue = ACTION_MAP[selectedActionType];
    if (actionValue === undefined) {
      alert(`Unknown action type: ${selectedActionType}`);
      return;
    }

    const actionConfig = quickActions.find((a) => a.type === selectedActionType) as any;
    const baseRuns = actionConfig?.runs ?? 0;
    const isExtraEligible = !isFootball && EXTRA_RUNS_ELIGIBLE_ACTIONS.has(selectedActionType);
    const runsDelta = isExtraEligible ? baseRuns + selectedExtraRuns : baseRuns;
    const wicketsDelta = selectedActionType === "wicket" ? 1 : 0;

    const extraNoteSuffix =
      isExtraEligible && selectedExtraRuns > 0
        ? ` +${selectedExtraRuns} run${selectedExtraRuns > 1 ? "s" : ""} (overthrow)`
        : "";

    let newOvers: string | undefined;
    if (!isFootball && BALL_CONSUMING_ACTIONS.has(selectedActionType)) {
      const currentOvers = overs[selectedTeamName] || "0.0";
      newOvers = addBall(currentOvers);
    }

    let newBowlerOver: string | undefined;
    if (!isFootball && BALL_CONSUMING_ACTIONS.has(selectedActionType)) {
      const currentBowlerOver = bowlerOvers[selectedBowlerId] || "0.0";
      newBowlerOver = addBall(currentBowlerOver);
    }

    const commentaryPayload = {
      side,
      playerId: selectedBatterId,
      action: actionValue,
      note: `${selectedActionType.toUpperCase()}: ${note || ""}${extraNoteSuffix}`.trim(),
      currentball: newOvers ?? overs[selectedTeamName] ?? "0.0",
    };

    setIsPosting(true);
    setPostStatus("idle");

    try {
      await postCommentary(selectedFixtureId, commentaryPayload);

      if (!isFootball) {
        await updateScoreFixtures(selectedFixtureId, {
          side,
          battingPlayerId: selectedBatterId,
          bowlingPlayerId: selectedBowlerId,
          action: actionValue,
          runsDelta,
          overs: newOvers ?? overs[selectedTeamName] ?? "0.0",
          wicketsDelta,
          bowlerOver: newBowlerOver || bowlerOvers[selectedBowlerId] || "0.0",
        });

        if (newOvers) setOvers((prev) => ({ ...prev, [selectedTeamName]: newOvers }));
        if (newBowlerOver) setBowlerOvers((prev) => ({ ...prev, [selectedBowlerId]: newBowlerOver }));
      } else {
        await updateScoreFixtures(selectedFixtureId, {
          side,
          battingPlayerId: selectedBatterId,
          bowlingPlayerId: selectedBowlerId,
          action: actionValue,
          runsDelta,
          wicketsDelta: 0,
          overs: "",
          bowlerOver: "",
        });
      }

      if (onScoreUpdated && selectedMatch) {
        const updatedMatch: FeedingMatchs = {
          ...selectedMatch,
          score: isFootball
            ? `${scores[matchTeams[0]?.teamName]?.runs || 0}-${scores[matchTeams[1]?.teamName]?.runs || 0}`
            : `${scores[selectedTeamName]?.runs || 0}/${scores[selectedTeamName]?.wkts || 0}`,
        };
        onScoreUpdated(updatedMatch);
      }

      setNote("");
      setPostStatus("success");
      showSuccess("Success", `Commentary posted (${selectedActionType})`);
      setSelectedActionType(null);
      setSelectedExtraRuns(0);
      onCommentaryPosted?.();

      await getFixtures();

      setTimeout(() => setPostStatus("idle"), 3000);
    } catch (error) {
      console.error("AddCommentary: Error:", error);
      setPostStatus("error");
      showError("Error", "Failed to post commentary. Please try again.");
      await getFixtures();
      setTimeout(() => setPostStatus("idle"), 3000);
    } finally {
      setIsPosting(false);
    }
  };

  const teams = matchTeams.map((team) => ({ name: team.teamName, color: team.color || "#ccc" }));

  const batterPlayers = getEligibleBatters(selectedTeamName);

  const bowlerPlayers = (() => {
    const team = matchTeams.find((t) => t.teamName.toLowerCase() !== selectedTeamName.toLowerCase());
    return team ? team.players : [];
  })();

  const oppositeTeamName =
    matchTeams.find((team) => team.teamName.toLowerCase() !== selectedTeamName.toLowerCase())?.teamName || "";

  const showExtraRunsPicker = !isFootball && !!selectedActionType && EXTRA_RUNS_ELIGIBLE_ACTIONS.has(selectedActionType);
  const inningsOver = isInningsOverForTeam(selectedTeamName) || winnerInfo?.isMatchOver;
  const battingRestricted = !!battingTeamId;

  // ⭐ NEW: Get IDs of current batsmen for highlighting
  const selectedTeam = matchTeams.find(t => t.teamName.toLowerCase() === selectedTeamName.toLowerCase());
  const currentBatsmenIds = selectedTeam ? getCurrentBatsmenIds(selectedTeam.id) : new Set<string>();

  return (
    <div className="add-commentary-container">
      {winnerInfo?.isMatchOver && (
        <div
          style={{
            background: "linear-gradient(135deg, #10B981 0%, #059669 100%)",
            color: "white",
            padding: "16px 24px",
            borderRadius: "12px",
            marginBottom: "20px",
            textAlign: "center",
            fontWeight: "bold",
            fontSize: "18px",
            boxShadow: "0 4px 15px rgba(16, 185, 129, 0.4)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "10px",
          }}
        >
          <span style={{ fontSize: "24px" }}>🏆</span>
          {winnerInfo.text}
        </div>
      )}

      {selectedMatch && matchTeams.length === 2 ? (
        <div className="match-info-banner">
          <span className="match-info">
            {selectedMatch.sport}: {matchTeams[0].teamName} vs {matchTeams[1].teamName}
          </span>

          <span className="match-info-score">
            {isFootball
              ? `${scores[matchTeams[0]?.teamName]?.runs || 0} - ${scores[matchTeams[1]?.teamName]?.runs || 0}`
              : `${scores[matchTeams[0]?.teamName]?.runs || 0}/${scores[matchTeams[0]?.teamName]?.wkts || 0} (${overs[matchTeams[0]?.teamName] || selectedMatch.homeOvers || "0.0"})`}
          </span>

          <span
            className="match-status-badge"
            style={{
              background: effectivelyLive ? "#10B981" : winnerInfo?.isMatchOver ? "#6B7280" : "#F59E0B",
              padding: "2px 12px",
              borderRadius: "12px",
              fontSize: "11px",
              fontWeight: "bold",
              color: "white",
              marginLeft: "8px",
            }}
          >
            {effectivelyLive ? "🔴 LIVE" : winnerInfo?.isMatchOver ? "🏆 MATCH OVER" : matchStatus?.toUpperCase() || "SCHEDULED"}
          </span>

          <span
            className="match-sport-badge"
            style={{
              background: isFootball ? "#10B981" : "#8B5CF6",
              padding: "2px 12px",
              borderRadius: "12px",
              fontSize: "11px",
              fontWeight: "bold",
              color: "white",
              marginLeft: "8px",
            }}
          >
            {isFootball ? "⚽ Football" : "🏏 Cricket"}
          </span>

          {battingTeamName && !winnerInfo?.isMatchOver && (
            <span
              style={{
                background: "#0EA5E9",
                padding: "2px 12px",
                borderRadius: "12px",
                fontSize: "11px",
                fontWeight: "bold",
                color: "white",
                marginLeft: "8px",
              }}
            >
              🏏 Batting: {battingTeamName}
            </span>
          )}
        </div>
      ) : (
        <div className="match-info-banner" style={{ background: "#666" }}>
          <span className="match-info">No match selected or teams not loaded</span>
        </div>
      )}

      {!effectivelyLive && selectedMatch && !winnerInfo?.isMatchOver && (
        <div className="match-disabled-overlay">
          <div className="disabled-message">
            <span className="disabled-icon">⏳</span>
            <h3>Match is {matchStatus?.toUpperCase() || "SCHEDULED"}</h3>
            <p>Commentary and score updates are only available when the match is LIVE</p>
          </div>
        </div>
      )}

      <div className={`score-control ${!effectivelyLive ? "disabled-section" : ""}`}>
        <div className="score-header">
          <h3>SCORE CONTROL</h3>
          <span className="feed-score">
            {isFootball ? "Goals are updated via commentary actions" : "Runs & wickets updated via commentary actions"}
          </span>
        </div>

        <p className="score-subtitle">
          {isFootball
            ? "Set GOALS for each side. Also logs a commentary entry."
            : "Set RUNS / WKTS for each side. Also logs a commentary entry."}
        </p>

        <div className="score-cards">
          {teams.map((team) => {
            const teamScore = scores[team.name] || { runs: 0, wkts: 0 };
            const teamId = matchTeams.find((t) => t.teamName === team.name)?.id;
            const isWinner = winnerInfo?.isMatchOver && winningTeamId && teamId === winningTeamId;
            return (
              <div
                className="team-score-card"
                key={team.name}
                style={isWinner ? { border: "2px solid #10B981", boxShadow: "0 0 0 2px rgba(16,185,129,0.3)" } : undefined}
              >
                <div className="team-header">
                  <span className="team-dot" style={{ background: team.color }} />
                  <span className="team-name">
                    {team.name}
                    {isWinner && <span style={{ marginLeft: 6 }}>🏆</span>}
                  </span>
                </div>

                <div className="score-row">
                  <div className="score-item">
                    <span className="score-label">{isFootball ? "GOALS" : "RUNS"}</span>
                    <span className="score-value">{teamScore.runs}</span>
                  </div>

                  {!isFootball && (
                    <>
                      <div className="score-item">
                        <span className="score-label">WKTS</span>
                        <span className="score-value">
                          {teamScore.wkts}
                          <span className="overs-limit"> / {getMaxWicketsForTeam(team.name)}</span>
                        </span>
                      </div>

                      <div className="score-item overs-item">
                        <span className="score-label">OVERS</span>
                        <div className="overs-stepper">
                          <span className="overs-value">
                            {overs[team.name] || "0.0"}
                            {totalOversLimit !== null && <span className="overs-limit"> / {totalOversLimit}</span>}
                          </span>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <hr className="divider" />

      <div className={`commentary-section ${!effectivelyLive ? "disabled-section" : ""}`}>
        <div className="commentary-header">
          <h3>ADD COMMENTARY</h3>
          <span className="sport-tag">{selectedMatch?.sport || (isFootball ? "Football" : "Cricket")}</span>
        </div>

        <p className="commentary-subtitle">
          {effectivelyLive
            ? "Pick a team and player, then tap an action — it pushes straight to the live feed."
            : winnerInfo?.isMatchOver
            ? "Match is over. No further commentary allowed."
            : `Commentary is disabled while match is ${matchStatus?.toLowerCase() || "scheduled"}`}
        </p>

        {effectivelyLive && battingRestricted && !inningsOver && (
          <div
            style={{
              background: "#0f172a",
              border: "1px dashed #38bdf8",
              color: "#38bdf8",
              padding: "8px 12px",
              borderRadius: "8px",
              fontSize: "12px",
              marginBottom: "10px",
            }}
          >
            🏏 Only <strong>{battingTeamName}</strong> is batting. Actions are enabled only for this team.
          </div>
        )}

        <div className="control-group">
          <label>TEAM</label>
          <div className="team-selector">
            {teams.map((team) => {
              const teamIsBatting = !battingRestricted || team.name === battingTeamName;
              const teamDisabled = !effectivelyLive || !teamIsBatting;
              return (
                <button
                  key={team.name}
                  className={`team-btn ${selectedTeamName === team.name ? "active" : ""}`}
                  onClick={() => setSelectedTeamName(team.name)}
                  disabled={teamDisabled}
                  title={!teamIsBatting ? "Not batting right now" : undefined}
                  style={{
                    opacity: teamDisabled ? 0.5 : 1,
                    cursor: teamDisabled ? "not-allowed" : "pointer",
                  }}
                >
                  {team.name}
                  {team.name === battingTeamName && (
                    <span style={{ marginLeft: 6, fontSize: 10 }}>🏏</span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        <div className="commentary-controls">
          <div className="control-group">
            <label>
              BATTER
              {selectedTeamName && (
                <span style={{ marginLeft: "6px", fontSize: "11px", fontWeight: 400, color: "#8d96aa" }}>
                  — {selectedTeamName}
                </span>
              )}
              {batterPlayers.length === 0 && (
                <span style={{ marginLeft: "8px", color: "#f87171", fontSize: "11px", fontWeight: 600 }}>
                  (no eligible batters)
                </span>
              )}
            </label>
            <div className="player-selector">
              <select
                value={selectedBatterId}
                onChange={(e) => {
                  setSelectedBatterId(e.target.value);
                  localStorage.setItem("selectedBatterId", e.target.value);
                }}
                className="player-dropdown"
                disabled={batterPlayers.length === 0 || !effectivelyLive || inningsOver || !isBattingTeamSelected}
              >
                {batterPlayers.length === 0 ? (
                  <option value="">No batters available</option>
                ) : (
                  batterPlayers.map((player) => {
                    const isCurrentlyBatting = currentBatsmenIds.has(player.playerId);
                    return (
                      <option key={player.playerId} value={player.playerId}>
                        {isCurrentlyBatting ? "🏏 " : ""}{player.playerName} ({player.role}){isCurrentlyBatting ? " - On Pitch" : ""}
                      </option>
                    );
                  })
                )}
              </select>
            </div>
          </div>

          <div className="control-group">
            <label>
              BOWLER
              {oppositeTeamName && (
                <span style={{ marginLeft: "6px", fontSize: "11px", fontWeight: 400, color: "#8d96aa" }}>
                  — {oppositeTeamName}
                </span>
              )}
              {isBowlerLocked() && (
                <span style={{ marginLeft: "8px", color: "#f87171", fontSize: "11px", fontWeight: 600 }}>
                  🔒 Locked until over completes
                </span>
              )}
              {isStartOfNewOver() && !isBowlerLocked() && (
                <span style={{ marginLeft: "8px", color: "#f59e0b", fontSize: "11px", fontWeight: 600 }}>
                  ⚠️ New over - previous bowler restricted
                </span>
              )}
            </label>
            <div className="player-selector">
              <select
                value={selectedBowlerId}
                onChange={(e) => {
                  if (!isBowlerLocked() && !isBowlerRestricted(e.target.value)) {
                    setSelectedBowlerId(e.target.value);
                  }
                }}
                className="player-dropdown"
                disabled={bowlerPlayers.length === 0 || !effectivelyLive || inningsOver || isBowlerLocked() || !isBattingTeamSelected}
                title={isBowlerLocked() ? "Bowler is locked until the current over completes" : undefined}
              >
                {bowlerPlayers.length === 0 ? (
                  <option value="">No bowlers available</option>
                ) : (
                  bowlerPlayers.map((player) => {
                    const restricted = isBowlerRestricted(player.playerId);
                    return (
                      <option key={player.playerId} value={player.playerId} disabled={restricted}>
                        {player.playerName} ({player.role}) {restricted ? " (Cannot bowl consecutive overs)" : ""}
                      </option>
                    );
                  })
                )}
              </select>
            </div>
          </div>
        </div>

        <div className="control-group">
          <label>NOTE (optional)</label>
          <div className="note-input-group">
            <input
              type="text"
              placeholder={isFootball ? "e.g. powerful strike from outside the box" : "e.g. drives it through the covers"}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="note-input"
              disabled={!effectivelyLive || inningsOver || !isBattingTeamSelected}
            />
          </div>
        </div>

        <div className="quick-actions">
          <p className="quick-actions-title">
            ⚡ Select an action, then click "Post Commentary"
            {selectedActionType && (
              <span className="selected-action-indicator">
                {" "}
                • Selected: <strong>{selectedActionType.toUpperCase().replace("_", " ")}</strong>
              </span>
            )}
          </p>

          <div
            className="action-buttons"
            style={{
              display: "grid",
              gridTemplateColumns: isFootball ? "repeat(5, 1fr)" : "repeat(4, 1fr)",
              gap: "8px",
              opacity: effectivelyLive && !inningsOver && isBattingTeamSelected ? 1 : 0.5,
              pointerEvents: effectivelyLive && !inningsOver && isBattingTeamSelected ? "auto" : "none",
            }}
          >
            {quickActions.map((action) => {
              const isSelected = selectedActionType === action.type;
              const isWicketDisabled = !isFootball && action.type === "wicket" && isAtMaxWickets(selectedTeamName);
              const isOverLimit = !isFootball && isAtMaxOvers(selectedTeamName);
              const isDisabled =
                !effectivelyLive || isWicketDisabled || isOverLimit || !isBattingTeamSelected;

              return (
                <button
                  key={action.type}
                  className={`action-btn ${action.type} ${isSelected ? "selected" : ""}`}
                  onClick={() => handleActionSelect(action.type)}
                  disabled={isDisabled}
                  title={
                    !isBattingTeamSelected
                      ? `Only the batting team (${battingTeamName}) can act`
                      : isWicketDisabled
                      ? `${selectedTeamName} is all out`
                      : isOverLimit
                      ? `${selectedTeamName} has completed their overs`
                      : undefined
                  }
                  style={{
                    backgroundColor: isSelected ? action.selectedBg : action.bgColor,
                    borderColor: isSelected ? action.selectedBg : action.borderColor,
                    color: isSelected ? action.selectedColor : action.color,
                    transform: isSelected ? "scale(1.05)" : "scale(1)",
                    boxShadow: isSelected ? `0 4px 16px ${action.borderColor}66` : "none",
                    padding: isFootball ? "8px 4px" : "8px 6px",
                    fontSize: isFootball ? "11px" : "12px",
                    opacity: isDisabled ? 0.5 : 1,
                    cursor: isDisabled ? "not-allowed" : "pointer",
                  }}
                >
                  <span className="action-icon">{action.icon}</span>
                  <span className="action-label" style={{ fontSize: isFootball ? "9px" : "10px" }}>
                    {action.label}
                  </span>
                  {isSelected && <span className="check-mark">✓</span>}
                </button>
              );
            })}
          </div>

          {inningsOver && effectivelyLive && !winnerInfo?.isMatchOver && (
            <div style={{ color: "#f87171", fontSize: "14px", marginTop: "8px" }}>
              ⛔ {selectedTeamName} has finished their overs – no further actions allowed.
            </div>
          )}

          {showExtraRunsPicker && (
            <div className="extra-runs-picker" style={{ marginTop: "12px" }}>
              <p className="quick-actions-title" style={{ marginBottom: "6px" }}>
                ➕ Extra runs on the {selectedActionType?.toUpperCase()} (overthrow / boundary, optional)
              </p>
              <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                {EXTRA_RUNS_OPTIONS.map((val) => {
                  const isSelected = selectedExtraRuns === val;
                  return (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setSelectedExtraRuns(val)}
                      disabled={!effectivelyLive || inningsOver || !isBattingTeamSelected}
                      style={{
                        padding: "6px 14px",
                        borderRadius: "8px",
                        border: `1px solid ${isSelected ? "#2563EB" : "#3a3f4b"}`,
                        background: isSelected ? "#2563EB" : "transparent",
                        color: isSelected ? "#FFFFFF" : "#cbd2e0",
                        fontSize: "12px",
                        fontWeight: 600,
                        cursor:
                          !effectivelyLive || inningsOver || !isBattingTeamSelected
                            ? "not-allowed"
                            : "pointer",
                        opacity: !effectivelyLive || inningsOver || !isBattingTeamSelected ? 0.5 : 1,
                      }}
                    >
                      {val === 0 ? "None" : `+${val}`}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "10px" }}>
          <button
            className={`add-note-btn ${postStatus === "success" ? "success" : ""} ${postStatus === "error" ? "error" : ""}`}
            onClick={handlePostCommentary}
            disabled={isPosting || !selectedActionType || !effectivelyLive || inningsOver || !isBattingTeamSelected}
          >
            {!effectivelyLive ? (
              winnerInfo?.isMatchOver ? "Match Over" : "Match Not Live"
            ) : !isBattingTeamSelected ? (
              "Not Batting Team"
            ) : inningsOver ? (
              "Overs Completed"
            ) : isPosting ? (
              "Processing..."
            ) : postStatus === "success" ? (
              "✅ Posted!"
            ) : postStatus === "error" ? (
              "❌ Failed"
            ) : (
              <>
                Post Commentary <span className="arrow">→</span>
              </>
            )}
          </button>
        </div>

        {selectedActionType && effectivelyLive && !inningsOver && isBattingTeamSelected && (
          <div style={{ fontSize: "12px", color: "#8d96aa", marginTop: "8px", textAlign: "right" }}>
            Ready to post:{" "}
            <strong style={{ color: "#ffffff" }}>{selectedActionType.toUpperCase().replace("_", " ")}</strong>
            {showExtraRunsPicker && selectedExtraRuns > 0 && (
              <>
                {" "}
                (+{selectedExtraRuns} run{selectedExtraRuns > 1 ? "s" : ""})
              </>
            )}
            {note && ` with note: "${note}"`}
          </div>
        )}
      </div>
    </div>
  );
}

export default AddCommentary;