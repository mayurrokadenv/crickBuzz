import NVianCommentary from "../components/Commentary/NVianCommentary";
import SearchBar from "../components/Search/SearchBar";
import Header from "../components/Header/Header";
import SportTabs from "../components/SportTabs/SportTabs";
import MatchGrid from "../components/MatchGrid/MatchGrid";
import { useState, useEffect, useCallback } from "react";
import type { Fixture } from "../components/types/Fixture";
import { mapFixtureToMatchCard } from "../components/MatchGrid/fixtureMatchCardMapper";
import TopPerformers from "../components/TopPerformers/TopPerformers";
import NVianLiveSummary from "../components/NVianLiveSummary/NVianLiveSummary";
import Loader from "../components/Loader/Loader";
import { useNVianDashboardSearch } from "../context/NVianDashboardSearchContext";
import { useFixtureFeed } from "../hooks/useFixtureFeed";
import type { Fixture as FeedFixture } from "../hooks/useFixtureFeed";
import {
  BADMINTON_LOCAL_FIXTURE_CHANGED_EVENT,
  getAllTemporaryBadmintonFixtureDetails,
  type StoredTemporaryBadmintonFixture,
} from "../services/temporaryBadmintonFixtureService";
import {
  BADMINTON_LOCAL_SCORE_CHANGED_EVENT,
  getTemporaryBadmintonScore,
} from "../services/temporaryBadmintonScoreService";
import { isLocalRacquetSport } from "../utils/localRacquetSports";
import "./Dashboard.css";

function getSetNumber(phase: string, fallback: number | undefined) {
  const normalizedPhase = phase.toLowerCase().replace(/[\s_-]/g, "");
  const phaseSetNumbers: Record<string, number> = {
    set1: 1,
    firstset: 1,
    set2: 2,
    secondset: 2,
    set3: 3,
    thirdset: 3,
  };
  const phaseSet = phaseSetNumbers[normalizedPhase];
  return phaseSet ?? (fallback && fallback >= 1 && fallback <= 3 ? fallback : 1);
}

function mapFeedFixture(fixture: FeedFixture): Fixture {
  return {
    id: fixture.id,
    homeTeamId: String(fixture.homeTeamId ?? ""),
    homeTeamName: String(fixture.homeTeamName ?? "Home team"),
    awayTeamId: String(fixture.awayTeamId ?? ""),
    awayTeamName: String(fixture.awayTeamName ?? "Away team"),
    sport: String(fixture.sport ?? "Cricket"),
    scheduledAtUtc: String(fixture.scheduledAtUtc ?? fixture.startTimeUtc ?? ""),
    status: String(fixture.status ?? "Scheduled"),
    homeScore: Number(fixture.homeScore ?? 0),
    homeWickets: Number(fixture.homeWickets ?? 0),
    homeOvers: String(fixture.homeOvers ?? "0.0"),
    awayOvers: String(fixture.awayOvers ?? "0.0"),
    awayScore: Number(fixture.awayScore ?? 0),
    awayWickets: Number(fixture.awayWickets ?? 0),
    sportId: String(fixture.sportId ?? ""),
  };
}

