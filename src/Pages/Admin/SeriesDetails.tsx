import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  getSeriesDetails,
  type SeriesDetails as SeriesDetailsData,
} from "../../services/SeriesApi";

import {
  getRacquetRoundMatchCount,
  isLocalRacquetSport,
} from "../../utils/localRacquetSports";
import Loader from "../../components/Loader/Loader";
import "./SeriesDetails.css";

type FixtureRecord = SeriesDetailsData["fixtures"][number];
type StatusFilter = "All" | "Scheduled" | "Completed";

interface FixtureRound {
  key: string;
  date: string;
  name?: string;
  fixtures: FixtureRecord[];
  byeTeamNames?: string[];
  tbdMatches?: number;
}

function isStatus(fixture: FixtureRecord, status: StatusFilter) {
  return status === "All" || fixture.status.toLowerCase() === status.toLowerCase();
}

function getStatusClass(status: string) {
  return status.toLowerCase().replace(/[\s_-]+/g, "-");
}

function getFixtureWinner(fixture: FixtureRecord) {
  const winnerId =
    fixture.winningTeamId ??
    (fixture.homeScore > fixture.awayScore
      ? fixture.homeTeamId
      : fixture.awayScore > fixture.homeScore
        ? fixture.awayTeamId
        : null);

  if (winnerId === fixture.homeTeamId) return fixture.homeTeamName;
  if (winnerId === fixture.awayTeamId) return fixture.awayTeamName;
  return null;
}

function getFixtureScore(fixture: FixtureRecord, side: "home" | "away") {
  const score = side === "home" ? fixture.homeScore : fixture.awayScore;
  if (fixture.sport.toLowerCase() === "cricket") {
    const wickets = side === "home" ? fixture.homeWickets : fixture.awayWickets;
    return `${score}/${wickets}`;
  }
  return String(score);
}

function formatDate(date: string) {
  const timestamp = Date.parse(date);
  return Number.isNaN(timestamp)
    ? date
    : new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(timestamp);
}

function groupFixturesByDate(fixtures: FixtureRecord[]): FixtureRound[] {
  const rounds = new Map<string, FixtureRecord[]>();
  fixtures.forEach((fixture) => {
    const timestamp = Date.parse(fixture.scheduledAtUtc);
    const date = Number.isNaN(timestamp)
      ? "unscheduled"
      : new Date(timestamp).toISOString().slice(0, 10);
    rounds.set(date, [...(rounds.get(date) ?? []), fixture]);
  });
  return Array.from(rounds, ([date, roundFixtures]) => ({
    key: date,
    date,
    fixtures: roundFixtures,
  }));
}

function getRoundName(
  round: FixtureRound,
  index: number,
  rounds: FixtureRound[],
  teamCount: number,
) {
  const isLastRound = index === rounds.length - 1;
  if (isLastRound && rounds.length > 1 && round.fixtures.length === 1) {
    return "Final";
  }
  if (
    index === 0 &&
    rounds.length > 1 &&
    teamCount === 3 &&
    round.fixtures.length === 1
  ) {
    return "Semi-final";
  }
  if (round.fixtures.length === 2 && isLastRound && rounds.length > 1) {
    return "Semi-finals";
  }
  return `Round ${index + 1}`;
}

function getPlannedRoundName(teamCount: number, isInitialRound: boolean) {
  if (teamCount === 2) return "Final";
  if (isInitialRound) return "Round 1";
  if (teamCount === 3) return "Semi-final";
  if (teamCount === 4) return "Semi-finals";
  if (teamCount === 8) return "Quarter-finals";
  return `Round of ${teamCount}`;
}

