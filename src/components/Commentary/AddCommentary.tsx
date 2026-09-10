import React, { useState, useEffect, useRef } from "react";
import type { FeedingMatchs } from "../../services/match.types";
import {
  fetchLiveTeams,
  liveFixtures,
  postCommentary,
  updateScoreFixtures,
} from "../../services/liveservice";
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
  homeScore: number;
  homeWickets: number | null;
  awayScore: number;
  awayWickets: number | null;
  homeOvers?: string;
  awayOvers?: string;
  totalOvers?: string;
  scorecards?: any[];
}

interface AddCommentaryProps {
  selectedMatch?: ExtendedFeedingMatchs | null;
  onFixtureIdChange?: (fixtureId: string | null) => void;
  onCommentaryPosted?: () => void;
  onScoreUpdated?: (updatedMatch: FeedingMatchs) => void;
}

// Cricket Action Map
const CRICKET_ACTION_MAP: Record<string, number> = {
  six: 0,
  four: 1,
  single: 2,
  wicket: 3,
  wide: 4,
  two: 5,
  three: 6,
  no_ball: 17,
  byes: 18,
  dot_ball: 19,
};

// Football Action Map
const FOOTBALL_ACTION_MAP: Record<string, number> = {
  goal: 7,
  assist: 8,
  yellow_card: 9,
  red_card: 10,
  substitution: 11,
  penalty: 12,
  free_kick: 13,
  corner: 14,
  offside: 15,
  save: 16,
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

function AddCommentary({
  selectedMatch,
  onFixtureIdChange,
  onCommentaryPosted,
  onScoreUpdated,
}: AddCommentaryProps) {
  const [selectedTeamName, setSelectedTeamName] = useState<string>("");
  const [selectedBatterId, setSelectedBatterId] = useState<string>("");
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

  // NEW: Winner State
  const [winnerInfo, setWinnerInfo] = useState<{ isMatchOver: boolean; text: string } | null>(null);

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
  const MAX_WICKETS = 10;

  // NEW: Effectively live means match is live AND not mathematically over
  const effectivelyLive = isMatchLive && !winnerInfo?.isMatchOver;

  const isAtMaxWickets = (teamName: string) => {
    const teamScore = scores[teamName] || { runs: 0, wkts: 0 };
    return teamScore.wkts >= MAX_WICKETS;
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

  const subtractBall = (currentOvers: string): string => {
    let { overs: o, balls: b } = parseOvers(currentOvers);
    if (o === 0 && b === 0) return currentOvers;
    b -= 1;
    if (b < 0) {
      if (o > 0) {
        o -= 1;
        b = 5;
      } else {
        b = 0;
      }
    }
    return formatOvers(o, b);
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

  // ============================================================
  // NEW: BOWLER LOCK LOGIC
  // A bowler is locked if they have bowled at least 1 ball
  // in the current over (i.e., balls > 0).
  // ============================================================
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
        onFixtureIdChange?.(fixture.id);
        if (foundTeams.length === 2) {
          updateLocalScoresAndOvers(fixture, foundTeams);
        }
      } else {
        setSelectedFixtureId(null);
        setMatchStatus("");
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
        setSelectedBowlerId("");
        setBowlerOvers({});
      }

      if (foundTeams.length > 0) {
        const teamStillExists =
          previousSelectedTeamName &&
          foundTeams.some((team) => team.teamName.toLowerCase() === previousSelectedTeamName.toLowerCase());
        setSelectedTeamName(teamStillExists ? previousSelectedTeamName : foundTeams[0].teamName);
      }
    } else {
      setMatchTeams([]);
      setSelectedTeamName("");
      setSelectedFixtureId(null);
      setMatchStatus("");
      onFixtureIdChange?.(null);
      setScores({});
      setOvers({});
      setTotalOversLimit(null);
      setSelectedActionType(null);
      setSelectedExtraRuns(0);
      setNote("");
      setSelectedBatterId("");
      setSelectedBowlerId("");
      setBowlerOvers({});
    }
    prevMatchIdRef.current = currentMatchId;
  }, [selectedMatch, allTeams, liveFixturesList]);

  // ============================================================
  // WINNER DETECTION LOGIC
  // ============================================================
  useEffect(() => {
    if (!isMatchLive || !selectedMatch || matchTeams.length !== 2 || !scores || Object.keys(scores).length === 0) {
      setWinnerInfo(null);
      return;
    }

    const phase = selectedMatch.phase?.toLowerCase() || "";
    const isSecondInnings = phase.includes("second") || phase.includes("2");

    if (!isSecondInnings) {
      setWinnerInfo(null);
      return;
    }

    // Find first innings batting team from scorecards
    let firstBattingTeamId = "";
    if (selectedMatch.scorecards && selectedMatch.scorecards.length > 0) {
      const firstInnings = selectedMatch.scorecards.find((s: any) => s.inningsNo === 1);
      if (firstInnings) {
        firstBattingTeamId = firstInnings.battingTeamId;
      }
    }

    let firstBattingTeam = firstBattingTeamId
      ? matchTeams.find((t) => t.id === firstBattingTeamId)
      : null;

    // Fallback if not found via scorecards
    if (!firstBattingTeam) {
      firstBattingTeam = matchTeams.find(
        (t) => t.teamName.toLowerCase() === selectedMatch.team1.toLowerCase()
      );
    }

    if (!firstBattingTeam) firstBattingTeam = matchTeams[0];

    const secondBattingTeam = matchTeams.find((t) => t.id !== firstBattingTeam?.id);
    if (!firstBattingTeam || !secondBattingTeam) return;

    const firstTeamScore = scores[firstBattingTeam.teamName]?.runs || 0;
    const secondTeamScore = scores[secondBattingTeam.teamName] || { runs: 0, wkts: 0 };

    const target = firstTeamScore + 1;
    const isAllOut = secondTeamScore.wkts >= MAX_WICKETS;
    const isOversDone = isAtMaxOvers(secondBattingTeam.teamName);

    let resultText = "";
    let isOver = false;

    if (secondTeamScore.runs >= target) {
      // Chasing team wins
      isOver = true;
      resultText = `${secondBattingTeam.teamName} won the match by ${MAX_WICKETS - secondTeamScore.wkts} wickets`;
    } else if (isAllOut || isOversDone) {
      if (secondTeamScore.runs < target - 1) {
        // Defending team wins
        isOver = true;
        resultText = `${firstBattingTeam.teamName} won the match by ${target - 1 - secondTeamScore.runs} runs`;
      } else if (secondTeamScore.runs === target - 1) {
        // Tie
        isOver = true;
        resultText = `Match Tied`;
      }
    }

    if (isOver) {
      setWinnerInfo({ isMatchOver: true, text: resultText });
    } else {
      setWinnerInfo(null);
    }
  }, [scores, overs, matchTeams, selectedMatch, isMatchLive, totalOversLimit]);

  // ============================================================
  // BATTER / BOWLER SELECTION
  // ============================================================
  useEffect(() => {
    if (!selectedTeamName || matchTeams.length !== 2) {
      setSelectedBatterId("");
      setSelectedBowlerId("");
      return;
    }

    const battingTeam = matchTeams.find(
      (team) => team.teamName.toLowerCase() === selectedTeamName.toLowerCase()
    );
    const bowlingTeam = matchTeams.find(
      (team) => team.teamName.toLowerCase() !== selectedTeamName.toLowerCase()
    );

    const currentBatterIsValid =
      selectedBatterId && battingTeam?.players?.some((player) => player.playerId === selectedBatterId);
    const currentBowlerIsValid =
      selectedBowlerId && bowlingTeam?.players?.some((player) => player.playerId === selectedBowlerId);

    if (battingTeam && battingTeam.players && battingTeam.players.length > 0) {
      setSelectedBatterId(currentBatterIsValid ? selectedBatterId : battingTeam.players[0].playerId);
    } else {
      setSelectedBatterId("");
    }

    if (bowlingTeam && bowlingTeam.players && bowlingTeam.players.length > 0) {
      const newBowlerId = currentBowlerIsValid ? selectedBowlerId : bowlingTeam.players[0].playerId;
      setSelectedBowlerId(newBowlerId);
      if (newBowlerId && !bowlerOvers[newBowlerId]) {
        setBowlerOvers((prev) => ({ ...prev, [newBowlerId]: "0.0" }));
      }
    } else {
      setSelectedBowlerId("");
    }
  }, [selectedTeamName, matchTeams, selectedBatterId, selectedBowlerId]);

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

  const handleActionSelect = (actionType: string) => {
    if (!effectivelyLive) {
      showError("Error", "Cannot post commentary for a match that is not live or is already over");
      return;
    }

    if (isInningsOverForTeam(selectedTeamName)) {
      showError("Error", `${selectedTeamName} has completed their overs. No more actions allowed.`);
      return;
    }

    if (!isFootball && actionType === "wicket" && isAtMaxWickets(selectedTeamName)) {
      showError("Error", `${selectedTeamName} is already all out (${MAX_WICKETS} wickets).`);
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

    const side = getSide(selectedTeamName);
    if (side === null) {
      alert("Could not determine side for the selected team.");
      return;
    }

    if (!isFootball && selectedActionType === "wicket") {
      const currentWkts = scores[selectedTeamName]?.wkts || 0;
      if (currentWkts >= MAX_WICKETS) {
        showError("Error", `${selectedTeamName} is already all out (${MAX_WICKETS} wickets). Cannot add another wicket.`);
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

  const batterPlayers = (() => {
    const team = matchTeams.find((t) => t.teamName.toLowerCase() === selectedTeamName.toLowerCase());
    return team ? team.players : [];
  })();

  const bowlerPlayers = (() => {
    const team = matchTeams.find((t) => t.teamName.toLowerCase() !== selectedTeamName.toLowerCase());
    return team ? team.players : [];
  })();

  const oppositeTeamName =
    matchTeams.find((team) => team.teamName.toLowerCase() !== selectedTeamName.toLowerCase())?.teamName || "";

  const showExtraRunsPicker = !isFootball && !!selectedActionType && EXTRA_RUNS_ELIGIBLE_ACTIONS.has(selectedActionType);
  const inningsOver = isInningsOverForTeam(selectedTeamName) || winnerInfo?.isMatchOver;

  return (
    <div className="add-commentary-container">
      {/* ========================================================
          WINNER BANNER
      ======================================================== */}
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

      {/* ========================================================
          SCORE CONTROL
      ======================================================== */}
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
            return (
              <div className="team-score-card" key={team.name}>
                <div className="team-header">
                  <span className="team-dot" style={{ background: team.color }} />
                  <span className="team-name">{team.name}</span>
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
                        <span className="score-value">{teamScore.wkts}</span>
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

      {/* ========================================================
          COMMENTARY SECTION
      ======================================================== */}
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

        {/* TEAM SELECTOR */}
        <div className="control-group">
          <label>TEAM</label>
          <div className="team-selector">
            {teams.map((team) => (
              <button
                key={team.name}
                className={`team-btn ${selectedTeamName === team.name ? "active" : ""}`}
                onClick={() => setSelectedTeamName(team.name)}
                disabled={!effectivelyLive}
              >
                {team.name}
              </button>
            ))}
          </div>
        </div>

        {/* BATTER + BOWLER */}
        <div className="commentary-controls">
          <div className="control-group">
            <label>
              BATTER
              {selectedTeamName && (
                <span style={{ marginLeft: "6px", fontSize: "11px", fontWeight: 400, color: "#8d96aa" }}>
                  — {selectedTeamName}
                </span>
              )}
            </label>
            <div className="player-selector">
              <select
                value={selectedBatterId}
                onChange={(e) => setSelectedBatterId(e.target.value)}
                className="player-dropdown"
                disabled={batterPlayers.length === 0 || !effectivelyLive || inningsOver}
              >
                {batterPlayers.length === 0 ? (
                  <option value="">No batters available</option>
                ) : (
                  batterPlayers.map((player) => (
                    <option key={player.playerId} value={player.playerId}>
                      {player.playerName} ({player.role})
                    </option>
                  ))
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
            </label>
            <div className="player-selector">
              <select
                value={selectedBowlerId}
                onChange={(e) => {
                  if (!isBowlerLocked()) {
                    setSelectedBowlerId(e.target.value);
                  }
                }}
                className="player-dropdown"
                disabled={bowlerPlayers.length === 0 || !effectivelyLive || inningsOver || isBowlerLocked()}
                title={isBowlerLocked() ? "Bowler is locked until the current over completes" : undefined}
              >
                {bowlerPlayers.length === 0 ? (
                  <option value="">No bowlers available</option>
                ) : (
                  bowlerPlayers.map((player) => (
                    <option key={player.playerId} value={player.playerId}>
                      {player.playerName} ({player.role})
                    </option>
                  ))
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
              disabled={!effectivelyLive || inningsOver}
            />
          </div>
        </div>

        {/* QUICK ACTIONS */}
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
              opacity: effectivelyLive && !inningsOver ? 1 : 0.5,
              pointerEvents: effectivelyLive && !inningsOver ? "auto" : "none",
            }}
          >
            {quickActions.map((action) => {
              const isSelected = selectedActionType === action.type;
              const isWicketDisabled = !isFootball && action.type === "wicket" && isAtMaxWickets(selectedTeamName);
              const isOverLimit = !isFootball && isAtMaxOvers(selectedTeamName);
              const isDisabled = !effectivelyLive || isWicketDisabled || isOverLimit;

              return (
                <button
                  key={action.type}
                  className={`action-btn ${action.type} ${isSelected ? "selected" : ""}`}
                  onClick={() => handleActionSelect(action.type)}
                  disabled={isDisabled}
                  title={
                    isWicketDisabled
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

          {/* EXTRA RUNS PICKER */}
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
                      disabled={!effectivelyLive || inningsOver}
                      style={{
                        padding: "6px 14px",
                        borderRadius: "8px",
                        border: `1px solid ${isSelected ? "#2563EB" : "#3a3f4b"}`,
                        background: isSelected ? "#2563EB" : "transparent",
                        color: isSelected ? "#FFFFFF" : "#cbd2e0",
                        fontSize: "12px",
                        fontWeight: 600,
                        cursor: !effectivelyLive || inningsOver ? "not-allowed" : "pointer",
                        opacity: !effectivelyLive || inningsOver ? 0.5 : 1,
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

        {/* POST COMMENTARY BUTTON */}
        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "10px" }}>
          <button
            className={`add-note-btn ${postStatus === "success" ? "success" : ""} ${postStatus === "error" ? "error" : ""}`}
            onClick={handlePostCommentary}
            disabled={isPosting || !selectedActionType || !effectivelyLive || inningsOver}
          >
            {!effectivelyLive ? (
              winnerInfo?.isMatchOver ? "Match Over" : "Match Not Live"
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

        {/* READY TO POST */}
        {selectedActionType && effectivelyLive && !inningsOver && (
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