import { useState } from "react";
import FixtureList from "../../components/FixtureList/FixtureList";
import FixtureForm from "../../components/FixtureForm/FixtureForm";
import {
  NVIAN_DASHBOARD_REFRESH_EVENT,
  useNVianDashboardSearch,
} from "../../context/NVianDashboardSearchContext";

function Fixtures() {
    const [refreshKey, setRefreshKey] = useState(0);
    const { loadMatches } = useNVianDashboardSearch();

    const notifyLiveFeedRefresh = () => {
        window.dispatchEvent(new CustomEvent("crickbuzz-live-feeds-refresh"));
    };

    const handleFixtureSaved = async () => {
        setRefreshKey((prev) => prev + 1);
        notifyLiveFeedRefresh();
        window.dispatchEvent(new CustomEvent(NVIAN_DASHBOARD_REFRESH_EVENT));
        await loadMatches();
    };

    return (
        <div className="fixtures-layout">
            <FixtureForm onSaved={handleFixtureSaved} />
            <FixtureList refreshKey={refreshKey} />
        </div>
    );
}

export default Fixtures;