function SeriesDetails() {
  const { seriesId = "" } = useParams();
  const navigate = useNavigate();
  const [details, setDetails] = useState<SeriesDetailsData | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("All");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    const loadDetails = async () => {
      try {
        const data = await getSeriesDetails(seriesId);
        if (active) {
          setDetails(data);
          setError("");
        }
      } catch (loadError) {
        if (active) {
          setDetails(null);
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Unable to load series details.",
          );
        }
      } finally {
        if (active) setIsLoading(false);
      }
    };

    setIsLoading(true);
    void loadDetails();
    window.addEventListener("focus", loadDetails);

    return () => {
      active = false;
      window.removeEventListener("focus", loadDetails);

    };
  }, [seriesId]);

  const filteredFixtures = useMemo(
    () => details?.fixtures.filter((fixture) => isStatus(fixture, statusFilter)) ?? [],
    [details, statusFilter],
  );
  const rounds = useMemo(
    () => {
      if (!details?.series.bracket) return groupFixturesByDate(filteredFixtures);

      const fixtureById = new Map(
        details.fixtures.map((fixture) => [fixture.id, fixture]),
      );
      let nextRoundParticipantCount = details.series.teams.length;
      const bracketRounds = Array.from(
        { length: details.series.bracket.totalRounds },
        (_, index) => {
          const roundNumber = index + 1;
          const participantCount = nextRoundParticipantCount;
          const matchCount = isLocalRacquetSport(details.series.sportName)
            ? getRacquetRoundMatchCount(participantCount)
            : Math.floor(participantCount / 2);
          const round = details.series.bracket?.rounds.find(
            (item) => item.roundNumber === roundNumber,
          );
          const previousRound = details.series.bracket?.rounds.find(
            (item) => item.roundNumber === roundNumber - 1,
          );
          const previousAdvancingCount = previousRound
            ? previousRound.fixtureIds.length + previousRound.byeTeamIds.length
            : 0;
          const byeTeamIds =
            round?.byeTeamIds ??
            (!round &&
            previousAdvancingCount % 2 === 1 &&
            previousRound?.byeTeamIds.length
              ? previousRound.byeTeamIds.slice(-1)
              : []);
          nextRoundParticipantCount = round
            ? round.fixtureIds.length + round.byeTeamIds.length
            : participantCount - matchCount;
          const roundFixtures = (round?.fixtureIds ?? [])
            .map((id) => fixtureById.get(id))
            .filter(
              (fixture): fixture is FixtureRecord =>
                fixture !== undefined && isStatus(fixture, statusFilter),
            );
          const firstFixture = (round?.fixtureIds ?? [])
            .map((id) => fixtureById.get(id))
            .find((fixture) => fixture !== undefined);
          const timestamp = firstFixture
            ? Date.parse(firstFixture.scheduledAtUtc)
            : Number.NaN;
          return {
            key: `round-${roundNumber}`,
            date: firstFixture
              ? Number.isNaN(timestamp)
                ? "unscheduled"
                : new Date(timestamp).toISOString().slice(0, 10)
              : "TBD",
            name:
              (roundNumber === 1 && details.series.teams.length > 2
                ? "Round 1"
                : round?.name) ??
              getPlannedRoundName(participantCount, roundNumber === 1),
            fixtures: roundFixtures,
            byeTeamNames: byeTeamIds
              .map(
                (teamId) =>
                  details.teams.find((team) => team.teamId === teamId)
                    ?.teamName,
              )
              .filter((name): name is string => name !== undefined),
            tbdMatches:
              !round && statusFilter !== "Completed" ? matchCount : 0,
          };
        },
      ).filter(
        (round) =>
          round.fixtures.length > 0 ||
          round.byeTeamNames.length > 0 ||
          (round.tbdMatches ?? 0) > 0,
      );
      return bracketRounds;
    },
    [details, filteredFixtures, statusFilter],
  );

  if (isLoading) return <Loader label="Loading series details..." fullWidth />;
  if (error || !details) {
    return (
      <section className="series-details__message" role="alert">
        {error || "Series details are unavailable."}
      </section>
    );
  }

  const completedCount = details.fixtures.filter(
    (fixture) => fixture.status.toLowerCase() === "completed",
  ).length;
  const finalRound = rounds[rounds.length - 1];
  const finalWinner = details.series.bracket
    ? details.teams.find(
        (team) => team.teamId === details.series.bracket?.championTeamId,
      )?.teamName ?? null
    : finalRound?.fixtures.length === 1 &&
        finalRound.fixtures[0].status.toLowerCase() === "completed"
      ? getFixtureWinner(finalRound.fixtures[0])
      : null;

  return (
    <main className="series-details">
      <button
        type="button"
        className="series-details__back"
        onClick={() => navigate("/admin/series")}
      >
        Back to Series
      </button>

      <header className="series-details__header">
        <div>
          <h1>{details.series.name}</h1>
          <p>
            {details.series.sportName}
            {details.series.format ? ` · ${details.series.format}` : ""}
            {` · ${details.teams.length} teams`}
          </p>
          <p className="series-details__meta">
            {details.series.startDate && details.series.endDate
              ? `${formatDate(details.series.startDate)} - ${formatDate(details.series.endDate)}`
              : ""}
            {details.series.venue ? ` · ${details.series.venue}` : ""}
          </p>
        </div>
        <span className="series-details__played">
          {completedCount} / {details.fixtures.length} played
        </span>
      </header>

      <section className="series-details__section">
        <h2>Teams and Status</h2>
        <div className="series-details__teams">
          {details.teams.map((team) => (
            <article className="series-details__team" key={team.teamId}>
              <div className="series-details__team-heading">
                <span
                  className="series-details__team-color"
                  style={{ backgroundColor: team.color }}
                />
                <h3>{team.teamName}</h3>
                <span className={`series-details__status series-details__status--${getStatusClass(team.status)}`}>
                  {team.status}
                </span>
              </div>
              <p className="series-details__team-meta">
                {team.format ?? details.series.format ?? details.series.sportName}
                {` · ${team.played} played`}
              </p>
              {team.players.length > 0 ? (
                <ul className="series-details__players">
                  {team.players.map((player) => (
                    <li key={player.playerId}>
                      <span>{player.playerName}</span>
                      <span>{player.role}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="series-details__empty">No players registered.</p>
              )}
            </article>
          ))}
        </div>
      </section>

      <section className="series-details__section">
        <div className="series-details__section-heading">
          <h2>Bracket and Match Status</h2>
          <div className="series-details__filters" aria-label="Filter matches">
            {(["All", "Scheduled", "Completed"] as const).map((filter) => (
              <button
                type="button"
                key={filter}
                className={statusFilter === filter ? "active" : ""}
                aria-pressed={statusFilter === filter}
                onClick={() => setStatusFilter(filter)}
              >
                {filter}
              </button>
            ))}
          </div>
        </div>

        {rounds.length === 0 ? (
          <p className="series-details__empty">No games have been scheduled for this series.</p>
        ) : (
          <div className="series-details__bracket">
            {rounds.map((round, index) => (
              <section className="series-details__round" key={round.key}>
                <h3>
                  {round.name ??
                    getRoundName(round, index, rounds, details.teams.length)}
                </h3>
                <p className="series-details__round-date">
                  {round.date === "unscheduled" ? "Date not set" : formatDate(round.date)}
                </p>
                {round.byeTeamNames?.map((teamName) => (
                  <p className="series-details__bye" key={teamName}>
                    {teamName} advances with a bye
                  </p>
                ))}
                {round.fixtures.map((fixture) => {
                  const winner = getFixtureWinner(fixture);
                  return (
                    <article className="series-details__match" key={fixture.id}>
                      <div className="series-details__match-heading">
                        <span className={`series-details__status series-details__status--${getStatusClass(fixture.status)}`}>
                          {fixture.status}
                        </span>
                      </div>
                      <div className={`series-details__match-team ${winner === fixture.homeTeamName ? "series-details__match-team--winner" : ""}`}>
                        <span>{fixture.homeTeamName}</span>
                        <strong>{getFixtureScore(fixture, "home")}</strong>
                      </div>
                      <div className={`series-details__match-team ${winner === fixture.awayTeamName ? "series-details__match-team--winner" : ""}`}>
                        <span>{fixture.awayTeamName}</span>
                        <strong>{getFixtureScore(fixture, "away")}</strong>
                      </div>
                      <p className="series-details__match-venue">
                        {details.series.venue ? `${details.series.venue} · ` : ""}
                        {formatDate(fixture.scheduledAtUtc)}
                      </p>
                      {winner && (
                        <p className="series-details__winner">Winner: {winner}</p>
                      )}
                    </article>
                  );
                })}
                {Array.from(
                  { length: round.tbdMatches ?? 0 },
                  (_, index) => (
                    <article
                      className="series-details__match series-details__match--tbd"
                      key={`tbd-${index}`}
                    >
                      <div className="series-details__match-heading">
                        <span className="series-details__status series-details__status--tbd">
                          TBD
                        </span>
                      </div>
                      <div className="series-details__match-team">
                        <span>TBD</span>
                        <strong>—</strong>
                      </div>
                      <div className="series-details__match-team">
                        <span>TBD</span>
                        <strong>—</strong>
                      </div>
                      <p className="series-details__match-venue">
                        Teams determined from previous-round winners
                      </p>
                    </article>
                  ),
                )}
              </section>
            ))}
          </div>
        )}

        {finalWinner && (
          <p className="series-details__champion">Champion: {finalWinner}</p>
        )}
      </section>
    </main>
  );
}

export default SeriesDetails;
