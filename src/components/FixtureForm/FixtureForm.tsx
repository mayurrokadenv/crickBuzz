import { useEffect, useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import "./FixtureForm.css";

import { getTeams, type Team } from "../../services/TeamService";
import { sportService, type Sport } from "../../services/fixturesservice";
import { showError, showSuccess } from "../../services/common/AlertService";

interface Fixture {
    sport: string;
    home: string;
    away: string;
    scheduledAtUtc: string;
    totalOvers: string;
}

interface FixtureFormProps {
    onSaved: () => void;
}

function FixtureForm({ onSaved }: FixtureFormProps) {
    const [sports, setSports] = useState<Sport[]>([]);
    const [loading, setLoading] = useState(true);
    const [sportswiseteams, setTeams] = useState<Team[]>([]);

    const [fixture, setFixture] = useState<Fixture>({
        sport: "",
        home: "",
        away: "",
        scheduledAtUtc: "",
        totalOvers: "",
    });

    useEffect(() => {
        const loadSports = async () => {
            try {
                const data = await sportService.getSports();
                setSports(data);
                if (data.length > 0) {
                    setFixture((prev) => ({
                        ...prev,
                        sport: data[0].name,
                    }));
                }
            } catch (error) {
                showError("Error", "Failed to fetch sports:");
            } finally {
                setLoading(false);
            }
        };
        loadSports();
        loadTeams();
    }, []);

    const selectedSport = sports.find(
        (item) => item.name === fixture.sport
    );

    const filteredTeams = sportswiseteams.filter(
        (team) => team.sportId === selectedSport?.id
    );

    // Check if the selected sport is cricket (or any sport that needs overs)
    const isCricket = fixture.sport?.toLowerCase() === "cricket";

    const handleChange = (
        e: ChangeEvent<HTMLSelectElement | HTMLInputElement>
    ) => {
        const { name, value } = e.target;

        if (name === "sport") {
            setFixture({
                sport: value,
                home: "",
                away: "",
                scheduledAtUtc: "",
                totalOvers: "", // Reset overs when sport changes
            });
            return;
        }

        setFixture((prev) => ({
            ...prev,
            [name]: value,
        }));
    };

    const loadTeams = async (): Promise<Team[]> => {
        try {
            const data = await getTeams();
            setTeams(data);
            return data;
        } catch (err: any) {
            showError("Error", err);
            return [];
        }
    };

    const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();

        // Validate totalOvers only for cricket
        if (isCricket) {
            if (!fixture.totalOvers) {
                showError("Error", "Please enter total overs");
                return;
            }
            if (isNaN(Number(fixture.totalOvers)) || Number(fixture.totalOvers) <= 0) {
                showError("Error", "Please enter a valid number of overs (greater than 0)");
                return;
            }
        }

        const payload: any = {
            homeTeamId: fixture.home,
            awayTeamId: fixture.away,
            scheduledAtUtc: new Date(fixture.scheduledAtUtc).toISOString(),
        };

        // Only include totalOvers if it's cricket
        if (isCricket) {
            payload.totalOvers = fixture.totalOvers;
        }

        try {
            const response = await fetch("http://nvcricbuz.runasp.net/api/fixtures", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(payload),
            });

            if (!response.ok) {
                let errorMessage = "Failed to create fixture";
                try {
                    const error = await response.json();
                    errorMessage = error.detail || error.message || errorMessage;
                } catch (e) {
                    errorMessage = await response.text() || errorMessage;
                }
                showError("Error", errorMessage);
                return;
            }

            await showSuccess("Success", "Fixture scheduled successfully!");
            onSaved();
            setFixture({
                sport: sports.length > 0 ? sports[0].name : "",
                home: "",
                away: "",
                scheduledAtUtc: "",
                totalOvers: "",
            });
        } catch (error) {
            showError("Error", "Something went wrong.");
        }
    };

    return (
        <div className="card fixture-form">
            <h2>Create Fixture</h2>

            <p>
                Match two NVian teams against each other. Both must play the same sport.
            </p>

            <form onSubmit={handleSubmit}>
                <div className="form-group">
                    <label htmlFor="sport">Sport</label>
                    <select
                        id="sport"
                        name="sport"
                        value={fixture.sport}
                        onChange={handleChange}
                    >
                        {sports.map((sport) => (
                            <option key={sport.id} value={sport.name}>
                                {sport.name}
                            </option>
                        ))}
                    </select>
                </div>

                <div className="teams-row">
                    <div className="form-group">
                        <label htmlFor="home">Team A (Home)</label>
                        <select
                            id="home"
                            name="home"
                            value={fixture.home}
                            onChange={handleChange}
                        >
                            <option value="">Select Team A</option>
                            {filteredTeams
                                .filter(team => team.id !== fixture.away)
                                .map(team => (
                                    <option key={team.id} value={team.id}>
                                        {team.teamName}
                                    </option>
                                ))}
                        </select>
                    </div>

                    <div className="form-group">
                        <label htmlFor="away">Team B (Away)</label>
                        <select
                            id="away"
                            name="away"
                            value={fixture.away}
                            onChange={handleChange}
                        >
                            <option value="">Select Team B</option>
                            {filteredTeams
                                .filter(team => team.id !== fixture.home)
                                .map(team => (
                                    <option key={team.id} value={team.id}>
                                        {team.teamName}
                                    </option>
                                ))}
                        </select>
                    </div>
                </div>

                {/* Conditionally render overs field only for cricket */}
                {isCricket && (
                    <div className="form-group overs-field">
                        <label htmlFor="totalOvers">Total Overs</label>
                        <input
                            type="number"
                            id="totalOvers"
                            name="totalOvers"
                            value={fixture.totalOvers}
                            onChange={handleChange}
                            placeholder="Enter total overs"
                            min="1"
                            step="1"
                            required
                        />
                    </div>
                )}

                <div className="form-group">
                    <label htmlFor="scheduledAtUtc">Scheduled Date & Time</label>
                    <input
                        type="datetime-local"
                        id="scheduledAtUtc"
                        name="scheduledAtUtc"
                        value={fixture.scheduledAtUtc}
                        onChange={handleChange}
                        required
                    />
                </div>

                <button
                    type="submit"
                    className="submit-button"
                    disabled={
                        !fixture.home ||
                        !fixture.away ||
                        !fixture.scheduledAtUtc ||
                        (isCricket && !fixture.totalOvers)
                    }
                >
                    + Schedule Fixture
                </button>
            </form>
        </div>
    );
}

export default FixtureForm;