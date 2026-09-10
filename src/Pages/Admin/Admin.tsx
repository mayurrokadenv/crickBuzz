import { useState } from "react";
import { Outlet, useNavigate, useLocation } from "react-router-dom";
import FeedingMatch from "../../components/FeedingMatch/FeedingMatch";
import Header from "../../components/Header/Header";
import AdminTabs from "../../components/AdminTabs/AdminTabs";
import type { FeedingMatchs as FeedingMatchType } from "../../services/match.types";
import "./Admin.css";

export type TabType = "commentary" | "teams" | "fixtures" | "series";

export interface AdminOutletContext {
    selectedMatch: FeedingMatchType | null;
    selectedFixtureId: string | null;
    setSelectedFixtureId: (id: string | null) => void;
    refreshTick: number;
    triggerRefresh: () => void;
    onScoreUpdated: (updatedMatch: FeedingMatchType) => void;
}

function pathToTab(pathname: string): TabType {
    if (pathname.startsWith("/admin/teams-players")) return "teams";
    if (pathname.startsWith("/admin/fixtures")) return "fixtures";
    if (pathname.startsWith("/admin/series")) return "series";
    return "commentary";
}

function Admin() {
    const location = useLocation();
    const navigate = useNavigate();
    const activeTab = pathToTab(location.pathname);

    const [selectedMatch, setSelectedMatch] = useState<FeedingMatchType | null>(null);
    const [selectedMatchId, setSelectedMatchId] = useState<number | null>(null);
    const [selectedFixtureId, setSelectedFixtureId] = useState<string | null>(null);
    const [refreshTick, setRefreshTick] = useState(0);
    const [feedingMatches, setFeedingMatches] = useState<FeedingMatchType[]>([]);

    const handleMatchSelect = (match: FeedingMatchType) => {
        console.log("Admin: Match selected:", match);
        setSelectedMatch(match);
        setSelectedMatchId(match.id);
    };

    const handleMatchesLoaded = (matches: FeedingMatchType[]) => {
        console.log("Admin: Matches loaded:", matches);
        setFeedingMatches(matches);
    };

    const handleScoreUpdated = (updatedMatch: FeedingMatchType) => {
        console.log("Admin: Score updated for match:", updatedMatch);
        // Update the match in the feeding matches list
        setFeedingMatches(prevMatches => {
            const updated = prevMatches.map(m => 
                m.id === updatedMatch.id ? updatedMatch : m
            );
            console.log("Admin: Updated feeding matches:", updated);
            return updated;
        });
        // Update the selected match
        setSelectedMatch(updatedMatch);
        // Trigger refresh to update commentary
        setRefreshTick(t => t + 1);
    };

    const handleTabChange = (tab: TabType) => {
        const path =
            tab === "commentary" ? "/admin/commentary" :
            tab === "teams" ? "/admin/teams-players" :
            tab === "series" ? "/admin/series" :
            "/admin/fixtures";
        navigate(path);
    };

    const context: AdminOutletContext = {
        selectedMatch,
        selectedFixtureId,
        setSelectedFixtureId,
        refreshTick,
        triggerRefresh: () => setRefreshTick((t) => t + 1),
        onScoreUpdated: handleScoreUpdated,
    };

    return (
        <main className="container">
            <Header />
            <br />
            <FeedingMatch 
                onMatchSelect={handleMatchSelect} 
                onMatchesLoaded={handleMatchesLoaded}
                matches={feedingMatches}
                selectedMatchId={selectedMatchId}
                onSelectedMatchIdChange={setSelectedMatchId}
            />

            <section className="admin-page">
                <AdminTabs activeTab={activeTab} onTabChange={handleTabChange} />
                <div className="admin-content">
                    <Outlet context={context} />
                </div>
            </section>
        </main>
    );
}

export default Admin;