import { useEffect, useState } from "react";
import Header from "../Header/Header";
import type { FixtureScorecard } from "./FixtureScorecard";
import type { FixtureSetScoreDto } from "../types/FixtureDetails";
import type { MatchHeaderModel } from "../types/MatchDetailsModel";
import {
  BADMINTON_LOCAL_FIXTURE_CHANGED_EVENT,
  getTemporaryBadmintonFixtureDetails,
  type TemporaryBadmintonFixtureDetails,
} from "../../services/temporaryBadmintonFixtureService";
import {
  BADMINTON_LOCAL_SCORE_CHANGED_EVENT,
  getTemporaryBadmintonScore,
  type TemporaryBadmintonScore,
} from "../../services/temporaryBadmintonScoreService";
import Loader from "../Loader/Loader";
import { getTeams, type Player } from "../../services/TeamService";
import { getLocalRacquetSport } from "../../utils/localRacquetSports";
import "./BadmintonMatchDetailsView.css";

type Props = {
  fixtureId: string;
  fixture: FixtureScorecard | null;
  localFixture: TemporaryBadmintonFixtureDetails | null;
  header: MatchHeaderModel | null;
  loading: boolean;
};

const GAME_NUMBERS = [1, 2, 3];

function isGameComplete(
  teamA: number,
  teamB: number,
  isPickleball = false,
) {
  const highScore = Math.max(teamA, teamB);
  if (isPickleball) {
    return highScore >= 11 && Math.abs(teamA - teamB) >= 2;
  }
  return (
    (highScore >= 21 && Math.abs(teamA - teamB) >= 2) ||
    highScore >= 30
  );
}

function getSetNumber(phase?: string | null) {
  const normalizedPhase = phase?.toLowerCase().replace(/[\s_-]/g, "");
  const setNumbers: Record<string, number> = {
    set1: 1,
    firstset: 1,
    set2: 2,
    secondset: 2,
    set3: 3,
    thirdset: 3,
  };
  return normalizedPhase ? setNumbers[normalizedPhase] : undefined;
}

function getLocalScheduledDate(value?: string) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toLocaleString();
}

