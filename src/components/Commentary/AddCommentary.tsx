import React, { useState, useEffect } from "react";
import type { FeedingMatchs } from "../../services/match.types";
import {
  fetchLiveTeams,
  liveFixtures,
  postCommentary,
  updateScoreFixtures,
} from "../../services/liveservice";
import "./AddCommentary.css";
import { showError, showSuccess } from "../../services/common/AlertService";

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
  homeScore: number;
  homeWickets: number | null;
  awayScore: number;
  awayWickets: number | null;
  homeOvers?: string;
  awayOvers?: string;
  totalOvers?: string;
}

interface AddCommentaryProps {
  selectedMatch?: FeedingMatchs | null;
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
  {
    label: "SIX",
    runs: 6,
    type: "six",
    icon: "🚀",
    color: "#8B5CF6",
    bgColor: "#EDE9FE",
    borderColor: "#8B5CF6",
    selectedBg: "#8B5CF6",
    selectedColor: "#FFFFFF",
  },
  {
    label: "FOUR",
    runs: 4,
    type: "four",
    icon: "🏏",
    color: "#059669",
    bgColor: "#D1FAE5",
    borderColor: "#059669",
    selectedBg: "#059669",
    selectedColor: "#FFFFFF",
  },
  {
    label: "Single",
    runs: 1,
    type: "single",
    icon: "➡️",
    color: "#D97706",
    bgColor: "#FEF3C7",
    borderColor: "#D97706",
    selectedBg: "#D97706",
    selectedColor: "#FFFFFF",
  },
  {
    label: "Wicket",
    runs: 0,
    type: "wicket",
    icon: "🔴",
    color: "#DC2626",
    bgColor: "#FEE2E2",
    borderColor: "#DC2626",
    selectedBg: "#DC2626",
    selectedColor: "#FFFFFF",
  },
  {
    label: "Wide",
    runs: 1,
    type: "wide",
    icon: "↗️",
    color: "#2563EB",
    bgColor: "#DBEAFE",
    borderColor: "#2563EB",
    selectedBg: "#2563EB",
    selectedColor: "#FFFFFF",
  },
  {
    label: "Two",
    runs: 2,
    type: "two",
    icon: "✌🏻",
    color: "#eff0e7",
    bgColor: "#ace05e",
    borderColor: "#deeb25",
    selectedBg: "#d3cd97",
    selectedColor: "#FFFFFF",
  },
  {
    label: "Three",
    runs: 3,
    type: "three",
    icon: "👌🏻",
    color: "#eff0e7",
    bgColor: "#b66565",
    borderColor: "#ed4426",
    selectedBg: "#9a3725",
    selectedColor: "#FFFFFF",
  },
  {
    label: "No Ball",
    runs: 1,
    type: "no_ball",
    icon: "🙅🏻‍♂️",
    color: "#6B7280",
    bgColor: "#E5E7EB",
    borderColor: "#6B7280",
    selectedBg: "#6B7280",
    selectedColor: "#FFFFFF",
  },
];

const footballQuickActions = [
  {
    label: "⚽ Goal",
    type: "goal",
    icon: "⚽",
    color: "#059669",
    bgColor: "#D1FAE5",
    borderColor: "#059669",
    selectedBg: "#059669",
    selectedColor: "#FFFFFF",
  },
  {
    label: "🅰️ Assist",
    type: "assist",
    icon: "🅰️",
    color: "#2563EB",
    bgColor: "#DBEAFE",
    borderColor: "#2563EB",
    selectedBg: "#2563EB",
    selectedColor: "#FFFFFF",
  },
  {
    label: "🟨 Yellow Card",
    type: "yellow_card",
    icon: "🟨",
    color: "#D97706",
    bgColor: "#FEF3C7",
    borderColor: "#D97706",
    selectedBg: "#D97706",
    selectedColor: "#FFFFFF",
  },
  {
    label: "🟥 Red Card",
    type: "red_card",
    icon: "🟥",
    color: "#DC2626",
    bgColor: "#FEE2E2",
    borderColor: "#DC2626",
    selectedBg: "#DC2626",
    selectedColor: "#FFFFFF",
  },
  {
    label: "🔄 Substitution",
    type: "substitution",
    icon: "🔄",
    color: "#8B5CF6",
    bgColor: "#EDE9FE",
    borderColor: "#8B5CF6",
    selectedBg: "#8B5CF6",
    selectedColor: "#FFFFFF",
  },
  {
    label: "⚡ Penalty",
    type: "penalty",
    icon: "⚡",
    color: "#EF4444",
    bgColor: "#FEE2E2",
    borderColor: "#EF4444",
    selectedBg: "#EF4444",
    selectedColor: "#FFFFFF",
  },
  {
    label: "🎯 Free Kick",
    type: "free_kick",
    icon: "🎯",
    color: "#F59E0B",
    bgColor: "#FEF3C7",
    borderColor: "#F59E0B",
    selectedBg: "#F59E0B",
    selectedColor: "#FFFFFF",
  },
  {
    label: "🚩 Corner",
    type: "corner",
    icon: "🚩",
    color: "#3B82F6",
    bgColor: "#DBEAFE",
    borderColor: "#3B82F6",
    selectedBg: "#3B82F6",
    selectedColor: "#FFFFFF",
  },
  {
    label: "🚫 Offside",
    type: "offside",
    icon: "🚫",
    color: "#6B7280",
    bgColor: "#E5E7EB",
    borderColor: "#6B7280",
    selectedBg: "#6B7280",
    selectedColor: "#FFFFFF",
  },
  {
    label: "🧤 Save",
    type: "save",
    icon: "🧤",
    color: "#10B981",
    bgColor: "#D1FAE5",
    borderColor: "#10B981",
    selectedBg: "#10B981",
    selectedColor: "#FFFFFF",
  },
];

