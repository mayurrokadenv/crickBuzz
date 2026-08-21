import { useEffect, useState } from "react";
import "../SportTabs/SportTabs.css";

interface Sport {
    id: string;
    name: string;
}

interface SportTabsProps {
    selectedSportId: string;
    onSportChange: (sportId: string) => void;
}

const SportTabs = ({
    selectedSportId,
    onSportChange,
}: SportTabsProps) => {
    const [sportsCategories, setSportsCategories] = useState<Sport[]>([]);

    useEffect(() => {
        loadSports();
    }, []);

    const loadSports = async () => {
        try {
            const response = await fetch("http://nvcricbuz.runasp.net/api/sports");

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
        </section>
    );
};

export default SportTabs;