import { useEffect, useState } from "react";
import { getFixtureMatchDetails } from "../../services/MatchDataService";
import type {
  FixtureDetailsDto,
  FixtureSetScoreDto,
} from "../types/FixtureDetails";
import Loader from "../Loader/Loader";
import {
  getTemporaryBadmintonScore,
  saveTemporaryBadmintonScore,
} from "../../services/temporaryBadmintonScoreService";
import { getTeams, type Player } from "../../services/TeamService";
import {
  BADMINTON_LOCAL_FIXTURE_CHANGED_EVENT,
  getTemporaryBadmintonFixtureDetails,
} from "../../services/temporaryBadmintonFixtureService";
import { showInfo, showSuccess } from "../../services/common/AlertService";
import { getLocalRacquetSport } from "../../utils/localRacquetSports";
import {
  BADMINTON_LOCAL_SCORE_CHANGED_EVENT,
  loadRacquetMatch,
} from "../../services/racquetMatchService";
import "./BadmintonScoreEntry.css";

type Props = {
  fixtureId: string | null;
  sport?: string | null;
};

const GAME_NUMBERS = [1, 2, 3];

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

function isGameComplete(
  teamA: number,
  teamB: number,
  isPickleball = false,
) {
  const highScore = Math.max(teamA, teamB);
  const lead = Math.abs(teamA - teamB);
  if (isPickleball) return highScore >= 11 && lead >= 2;
  return (highScore >= 21 && lead >= 2) || highScore >= 30;
}