function NVianDashboard() {
  const { searchTerm, setSearchTerm, matches, loading } =
    useNVianDashboardSearch();
  const { createdFixtures } = useFixtureFeed();

  const [temporaryBadmintonFixtures, setTemporaryBadmintonFixtures] = useState<
    Fixture[]
  >([]);
  const [localFixtureError, setLocalFixtureError] = useState<string | null>(
    null,
  );
  const [selectedSportId, setSelectedSportId] = useState("all");
  const [selectedFixtureId, setSelectedFixtureId] = useState<string | null>(
    null,
  );
  const [showAllMatches, setShowAllMatches] = useState(false);

  const refreshTemporaryBadmintonFixtures = useCallback(() => {
    let localError: string | null = null;
    let savedFixtures: StoredTemporaryBadmintonFixture[];
    try {
      savedFixtures = getAllTemporaryBadmintonFixtureDetails();
    } catch (error: unknown) {
      console.error("Failed to load local racquet fixtures", error);
      setTemporaryBadmintonFixtures([]);
      setLocalFixtureError(
        error instanceof Error
          ? error.message
          : "Unable to load local racquet fixtures.",
      );
      return;
    }

    const fixtures = savedFixtures.flatMap(
      (savedFixture: StoredTemporaryBadmintonFixture) => {
        const { fixtureId, details } = savedFixture;
        const apiFixture = matches.find(
          (match) => match.id.toLowerCase() === fixtureId.toLowerCase(),
        );
        const sport = details.sport ?? apiFixture?.sport ?? "";
        const homeTeamName =
          details.homeTeamName ?? apiFixture?.homeTeamName ?? "";
        const awayTeamName =
          details.awayTeamName ?? apiFixture?.awayTeamName ?? "";

        if (!isLocalRacquetSport(sport) || !homeTeamName || !awayTeamName) {
          return [];
        }

        try {
          const localScore = getTemporaryBadmintonScore(fixtureId);
          const currentSet =
            localScore?.currentSet ??
            getSetNumber(details.phase, apiFixture?.currentSet);
          const sets =
            localScore?.sets ??
            apiFixture?.sets ??
            [1, 2, 3].map((setNumber) => ({
              setNumber,
              teamA:
                setNumber === currentSet ? apiFixture?.homeScore ?? 0 : 0,
              teamB:
                setNumber === currentSet ? apiFixture?.awayScore ?? 0 : 0,
            }));
          const activeSet = sets.find((set) => set.setNumber === currentSet);

          return [
            {
              id: fixtureId,
              homeTeamId: details.homeTeamId ?? apiFixture?.homeTeamId ?? "",
              homeTeamName,
              awayTeamId: details.awayTeamId ?? apiFixture?.awayTeamId ?? "",
              awayTeamName,
              sport,
              sportId: details.sportId ?? apiFixture?.sportId ?? "",
              status: details.status,
              scheduledAtUtc:
                details.scheduledAtUtc ?? apiFixture?.scheduledAtUtc ?? "",
              homeScore: activeSet?.teamA ?? 0,
              homeWickets: 0,
              homeOvers: apiFixture?.homeOvers ?? "0.0",
              awayScore: activeSet?.teamB ?? 0,
              awayWickets: 0,
              awayOvers: apiFixture?.awayOvers ?? "0.0",
              currentSet,
              sets,
            },
          ];
        } catch (error: unknown) {
          console.error("Failed to load local racquet dashboard data", error);
          localError =
            error instanceof Error
              ? error.message
              : "Unable to load local racquet match data.";
          return [];
        }
      },
    );

    setTemporaryBadmintonFixtures(fixtures);
    setLocalFixtureError(localError);
  }, [matches]);

  useEffect(() => {
    refreshTemporaryBadmintonFixtures();
    window.addEventListener(
      BADMINTON_LOCAL_FIXTURE_CHANGED_EVENT,
      refreshTemporaryBadmintonFixtures,
    );
    window.addEventListener(
      BADMINTON_LOCAL_SCORE_CHANGED_EVENT,
      refreshTemporaryBadmintonFixtures,
    );
    window.addEventListener("storage", refreshTemporaryBadmintonFixtures);

    return () => {
      window.removeEventListener(
        BADMINTON_LOCAL_FIXTURE_CHANGED_EVENT,
        refreshTemporaryBadmintonFixtures,
      );
      window.removeEventListener(
        BADMINTON_LOCAL_SCORE_CHANGED_EVENT,
        refreshTemporaryBadmintonFixtures,
      );
      window.removeEventListener("storage", refreshTemporaryBadmintonFixtures);
    };
  }, [refreshTemporaryBadmintonFixtures]);

  const sourceMatches = [
    ...matches,
    ...createdFixtures
      .filter(
        (createdFixture) =>
          !matches.some(
            (match) =>
              match.id.toLowerCase() === createdFixture.id.toLowerCase(),
          ),
      )
      .map(mapFeedFixture),
  ];

  const matchesById = new Map(
    sourceMatches.map((fixture) => [fixture.id.toLowerCase(), fixture]),
  );
  temporaryBadmintonFixtures.forEach((fixture) => {
    const key = fixture.id.toLowerCase();
    const existing = matchesById.get(key);
    matchesById.set(key, existing ? { ...existing, ...fixture } : fixture);
  });
  const liveMatches = Array.from(matchesById.values());

  const filteredMatches =
    selectedSportId === "all"
      ? liveMatches.filter((match) =>
          searchTerm.trim()
            ? `${match.sport} ${match.homeTeamName} ${match.awayTeamName}`
                .toLowerCase()
                .includes(searchTerm.trim().toLowerCase())
            : true,
        )
      : liveMatches.filter(
          (match) =>
            match.sportId === selectedSportId &&
            (!searchTerm.trim() ||
              `${match.sport} ${match.homeTeamName} ${match.awayTeamName}`
                .toLowerCase()
                .includes(searchTerm.trim().toLowerCase())),
        );

  const matchCards = filteredMatches.map(mapFixtureToMatchCard);
  const visibleMatchCards = showAllMatches
    ? matchCards
    : matchCards.slice(0, 8);

  const selectedFixture = matchCards.find((x) => x.id === selectedFixtureId);

  useEffect(() => {
    if (!matchCards.some((m) => m.id === selectedFixtureId)) {
      setSelectedFixtureId(matchCards.length > 0 ? matchCards[0].id : null);
    }
  }, [matchCards, selectedFixtureId]);

  useEffect(() => {
    setShowAllMatches(false);
  }, [selectedSportId, searchTerm]);

  return (
    <main className="container">
      <Header />
      <SearchBar setSearchTerm={setSearchTerm} />
      <SportTabs
        selectedSportId={selectedSportId}
        onSportChange={setSelectedSportId}
        showPointsTable
      />
      {localFixtureError && (
        <div className="nvian-local-fixture-error" role="alert">
          {localFixtureError}
        </div>
      )}
      {loading ? (
        <section className="dashboard-empty-state">
          <Loader label="Loading matches..." fullWidth />
        </section>
      ) : matchCards.length > 0 ? (
        <>
          <MatchGrid
            matches={visibleMatchCards}
            selectedFixtureId={selectedFixtureId}
            onMatchSelect={(match) => setSelectedFixtureId(match.id)}
          />
          {matchCards.length > 8 && (
            <button
              type="button"
              className="match-grid__toggle"
              onClick={() => setShowAllMatches((expanded) => !expanded)}
            >
              {showAllMatches
                ? "Show fewer matches"
                : `See more matches (${matchCards.length - 8})`}
            </button>
          )}
        </>
      ) : (
        <section className="dashboard-empty-state">
          {searchTerm.trim()
            ? "No matches found for your search."
            : "No live matches available."}
        </section>
      )}
      <NVianLiveSummary fixtureId={selectedFixture?.id} />
      <div className="Commentry_Performers">
        <NVianCommentary
          fixtureId={selectedFixture?.id}
          title={
            selectedFixture
              ? `${selectedFixture.team1Name} vs ${selectedFixture.team2Name}`
              : "NVian Commentary"
          }
        />
        <TopPerformers fixtureId={selectedFixture?.id ?? ""} />
      </div>
    </main>
  );
}

export default NVianDashboard;
