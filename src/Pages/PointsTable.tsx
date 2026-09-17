import Header from "../components/Header/Header";
import "./PointsTable.css";
import {
  getSeries as fetchSeries,
  getPointsTable,
  type Series,
} from "../services/SeriesService";
import { useEffect, useState } from "react";

interface PointsTableRow {
  teamId: string;
  teamName: string;
  played: number;
  won: number;
  lost: number;
  points: number;
}

function PointsTable() {
  const [seriesData, setSeriesData] = useState<Series[]>([]);
  const [loading, setLoading] = useState(true);
  const [tableLoading, setTableLoading] = useState(false);
  const [selectedSeriesId, setSelectedSeriesId] = useState("");
  const [pointsTableData, setPointsTableData] = useState<PointsTableRow[]>([]);

  useEffect(() => {
    loadSeries();
  }, []);

  useEffect(() => {
    if (selectedSeriesId) {
      pointsTable(selectedSeriesId);
    } else {
      setPointsTableData([]);
    }
  }, [selectedSeriesId]);

  const loadSeries = async () => {
    try {
      setLoading(true);
      const response = await fetchSeries();
      setSeriesData(response ?? []);
    } catch (error) {
      console.error("Error fetching series data:", error);
    } finally {
      setLoading(false);
    }
  };

  const pointsTable = async (seriesId: string) => {
    try {
      setTableLoading(true);
      const response = await getPointsTable(seriesId);
      const sortedData = (response ?? []).sort(
        (a: PointsTableRow, b: PointsTableRow) => b.points - a.points
      );
      setPointsTableData(sortedData);
    } catch (error) {
      console.error("Error fetching points table data:", error);
      setPointsTableData([]);
    } finally {
      setTableLoading(false);
    }
  };

  const handleSeriesChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedSeriesId(event.target.value);
  };

  const getInitials = (name: string) => {
    return name
      .trim()
      .split(" ")
      .map((w) => w[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();
  };

  const getRankClass = (index: number) => {
    if (index === 0) return "points-table__rank--gold";
    if (index === 1) return "points-table__rank--silver";
    if (index === 2) return "points-table__rank--bronze";
    return "";
  };

  return (
    <main className="points-table-page container">
      <Header />

      <div className="points-table-page__content">
        {/* Page Header */}
        <div className="points-table-page__header">
          <div>
            <p className="points-table-page__eyebrow">Points Table</p>
            <h1>Standings &amp; Rankings</h1>
            <p className="points-table-page__subtitle">
              Select a series to view team standings and match statistics.
            </p>
          </div>
        </div>

        {/* Series Selector */}
        {loading ? (
          <div className="points-table-page__select-skeleton" />
        ) : seriesData.length === 0 ? (
          <div className="points-table-page__empty-state">
            <div className="points-table-page__empty-icon">🏏</div>
            <p className="points-table-page__empty-title">No series found</p>
            <p className="points-table-page__empty-text">
              There are no series available at the moment. Please check back later.
            </p>
          </div>
        ) : (
          <div className="points-table-page__dropdown-wrapper">
            <label htmlFor="series-select" className="points-table-page__label">
              Choose Series
            </label>
            <div className="points-table-page__select-container">
              <select
                id="series-select"
                className="points-table-page__select"
                value={selectedSeriesId}
                onChange={handleSeriesChange}
              >
                <option value="">-- Select a series --</option>
                {seriesData.map((series) => (
                  <option key={series.id} value={series.id}>
                    {series.name}
                  </option>
                ))}
              </select>
              <span className="points-table-page__select-chevron">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M6 9l6 6 6-6"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </span>
            </div>
          </div>
        )}

        {/* Points Table */}
        {selectedSeriesId && (
          <div className="points-table-page__table-wrapper">
            {tableLoading ? (
              <div className="points-table-page__table-skeleton">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="points-table-page__skeleton-row" />
                ))}
              </div>
            ) : pointsTableData.length === 0 ? (
              <div className="points-table-page__empty-state points-table-page__empty-state--small">
                <div className="points-table-page__empty-icon">📊</div>
                <p className="points-table-page__empty-title">No data yet</p>
                <p className="points-table-page__empty-text">
                  Points table for this series is not available.
                </p>
              </div>
            ) : (
              <table className="points-table">
                <thead>
                  <tr>
                    <th className="points-table__th--center">#</th>
                    <th>Team</th>
                    <th className="points-table__th--center">P</th>
                    <th className="points-table__th--center">W</th>
                    <th className="points-table__th--center">L</th>
                    <th className="points-table__th--center">Pts</th>
                  </tr>
                </thead>
                <tbody>
                  {pointsTableData.map((team, index) => (
                    <tr key={team.teamId}>
                      <td className="points-table__td--center">
                        <span
                          className={`points-table__rank-badge ${getRankClass(
                            index
                          )}`}
                        >
                          {index + 1}
                        </span>
                      </td>
                      <td>
                        <div className="points-table__team">
                          <div className="points-table__team-avatar">
                            {getInitials(team.teamName)}
                          </div>
                          <span className="points-table__team-name">
                            {team.teamName.trim()}
                          </span>
                        </div>
                      </td>
                      <td className="points-table__td--center">{team.played}</td>
                      <td className="points-table__td--center points-table__td--won">
                        {team.won}
                      </td>
                      <td className="points-table__td--center points-table__td--lost">
                        {team.lost}
                      </td>
                      <td className="points-table__td--center">
                        <span className="points-table__points">
                          {team.points}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>
    </main>
  );
}

export default PointsTable;