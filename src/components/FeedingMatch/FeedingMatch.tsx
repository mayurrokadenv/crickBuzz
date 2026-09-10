import React, { type ChangeEvent, useEffect, useMemo, useRef, useState } from "react";
import type { FeedingMatchs } from "../../services/match.types";
import { getLiveMatches } from "../../services/liveservice";
import useScoreUpdateFeed from "../../hooks/useScoreUpdateFeed";
import Loader from "../Loader/Loader";
import "./FeedingMatch.css";

const FEEDING_MATCH_REFRESH_EVENT = "crickbuzz-live-feeds-refresh";

interface FeedingMatchProps {
  onMatchSelect?: (match: FeedingMatchs) => void;
  onMatchesLoaded?: (matches: FeedingMatchs[]) => void;
  matches?: FeedingMatchs[];
  selectedMatchId?: number | null;
  onSelectedMatchIdChange?: (matchId: number) => void;
}

const FeedingMatchComponent = ({
  onMatchSelect,
  onMatchesLoaded,
  matches: externalMatches,
  selectedMatchId: selectedMatchIdProp,
  onSelectedMatchIdChange,
}: FeedingMatchProps) => {
  const [feedingMatches, setFeedingMatches] = useState<FeedingMatchs[]>([]);
  const [internalSelectedMatchId, setInternalSelectedMatchId] = useState<number>(0);
  const selectedMatchId = selectedMatchIdProp ?? internalSelectedMatchId;
  const selectedMatchIdRef = useRef(selectedMatchId);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  selectedMatchIdRef.current = selectedMatchId;

  const selectMatch = (match: FeedingMatchs) => {
    selectedMatchIdRef.current = match.id;
    setInternalSelectedMatchId(match.id);
    onSelectedMatchIdChange?.(match.id);
    onMatchSelect?.(match);
  };

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
        selectMatch(externalMatches[0]);
      }
      setLoading(false);
    } else {
      fetchLiveMatches();
    }
  }, [externalMatches]); // Re-run when externalMatches changes

  useEffect(() => {
    const handleRefresh = () => {
      fetchLiveMatches();
    };

    window.addEventListener(FEEDING_MATCH_REFRESH_EVENT, handleRefresh);

    return () => {
      window.removeEventListener(FEEDING_MATCH_REFRESH_EVENT, handleRefresh);
    };
  }, []);

  const fetchLiveMatches = async () => {
    try {
      setLoading(true);
      setError(null);
      const matches = await getLiveMatches();
      if (matches.length > 0) {
        console.log("FeedingMatch: Fetched matches:", matches);
        setFeedingMatches(matches);
        const selected = matches.find(
          (match) => match.id === selectedMatchIdRef.current,
        ) ?? matches[0];
        selectMatch(selected);
        onMatchesLoaded?.(matches);
      } else {
        console.log("FeedingMatch: Using fallback matches");
        setFeedingMatches(fallbackMatches);
        selectMatch(fallbackMatches[0]);
        onMatchesLoaded?.(fallbackMatches);
      }
    } catch (error) {
      console.error("FeedingMatch: Error fetching:", error);
      setError("Failed to load live matches. Showing demo data.");
      setFeedingMatches(fallbackMatches);
      selectMatch(fallbackMatches[0]);
      onMatchesLoaded?.(fallbackMatches);
    } finally {
      setLoading(false);
    }
  };

  const selectedMatch: FeedingMatchs = useMemo(() => {
    const match = feedingMatches.find((match) => match.id === selectedMatchId);
    return match ?? feedingMatches[0];
  }, [selectedMatchId, feedingMatches]);

  const { scoreByMatch } = useScoreUpdateFeed(selectedMatch?.fixtureId ?? "");
  console.log("FeedingMatch: Score updates in FeedingMatch:====================>", scoreByMatch);
  const realtime = selectedMatch?.fixtureId
    ? scoreByMatch[selectedMatch.fixtureId]
    : undefined;


    console.log("FeedingMatch: Realtime score for fixtureId in FeedingMatch==============>", selectedMatch?.fixtureId, ":", realtime);
  const displayedMatch =
    realtime && selectedMatch
      ? {
          ...selectedMatch,
          score: `${realtime.homeScore}/${realtime.homeWickets ?? 0} (${realtime.homeOvers ?? selectedMatch.homeOvers ?? "0.0"})`,
          homeOvers: realtime.homeOvers ?? selectedMatch.homeOvers,
          awayOvers: realtime.awayOvers ?? selectedMatch.awayOvers,
        }
      : selectedMatch;

  const handleMatchChange = (e: ChangeEvent<HTMLSelectElement>) => {
    const newId = Number(e.target.value);
    console.log("FeedingMatch: Match changed to ID:", newId);
    const match = feedingMatches.find((m) => m.id === newId);
    if (match) {
      selectMatch(match);
    }
  };

  if (loading) {
    return (
      <div className="feeding-match-container">
        <Loader label="Loading live matches..." />
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
      {displayedMatch && (
        <div className="match-status">
          <span className="stage">{displayedMatch.stage}</span>
          <span className="separator">•</span>
          <span className="progress">{displayedMatch.progress}</span>
          <span className="score">{displayedMatch.score}</span>
        </div>
      )}
    </div>
  );
};

export default FeedingMatchComponent;
