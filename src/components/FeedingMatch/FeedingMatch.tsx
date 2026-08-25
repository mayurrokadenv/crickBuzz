import React, { type ChangeEvent, useEffect, useMemo, useState } from "react";
import type { FeedingMatchs } from "../../services/match.types";
import { getLiveMatches } from "../../services/liveservice";
import "./FeedingMatch.css";

interface FeedingMatchProps {
  onMatchSelect?: (match: FeedingMatchs) => void;
  onMatchesLoaded?: (matches: FeedingMatchs[]) => void;
  matches?: FeedingMatchs[];
}

const FeedingMatchComponent = ({
  onMatchSelect,
  onMatchesLoaded,
  matches: externalMatches,
}: FeedingMatchProps) => {
  debugger;
  const [feedingMatches, setFeedingMatches] = useState<FeedingMatchs[]>([]);
  const [selectedMatchId, setSelectedMatchId] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fallbackMatches: FeedingMatchs[] = [
    {
      id: 1,
      sport: "Cricket",
      team1: "Mumbai",
      team2: "Chennai",
      score: "186/5",
      stage: "2nd Innings",
      progress: "Over 18.3",
    },
  ];

  // Load matches on mount or when external matches change
  useEffect(() => {
    if (externalMatches && externalMatches.length > 0) {
      setFeedingMatches(externalMatches);
      // If selected match ID is not in the list, select the first one
      if (!externalMatches.some((m) => m.id === selectedMatchId)) {
        setSelectedMatchId(externalMatches[0].id);
        // Notify parent about the new selection
        if (onMatchSelect) {
          onMatchSelect(externalMatches[0]);
        }
      }
      setLoading(false);
    } else {
      fetchLiveMatches();
    }
  }, [externalMatches]); // Re-run when externalMatches changes

  const fetchLiveMatches = async () => {
    try {
      setLoading(true);
      setError(null);
      const matches = await getLiveMatches();
      if (matches.length > 0) {
        console.log("FeedingMatch: Fetched matches:", matches);
        setFeedingMatches(matches);
        setSelectedMatchId(matches[0].id);
        onMatchesLoaded?.(matches);
        if (onMatchSelect) {
          onMatchSelect(matches[0]);
        }
      } else {
        console.log("FeedingMatch: Using fallback matches");
        setFeedingMatches(fallbackMatches);
        setSelectedMatchId(fallbackMatches[0].id);
        onMatchesLoaded?.(fallbackMatches);
        if (onMatchSelect) {
          onMatchSelect(fallbackMatches[0]);
        }
      }
    } catch (error) {
      console.error("FeedingMatch: Error fetching:", error);
      setError("Failed to load live matches. Showing demo data.");
      setFeedingMatches(fallbackMatches);
      setSelectedMatchId(fallbackMatches[0].id);
      onMatchesLoaded?.(fallbackMatches);
      if (onMatchSelect) {
        onMatchSelect(fallbackMatches[0]);
      }
    } finally {
      setLoading(false);
    }
  };

  const selectedMatch: FeedingMatchs = useMemo(() => {
    const match = feedingMatches.find((match) => match.id === selectedMatchId);
    return match ?? feedingMatches[0];
  }, [selectedMatchId, feedingMatches]);

  const handleMatchChange = (e: ChangeEvent<HTMLSelectElement>) => {
    const newId = Number(e.target.value);
    console.log("FeedingMatch: Match changed to ID:", newId);
    setSelectedMatchId(newId);
    const match = feedingMatches.find((m) => m.id === newId);
    if (match && onMatchSelect) {
      onMatchSelect(match);
    }
  };

  if (loading) {
    return (
      <div className="feeding-match-container">
        <div className="loading-state">Loading live matches...</div>
      </div>
    );
  }

  if (error && feedingMatches.length === 0) {
    return (
      <div className="feeding-match-container">
        <div className="error-state">{error}</div>
      </div>
    );
  }

  return (
    <div className="feeding-match-container">
      <div className="feeding-label">
        <span>FEEDING MATCH</span>
        {error && <span className="error-badge">{error}</span>}
      </div>
      <div className="match-select-container">
        <select
          className="match-select"
          value={selectedMatchId}
          onChange={handleMatchChange}
        >
          {feedingMatches.map((match) => (
            <option key={match.id} value={match.id}>
              {match.sport}: {match.team1} vs {match.team2}
            </option>
          ))}
        </select>
      </div>
      {selectedMatch && (
        <div className="match-status">
          <span className="stage">{selectedMatch.stage}</span>
          <span className="separator">•</span>
          <span className="progress">{selectedMatch.progress}</span>
          <span className="score">{selectedMatch.score}</span>
        </div>
      )}
    </div>
  );
};

export default FeedingMatchComponent;
