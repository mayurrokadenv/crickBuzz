import { useEffect, useState } from "react";
import "./FixtureList.css";
import useScoreUpdateFeed from "../../hooks/useScoreUpdateFeed";
import { fixtureService, type Fixture } from "../../services/fixturesservice";
import { showError, showSuccess } from "../../services/common/AlertService";

interface EditableFixture extends Fixture {
  homeOvers?: string;
  awayOvers?: string;
  statusValue: number;
  phaseValue: number;
}
interface FixtureListProps {
  refreshKey: number;
}

function FixtureListItem({
  fixture,
  index,
  editingId,
  setEditingId,
  handleDelete,
  handleDateChange,
  handleChange,
  handleSave,
}: {
  fixture: EditableFixture;
  index: number;
  editingId: string | null;
  setEditingId: (id: string | null) => void;
  handleDelete: (id: string) => Promise<void>;
  handleDateChange: (index: number, value: string) => void;
  handleChange: (
    index: number,
    field: "statusValue" | "phaseValue",
    value: number,
  ) => void;
  handleSave: (fixture: EditableFixture) => Promise<void>;
}) {
  // Live fixtures should remain editable as admin users may need to adjust
  // phase/status after a match has started.
  const canEdit = [0, 1, 5].includes(fixture.statusValue);
  const hideActions = fixture.statusValue === 2 || fixture.statusValue === 4;

  // Call the score feed hook the same way LiveMatchDetails does: pass
  // the fixture id only (hook joins the correct group).
  const { scoreByMatch } = useScoreUpdateFeed(String(fixture.id));

  const realtime = fixture.id ? scoreByMatch[String(fixture.id)] : undefined;

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
              value={fixture.scheduledAtUtc.substring(0, 16)}
              disabled={!canEdit}
              onChange={(e) => handleDateChange(index, e.target.value)}
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
                  {/* <option value={2}>First Half</option>
                  <option value={3}>Second Half</option>
                  <option value={4}>Extra Time</option>
                  <option value={5}>Penalty Shootout</option> */}
                </>
              )}
            </select>
          </div>

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
                {new Date(fixture.scheduledAtUtc).toLocaleString()} •{" "}
                {fixture.phase} • {fixture.status}
              </p>
            </div>

            <div className="fixture-score">
              <strong>
                {`${realtime?.homeScore ?? fixture.homeScore}/${realtime?.homeWickets ?? fixture.homeWickets ?? 0} (${realtime?.homeOvers ?? fixture.homeOvers ?? "0.0"})`}
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
    field: "statusValue" | "phaseValue",
    value: number,
  ) => {
    setFixtures((prev) => {
      const copy = [...prev];
      copy[index] = {
        ...copy[index],
        [field]: value,
      };
      return copy;
    });
  };

  const handleDateChange = (index: number, value: string) => {
    const copy = [...fixtures];
    copy[index] = {
      ...copy[index],
      scheduledAtUtc: value,
    };

    setFixtures(copy);
  };

  const handleSave = async (fixture: EditableFixture) => {
    try {
      const updated = await fixtureService.updateFixture(
        fixture.id,
        fixture.statusValue,
        fixture.phaseValue,
        fixture.scheduledAtUtc,
      );

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
              }
            : f,
        ),
      );

      setEditingId(null);
    } catch (err) {
      loadFixtures();
      showError("Error", "Update failed");
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Delete this fixture?")) return;

    try {
      await fixtureService.deleteFixture(id);

      setFixtures((prev) => prev.filter((x) => x.id !== id));
    } catch (err) {
      console.error(err);
      alert("Unable to delete fixture.");
    }
  };

  if (loading) return <p>Loading...</p>;

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
          handleDateChange={handleDateChange}
          handleChange={handleChange}
          handleSave={handleSave}
        />
      ))}
    </div>
  );
}