function BadmintonScoreEntry({ fixtureId, sport }: Props) {
  const [fixture, setFixture] = useState<FixtureDetailsDto | null>(null);
  const [gameScores, setGameScores] = useState<FixtureSetScoreDto[]>([]);
  const [currentGame, setCurrentGame] = useState(1);
  const [selectedGame, setSelectedGame] = useState(1);
  const [currentSetIsLive, setCurrentSetIsLive] = useState(false);
  const [homeTeamPlayers, setHomeTeamPlayers] = useState<Player[]>([]);
  const [awayTeamPlayers, setAwayTeamPlayers] = useState<Player[]>([]);
  const [playerPoints, setPlayerPoints] = useState<
    Record<string, Record<number, number>>
  >({});
  const [rosterError, setRosterError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [storageError, setStorageError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!fixtureId) {
      setFixture(null);
      setGameScores([]);
      setCurrentSetIsLive(false);
      setHomeTeamPlayers([]);
      setAwayTeamPlayers([]);
      setPlayerPoints({});
      setRosterError(null);
      setError(null);
      setStorageError(null);
      return;
    }

    let ignore = false;
    setFixture(null);
    setGameScores([]);
    setHomeTeamPlayers([]);
    setAwayTeamPlayers([]);
    setPlayerPoints({});
    setLoading(true);
    setError(null);
    setStorageError(null);
    setRosterError(null);

    // Load the fixture and its saved racquet match (/api/racquet-matches) together.
    void Promise.all([
      getFixtureMatchDetails(fixtureId),
      loadRacquetMatch(fixtureId),
    ])
      .then(([details]) => {
        if (ignore) return;

        const isBadminton =
          getLocalRacquetSport(sport ?? details.sport) === "badminton";
        if (isBadminton) {
          void getTeams()
            .then((teams) => {
              if (ignore) return;
              setHomeTeamPlayers(
                teams.find((team) => team.id === details.homeTeamId)?.players ??
                  [],
              );
              setAwayTeamPlayers(
                teams.find((team) => team.id === details.awayTeamId)?.players ??
                  [],
              );
            })
            .catch((rosterLoadError: unknown) => {
              console.error("Failed to load badminton team rosters", rosterLoadError);
              if (!ignore) {
                setRosterError(
                  rosterLoadError instanceof Error
                    ? rosterLoadError.message
                    : "Unable to load badminton team rosters.",
                );
              }
            });
        }

        const savedScore = getTemporaryBadmintonScore(fixtureId);
        const savedFixture = getTemporaryBadmintonFixtureDetails(fixtureId);
        const apiCurrentGame = details.currentSet;
        const apiActiveGame =
          apiCurrentGame != null && apiCurrentGame >= 1 && apiCurrentGame <= 3
            ? apiCurrentGame
            : getSetNumber(details.phase) ?? 1;
        const fixtureActiveGame =
          getSetNumber(savedFixture?.phase) ?? apiActiveGame;
        const activeGame =
          savedScore?.currentSet ??
          fixtureActiveGame;
        const scores = GAME_NUMBERS.map((gameNumber) => {
          const storedScore = details.sets?.find(
            (score) => score.setNumber === gameNumber,
          );
          return {
            setNumber: gameNumber,
            teamA: storedScore?.teamA ?? 0,
            teamB: storedScore?.teamB ?? 0,
          };
        });

        if (
          !details.sets?.some((score) => score.setNumber === activeGame) &&
          (details.homeScore > 0 || details.awayScore > 0)
        ) {
          scores[activeGame - 1] = {
            setNumber: activeGame,
            teamA: details.homeScore ?? 0,
            teamB: details.awayScore ?? 0,
          };
        }

        const activeScores = savedScore?.sets ?? scores;
        const activePlayerPoints = savedScore?.playerPoints ?? {};
        const fixtureStatus = savedFixture?.status ?? details.status;
        const normalizedFixtureStatus = fixtureStatus
          .toLowerCase()
          .replace(/[\s_-]/g, "");
        const activeSetIsLive =
          (normalizedFixtureStatus === "live" ||
            normalizedFixtureStatus === "inprogress") &&
          fixtureActiveGame === activeGame;
        setFixture(
          savedFixture
            ? {
                ...details,
                status: savedFixture.status,
                phase: savedFixture.phase,
                homeTeamName:
                  savedFixture.homeTeamName ?? details.homeTeamName,
                awayTeamName:
                  savedFixture.awayTeamName ?? details.awayTeamName,
              }
            : details,
        );
        setGameScores(activeScores);
        setPlayerPoints(activePlayerPoints);
        setCurrentGame(activeGame);
        setSelectedGame(activeGame);
        setCurrentSetIsLive(activeSetIsLive);
        // First time this match is opened: create its record on the server (POST, 0-0 in all games).
        if (!savedScore) {
          saveTemporaryBadmintonScore(fixtureId, {
            currentSet: activeGame,
            sets: activeScores,
            isLive: activeSetIsLive,
            playerPoints: activePlayerPoints,
          }).catch((saveError: unknown) => {
            console.error("Failed to create racquet match", saveError);
            if (!ignore) {
              setStorageError(
                saveError instanceof Error
                  ? saveError.message
                  : "Unable to create the match score.",
              );
            }
          });
        }
      })
      .catch((loadError: unknown) => {
        console.error("Failed to load racquet score entry data", loadError);
        if (!ignore) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Unable to load racquet score data.",
          );
        }
      })
      .finally(() => {
        if (!ignore) setLoading(false);
      });

    return () => {
      ignore = true;
    };
  }, [fixtureId, sport]);

  useEffect(() => {
    if (!fixtureId) return;

    const handleFixtureChange = (event: Event) => {
      const changedFixtureId = (
        event as CustomEvent<{ fixtureId: string }>
      ).detail?.fixtureId;
      if (changedFixtureId !== fixtureId) return;

      try {
        const savedFixture = getTemporaryBadmintonFixtureDetails(fixtureId);
        if (!savedFixture) return;

        setFixture((currentFixture) =>
          currentFixture
            ? {
                ...currentFixture,
                status: savedFixture.status,
                phase: savedFixture.phase,
                homeTeamName:
                  savedFixture.homeTeamName ?? currentFixture.homeTeamName,
                awayTeamName:
                  savedFixture.awayTeamName ?? currentFixture.awayTeamName,
              }
            : currentFixture,
        );

        const normalizedStatus = savedFixture.status
          .toLowerCase()
          .replace(/[\s_-]/g, "");
        const currentSetIsLive =
          (normalizedStatus === "live" || normalizedStatus === "inprogress") &&
          getSetNumber(savedFixture.phase) === currentGame;
        setCurrentSetIsLive(currentSetIsLive);
        // No save needed here: the server works out isLive from the fixture status and phase.
      } catch (refreshError: unknown) {
        console.error("Failed to refresh racquet fixture state", refreshError);
        setStorageError(
          refreshError instanceof Error
            ? refreshError.message
            : "Unable to refresh racquet fixture state.",
        );
      }
    };

    window.addEventListener(
      BADMINTON_LOCAL_FIXTURE_CHANGED_EVENT,
      handleFixtureChange,
    );
    return () =>
      window.removeEventListener(
        BADMINTON_LOCAL_FIXTURE_CHANGED_EVENT,
        handleFixtureChange,
      );
  }, [fixtureId, currentGame]);

  // Score saved by the server (after a point, or changed in another browser): show it.
  useEffect(() => {
    if (!fixtureId) return;

    const handleScoreChange = (event: Event) => {
      const changedFixtureId = (
        event as CustomEvent<{ fixtureId: string }>
      ).detail?.fixtureId;
      if (changedFixtureId !== fixtureId) return;

      const savedScore = getTemporaryBadmintonScore(fixtureId);
      if (!savedScore) return;

      setGameScores(savedScore.sets);
      setPlayerPoints(savedScore.playerPoints ?? {});
      setCurrentSetIsLive(savedScore.isLive ?? false);
      if (savedScore.currentSet !== currentGame) {
        setCurrentGame(savedScore.currentSet);
        setSelectedGame(savedScore.currentSet);
      }
    };

    window.addEventListener(BADMINTON_LOCAL_SCORE_CHANGED_EVENT, handleScoreChange);
    return () =>
      window.removeEventListener(BADMINTON_LOCAL_SCORE_CHANGED_EVENT, handleScoreChange);
  }, [fixtureId, currentGame]);

  if (!fixtureId) {
    return (
      <section className="badminton-score-entry__empty">
        Select a match to manage its live score.
      </section>
    );
  }

  if (loading && !fixture) {
    return <Loader label="Loading match score..." fullWidth />;
  }

  if (error && !fixture) {
    return (
      <section className="badminton-score-entry__empty" role="alert">
        {error}
      </section>
    );
  }

  if (!fixture) {
    return (
      <section className="badminton-score-entry__empty">
        Match score data is unavailable.
      </section>
    );
  }

  const normalizedStatus = fixture.status.toLowerCase().replace(/[\s_-]/g, "");
  const isLive = normalizedStatus === "live" || normalizedStatus === "inprogress";
  const scoringSport =
    getLocalRacquetSport(sport ?? fixture.sport) ?? "badminton";
  const isPickleball = scoringSport === "pickleball";
  const sportName =
    scoringSport === "pickleball" ? "Pickleball" : "Badminton";
  const fixtureLiveGame = getSetNumber(fixture.phase) ?? fixture.currentSet;
  const selectedScore =
    gameScores.find((score) => score.setNumber === selectedGame) ?? {
      setNumber: selectedGame,
      teamA: 0,
      teamB: 0,
    };
  const winsA = gameScores.filter(
    (score) =>
      isGameComplete(score.teamA, score.teamB, isPickleball) &&
      score.teamA > score.teamB,
  ).length;
  const winsB = gameScores.filter(
    (score) =>
      isGameComplete(score.teamA, score.teamB, isPickleball) &&
      score.teamB > score.teamA,
  ).length;
  const isMatchComplete = winsA >= 2 || winsB >= 2;
  const selectedGameComplete = isGameComplete(
    selectedScore.teamA,
    selectedScore.teamB,
    isPickleball,
  );
  const canAddPoints =
    !saving &&
    isLive &&
    currentSetIsLive &&
    !isMatchComplete &&
    selectedGame === currentGame &&
    !selectedGameComplete;

  const getGameStatus = (score: FixtureSetScoreDto) => {
    if (score.setNumber > currentGame) return "Not started";
    if (isGameComplete(score.teamA, score.teamB, isPickleball)) {
      return score.teamA > score.teamB
        ? `Won by ${fixture.homeTeamName}`
        : `Won by ${fixture.awayTeamName}`;
    }
    if (score.setNumber === currentGame && !currentSetIsLive) {
      return "Waiting to start";
    }
    return score.setNumber === currentGame ? "In Progress" : "Complete";
  };

  const addPoint = async (team: "A" | "B", playerId?: string) => {
    if (!canAddPoints) return;

    const updatedScores = gameScores.map((score) =>
      score.setNumber === selectedGame
        ? {
            ...score,
            teamA: score.teamA + (team === "A" ? 1 : 0),
            teamB: score.teamB + (team === "B" ? 1 : 0),
          }
        : score,
    );

    const updatedGame = updatedScores.find(
      (score) => score.setNumber === selectedGame,
    );
    const updatedWinsA = updatedScores.filter(
      (score) =>
        isGameComplete(score.teamA, score.teamB, isPickleball) &&
        score.teamA > score.teamB,
    ).length;
    const updatedWinsB = updatedScores.filter(
      (score) =>
        isGameComplete(score.teamA, score.teamB, isPickleball) &&
        score.teamB > score.teamA,
    ).length;
    const gameIsComplete =
      updatedGame !== undefined &&
      isGameComplete(updatedGame.teamA, updatedGame.teamB, isPickleball);
    const matchIsComplete = updatedWinsA >= 2 || updatedWinsB >= 2;
    const advancesToNextGame =
      gameIsComplete && !matchIsComplete && selectedGame < 3;
    const nextCurrentGame = advancesToNextGame
      ? selectedGame + 1
      : currentGame;
    const nextCurrentSetIsLive = gameIsComplete
      ? advancesToNextGame && isLive && fixtureLiveGame === nextCurrentGame
      : !matchIsComplete;
    const updatedPlayerPoints = playerId
      ? {
          ...playerPoints,
          [playerId]: {
            ...playerPoints[playerId],
            [selectedGame]: (playerPoints[playerId]?.[selectedGame] ?? 0) + 1,
          },
        }
      : playerPoints;

    // Save on the server first; the buttons stay disabled until it answers.
    setSaving(true);
    try {
      await saveTemporaryBadmintonScore(fixture.id, {
        currentSet: nextCurrentGame,
        sets: updatedScores,
        isLive: nextCurrentSetIsLive,
        playerPoints: updatedPlayerPoints,
      });
    } catch (saveError: unknown) {
      console.error("Failed to save racquet score", saveError);
      setStorageError(
        saveError instanceof Error
          ? saveError.message
          : "Unable to save the score.",
      );
      return;
    } finally {
      setSaving(false);
    }

    setGameScores(updatedScores);
    setPlayerPoints(updatedPlayerPoints);
    setStorageError(null);
    if (advancesToNextGame) {
      setCurrentGame(nextCurrentGame);
      setSelectedGame(nextCurrentGame);
      setCurrentSetIsLive(nextCurrentSetIsLive);
      await showInfo(
        `Game ${selectedGame} complete`,
        nextCurrentSetIsLive
          ? `Game ${nextCurrentGame} is live according to the fixture. Scoring is enabled.`
          : `Set the fixture phase to Set ${nextCurrentGame} when that game goes live. Scoring will then be enabled.`,
      );
    } else if (matchIsComplete) {
      setCurrentSetIsLive(false);
      await showSuccess(
        "Match complete",
        "The match has been decided. Further scoring is locked.",
      );
    } else if (gameIsComplete) {
      setCurrentSetIsLive(false);
    }
  };

  return (
    <section className="badminton-score-entry" aria-busy={loading}>
      <header className="badminton-score-entry__header">
        <div>
          <h2>Live Score Management</h2>
          <p>{sportName} · Best of 3 games</p>
        </div>
        <span
          className={`badminton-score-entry__badge ${
            isLive ? "badminton-score-entry__badge--live" : ""
          }`}
        >
          {isLive ? "LIVE" : fixture.status}
        </span>
      </header>

      {isPickleball && (
        <section className="badminton-score-entry__rules">
          <h3>Pickleball scoring rules</h3>
          <span>Points per game: 11</span>
          <span>Winning margin: 2 points</span>
          <span>Maximum points: No fixed maximum</span>
        </section>
      )}

      <div className="badminton-score-entry__players">
        <article className="badminton-score-entry__player">
          <h3>{fixture.homeTeamName}</h3>
          <strong>{selectedScore.teamA}</strong>
          <span>Games: {winsA}</span>
          {scoringSport === "badminton" && homeTeamPlayers.length === 2 ? (
            <div className="badminton-score-entry__player-actions">
              {homeTeamPlayers.map((player) => (
                <div
                  className="badminton-score-entry__player-action"
                  key={player.playerId}
                >
                  <span className="badminton-score-entry__player-name-points">
                    <span className="badminton-score-entry__player-name">
                      {player.playerName}
                    </span>
                    <span className="badminton-score-entry__player-points">
                      {playerPoints[player.playerId]?.[selectedGame] ?? 0}
                    </span>
                  </span>
                  <button
                    type="button"
                    aria-label={`Add point for ${fixture.homeTeamName} (${player.playerName})`}
                    disabled={!canAddPoints}
                    onClick={() => void addPoint("A", player.playerId)}
                  >
                    + Add Point
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <button
              type="button"
              disabled={!canAddPoints}
              onClick={() => void addPoint("A")}
            >
              + Add Point
            </button>
          )}
        </article>
        <article className="badminton-score-entry__player">
          <h3>{fixture.awayTeamName}</h3>
          <strong>{selectedScore.teamB}</strong>
          <span>Games: {winsB}</span>
          {scoringSport === "badminton" && awayTeamPlayers.length === 2 ? (
            <div className="badminton-score-entry__player-actions">
              {awayTeamPlayers.map((player) => (
                <div
                  className="badminton-score-entry__player-action"
                  key={player.playerId}
                >
                  <span className="badminton-score-entry__player-name-points">
                    <span className="badminton-score-entry__player-name">
                      {player.playerName}
                    </span>
                    <span className="badminton-score-entry__player-points">
                      {playerPoints[player.playerId]?.[selectedGame] ?? 0}
                    </span>
                  </span>
                  <button
                    type="button"
                    aria-label={`Add point for ${fixture.awayTeamName} (${player.playerName})`}
                    disabled={!canAddPoints}
                    onClick={() => void addPoint("B", player.playerId)}
                  >
                    + Add Point
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <button
              type="button"
              disabled={!canAddPoints}
              onClick={() => void addPoint("B")}
            >
              + Add Point
            </button>
          )}
        </article>
      </div>

      <section className="badminton-score-entry__games">
        <h3>Game Scores</h3>
        <div className="badminton-score-entry__table-wrap">
          <table>
            <thead>
              <tr>
                <th>Game</th>
                <th>{fixture.homeTeamName}</th>
                <th>{fixture.awayTeamName}</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {gameScores.map((score) => (
                <tr
                  key={score.setNumber}
                  className={
                    score.setNumber === currentGame
                      ? "badminton-score-entry__current-game"
                      : ""
                  }
                >
                  <th scope="row">Game {score.setNumber}</th>
                  <td>{score.teamA}</td>
                  <td>{score.teamB}</td>
                  <td>{getGameStatus(score)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="badminton-score-entry__footer">
          <span>Current game: {currentGame}</span>
          <span
            className={
              isMatchComplete
                ? "badminton-score-entry__match-complete"
                : "badminton-score-entry__in-progress"
            }
          >
            {isMatchComplete
              ? "Match complete"
              : !isLive
                ? "Match not live · scoring locked"
                : currentSetIsLive
                  ? `Game ${currentGame} live`
                  : `Waiting for fixture to set Game ${currentGame} live`}
          </span>
        </div>
      </section>

      <p className="badminton-score-entry__notice">
        Scores are saved on the server and shown on every screen.
      </p>
      {error && <p className="badminton-score-entry__error">{error}</p>}
      {storageError && (
        <p className="badminton-score-entry__error" role="alert">
          {storageError}
        </p>
      )}
      {rosterError && (
        <p className="badminton-score-entry__error" role="alert">
          Could not load player names; team-level scoring remains available.{" "}
          {rosterError}
        </p>
      )}
    </section>
  );
}

export default BadmintonScoreEntry;
