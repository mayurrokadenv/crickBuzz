import "./RecentEntries.css";
import { useEffect, useState } from "react";
import {
  getCommentary,
  updateCommentary,
  type CommentaryEntry,
} from "../../services/liveservice";
import { showError, showSuccess } from "../../services/common/AlertService";

interface Entry {
  id: string;
  player: string;
  event: string;
  time: string;
  comment?: string;
}

interface RecentEntriesProps {
  fixtureId: string | null;
  refreshTrigger?: number;
}

function mapEntry(item: CommentaryEntry): Entry {
  return {
    id: item.id,
    player: item.playerName,
    event: item.action?.toUpperCase() ?? "",
    time: new Date(item.createdAtUtc).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    }),
    comment: item.note || undefined,
  };
}

function RecentEntries({ fixtureId, refreshTrigger }: RecentEntriesProps) {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editData, setEditData] = useState<Entry | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);

  // console.log("FIXTUREID====================>", fixtureId);
  // console.log("CommentaryData==================>", entries);
  // console.log("editData===========>", editData);

  const updateCommentarys = async () => {
    if (!fixtureId || !editData) return;

    setIsUpdating(true);
    try {
      // Only send the comment update
      const res = await updateCommentary(fixtureId, editData.id, {
        note: editData.comment || "",
      });

      console.log("Response===========>", res);

      // Update local state with the new comment
      setEntries(
        entries.map((item) =>
          item.id === editData.id
            ? { ...item, comment: editData.comment }
            : item,
        ),
      );

      // Close edit mode
      setEditingId(null);
      setEditData(null);

      showSuccess("Success", `Commentary updated for ${editData.player}`);
    } catch (e: any) {
      console.error("RecentEntries.tsx: Error updateCommentary======>", e);
      console.error("RecentEntries.tsx: Error updateCommentary full======>", e);
      showError("Error", "Failed to update commentary. Please try again.");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleSaveEdit = () => {
    if (!editData) return;
    updateCommentarys();
  };

  useEffect(() => {
    if (!fixtureId) {
      setEntries([]);
      return;
    }

    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await getCommentary(fixtureId);
        if (!cancelled) {
          setEntries(data.map(mapEntry));
        }
      } catch (e) {
        console.error("RecentEntries: Error fetching commentary:", e);
        if (!cancelled) setError("Failed to load commentary.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [fixtureId, refreshTrigger]);

  const getBallColor = (event: string) => {
    switch (event.toUpperCase()) {
      case "SIX":
      case "WICKET":
        return "orange";
      case "FOUR":
      case "SINGLE":
      case "DOUBLE":
      case "WIDE":
      default:
        return "blue";
    }
  };

  const handleEditClick = (item: Entry) => {
    setEditingId(item.id);
    setEditData({ ...item });
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditData(null);
  };

  const handleInputChange = (field: keyof Entry, value: string) => {
    if (editData) {
      setEditData({ ...editData, [field]: value });
    }
  };

  return (
    <div className="mainComponent">
      <div className="mainHeader">
        <div className="mainHeaderTop">
          <h3>RECENT ENTRIES</h3>
          <p>{entries.length}</p>
        </div>
        <span className="mainHeaderSubtitle">
          Latest commentary for this fixture, most recent first.
        </span>
      </div>

      <div className="divider"></div>

      <div className="recentList">
        {!fixtureId && (
          <div className="empty-state">Select a match to see commentary.</div>
        )}
        {loading && <div className="loading-state">Loading commentary...</div>}
        {error && <div className="error-state">{error}</div>}
        {fixtureId && !loading && !error && entries.length === 0 && (
          <div className="empty-state">
            No commentary yet — post one from the left panel.
          </div>
        )}

        {entries.map((item) => (
          <div className="entry" key={item.id}>
            <div className="content">
              {editingId === item.id && editData ? (
                <div className="editModeContainer">
                  <div className="editHeader">
                    <div className="editPlayerInfo">
                      <div
                        className={`playerBall ${getBallColor(editData.event)}`}
                      ></div>
                      <div className="editTextContainer">
                        <div className="editPlayerInput">
                          {/* Read-only player name */}
                          <span className="editPlayerNameDisplay">
                            <strong>{editData.player}</strong>
                          </span>
                          <span className="editSeparator">·</span>
                          {/* Read-only event */}
                          <span className="editEventDisplay">
                            {editData.event}
                          </span>
                        </div>
                        <span className="editTime">{editData.time}</span>
                      </div>
                    </div>
                    <button className="close-btn" onClick={handleCancelEdit}>
                      ×
                    </button>
                  </div>

                  <div className="editCommentSection">
                    <textarea
                      value={editData.comment || ""}
                      onChange={(e) =>
                        handleInputChange("comment", e.target.value)
                      }
                      className="editCommentInput"
                      placeholder="Edit comment..."
                      rows={3}
                      autoFocus
                    />
                  </div>

                  <div className="editActionsRow">
                    <div className="editButtons">
                      <button
                        className="cancelEditBtn"
                        onClick={handleCancelEdit}
                        disabled={isUpdating}
                      >
                        Cancel
                      </button>
                      <button
                        className="saveEditBtn"
                        onClick={handleSaveEdit}
                        disabled={isUpdating}
                      >
                        {isUpdating ? "Saving..." : "Save Comment"}
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="subContent">
                  <div className="contentHeader">
                    <div
                      className={`playerBall ${getBallColor(item.event)}`}
                    ></div>
                    <div className="textContainer">
                      <p className="playerText">
                        <strong>{item.player}</strong> · {item.event}
                        {item.comment && (
                          <span className="comment"> - {item.comment}</span>
                        )}
                      </p>
                      <span className="time">{item.time}</span>
                    </div>
                  </div>
                  <div className="actionButtons">
                    <button
                      className="edit-btn"
                      onClick={() => handleEditClick(item)}
                      disabled={isUpdating}
                    >
                      ✎ Edit
                    </button>
                    <button className="close-btn">×</button>
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default RecentEntries;
