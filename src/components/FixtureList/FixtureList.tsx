import { useEffect, useRef, useState } from "react";
import "./FixtureList.css";
import useScoreUpdateFeed, { getScoreForFixture } from "../../hooks/useScoreUpdateFeed";
import { fixtureService, type Fixture } from "../../services/fixturesservice";
import { showError, showSuccess } from "../../services/common/AlertService";
import Loader from "../Loader/Loader";
import {
  BADMINTON_LOCAL_SCORE_CHANGED_EVENT,
  getTemporaryBadmintonScore,
  getTemporaryBadmintonScoreStorageKey,
  type TemporaryBadmintonScore,
} from "../../services/temporaryBadmintonScoreService";
import {
  getTemporaryBadmintonFixtureDetails,
  saveTemporaryBadmintonFixtureDetails,
} from "../../services/temporaryBadmintonFixtureService";
import {
  assertRacquetSetCanGoLive,
  isLocalRacquetSport,
} from "../../utils/localRacquetSports";
import { loadRacquetMatches } from "../../services/racquetMatchService";

type EditableFixture = Omit<Fixture, "battingTeamId"> & {
  homeOvers?: string;
  awayOvers?: string;
  statusValue: number;
  phaseValue: number;
  battingTeamId?: string | null;
  originalStatusValue?: number;
};

interface FixtureListProps {
  refreshKey: number;
}

