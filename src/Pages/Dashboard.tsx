import Header from "../components/Header/Header";
import SportTabs from "../components/SportTabs/SportTabs";
import MatchGrid from "../components/MatchGrid/MatchGrid";
import TopPerformers from "../components/TopPerformers/TopPerformers";
import LiveCommentary from "../components/Commentary/LiveCommentary";
import SearchBar from "../components/Search/SearchBar";
import {useState,useEffect} from "react";
import { getCurrentMatches, searchCurrentMatches } from "../services/MatchDataService";
import RecentEntries from "../components/RecentEntries/RecentEntries";
import LiveStatDetails from "../components/LiveStatDetails/LiveStatDetails";
import "./Dashboard.css";

import type { CricbuzzMatchItem } from "../components/types/Matches";
import { useCommentaryFeed } from "../hooks/useCommentaryFeed";
import { mapCricbuzzMatchToCard } from "../components/MatchGrid/cricbuzzMatchCardMapper";
import { useDashboardSearch } from "../context/DashboardSearchContext";

function Dashboard() {
    const {
        searchTerm,
        setSearchTerm,
        matches,
        loading,
    } = useDashboardSearch();

    const [selectedSportId, setSelectedSportId] = useState("all");

    const { commentaryByMatch } = useCommentaryFeed(
        "5A89597A-817B-4B38-B22C-75DCDA108BE8"
    );
    const [selectedFixtureId, setSelectedFixtureId] =useState<string | null>(null);

const matchCards = matches.map(mapCricbuzzMatchToCard);
 const selectedFixture = matchCards.find(x => x.id === selectedFixtureId);

 useEffect(() => {
  if (!selectedFixtureId && matchCards.length > 0) {
    setSelectedFixtureId(matchCards[0].id);
  }
  
}, [matchCards, selectedFixtureId]);




    return (

        <main className="container">

            <Header />

            <SearchBar
                setSearchTerm={setSearchTerm}
            />

            <SportTabs
                selectedSportId={selectedSportId}
                onSportChange={setSelectedSportId}
            />

            {loading ? (
              <section className="dashboard-empty-state">
                Loading...
              </section>
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
                  : "No matches available."}
              </section>
            )}
            <div className="Commentry_Performers">
              <LiveCommentary
                    matchId={selectedFixture?.id}
                />
            </div>


        </main>

    );

}

export default Dashboard;