import React, { useState, useEffect } from "react";
import "./Series.css";
import { showError, showSuccess } from "../../services/common/AlertService";
import {
    createSeries,
    getSeries,
    deleteSeries,
    getSeriesSports,
    getSeriesTeams,
    type SeriesFormat,
} from "../../services/SeriesApi";

import type { TeamFormat } from "../../services/TeamService";
import Loader from "../../components/Loader/Loader";
import { useNavigate } from "react-router-dom";

interface Sport {
    id: string;
    name: string;
}

interface Team {
    id: string;
    teamName: string;
    sportId: string;
    format?: TeamFormat;
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
    startDate?: string;
    endDate?: string;
    venue?: string;
    format?: SeriesFormat;
    teams: SeriesTeam[];
}

const SERIES_FORMATS: SeriesFormat[] = ["Single", "Double", "Mixed Double"];

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
    const navigate = useNavigate();
    const [name, setName] = useState<string>("");
    const [sportId, setSportId] = useState<string>("");
    const [format, setFormat] = useState<SeriesFormat | "">("");
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");
    const [venue, setVenue] = useState("");
    const [selectedTeamIds, setSelectedTeamIds] = useState<string[]>([]);

    const [sports, setSports] = useState<Sport[]>([]);
    const [teams, setTeams] = useState<Team[]>([]);
    const [teamLoadFailed, setTeamLoadFailed] = useState(false);
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
            const data = await getSeriesSports();
            setSports(data);
        } catch (error) {
            console.error("Error fetching sports:", error);
            showError("Error", "Failed to fetch sports list.");
        }
    };

    const handleDeleteSeries = async (seriesId: string, seriesName: string) => {
        const confirmed = window.confirm(
            `Are you sure you want to delete the series "${seriesName}"?\n\nThis action cannot be undone.`
        );
        if (!confirmed) return;

        try {
            setIsLoading(true);
            await deleteSeries(seriesId);
            showSuccess("Success", "Series deleted successfully!");
            await loadSeries();
        } catch (error) {
            console.error("Error deleting series:", error);
            showError("Error", "Failed to delete series. Please try again.");
        } finally {
            setIsLoading(false);
        }
    };

    const loadTeams = async () => {
        try {
            const data = await getSeriesTeams();
            const uniqueTeams = deduplicateById<Team>(data, "id");
            setTeams(uniqueTeams);
        } catch (error) {
            console.error("Error fetching teams:", error);
            setTeamLoadFailed(true);
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

    const requiresFormat = ["badminton", "pickleball"].includes(
        sports.find((sport) => sport.id === sportId)?.name.toLowerCase() ?? ""
    );
    const filteredTeams = teams.filter(
        (team) =>
            team.sportId === sportId &&
            (!requiresFormat || (format !== "" && team.format === format))
    );

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
        if (!startDate || !endDate) {
            showError("Validation Error", "Start date and end date are required");
            return;
        }
        if (endDate < startDate) {
            showError("Validation Error", "End date cannot be before the start date");
            return;
        }
        if (!venue.trim()) {
            showError("Validation Error", "Venue is required");
            return;
        }
        const selectedFormat = SERIES_FORMATS.find((item) => item === format);
        if (requiresFormat && !selectedFormat) {
            showError("Validation Error", "Please select a format");
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
            startDate,
            endDate,
            venue: venue.trim(),
            format: requiresFormat ? selectedFormat : undefined,
        };

        setIsSubmitting(true);

        try {
            await createSeries(payload);
            showSuccess("Success", "Series created successfully!");

            setName("");
            setSportId("");
            setFormat("");
            setStartDate("");
            setEndDate("");
            setVenue("");
            setSelectedTeamIds([]);
            
            await loadSeries();

        } catch (error) {
            console.error("Error creating series:", error);
            showError(
                "Error",
                error instanceof Error ? error.message : "Failed to create series. Please try again."
            );
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
                            onChange={(e) => {
                                setSportId(e.target.value);
                                setFormat("");
                                setSelectedTeamIds([]);
                            }}
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

                    {requiresFormat && (
                        <div>
                            <label htmlFor="series-format">FORMAT *</label>
                            <select
                                id="series-format"
                                value={format}
                                onChange={(e) => {
                                    setFormat(
                                        SERIES_FORMATS.find((item) => item === e.target.value) ?? ""
                                    );
                                    setSelectedTeamIds([]);
                                }}
                                disabled={isSubmitting || isLoading}
                            >
                                <option value="">-- Select a Format --</option>
                                {SERIES_FORMATS.map((item) => (
                                    <option key={item} value={item}>
                                        {item}
                                    </option>
                                ))}
                            </select>
                        </div>
                    )}

                    <div>
                        <label htmlFor="series-start-date">START DATE *</label>
                        <input
                            id="series-start-date"
                            type="date"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                            required
                            disabled={isSubmitting || isLoading}
                        />
                    </div>

                    <div>
                        <label htmlFor="series-end-date">END DATE *</label>
                        <input
                            id="series-end-date"
                            type="date"
                            value={endDate}
                            min={startDate || undefined}
                            onChange={(e) => setEndDate(e.target.value)}
                            required
                            disabled={isSubmitting || isLoading}
                        />
                    </div>

                    <div>
                        <label htmlFor="series-venue">VENUE *</label>
                        <input
                            id="series-venue"
                            type="text"
                            value={venue}
                            onChange={(e) => setVenue(e.target.value)}
                            placeholder="Enter venue"
                            required
                            disabled={isSubmitting || isLoading}
                        />
                    </div>

                    <div>
                        <label>SELECT TEAMS * (Minimum 2)</label>
                        <div className="teams-row">
                            {filteredTeams.length === 0 && (
                                <span role="status">
                                    {isLoading ? "Loading teams…"
                                        : teamLoadFailed ? "Could not load teams from the API."
                                        : !sportId ? "Choose a sport to see its teams."
                                        : requiresFormat && !format ? "Choose a format to see eligible teams."
                                        : requiresFormat ? `No teams are registered for ${format} in this sport.`
                                        : "No teams are registered for this sport."}
                                </span>
                            )}
                            {filteredTeams.map((team) => {
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
                        {isSubmitting ? (
                            <Loader label="Creating Series..." size="small" />
                        ) : (
                            "+ Create Series"
                        )}
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

                                    <button
                                        type="button"
                                        className="series-card__game"
                                        onClick={() => navigate(`/admin/series/${encodeURIComponent(series.id)}`)}
                                    >
                                        View Details
                                    </button>

                                    <button
                                        type="button"
                                        className="series-card__delete"
                                        onClick={() => handleDeleteSeries(series.id, series.name)}
                                        title={`Delete "${series.name}"`}
                                        aria-label={`Delete series ${series.name}`}
                                        disabled={isLoading}
                                    >
                                        ✕
                                    </button>
                                    
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
