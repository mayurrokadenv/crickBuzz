import React, { useState, useEffect } from "react";
import "./Series.css";
import { showError, showSuccess } from "../../services/common/AlertService";
import { createSeries, getSeries } from "../../services/SeriesService";
import { sportService } from "../../services/fixturesservice";
import { getTeams } from "../../services/TeamService";
import Loader from "../../components/Loader/Loader";

interface Sport {
    id: string;
    name: string;
}

interface Team {
    id: string;
    teamName: string;
}

interface SeriesTeam {
    teamId: string;
    teamName: string;
}

interface SeriesData {
    id: string;
    name: string;
    sportId: string;
    sportName: string;
    teams: SeriesTeam[];
}

function deduplicateById<T>(array: T[], key: keyof T): T[] {
    if (!array) return [];
    const seen = new Set();
    return array.filter((item) => {
        const value = item[key];
        if (seen.has(value)) return false;
        seen.add(value);
        return true;
    });
}

function Series() {
    const [name, setName] = useState<string>("");
    const [sportId, setSportId] = useState<string>("");
    const [selectedTeamIds, setSelectedTeamIds] = useState<string[]>([]);

    const [sports, setSports] = useState<Sport[]>([]);
    const [teams, setTeams] = useState<Team[]>([]);
    const [seriesList, setSeriesList] = useState<SeriesData[]>([]);
    
    const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
    const [isLoading, setIsLoading] = useState<boolean>(true);

    useEffect(() => {
        const fetchInitialData = async () => {
            setIsLoading(true);
            await Promise.all([
                loadSports(),
                loadTeams(),
                loadSeries()
            ]);
            setIsLoading(false);
        };

        fetchInitialData();
    }, []);

    const loadSports = async () => {
        try {
            const data = await sportService.getSports();
            setSports(data);
        } catch (error) {
            console.error("Error fetching sports:", error);
            showError("Error", "Failed to fetch sports list.");
        }
    };

    const loadTeams = async () => {
        try {
            const data = await getTeams();
            const uniqueTeams = deduplicateById<Team>(data, "id");
            setTeams(uniqueTeams);
        } catch (error) {
            console.error("Error fetching teams:", error);
            showError("Error", "Failed to fetch teams list.");
        }
    };

    const loadSeries = async () => {
        try {
            const data = await getSeries();
            setSeriesList(data);
        } catch (error) {
            console.error("Error loading series:", error);
            showError("Error", "Failed to load series.");
        }
    };

    const handleTeamToggle = (teamId: string) => {
        setSelectedTeamIds((prev) =>
            prev.includes(teamId)
                ? prev.filter((id) => id !== teamId)
                : [...prev, teamId]
        );
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (isSubmitting) return;

        if (!name.trim()) {
            showError("Validation Error", "Series name is required");
            return;
        }
        if (!sportId) {
            showError("Validation Error", "Please select a sport");
            return;
        }
        if (selectedTeamIds.length < 2) {
            showError("Validation Error", "Please select at least 2 teams for a series");
            return;
        }

        const uniqueTeamIds = Array.from(new Set(selectedTeamIds));

        const payload = {
            name: name.trim(),
            sportId,
            teamIds: uniqueTeamIds,
        };

        setIsSubmitting(true);

        try {
            await createSeries(payload);
            showSuccess("Success", "Series created successfully!");

            setName("");
            setSportId("");
            setSelectedTeamIds([]);
            
            await loadSeries();

        } catch (error) {
            console.error("Error creating series:", error);
            showError("Error", "Failed to create series. Please try again.");
        } finally {
            setIsSubmitting(false);
        }
    };


    return (
        <div className="fixture-form1">

            <div className="left-side">
                <form onSubmit={handleSubmit}>
                    <div>
                        <h2>Create Series</h2>
                        <p>Create a new tournament series by selecting a sport and adding teams.</p>
                        
                        <label>SERIES NAME *</label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="e.g. World Cup 2026"
                            disabled={isSubmitting || isLoading}
                        />
                    </div>

                    <div>
                        <label>SPORT *</label>
                        <select
                            value={sportId}
                            onChange={(e) => setSportId(e.target.value)}
                            disabled={isSubmitting || isLoading}
                        >
                            <option value="">-- Select a Sport --</option>
                            {sports.map((sport) => (
                                <option key={sport.id} value={sport.id}>
                                    {sport.name}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label>SELECT TEAMS * (Minimum 2)</label>
                        <div className="teams-row">
                            {teams.map((team) => {
                                const isSelected = selectedTeamIds.includes(team.id);
                                return (
                                    <button
                                        key={team.id}
                                        type="button"
                                        onClick={() => handleTeamToggle(team.id)}
                                        className={`team-toggle-btn ${isSelected ? "active" : ""}`}
                                        disabled={isSubmitting || isLoading}
                                    >
                                        {team.teamName}
                                        {isSelected && <span>✓</span>}
                                    </button>
                                );
                            })}
                        </div>
                        <span style={{ color: "#888", fontSize: "12px", display: "block", marginTop: "8px", textAlign: "right" }}>
                            {selectedTeamIds.length} team(s) selected
                        </span>
                    </div>

                    <button
                        type="submit"
                        className="submit-btn"
                        disabled={isSubmitting || isLoading}
                    >
                        {isSubmitting ? "Creating Series..." : "+ Create Series"}
                    </button>
                </form>
            </div>

            <div className="right-side">
                <h2>Series List</h2>
                <div className="series-list">
                    {isLoading ? (
                        <Loader label="Loading series..." fullWidth />
                    ) : seriesList.length === 0 ? (
                        <div className="empty-state">No series created yet.</div>
                    ) : (
                        seriesList.map((series) => {

                            const uniqueSeriesTeams = deduplicateById<SeriesTeam>(series.teams || [], "teamId");
                            
                            return (
                                <div key={series.id} className="series-card">
                                    <div className="series-card__left">
                                        <span className="sport-badge">
                                            {series.sportName}
                                        </span>

                                        <div className="series-card__info">
                                            <h3 className="series-card__title">
                                                {series.name}
                                            </h3>
                                            <div className="series-card__meta">
                                                {uniqueSeriesTeams.map((t, index) => (
                                                    <React.Fragment key={t.teamId}>
                                                        <span>{t.teamName.trim()}</span>
                                                        {index < uniqueSeriesTeams.length - 1 && (
                                                            <span className="separator">•</span>
                                                        )}
                                                    </React.Fragment>
                                                ))}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="series-card__score">
                                        {uniqueSeriesTeams.length} Teams
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            </div>
        </div>
    );
}

export default Series;