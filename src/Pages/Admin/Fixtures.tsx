import { useState } from "react";
import FixtureList from "../../components/FixtureList/FixtureList";
import FixtureForm from "../../components/FixtureForm/FixtureForm";
import { useNVianDashboardSearch } from "../../context/NVianDashboardSearchContext";

function Fixtures() {
    const [refreshKey, setRefreshKey] = useState(0);
    const { loadMatches } = useNVianDashboardSearch();

    const handleFixtureSaved = async () => {
        setRefreshKey((prev) => prev + 1);
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