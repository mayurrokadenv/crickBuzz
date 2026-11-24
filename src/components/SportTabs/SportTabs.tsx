import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "../SportTabs/SportTabs.css";
import { getSports } from "../../services/SportService";

interface Sport {
    id: string;
    name: string;
}

interface SportTabsProps {
    selectedSportId: string;
    onSportChange: (sportId: string) => void;
    showPointsTable?: boolean;
}

const SportTabs = ({
    selectedSportId,
    onSportChange,
    showPointsTable = false,
}: SportTabsProps) => {
    const [sportsCategories, setSportsCategories] = useState<Sport[]>([]);
    const navigate = useNavigate();

    useEffect(() => {
        loadSports();
    }, []);

    const loadSports = async () => {
        try {
            const data = await getSports();

            setSportsCategories([
                {
                    id: "all",
                    name: "All Sports",
                },
                ...data,
            ]);
        } catch (error) {
            console.error("Error loading local sports:", error);
        }
    };

    return (
        <>
        <section className="sports-tabs">
            {sportsCategories.map((sport) => (
                <button
                    key={sport.id}
                    className={`sports-tabs__button ${selectedSportId === sport.id ? "active" : ""
                        }`}
                    onClick={() => onSportChange(sport.id)}
                >
                    {sport.name}
                </button>
            ))}

            {showPointsTable && (
                <button
                    type="button"
                    className="sports-tabs__points-table"
                    onClick={() => navigate("/points-table")}
                >
                    Points Table
                </button>
            )}
        </section>

        
        </>
    );
};

export default SportTabs;