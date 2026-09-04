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
import { useNVianDashboardSearch } from "../context/NVianDashboardSearchContext";
import "./Dashboard.css";

function NVianDashboard() {
  const { searchTerm, setSearchTerm, matches, loading } =
    useNVianDashboardSearch();

  const [selectedSportId, setSelectedSportId] = useState("all");
  const [selectedFixtureId, setSelectedFixtureId] = useState<string | null>(
    null,
  );

  const filteredMatches =
    selectedSportId === "all"
      ? matches
      : matches.filter((m) => m.sportId === selectedSportId);

  const matchCards = filteredMatches.map(mapFixtureToMatchCard);

  const selectedFixture = matchCards.find((x) => x.id === selectedFixtureId);

  useEffect(() => {
    if (!matchCards.some((m) => m.id === selectedFixtureId)) {
      setSelectedFixtureId(matchCards.length > 0 ? matchCards[0].id : null);
    }
  }, [matchCards, selectedFixtureId]);

  return (
    <main className="container">
      <Header />
      <SearchBar setSearchTerm={setSearchTerm} />
      <SportTabs
        selectedSportId={selectedSportId}
        onSportChange={setSelectedSportId}
      />
      {loading ? (
        <section className="dashboard-empty-state">Loading...</section>
      ) : matchCards.length > 0 ? (
        <MatchGrid
          matches={matchCards}
          selectedFixtureId={selectedFixtureId}
          onMatchSelect={(match) => setSelectedFixtureId(match.id)}
        />
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
