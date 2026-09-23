import NVianCommentary from "../components/Commentary/NVianCommentary";
import SearchBar from "../components/Search/SearchBar";
import Header from "../components/Header/Header";
import SportTabs from "../components/SportTabs/SportTabs";
import MatchGrid from "../components/MatchGrid/MatchGrid";
import { useState, useEffect } from "react";
import type { Fixture } from "../components/types/Fixture";
import { mapFixtureToMatchCard } from "../components/MatchGrid/fixtureMatchCardMapper";
import {
  getLiveFixtures,
  searchLiveFixtures,
} from "../services/MatchDataService";
import TopPerformers from "../components/TopPerformers/TopPerformers";
import NVianLiveSummary from "../components/NVianLiveSummary/NVianLiveSummary";
import Loader from "../components/Loader/Loader";
import { useNVianDashboardSearch } from "../context/NVianDashboardSearchContext";
import { useFixtureFeed } from "../hooks/useFixtureFeed";
import type { Fixture as SignalRFixture } from "../hooks/useFixtureFeed";
import "./Dashboard.css";

function mapSignalRFixture(fixture: SignalRFixture): Fixture {
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

  const [selectedSportId, setSelectedSportId] = useState("all");
  const [selectedFixtureId, setSelectedFixtureId] = useState<string | null>(
    null,
  );
  const [showAllMatches, setShowAllMatches] = useState(false);

  const liveMatches = [
    ...matches,
    ...createdFixtures
      .filter(
        (createdFixture) =>
          !matches.some(
            (match) =>
              match.id.toLowerCase() === createdFixture.id.toLowerCase(),
          ),
      )
      .map(mapSignalRFixture),
  ];

  const filteredMatches =
    selectedSportId === "all"
      ? liveMatches
      : liveMatches.filter((m) => m.sportId === selectedSportId);

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
