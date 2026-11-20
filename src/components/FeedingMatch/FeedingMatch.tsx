import React, { type ChangeEvent, useEffect, useMemo, useRef, useState } from "react";
import type { FeedingMatchs } from "../../services/match.types";
import { getLiveMatches } from "../../services/liveservice";
import useScoreUpdateFeed, { getScoreForFixture } from "../../hooks/useScoreUpdateFeed";
import Loader from "../Loader/Loader";
import {
  getAllTemporaryBadmintonFixtureDetails,
} from "../../services/temporaryBadmintonFixtureService";
import {
  BADMINTON_LOCAL_SCORE_CHANGED_EVENT,
  getTemporaryBadmintonScore,
} from "../../services/temporaryBadmintonScoreService";
import { isLocalRacquetSport } from "../../utils/localRacquetSports";
import "./FeedingMatch.css";

const FEEDING_MATCH_REFRESH_EVENT = "crickbuzz-live-feeds-refresh";

function getLocalRacquetScore(fixtureId: string) {
  const score = getTemporaryBadmintonScore(fixtureId);
  return score?.sets.map((set) => `${set.teamA}/${set.teamB}`).join(" - ") ?? null;
}

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
  const lastLoadedMatchesRef = useRef<FeedingMatchs[] | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  selectedMatchIdRef.current = selectedMatchId;

  const selectMatch = (match: FeedingMatchs) => {
    selectedMatchIdRef.current = match.id;
    setInternalSelectedMatchId(match.id);
    onSelectedMatchIdChange?.(match.id);
    onMatchSelect?.(match);
  };

  // Load matches on mount or when external matches change
  useEffect(() => {
    if (externalMatches && externalMatches.length > 0) {
      setFeedingMatches(externalMatches);
      // If selected match ID is not in the list, select the first one
      if (!externalMatches.some((m) => m.id === selectedMatchId)) {
        selectMatch(externalMatches[0]);
      }
      setLoading(false);
    } else if (externalMatches && externalMatches === lastLoadedMatchesRef.current) {
      setFeedingMatches(externalMatches);
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

  useEffect(() => {
    const handleLocalScoreChange = (event: Event) => {
      const fixtureId = (
        event as CustomEvent<{ fixtureId: string }>
      ).detail?.fixtureId;
      if (!fixtureId) return;

      try {
        const score =
          getLocalRacquetScore(fixtureId) ?? "0/0 - 0/0 - 0/0";
        setFeedingMatches((currentMatches) =>
          currentMatches.map((match) =>
            match.fixtureId === fixtureId ? { ...match, score } : match,
          ),
        );
      } catch (error: unknown) {
        console.error("Failed to load local racquet match score", error);
        setError(
          error instanceof Error
            ? error.message
            : "Unable to load local racquet match score.",
        );
      }
    };

    window.addEventListener(
      BADMINTON_LOCAL_SCORE_CHANGED_EVENT,
      handleLocalScoreChange,
    );
    return () => {
      window.removeEventListener(
        BADMINTON_LOCAL_SCORE_CHANGED_EVENT,
        handleLocalScoreChange,
      );
    };
  }, []);

  const fetchLiveMatches = async () => {
    try {
      setLoading(true);
      setError(null);
      const matches = await getLiveMatches();
      let savedFixtures: ReturnType<
        typeof getAllTemporaryBadmintonFixtureDetails
      > = [];
      try {
        savedFixtures = getAllTemporaryBadmintonFixtureDetails();
      } catch (error: unknown) {
        console.error("Failed to load local racquet fixtures", error);
        setError(
          error instanceof Error
            ? error.message
            : "Unable to load local racquet fixtures.",
        );
      }
      let localMatchId = -1;

      for (const savedFixture of savedFixtures) {
        const { fixtureId, details } = savedFixture;
        const existingIndex = matches.findIndex(
          (match) => match.fixtureId === fixtureId,
        );
        const existingMatch = existingIndex >= 0 ? matches[existingIndex] : null;
        const team1 = details.homeTeamName || existingMatch?.team1;
        const team2 = details.awayTeamName || existingMatch?.team2;
        const hasLocalMatchDetails =
          details.statusValue === 1 && team1 && team2;

        if (!existingMatch && !hasLocalMatchDetails) continue;

        let score = existingMatch?.score ?? "0/0 - 0/0 - 0/0";
        try {
          score = getLocalRacquetScore(fixtureId) ?? score;
        } catch (error: unknown) {
          console.error("Failed to load local racquet match score", error);
          setError(
            error instanceof Error
              ? error.message
              : "Unable to load local racquet match score.",
          );
          score = "Score unavailable";
        }

        const localMatch: FeedingMatchs = {
          id: existingMatch?.id ?? localMatchId--,
          fixtureId,
          sport: details.sport || existingMatch?.sport || "Badminton",
          team1: team1 ?? "",
          team2: team2 ?? "",
          score,
          stage: details.status,
          progress: details.phase,
        };

        if (existingIndex >= 0) {
          matches[existingIndex] = localMatch;
        } else {
          matches.push(localMatch);
        }
      }

      if (matches.length > 0) {
        console.log("FeedingMatch: Fetched matches:", matches);
        setFeedingMatches(matches);
        lastLoadedMatchesRef.current = matches;
        const selected = matches.find(
          (match) => match.id === selectedMatchIdRef.current,
        ) ?? matches[0];
        selectMatch(selected);
        onMatchesLoaded?.(matches);
      } else {
        setFeedingMatches([]);
        lastLoadedMatchesRef.current = matches;
        onMatchesLoaded?.(matches);
      }
    } catch (error) {
      console.error("FeedingMatch: Error fetching:", error);
      setError("Failed to load live matches.");
      const noMatches: FeedingMatchs[] = [];
      setFeedingMatches(noMatches);
      lastLoadedMatchesRef.current = noMatches;
      onMatchesLoaded?.(noMatches);
    } finally {
      setLoading(false);
    }
  };

  const selectedMatch = useMemo(() => {
    const match = feedingMatches.find((match) => match.id === selectedMatchId);
    return match ?? feedingMatches[0];
  }, [selectedMatchId, feedingMatches]);

  const { scoreByMatch } = useScoreUpdateFeed(selectedMatch?.fixtureId ?? "");
  console.log("FeedingMatch: Score updates in FeedingMatch:====================>", scoreByMatch);
  const isSelectedLocalRacquet = isLocalRacquetSport(selectedMatch?.sport);
  const realtime = selectedMatch?.fixtureId && !isSelectedLocalRacquet
    ? getScoreForFixture(scoreByMatch, selectedMatch.fixtureId)
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
      {feedingMatches.length > 0 ? (
        <div className="match-select-container">
          <select
            className="match-select"
            value={selectedMatchId}
            onChange={handleMatchChange}
          >
            {feedingMatches.map((match) => (
              <option key={match.id} value={match.id}>
                {match.sport}: {match.team1} vs {match.team2}
                {isLocalRacquetSport(match.sport) &&
                match.stage.toLowerCase() !== "live"
                  ? ` • ${match.stage}`
                  : ""}
              </option>
            ))}
          </select>
        </div>
      ) : (
        <div className="no-matches">No feeding match available</div>
      )}
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
