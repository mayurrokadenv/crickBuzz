import { useEffect, useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import "./FixtureForm.css";

import { getTeams, type Team } from "../../services/TeamService";
import { fixtureService, sportService, type Sport } from "../../services/fixturesservice";
import { showError, showSuccess } from "../../services/common/AlertService";
import { getSeries as fetchSeries } from "../../services/SeriesService";
import { useFixtureFeed } from "../../hooks/useFixtureFeed";
import { useLocation } from "react-router-dom";
import { isLocalRacquetSport } from "../../utils/localRacquetSports";

// Define Series interface based on your API response
interface Series {
    id: string;
    name: string;
    sportId: string;
    sportName: string;
    teams: {
        teamId: string;
        teamName: string;
    }[];
}

interface Fixture {
    sport: string;
    seriesId: string; // Added seriesId
    home: string;
    away: string;
    scheduledAtUtc: string;
    totalOvers: string;
}

interface FixtureFormProps {
    onSaved: () => void;
}

function FixtureForm({ onSaved }: FixtureFormProps) {

    const location = useLocation();
    const { fixturesById, createdFixtures, updatedFixtures, connectionState } = useFixtureFeed();

    const [sports, setSports] = useState<Sport[]>([]);
    const [series, setSeries] = useState<Series[]>([]); // Added series state
    const [loading, setLoading] = useState(true);
    const [sportswiseteams, setTeams] = useState<Team[]>([]);

    const now = new Date();
    const minDateTime = now.toISOString().slice(0, 16); // "YYYY-MM-DDTHH:mm"

    console.log("FixtureForm: fixturesById:", fixturesById);
    console.log("FixtureForm: createdFixtures:", createdFixtures);
    console.log("FixtureForm: updatedFixtures:", updatedFixtures);
    console.log("FixtureForm: connectionState:", connectionState);

    const [fixture, setFixture] = useState<Fixture>({
        sport: "",
        seriesId: "", // Initialize seriesId
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
        getSeries();
    }, []);

    const getSeries = async (): Promise<Awaited<ReturnType<typeof fetchSeries>>> => {
        try {
            const data = await fetchSeries();
            setSeries(data); // Store series in state
            console.log("Fetched series:", data);
            return data;
        } catch (error) {
            console.error("Error fetching series:", error);
            return [];
        }
    };

    const selectedSport = sports.find(
        (item) => item.name === fixture.sport
    );

    // Filter series based on selected sport
    const filteredSeries = series.filter(s => s.sportId === selectedSport?.id);
    const selectedSeries = series.find((item) => item.id === fixture.seriesId);
    const isAddingNewSeriesTeam = Boolean(
        isLocalRacquetSport(selectedSeries?.sportName) &&
        selectedSeries &&
        [fixture.home, fixture.away].some(
            (teamId) =>
                teamId &&
                !selectedSeries.teams.some((team) => team.teamId === teamId),
        ),
    );

    useEffect(() => {
        const requestedSeriesId = new URLSearchParams(location.search).get("seriesId");
        if (!requestedSeriesId || !sports.length || !series.length) return;

        const requestedSeries = series.find((item) => item.id === requestedSeriesId);
        if (!requestedSeries) return;

        const sportName =
            sports.find((sport) => sport.id === requestedSeries.sportId)?.name ??
            requestedSeries.sportName;
        setFixture((current) => ({
            ...current,
            sport: sportName,
            seriesId: requestedSeries.id,
            home: "",
            away: "",
        }));
    }, [location.search, series, sports]);

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
                seriesId: "", // Reset series when sport changes
                home: "",
                away: "",
                scheduledAtUtc: "",
                totalOvers: "", // Reset overs when sport changes
            });
            return;
        }

        if (name === "seriesId") {
            setFixture((prev) => ({
                ...prev,
                seriesId: value,
                home: "", // Reset teams when series changes
                away: "",
            }));
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

        if (!fixture.home) {
            showError("Validation Error", "Please select the home team.");
            return;
        }

        if (!fixture.away) {
            showError("Validation Error", "Please select the away team.");
            return;
        }

        if (fixture.home === fixture.away) {
            showError("Validation Error", "Please select two different teams.");
            return;
        }

        if (!isAddingNewSeriesTeam && !fixture.scheduledAtUtc) {
            showError("Validation Error", "Please select a scheduled date and time.");
            return;
        }

        if (!isAddingNewSeriesTeam) {
            const scheduledDate = new Date(fixture.scheduledAtUtc);
            if (Number.isNaN(scheduledDate.getTime())) {
                showError("Validation Error", "Please select a valid scheduled date and time.");
                return;
            }

            if (scheduledDate < new Date()) {
                showError("Validation Error", "Scheduled date and time cannot be in the past.");
                return;
            }
        }

        // Validate total overs only for cricket.
        if (isCricket && !isAddingNewSeriesTeam) {
            if (!fixture.totalOvers.trim()) {
                showError("Validation Error", "Please enter total overs.");
                return;
            }

            if (!Number.isInteger(Number(fixture.totalOvers)) || Number(fixture.totalOvers) <= 0) {
                showError("Validation Error", "Please enter a valid whole number of overs greater than 0.");
                return;
            }
        }

        const payload = {
            homeTeamId: fixture.home,
            awayTeamId: fixture.away,
            scheduledAtUtc: isAddingNewSeriesTeam
                ? undefined
                : new Date(fixture.scheduledAtUtc).toISOString(),
            totalOvers: isCricket ? fixture.totalOvers : undefined,
            seriesId: fixture.seriesId || null, // Include seriesId, send null if "None" is selected
        };

        console.log("Payload before sending:", payload);

        try {
            const result = await fixtureService.createFixture(payload);
            await showSuccess(
                result.bracketRebuilt ? "Series schedule rebuilt" : "Success",
                result.bracketRebuilt
                    ? `${result.addedTeamCount} team${result.addedTeamCount === 1 ? "" : "s"} added. The bracket schedule was rebuilt.`
                    : "Fixture scheduled successfully!",
            );
            onSaved();
            setFixture({
                sport: sports.length > 0 ? sports[0].name : "",
                seriesId: "",
                home: "",
                away: "",
                scheduledAtUtc: "",
                totalOvers: "",
            });
        } catch (error: unknown) {
            console.error("Failed to create fixture locally", error);
            showError(
                "Error",
                error instanceof Error ? error.message : "Something went wrong.",
            );
        }
    };

    return (
        <div className="card fixture-form">
            <h2>Create Fixture</h2>

            <p>
                Match two NVian teams against each other. Both must play the same sport.
            </p>

            <form onSubmit={handleSubmit} noValidate>
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

                {/* New Series Dropdown */}
                <div className="form-group">
                    <label htmlFor="seriesId">Series</label>
                    <select
                        id="seriesId"
                        name="seriesId"
                        value={fixture.seriesId}
                        onChange={handleChange}
                    >
                        <option value="">None</option>
                        {filteredSeries.map((s) => (
                            <option key={s.id} value={s.id}>
                                {s.name}
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
                        min={minDateTime}
                    />
                </div>

                <button
                    type="submit"
                    className="submit-button"
                >
                    + Schedule Fixture
                </button>
            </form>
        </div>
    );
}

export default FixtureForm;