function AddCommentary({
  selectedMatch,
  onFixtureIdChange,
  onCommentaryPosted,
  onScoreUpdated,
}: AddCommentaryProps) {
  const [selectedTeamName, setSelectedTeamName] = useState<string>("");
  const [selectedPlayerId, setSelectedPlayerId] = useState<string>("");
  const [note, setNote] = useState("");
  const [selectedActionType, setSelectedActionType] = useState<string | null>(
    null,
  );

  const [allTeams, setAllTeams] = useState<Team[]>([]);
  const [liveFixturesList, setLiveFixturesList] = useState<LiveFixture[]>([]);
  const [matchTeams, setMatchTeams] = useState<Team[]>([]);
  const [selectedFixtureId, setSelectedFixtureId] = useState<string | null>(
    null,
  );
  const [matchStatus, setMatchStatus] = useState<string>("");

  const [scores, setScores] = useState<
    Record<string, { runs: number; wkts: number }>
  >({});
  const [overs, setOvers] = useState<Record<string, string>>({});
  const [totalOversLimit, setTotalOversLimit] = useState<number | null>(null);

  const [isPosting, setIsPosting] = useState<boolean>(false);
  const [postStatus, setPostStatus] = useState<"idle" | "success" | "error">(
    "idle",
  );

  // ---- Extra runs (overthrows) on wide / no-ball ----
  const [selectedExtraRuns, setSelectedExtraRuns] = useState<number>(0);

  // Actions where extra runs (overthrows/boundary after the delivery) can be added.
  const EXTRA_RUNS_ELIGIBLE_ACTIONS = new Set(["wide", "no_ball"]);
  const EXTRA_RUNS_OPTIONS = [0, 1, 2, 3, 4, 6];

  const getSportType = (): "cricket" | "football" => {
    if (
      selectedMatch?.sport?.toLowerCase().includes("football") ||
      selectedMatch?.sport?.toLowerCase().includes("soccer")
    )
      return "football";
    return "cricket";
  };

  const isFootball = getSportType() === "football";
  const quickActions = isFootball ? footballQuickActions : cricketQuickActions;
  const ACTION_MAP = isFootball ? FOOTBALL_ACTION_MAP : CRICKET_ACTION_MAP;
  const isMatchLive = matchStatus?.toLowerCase() === "live";

  const MAX_WICKETS = 10;

  const isAtMaxWickets = (teamName: string) => {
    const teamScore = scores[teamName] || { runs: 0, wkts: 0 };
    return teamScore.wkts >= MAX_WICKETS;
  };

  // Overs helpers
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
      } else b = 0;
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
        const fixture = res.find((f) => f.id === selectedFixtureId);
        if (fixture && matchTeams.length === 2)
          updateLocalScoresAndOvers(fixture, matchTeams);
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
      newScores[homeTeam.teamName] = {
        runs: fixture.homeScore || 0,
        wkts: fixture.homeWickets || 0,
      };
      newScores[awayTeam.teamName] = {
        runs: fixture.awayScore || 0,
        wkts: fixture.awayWickets || 0,
      };
      newOvers[homeTeam.teamName] = fixture.homeOvers || "0.0";
      newOvers[awayTeam.teamName] = fixture.awayOvers || "0.0";

      // ---- Overs limit with fallback ----
      let limit: number | null = null;
      if (fixture.totalOvers) {
        limit = parseFloat(fixture.totalOvers);
      } else if (selectedMatch?.totalOvers) {
        limit = parseFloat(selectedMatch.totalOvers);
      } else {
        // Default to 20 overs for cricket if no limit is provided
        limit = 20;
        console.warn("Total overs not provided, defaulting to 20");
      }
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

  useEffect(() => {
    fetchTeams();
    getFixtures();
  }, []);
  useEffect(() => {
    if (selectedMatch && allTeams.length > 0 && liveFixturesList.length > 0) {
      const team1 = allTeams.find(
        (t) => t.teamName.toLowerCase() === selectedMatch.team1.toLowerCase(),
      );
      const team2 = allTeams.find(
        (t) => t.teamName.toLowerCase() === selectedMatch.team2.toLowerCase(),
      );
      const foundTeams = [team1, team2].filter(Boolean) as Team[];
      setMatchTeams(foundTeams);
      const fixture = liveFixturesList.find(
        (f) =>
          (f.homeTeamName.toLowerCase() === selectedMatch.team1.toLowerCase() &&
            f.awayTeamName.toLowerCase() ===
              selectedMatch.team2.toLowerCase()) ||
          (f.homeTeamName.toLowerCase() === selectedMatch.team2.toLowerCase() &&
            f.awayTeamName.toLowerCase() === selectedMatch.team1.toLowerCase()),
      );
      if (fixture) {
        setSelectedFixtureId(fixture.id);
        setMatchStatus(fixture.status);
        onFixtureIdChange?.(fixture.id);
        if (foundTeams.length === 2)
          updateLocalScoresAndOvers(fixture, foundTeams);
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
      setSelectedPlayerId("");
      if (foundTeams.length > 0) setSelectedTeamName(foundTeams[0].teamName);
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
      setSelectedPlayerId("");
    }
  }, [selectedMatch, allTeams, liveFixturesList]);

  useEffect(() => {
    if (selectedTeamName) {
      const team = matchTeams.find((t) => t.teamName === selectedTeamName);
      if (team && team.players.length > 0)
        setSelectedPlayerId(team.players[0].playerId);
      else setSelectedPlayerId("");
    }
  }, [selectedTeamName, matchTeams]);

  const getSide = (teamName: string): 0 | 1 | null => {
    if (!selectedFixtureId || !liveFixturesList.length) return null;
    const fixture = liveFixturesList.find((f) => f.id === selectedFixtureId);
    if (!fixture) return null;
    if (fixture.homeTeamName.toLowerCase() === teamName.toLowerCase()) return 0;
    if (fixture.awayTeamName.toLowerCase() === teamName.toLowerCase()) return 1;
    return null;
  };

  const handleOversChange = async (teamName: string, delta: 1 | -1) => {
    if (!isMatchLive) {
      showError("Error", "Cannot update overs for a match that is not live");
      return;
    }
    const currentOvers = overs[teamName] || "0.0";
    let newOversStr =
      delta === 1 ? addBall(currentOvers) : subtractBall(currentOvers);
    if (totalOversLimit !== null && delta === 1) {
      const currentTotal =
        parseOvers(currentOvers).overs * 6 + parseOvers(currentOvers).balls;
      const newTotal =
        parseOvers(newOversStr).overs * 6 + parseOvers(newOversStr).balls;
      if (newTotal > totalOversLimit * 6) {
        console.warn("Overs limit reached");
        return;
      }
    }
    if (newOversStr === currentOvers) return;

    // Determine side
    const side = getSide(teamName);
    if (side === null) {
      showError("Error", "Could not determine side for the team.");
      return;
    }

    try {
      // Persist the overs change via API
      await updateScoreFixtures(selectedFixtureId!, {
        side,
        runsDelta: 0,
        wicketsDelta: 0,
        overs: newOversStr,
      });
      // Update local state after success
      setOvers((prev) => ({ ...prev, [teamName]: newOversStr }));
    } catch (error) {
      console.error("Failed to update overs:", error);
      showError("Error", "Failed to update overs. Please try again.");
    }
  };
  const handleActionSelect = (actionType: string) => {
    if (!isMatchLive) {
      showError("Error", "Cannot post commentary for a match that is not live");
      return;
    }
    if (
      !isFootball &&
      actionType === "wicket" &&
      isAtMaxWickets(selectedTeamName)
    ) {
      showError(
        "Error",
        `${selectedTeamName} is already all out (${MAX_WICKETS} wickets).`,
      );
      return;
    }
    setSelectedActionType((prev) => {
      const next = prev === actionType ? null : actionType;
      return next;
    });
    setSelectedExtraRuns(0); // reset extras any time the action selection changes
    setPostStatus("idle");
  };

  // ================== UPDATED handlePostCommentary (no optimistic updates) ==================

  const BALL_CONSUMING_ACTIONS = new Set([
    "six",
    "four",
    "single",
    "wicket",
    "two",
    "three",
  ]);

  const handlePostCommentary = async () => {
    if (!isMatchLive) {
      showError("Error", "Cannot post commentary for a match that is not live");
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
    if (!selectedPlayerId) {
      alert("Please select a player.");
      return;
    }
    if (!selectedTeamName) {
      alert("Please select a team.");
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
        showError(
          "Error",
          `${selectedTeamName} is already all out (${MAX_WICKETS} wickets). Cannot add another wicket.`,
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

    // Find the run value for this action from the quickActions config
    const actionConfig = quickActions.find(
      (a) => a.type === selectedActionType,
    ) as any;
    const baseRuns = actionConfig?.runs ?? 0;
    const isExtraEligible =
      !isFootball && EXTRA_RUNS_ELIGIBLE_ACTIONS.has(selectedActionType);
    const runsDelta = isExtraEligible ? baseRuns + selectedExtraRuns : baseRuns;
    const wicketsDelta = selectedActionType === "wicket" ? 1 : 0;

    const extraNoteSuffix =
      isExtraEligible && selectedExtraRuns > 0
        ? ` +${selectedExtraRuns} run${selectedExtraRuns > 1 ? "s" : ""} (overthrow)`
        : "";

    // Compute new overs if this action is a legal delivery
    let newOvers: string | undefined;
    if (!isFootball && BALL_CONSUMING_ACTIONS.has(selectedActionType)) {
      const currentOvers = overs[selectedTeamName] || "0.0";
      newOvers = addBall(currentOvers);
    }

    const commentaryPayload = {
      side,
      playerId: selectedPlayerId,
      action: actionValue,
      note: `${selectedActionType.toUpperCase()}: ${note || ""}${extraNoteSuffix}`.trim(),
      currentball: newOvers ?? overs[selectedTeamName] ?? "0.0",
    };

    setIsPosting(true);
    setPostStatus("idle");

    try {
      debugger;
      // 1. Log the commentary entry (feed)
      await postCommentary(selectedFixtureId, commentaryPayload);

      // 2. Persist the score/overs update
      if (!isFootball) {
        await updateScoreFixtures(selectedFixtureId, {
          side,
          runsDelta,
          wicketsDelta,
          overs: newOvers ?? overs[selectedTeamName] ?? "0.0",
        });
        if (newOvers) {
          setOvers((prev) => ({
            ...prev,
            [selectedTeamName]: newOvers as string,
          }));
        }
      } else {
        await updateScoreFixtures(selectedFixtureId, {
          side,
          runsDelta,
          wicketsDelta: 0,
          overs: "",
        });
      }

      // Build updated match data
      if (onScoreUpdated && selectedMatch) {
        const updatedMatch: FeedingMatchs = {
          ...selectedMatch,
          score: isFootball
            ? `${scores[matchTeams[0]?.teamName]?.runs || 0}-${scores[matchTeams[1]?.teamName]?.runs || 0}`
            : `${scores[selectedTeamName]?.runs || 0}/${scores[selectedTeamName]?.wkts || 0}`,
          // If you track stage/progress, compute them here (e.g., overs, innings)
          // stage: ...,
          // progress: ...,
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

  // ---- Render helpers ----
  const teams = matchTeams.map((team) => ({
    name: team.teamName,
    color: team.color || "#ccc",
  }));
  const currentPlayers = (() => {
    const team = matchTeams.find((t) => t.teamName === selectedTeamName);
    return team ? team.players : [];
  })();

  const showExtraRunsPicker =
    !isFootball &&
    !!selectedActionType &&
    EXTRA_RUNS_ELIGIBLE_ACTIONS.has(selectedActionType);

  // ---- JSX ----
  return (
    <div className="add-commentary-container">
      {selectedMatch && matchTeams.length === 2 ? (
        <div className="match-info-banner">
          <span className="match-info">
            {selectedMatch.sport}: {matchTeams[0].teamName} vs{" "}
            {matchTeams[1].teamName}
          </span>
          <span className="match-info-score">
            {isFootball
              ? `${scores[matchTeams[0]?.teamName]?.runs || 0} - ${scores[matchTeams[1]?.teamName]?.runs || 0}`
              : `${scores[matchTeams[0]?.teamName]?.runs || 0}/${scores[matchTeams[0]?.teamName]?.wkts || 0} - ${scores[matchTeams[1]?.teamName]?.runs || 0}/${scores[matchTeams[1]?.teamName]?.wkts || 0}`}
          </span>
          <span
            className="match-status-badge"
            style={{
              background: isMatchLive ? "#10B981" : "#F59E0B",
              padding: "2px 12px",
              borderRadius: "12px",
              fontSize: "11px",
              fontWeight: "bold",
              color: "white",
              marginLeft: "8px",
            }}
          >
            {isMatchLive
              ? "🔴 LIVE"
              : matchStatus?.toUpperCase() || "SCHEDULED"}
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
          <span className="match-info">
            No match selected or teams not loaded
          </span>
        </div>
      )}

      {!isMatchLive && selectedMatch && (
        <div className="match-disabled-overlay">
          <div className="disabled-message">
            <span className="disabled-icon">⏳</span>
            <h3>Match is {matchStatus?.toUpperCase() || "SCHEDULED"}</h3>
            <p>
              Commentary and score updates are only available when the match is
              LIVE
            </p>
          </div>
        </div>
      )}

      <div
        className={`score-control ${!isMatchLive ? "disabled-section" : ""}`}
      >
        <div className="score-header">
          <h3>SCORE CONTROL</h3>
          <span className="feed-score">
            {isFootball
              ? "Goals are updated via commentary actions"
              : "Runs & wickets updated via commentary actions"}
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
                  <span
                    className="team-dot"
                    style={{ background: team.color }}
                  />
                  <span className="team-name">{team.name}</span>
                </div>
                <div className="score-row">
                  <div className="score-item">
                    <span className="score-label">
                      {isFootball ? "GOALS" : "RUNS"}
                    </span>
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
                          <button
                            className="stepper-btn"
                            onClick={() => handleOversChange(team.name, -1)}
                            disabled={
                              !isMatchLive || overs[team.name] === "0.0"
                            }
                          >
                            −
                          </button>
                          <span className="overs-value">
                            {overs[team.name] || "0.0"}
                            {totalOversLimit !== null && (
                              <span className="overs-limit">
                                {" "}
                                / {totalOversLimit}
                              </span>
                            )}
                          </span>
                          <button
                            className="stepper-btn"
                            onClick={() => handleOversChange(team.name, 1)}
                            disabled={!isMatchLive || isAtMaxOvers(team.name)}
                          >
                            +
                          </button>
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

      <div
        className={`commentary-section ${!isMatchLive ? "disabled-section" : ""}`}
      >
        <div className="commentary-header">
          <h3>ADD COMMENTARY</h3>
          <span className="sport-tag">
            {selectedMatch?.sport || (isFootball ? "Football" : "Cricket")}
          </span>
        </div>
        <p className="commentary-subtitle">
          {isMatchLive
            ? "Pick a team and player, then tap an action — it pushes straight to the live feed."
            : `Commentary is disabled while match is ${matchStatus?.toLowerCase() || "scheduled"}`}
        </p>

        <div className="control-group">
          <label>TEAM</label>
          <div className="team-selector">
            {teams.map((team) => (
              <button
                key={team.name}
                className={`team-btn ${selectedTeamName === team.name ? "active" : ""}`}
                onClick={() => setSelectedTeamName(team.name)}
                disabled={!isMatchLive}
              >
                {team.name}
              </button>
            ))}
          </div>
        </div>

        <div className="commentary-controls">
          <div className="control-group">
            <label>PLAYER</label>
            <div className="player-selector">
              <select
                value={selectedPlayerId}
                onChange={(e) => setSelectedPlayerId(e.target.value)}
                className="player-dropdown"
                disabled={currentPlayers.length === 0 || !isMatchLive}
              >
                {currentPlayers.length === 0 ? (
                  <option value="">No players available</option>
                ) : (
                  currentPlayers.map((player) => (
                    <option key={player.playerId} value={player.playerId}>
                      {player.playerName} ({player.role})
                    </option>
                  ))
                )}
              </select>
            </div>
          </div>

          <div className="control-group">
            <label>NOTE (optional)</label>
            <div className="note-input-group">
              <input
                type="text"
                placeholder={
                  isFootball
                    ? "e.g. powerful strike from outside the box"
                    : "e.g. drives it through the covers"
                }
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className="note-input"
                disabled={!isMatchLive}
              />
            </div>
          </div>
        </div>

        <div className="quick-actions">
          <p className="quick-actions-title">
            ⚡ Select an action, then click "Post Commentary"
            {selectedActionType && (
              <span className="selected-action-indicator">
                {" "}
                • Selected:{" "}
                <strong>
                  {selectedActionType.toUpperCase().replace("_", " ")}
                </strong>
              </span>
            )}
          </p>
          <div
            className="action-buttons"
            style={{
              display: "grid",
              gridTemplateColumns: isFootball
                ? "repeat(5, 1fr)"
                : "repeat(4, 1fr)",
              gap: "8px",
              opacity: isMatchLive ? 1 : 0.5,
              pointerEvents: isMatchLive ? "auto" : "none",
            }}
          >
            {quickActions.map((action) => {
              const isSelected = selectedActionType === action.type;
              const isWicketDisabled =
                !isFootball &&
                action.type === "wicket" &&
                isAtMaxWickets(selectedTeamName);
              const isDisabled = !isMatchLive || isWicketDisabled;
              return (
                <button
                  key={action.type}
                  className={`action-btn ${action.type} ${isSelected ? "selected" : ""}`}
                  onClick={() => handleActionSelect(action.type)}
                  disabled={isDisabled}
                  title={
                    isWicketDisabled
                      ? `${selectedTeamName} is all out`
                      : undefined
                  }
                  style={{
                    backgroundColor: isSelected
                      ? action.selectedBg
                      : action.bgColor,
                    borderColor: isSelected
                      ? action.selectedBg
                      : action.borderColor,
                    color: isSelected ? action.selectedColor : action.color,
                    transform: isSelected ? "scale(1.05)" : "scale(1)",
                    boxShadow: isSelected
                      ? `0 4px 16px ${action.borderColor}66`
                      : "none",
                    padding: isFootball ? "8px 4px" : "8px 6px",
                    fontSize: isFootball ? "11px" : "12px",
                    opacity: isDisabled ? 0.5 : 1,
                    cursor: isDisabled ? "not-allowed" : "pointer",
                  }}
                >
                  <span className="action-icon">{action.icon}</span>
                  <span
                    className="action-label"
                    style={{ fontSize: isFootball ? "9px" : "10px" }}
                  >
                    {action.label}
                  </span>
                  {isSelected && <span className="check-mark">✓</span>}
                </button>
              );
            })}
          </div>

          {/* ---- Extra runs picker: shown only for wide (and no_ball, if added later) ---- */}
          {showExtraRunsPicker && (
            <div className="extra-runs-picker" style={{ marginTop: "12px" }}>
              <p
                className="quick-actions-title"
                style={{ marginBottom: "6px" }}
              >
                ➕ Extra runs on the {selectedActionType?.toUpperCase()}{" "}
                (overthrow / boundary, optional)
              </p>
              <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                {EXTRA_RUNS_OPTIONS.map((val) => {
                  const isSelected = selectedExtraRuns === val;
                  return (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setSelectedExtraRuns(val)}
                      disabled={!isMatchLive}
                      style={{
                        padding: "6px 14px",
                        borderRadius: "8px",
                        border: `1px solid ${isSelected ? "#2563EB" : "#3a3f4b"}`,
                        background: isSelected ? "#2563EB" : "transparent",
                        color: isSelected ? "#FFFFFF" : "#cbd2e0",
                        fontSize: "12px",
                        fontWeight: 600,
                        cursor: !isMatchLive ? "not-allowed" : "pointer",
                        opacity: !isMatchLive ? 0.5 : 1,
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

        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            marginTop: "10px",
          }}
        >
          <button
            className={`add-note-btn ${postStatus === "success" ? "success" : ""} ${postStatus === "error" ? "error" : ""}`}
            onClick={handlePostCommentary}
            disabled={isPosting || !selectedActionType || !isMatchLive}
          >
            {!isMatchLive ? (
              "Match Not Live"
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
        {selectedActionType && isMatchLive && (
          <div
            style={{
              fontSize: "12px",
              color: "#8d96aa",
              marginTop: "8px",
              textAlign: "right",
            }}
          >
            Ready to post:{" "}
            <strong style={{ color: "#ffffff" }}>
              {selectedActionType.toUpperCase().replace("_", " ")}
            </strong>
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