function BadmintonMatchDetailsView({
  fixtureId,
  fixture,
  localFixture,
  header,
  loading,
}: Props) {
  const [localScore, setLocalScore] =
    useState<TemporaryBadmintonScore | null>(null);
  const [localScoreError, setLocalScoreError] = useState<string | null>(null);
  const [savedFixture, setSavedFixture] =
    useState<TemporaryBadmintonFixtureDetails | null>(localFixture);
  const [homeTeamPlayers, setHomeTeamPlayers] = useState<Player[]>([]);
  const [awayTeamPlayers, setAwayTeamPlayers] = useState<Player[]>([]);
  const [rosterError, setRosterError] = useState<string | null>(null);
  const [viewGame, setViewGame] = useState<number | null>(null);
  const currentFixture = fixture?.id === fixtureId ? fixture : null;
  const homeTeamId = savedFixture?.homeTeamId ?? currentFixture?.homeTeamId;
  const awayTeamId = savedFixture?.awayTeamId ?? currentFixture?.awayTeamId;
  const currentHeader = header?.matchId === fixtureId ? header : null;

  useEffect(() => {
    setSavedFixture(localFixture);
  }, [localFixture]);

  useEffect(() => {
    const refreshLocalData = () => {
      try {
        setLocalScore(getTemporaryBadmintonScore(fixtureId));
        setLocalScoreError(null);
      } catch (error: unknown) {
        console.error("Failed to load local racquet match details", error);
        setLocalScoreError(
          error instanceof Error
            ? error.message
            : "Unable to load local racquet match details.",
        );
      }
      try {
        setSavedFixture(getTemporaryBadmintonFixtureDetails(fixtureId));
      } catch (error: unknown) {
        console.error("Failed to load local racquet fixture details", error);
        setLocalScoreError(
          error instanceof Error
            ? error.message
            : "Unable to load local racquet fixture details.",
        );
      }
    };

    refreshLocalData();
    const handleLocalDataChange = (event: Event) => {
      const changedFixtureId = (
        event as CustomEvent<{ fixtureId: string }>
      ).detail?.fixtureId;
      if (changedFixtureId === fixtureId) refreshLocalData();
    };

    window.addEventListener(
      BADMINTON_LOCAL_SCORE_CHANGED_EVENT,
      handleLocalDataChange,
    );
    window.addEventListener(
      BADMINTON_LOCAL_FIXTURE_CHANGED_EVENT,
      handleLocalDataChange,
    );
    return () => {
      window.removeEventListener(
        BADMINTON_LOCAL_SCORE_CHANGED_EVENT,
        handleLocalDataChange,
      );
      window.removeEventListener(
        BADMINTON_LOCAL_FIXTURE_CHANGED_EVENT,
        handleLocalDataChange,
      );
    };
  }, [fixtureId]);

  useEffect(() => {
    if (!homeTeamId && !awayTeamId) return;
    let ignore = false;
    setRosterError(null);
    getTeams()
      .then((teams) => {
        if (ignore) return;
        setHomeTeamPlayers(
          teams.find((team) => team.id === homeTeamId)?.players ?? [],
        );
        setAwayTeamPlayers(
          teams.find((team) => team.id === awayTeamId)?.players ?? [],
        );
      })
      .catch((error: unknown) => {
        console.error("Failed to load racquet team rosters", error);
        if (!ignore) {
          setRosterError(
            error instanceof Error
              ? error.message
              : "Unable to load player names.",
          );
        }
      });
    return () => {
      ignore = true;
    };
  }, [homeTeamId, awayTeamId]);

  useEffect(() => {
    if (viewGame === null) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setViewGame(null);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [viewGame]);

  const homeTeamName =
    savedFixture?.homeTeamName ??
    currentFixture?.homeTeamName ??
    currentHeader?.team1.name ??
    "Home team";
  const awayTeamName =
    savedFixture?.awayTeamName ??
    currentFixture?.awayTeamName ??
    currentHeader?.team2.name ??
    "Away team";
  const sportName =
    savedFixture?.sport ?? currentHeader?.matchFormat ?? "Badminton";
  const isPickleball =
    getLocalRacquetSport(sportName) === "pickleball";
  const status =
    savedFixture?.status ??
    currentFixture?.status ??
    currentHeader?.status ??
    "Unknown";
  const phase =
    savedFixture?.phase ??
    currentFixture?.phase ??
    currentHeader?.state ??
    "";
  const currentSet =
    localScore?.currentSet ??
    getSetNumber(phase) ??
    currentFixture?.currentSet ??
    getSetNumber(currentFixture?.phase) ??
    1;
  const sets =
    localScore?.sets ??
    currentFixture?.sets ??
    GAME_NUMBERS.map((setNumber) => ({
      setNumber,
      teamA:
        setNumber === currentSet && currentFixture
          ? currentFixture.homeScore
          : 0,
      teamB:
        setNumber === currentSet && currentFixture
          ? currentFixture.awayScore
          : 0,
    }));
  const homeGamesWon = sets.filter(
    (set) =>
      isGameComplete(set.teamA, set.teamB, isPickleball) &&
      set.teamA > set.teamB,
  ).length;
  const awayGamesWon = sets.filter(
    (set) =>
      isGameComplete(set.teamA, set.teamB, isPickleball) &&
      set.teamB > set.teamA,
  ).length;
  const normalizedFixtureStatus = status.toLowerCase().replace(/[\s_-]/g, "");
  const isCompleted =
    normalizedFixtureStatus === "completed" ||
    normalizedFixtureStatus === "complete";
  const winningTeam =
    homeGamesWon >= 2
      ? homeTeamName
      : awayGamesWon >= 2
        ? awayTeamName
        : null;
  const currentGameScore =
    sets.find((set) => set.setNumber === currentSet) ??
    ({ setNumber: currentSet, teamA: 0, teamB: 0 } satisfies FixtureSetScoreDto);
  const fixtureLiveGame = getSetNumber(phase) ?? currentFixture?.currentSet;
  const fixtureGameIsLive =
    (normalizedFixtureStatus === "live" ||
      normalizedFixtureStatus === "inprogress") &&
    fixtureLiveGame === currentSet;
  const currentGameStatus = isGameComplete(
    currentGameScore.teamA,
    currentGameScore.teamB,
    isPickleball,
  )
    ? "Complete"
    : fixtureGameIsLive
      ? "In progress"
      : "Waiting to start";
  const scheduledAt =
    getLocalScheduledDate(savedFixture?.scheduledAtUtc) ??
    getLocalScheduledDate(currentFixture?.scheduledAtUtc) ??
    getLocalScheduledDate(
      currentHeader?.matchStartTimestamp
        ? new Date(currentHeader.matchStartTimestamp).toISOString()
        : undefined,
    );

  if (loading && !currentFixture && !savedFixture && !currentHeader) {
    return <Loader label="Loading match details..." fullWidth />;
  }

  return (
    <main className="badminton-match-details-page">
      <Header />
      <section className="badminton-match-details">
        <header className="badminton-match-details__header">
          <div>
            <span className="badminton-match-details__sport">
              {sportName.toUpperCase()}
            </span>
            <h1>
              {homeTeamName} <span>vs</span> {awayTeamName}
            </h1>
            <p>
              {phase || "Best of 3 sets"}
              {scheduledAt ? ` · ${scheduledAt}` : ""}
            </p>
          </div>
          <div className="badminton-match-details__header-result">
            <span
              className={`badminton-match-details__status ${
                status.toLowerCase() === "live"
                  ? "badminton-match-details__status--live"
                  : ""
              }`}
            >
              {status}
            </span>
            {isCompleted && winningTeam && (
              <p className="badminton-match-details__winner">
                {winningTeam} won the match
              </p>
            )}
          </div>
        </header>

        {isPickleball && (
          <p className="badminton-match-details__rules">
            Pickleball rules: 11 points per set, win by 2, no fixed maximum.
          </p>
        )}

        <section className="badminton-match-details__current">
          <div>
            <span>Current set</span>
            <strong>{currentSet}</strong>
            <small>{currentGameStatus}</small>
          </div>
          <div>
            <span>{homeTeamName}</span>
            <strong>{currentGameScore.teamA}</strong>
            <small>Sets won: {homeGamesWon}</small>
          </div>
          <div>
            <span>{awayTeamName}</span>
            <strong>{currentGameScore.teamB}</strong>
            <small>Sets won: {awayGamesWon}</small>
          </div>
        </section>

        <section className="badminton-match-details__scores">
          <h2>Set scores</h2>
          <div className="badminton-match-details__table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Set</th>
                  <th>{homeTeamName}</th>
                  <th>{awayTeamName}</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {GAME_NUMBERS.map((setNumber) => {
                  const score = sets.find((set) => set.setNumber === setNumber);
                  const teamA = score?.teamA ?? 0;
                  const teamB = score?.teamB ?? 0;
                  const complete = isGameComplete(teamA, teamB, isPickleball);
                  const gameStatus =
                    setNumber > currentSet
                      ? "Not started"
                      : complete
                        ? teamA > teamB
                          ? `Won by ${homeTeamName}`
                          : `Won by ${awayTeamName}`
                        : setNumber === currentSet
                          ? currentGameStatus
                          : "Completed";

                  return (
                    <tr
                      key={setNumber}
                      className={
                        setNumber === currentSet
                          ? "badminton-match-details__current-row"
                          : ""
                      }
                    >
                      <th scope="row">Set {setNumber}</th>
                      <td>{teamA}</td>
                      <td>{teamB}</td>
                      <td>{gameStatus}</td>
                      <td>
                        <button
                          type="button"
                          className="badminton-match-details__view-button"
                          onClick={() => setViewGame(setNumber)}
                        >
                          View Score
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

        {viewGame !== null &&
          (() => {
            const gameScore = sets.find((set) => set.setNumber === viewGame);
            const playerPoints = localScore?.playerPoints ?? {};
            const teams = [
              {
                name: homeTeamName,
                total: gameScore?.teamA ?? 0,
                players: homeTeamPlayers,
              },
              {
                name: awayTeamName,
                total: gameScore?.teamB ?? 0,
                players: awayTeamPlayers,
              },
            ];
            return (
              <div
                className="badminton-match-details__modal-backdrop"
                onClick={() => setViewGame(null)}
              >
                <div
                  className="badminton-match-details__modal"
                  role="dialog"
                  aria-modal="true"
                  aria-labelledby="badminton-set-score-title"
                  onClick={(event) => event.stopPropagation()}
                >
                  <div className="badminton-match-details__modal-header">
                    <h3 id="badminton-set-score-title">
                      Set {viewGame} &middot; Player points
                    </h3>
                    <button
                      type="button"
                      className="badminton-match-details__modal-close"
                      aria-label="Close"
                      onClick={() => setViewGame(null)}
                    >
                      &times;
                    </button>
                  </div>
                  <div className="badminton-match-details__modal-teams">
                    {teams.map((team) => (
                      <section key={team.name}>
                        <header>
                          <span>{team.name}</span>
                          <strong>{team.total}</strong>
                        </header>
                        {team.players.length > 0 ? (
                          <ul>
                            {team.players.map((player) => (
                              <li key={player.playerId}>
                                <span>{player.playerName}</span>
                                <strong>
                                  {playerPoints[player.playerId]?.[viewGame] ??
                                    0}
                                </strong>
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <p className="badminton-match-details__modal-empty">
                            {rosterError ?? "No player data available."}
                          </p>
                        )}
                      </section>
                    ))}
                  </div>
                </div>
              </div>
            );
          })()}

        {localScoreError && (
          <p className="badminton-match-details__error" role="alert">
            {localScoreError}
          </p>
        )}
      </section>
    </main>
  );
}

export default BadmintonMatchDetailsView;
