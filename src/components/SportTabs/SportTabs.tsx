import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "../SportTabs/SportTabs.css";

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
            const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || "/api"}/sports`);

            if (!response.ok) {
                throw new Error("Unable to fetch sports.");
            }

            const data: Sport[] = await response.json();

            setSportsCategories([
                {
                    id: "all",
                    name: "All Sports",
                },
                ...data,
            ]);
        } catch (error) {
            console.error("Error loading sports:", error);
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