function FixtureListItem({
  fixture,
  index,
  editingId,
  setEditingId,
  handleDelete,
  handleChange,
  handleSave,
}: {
  fixture: EditableFixture;
  index: number;
  editingId: string | null;
  setEditingId: (id: string | null) => void;
  handleDelete: (id: string) => Promise<void>;
  handleChange: (
    index: number,
    field: "statusValue" | "phaseValue" | "battingTeamId",
    value: number | string,
  ) => void;
  handleSave: (fixture: EditableFixture) => Promise<void>;
}) {
  const canEdit = true;
  const hideActions = false;
  const [isSaving, setIsSaving] = useState(false);
  const savingRef = useRef(false);

  const onSaveClick = async () => {
    if (savingRef.current) return;
    savingRef.current = true;
    setIsSaving(true);
    try {
      await handleSave(fixture);
    } finally {
      savingRef.current = false;
      setIsSaving(false);
    }
  };

  const { scoreByMatch } = useScoreUpdateFeed(String(fixture.id));

  console.log(
    "FixtureListItem: Score updates in FixtureListItem:====================>",
    scoreByMatch,
  );
  const realtime = fixture.id ? getScoreForFixture(scoreByMatch, String(fixture.id)) : undefined;

  console.log(
    "FixtureListItem: Realtime score for fixtureId in FixtureList===============>",
    fixture.id,
    ":",
    realtime,
  );

  const getLocalDateTimeString = (utcString: string) => {
    if (!utcString) return "";
    const date = new Date(utcString + "Z");
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };

  // Safe access to team ids regardless of how the Fixture type names them.
  const homeTeamId =
    (fixture as unknown as { homeTeamId?: string }).homeTeamId ?? "";
  const awayTeamId =
    (fixture as unknown as { awayTeamId?: string }).awayTeamId ?? "";

  const isCricket = fixture.sport?.toLowerCase() === "cricket";
  const isLocalRacquet = isLocalRacquetSport(fixture.sport);
  const [temporaryScore, setTemporaryScore] =
    useState<TemporaryBadmintonScore | null>(null);
  const [temporaryScoreError, setTemporaryScoreError] = useState<string | null>(
    null,
  );

  useEffect(() => {
    if (!isLocalRacquet) {
      setTemporaryScore(null);
      setTemporaryScoreError(null);
      return;
    }

    const refreshTemporaryScore = () => {
      try {
        setTemporaryScore(getTemporaryBadmintonScore(fixture.id));
        setTemporaryScoreError(null);
      } catch (error: unknown) {
        console.error("Failed to read local racquet fixture score", error);
        setTemporaryScore(null);
        setTemporaryScoreError(
          error instanceof Error
            ? error.message
            : "Unable to read the local racquet score.",
        );
      }
    };

    const handleLocalScoreChange = (event: Event) => {
      const detail = (event as CustomEvent<{ fixtureId: string }>).detail;
      if (detail?.fixtureId === fixture.id) refreshTemporaryScore();
    };
    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === getTemporaryBadmintonScoreStorageKey(fixture.id)) {
        refreshTemporaryScore();
      }
    };

    refreshTemporaryScore();
    window.addEventListener(
      BADMINTON_LOCAL_SCORE_CHANGED_EVENT,
      handleLocalScoreChange,
    );
    window.addEventListener("storage", handleStorageChange);

    return () => {
      window.removeEventListener(
        BADMINTON_LOCAL_SCORE_CHANGED_EVENT,
        handleLocalScoreChange,
      );
      window.removeEventListener("storage", handleStorageChange);
    };
  }, [fixture.id, isLocalRacquet]);

  return (
    <div key={fixture.id}>
      {editingId === fixture.id ? (
        <div className="fixture-card">
          <div className="row">
            <input value={fixture.homeTeamName} disabled />
            <input value={fixture.awayTeamName} disabled />
          </div>

          <div className="row">
            <input
              type="datetime-local"
              value={getLocalDateTimeString(fixture.scheduledAtUtc)}
              disabled
              aria-label="Scheduled date and time cannot be edited"
            />

            <select
              value={fixture.phaseValue}
              disabled={!canEdit}
              onChange={(e) =>
                handleChange(index, "phaseValue", Number(e.target.value))
              }
            >
              {fixture.sport?.toLowerCase() ===
              "football".toLowerCase().slice() ? (
                <>
                  <option value={2}>First Half</option>
                  <option value={3}>Second Half</option>
                  <option value={4}>Extra Time</option>
                  <option value={5}>Penalty Shootout</option>
                </>
              ) : fixture.sport?.toLowerCase() === "hockey" ? (
                <>
                  <option value={2}>First Half</option>
                  <option value={3}>Second Half</option>
                  <option value={5}>Shootout</option>
                </>
              ) : isLocalRacquetSport(fixture.sport) ? (
                <>
                  <option value={2}>Set 1</option>
                  <option value={3}>Set 2</option>
                  <option value={5}>Set 3</option>
                </>
              ): (
                <>
                  <option value={0}>First Innings</option>
                  <option value={1}>Second Innings</option>
                </>
              )}
            </select>
          </div>

          {/* 👇 Batting team dropdown (cricket only) */}
          {isCricket && (
            <div className="row single-column">
              <select
                value={fixture.battingTeamId ?? ""}
                disabled={!canEdit}
                onChange={(e) =>
                  handleChange(index, "battingTeamId", e.target.value)
                }
              >
                <option value="">-- Select batting team --</option>
                {homeTeamId && (
                  <option value={homeTeamId}>
                    {fixture.homeTeamName} (Home)
                  </option>
                )}
                {awayTeamId && (
                  <option value={awayTeamId}>
                    {fixture.awayTeamName} (Away)
                  </option>
                )}
              </select>
            </div>
          )}

          <div className="row single-column">
            <select
              value={fixture.statusValue}
              disabled={!canEdit}
              onChange={(e) =>
                handleChange(index, "statusValue", Number(e.target.value))
              }
            >
              <option value={0}>Scheduled</option>
              <option value={1}>Live</option>
              <option value={2}>Completed</option>
              <option value={3}>Postponed</option>
              <option value={4}>Cancelled</option>
            </select>
          </div>

          <div className="actions">
            <button
              className="cancel"
              onClick={() => setEditingId(null)}
              disabled={isSaving}
            >
              Cancel
            </button>

            <button
              className="save"
              onClick={onSaveClick}
              disabled={isSaving}
            >
              {isSaving ? "Saving..." : "Save"}
            </button>
          </div>
        </div>
      ) : (
        <div
          className={`fixture-item ${
            isLocalRacquet ? "fixture-item--racquet" : ""
          }`}
        >
          <div className="fixture-left">
            <span className="sport-badge">{fixture.sport}</span>

            <div className="fixture-info">
              <h4>
                {fixture.homeTeamName} vs {fixture.awayTeamName}
              </h4>

              <p>
                {new Date(fixture.scheduledAtUtc + "Z").toLocaleString()} •{" "}
                {fixture.phase} • {fixture.status}
              </p>
            </div>

            <div
              className={
                isLocalRacquet
                  ? "fixture-score fixture-score--racquet"
                  : "fixture-score"
              }
            >
              {isLocalRacquet && temporaryScoreError ? (
                <strong className="fixture-score-error">
                  {temporaryScoreError}
                </strong>
              ) : isLocalRacquet &&
                (temporaryScore ||
                  fixture.status.toLowerCase() === "scheduled") ? (
                <strong>
                  {temporaryScore
                    ? temporaryScore.sets
                        .map((set) => `${set.teamA}/${set.teamB}`)
                        .join(" - ")
                    : "0/0 - 0/0 - 0/0"}
                </strong>
              ) : (
                <>
                  <strong>
                    {`${realtime?.homeScore ?? fixture.homeScore}/${
                      realtime?.homeWickets ?? fixture.homeWickets ?? 0
                    } (${realtime?.homeOvers ?? fixture.homeOvers ?? "0.0"})`}
                  </strong>
                  <span className="fixture-score-meta">
                    &nbsp;• {realtime?.awayScore ?? fixture.awayScore}/
                    {realtime?.awayWickets ?? fixture.awayWickets ?? 0} (
                    {realtime?.awayOvers ?? fixture.awayOvers ?? "0.0"})
                  </span>
                </>
              )}
            </div>
          </div>

          {!hideActions && (
            <div className="fixture-actions">
              <button
                className="icon-btn"
                onClick={() => setEditingId(fixture.id)}
              >
                ✏️
              </button>

              <button
                className="icon-btn delete"
                onClick={() => handleDelete(fixture.id)}
              >
                ✕
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function FixtureList({ refreshKey }: FixtureListProps) {
  const [fixtures, setFixtures] = useState<EditableFixture[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);

  useEffect(() => {
    loadFixtures();
  }, [refreshKey]);

  async function loadFixtures() {
    try {
      const data = await fixtureService.getLiveFixtures();
      // Badminton/Pickleball status and phase are saved in local storage.
      await loadRacquetMatches().catch((error: unknown) =>
        console.error("Failed to load racquet matches", error),
      );
      let localDetailsError: unknown = null;
      let localDetailsEnriched = false;
      const loadedFixtures = data.map((f) => {
        const phaseValue = getPhaseValue(f.phase);
        const fixture: EditableFixture = {
          ...f,
          statusValue: getStatusValue(f.status),
          phaseValue:
            isLocalRacquetSport(f.sport) && ![2, 3, 5].includes(phaseValue)
              ? 2
              : phaseValue,
          battingTeamId:
            (f as unknown as { battingTeamId?: string | null }).battingTeamId || null,
          originalStatusValue: getStatusValue(f.status),
        };

        if (!isLocalRacquetSport(f.sport)) return fixture;

        try {
          const localDetails = getTemporaryBadmintonFixtureDetails(f.id);
          if (!localDetails) return fixture;

          const enrichedDetails = {
            ...localDetails,
            sport: localDetails.sport ?? f.sport,
            sportId: localDetails.sportId ?? f.sportId,
            homeTeamId: localDetails.homeTeamId ?? f.homeTeamId,
            awayTeamId: localDetails.awayTeamId ?? f.awayTeamId,
            homeTeamName: localDetails.homeTeamName ?? f.homeTeamName,
            awayTeamName: localDetails.awayTeamName ?? f.awayTeamName,
          };
          if (
            !localDetails.sport ||
            !localDetails.sportId ||
            !localDetails.homeTeamId ||
            !localDetails.awayTeamId ||
            !localDetails.homeTeamName ||
            !localDetails.awayTeamName
          ) {
            void saveTemporaryBadmintonFixtureDetails(f.id, enrichedDetails).catch(
              (error: unknown) => console.error("Failed to save racquet fixture details", error),
            );
            localDetailsEnriched = true;
          }

          return {
            ...fixture,
            ...enrichedDetails,
            originalStatusValue: localDetails.statusValue,
          };
        } catch (error: unknown) {
          console.error("Failed to load local racquet fixture details", error);
          if (!localDetailsError) localDetailsError = error;
          return fixture;
        }
      });

      setFixtures(loadedFixtures);
      if (localDetailsEnriched) {
        window.dispatchEvent(new CustomEvent("crickbuzz-live-feeds-refresh"));
      }
      if (localDetailsError) {
        showError(
          "Local data error",
          localDetailsError instanceof Error
            ? localDetailsError.message
            : "Unable to load local racquet fixture details.",
        );
      }
    } catch (error: unknown) {
      console.error("Failed to load fixtures", error);
      showError(
        "Error",
        error instanceof Error ? error.message : "Unable to load fixtures.",
      );
    } finally {
      setLoading(false);
    }
  }

  const getStatusValue = (status: string) => {
    switch (status) {
      case "Scheduled":
        return 0;
      case "Live":
        return 1;
      case "Completed":
        return 2;
      case "Postponed":
        return 3;
      case "Cancelled":
        return 4;
      default:
        return 0;
    }
  };

  const getPhaseValue = (phase: string | null | undefined) => {
    const normalizedPhase = (phase ?? "").toLowerCase().replace(/[\s_-]/g, "");
    switch (normalizedPhase) {
      case "firstinnings":
        return 0;
      case "secondinnings":
        return 1;
      case "firsthalf":
        return 2;
      case "secondhalf":
        return 3;
      case "extratime":
        return 4;
      case "penaltyshootout":
        return 5;
      case "set1":
      case "firstset":
        return 2;
      case "set2":
      case "secondset":
        return 3;
      case "set3":
      case "thirdset":
        return 5;
      default:
        return 0;
    }
  };

  const getStatusName = (statusValue: number) => {
    switch (statusValue) {
      case 1:
        return "Live";
      case 2:
        return "Completed";
      case 3:
        return "Postponed";
      case 4:
        return "Cancelled";
      default:
        return "Scheduled";
    }
  };

  const getRacquetPhaseName = (phaseValue: number) => {
    switch (phaseValue) {
      case 3:
        return "Set2";
      case 5:
        return "Set3";
      default:
        return "Set1";
    }
  };

  const editableStatuses = [0, 5];

  const isEditableStatus = (status: number) =>
    editableStatuses.includes(status);

  const validateRacquetLiveState = (
    fixture: EditableFixture,
    statusValue: number,
    phaseValue: number,
  ) => {
    const score = getTemporaryBadmintonScore(fixture.id);
    assertRacquetSetCanGoLive(
      fixture.sport,
      getStatusName(statusValue),
      getRacquetPhaseName(phaseValue),
      score?.sets ??
        [1, 2, 3].map((setNumber) => ({
          setNumber,
          teamA: 0,
          teamB: 0,
        })),
    );
  };

  const handleChange = (
    index: number,
    field: "statusValue" | "phaseValue" | "battingTeamId",
    value: number | string,
  ) => {
    const currentFixture = fixtures[index];
    if (currentFixture && isLocalRacquetSport(currentFixture.sport)) {
      const nextStatusValue =
        field === "statusValue"
          ? Number(value)
          : currentFixture.statusValue;
      const nextPhaseValue =
        field === "phaseValue"
          ? Number(value)
          : currentFixture.phaseValue;
      if (nextStatusValue === 1) {
        try {
          validateRacquetLiveState(
            currentFixture,
            nextStatusValue,
            nextPhaseValue,
          );
        } catch (error: unknown) {
          showError(
            "Validation Error",
            error instanceof Error
              ? error.message
              : "Unable to update the racquet match status.",
          );
          return;
        }
      }
    }

    setFixtures((prev) => {
      const copy = [...prev];
      copy[index] = {
        ...copy[index],
        [field]: value,
      } as EditableFixture;
      return copy;
    });
  };

  const handleSave = async (fixture: EditableFixture) => {
    if (isLocalRacquetSport(fixture.sport)) {
      try {
        validateRacquetLiveState(
          fixture,
          fixture.statusValue,
          fixture.phaseValue,
        );
        const localDetails = {
          status: getStatusName(fixture.statusValue),
          phase: getRacquetPhaseName(fixture.phaseValue),
          statusValue: fixture.statusValue,
          phaseValue: fixture.phaseValue,
          scheduledAtUtc: fixture.scheduledAtUtc,
          battingTeamId: fixture.battingTeamId ?? null,
          sport: fixture.sport,
          sportId: fixture.sportId,
          homeTeamId: fixture.homeTeamId,
          awayTeamId: fixture.awayTeamId,
          homeTeamName: fixture.homeTeamName,
          awayTeamName: fixture.awayTeamName,
        };
        await saveTemporaryBadmintonFixtureDetails(fixture.id, localDetails);
        setFixtures((prev) =>
          prev.map((currentFixture) =>
            currentFixture.id === fixture.id
              ? {
                  ...currentFixture,
                  ...localDetails,
                  originalStatusValue: fixture.statusValue,
                }
              : currentFixture,
          ),
        );
        await showSuccess("Success", `${fixture.sport} fixture updated successfully.`);
        window.dispatchEvent(new CustomEvent("crickbuzz-live-feeds-refresh"));
        setEditingId(null);
      } catch (error: unknown) {
        console.error("Failed to save racquet fixture details", error);
        loadFixtures();
        showError(
          "Error",
          error instanceof Error
            ? error.message
            : "Unable to save the racquet fixture details.",
        );
      }
      return;
    }

    try {
      const battingTeamId =
        fixture.sport?.toLowerCase() === "football"
          ? null
          : fixture.battingTeamId || null;

      const updated = await fixtureService.updateFixture(
        fixture.id,
        fixture.statusValue,
        fixture.phaseValue,
        fixture.scheduledAtUtc,
        battingTeamId,
      );

      console.log("Updated fixture:=====================>", updated);

      await showSuccess("Success", "Fixture updated successfully.");

      setFixtures((prev) =>
        prev.map((f) =>
          f.id === updated.id
            ? {
                ...f,
                status: updated.status,
                phase: updated.phase,
                statusValue: getStatusValue(updated.status),
                phaseValue: getPhaseValue(updated.phase),
                battingTeamId:
                  (updated as unknown as { battingTeamId?: string })
                    .battingTeamId ?? f.battingTeamId,
              }
            : f,
        ),
      );

      window.dispatchEvent(new CustomEvent("crickbuzz-live-feeds-refresh"));

      setEditingId(null);
    } catch (err: unknown) {
      loadFixtures();
      const error = err as {
        response?: {
          data?: {
            detail?: string;
            errors?: Record<string, string | string[]>;
          };
        };
      };
      const responseData = error.response?.data;
      const validationMessage = responseData?.errors
        ? Object.values(responseData.errors)
            .flat()
            .join(" ")
        : undefined;

      console.log(
        "Error updating fixture:=====================>",
        error.response || error,
      );
      showError(
        "Error",
        validationMessage || responseData?.detail || "Unable to update fixture.",
      );
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Delete this fixture?")) return;

    try {
      await fixtureService.deleteFixture(id);
      showSuccess("Success", "Fixture deleted successfully.");
      setFixtures((prev) => prev.filter((x) => x.id !== id));
    } catch (err) {
      showError("Error", "Unable to delete fixture.");
      console.error(err);
      alert("Unable to delete fixture.");
    }
  };

  if (loading) return <Loader label="Loading fixtures..." fullWidth />;

  return (
    <div className="fixture-list">
      <div className="fixture-header">
        <h2>NVian Fixtures</h2>
        <span>{fixtures.length}</span>
      </div>

      {fixtures.map((fixture, index) => (
        <FixtureListItem
          key={fixture.id}
          fixture={fixture}
          index={index}
          editingId={editingId}
          setEditingId={setEditingId}
          handleDelete={handleDelete}
          handleChange={handleChange}
          handleSave={handleSave}
        />
      ))}
    </div>
  );
}