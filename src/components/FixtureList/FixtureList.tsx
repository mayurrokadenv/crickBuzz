import { useEffect, useState } from "react";
import "./FixtureList.css";
import useScoreUpdateFeed from "../../hooks/useScoreUpdateFeed";
import { fixtureService, type Fixture } from "../../services/fixturesservice";
import { showError, showSuccess } from "../../services/common/AlertService";
import Loader from "../Loader/Loader";

type EditableFixture = Omit<Fixture, "battingTeamId"> & {
  homeOvers?: string;
  awayOvers?: string;
  statusValue: number;
  phaseValue: number;
  battingTeamId?: string;
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

  const { scoreByMatch } = useScoreUpdateFeed(String(fixture.id));

  console.log(
    "FixtureListItem: Score updates in FixtureListItem:====================>",
    scoreByMatch,
  );
  const realtime = fixture.id ? scoreByMatch[String(fixture.id)] : undefined;

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
                  <option value={0}>First Half</option>
                  <option value={1}>Second Half</option>
                  <option value={2}>Extra Time</option>
                  <option value={3}>Penalty Shootout</option>
                </>
              ) : fixture.sport?.toLowerCase() === "hockey" ? (
                <>
                  <option value={0}>First Half</option>
                  <option value={1}>Second Half</option>
                  <option value={2}>Shootout</option>
                </>
              ) : (
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
            <button className="cancel" onClick={() => setEditingId(null)}>
              Cancel
            </button>

            <button className="save" onClick={() => handleSave(fixture)}>
              Save
            </button>
          </div>
        </div>
      ) : (
        <div className="fixture-item">
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

            <div className="fixture-score">
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
      setFixtures(
        data.map((f) => ({
          ...f,
          statusValue: getStatusValue(f.status),
          phaseValue: getPhaseValue(f.phase),
          battingTeamId:
            (f as unknown as { battingTeamId?: string }).battingTeamId ?? "",
          originalStatusValue: getStatusValue(f.status),
        })),
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

  const getPhaseValue = (phase: string) => {
    switch (phase) {
      case "FirstInnings":
        return 0;
      case "SecondInnings":
        return 1;
      case "FirstHalf":
        return 2;
      case "SecondHalf":
        return 3;
      case "ExtraTime":
        return 4;
      case "PenaltyShootout":
        return 5;
      default:
        return 0;
    }
  };

  const editableStatuses = [0, 5];

  const isEditableStatus = (status: number) =>
    editableStatuses.includes(status);

  const handleChange = (
    index: number,
    field: "statusValue" | "phaseValue" | "battingTeamId",
    value: number | string,
  ) => {
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
    try {
      const updated = await fixtureService.updateFixture(
        fixture.id,
        fixture.statusValue,
        fixture.phaseValue,
        fixture.scheduledAtUtc,
        fixture.battingTeamId ?? "",
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
        response?: { data?: { detail?: string } };
      };
      console.log(
        "Error updating fixture:=====================>",
        error.response || error,
      );
      showError(
        "Error",
        error.response?.data?.detail || "Unable to update fixture.",
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