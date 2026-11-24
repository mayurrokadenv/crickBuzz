import { useEffect, useState } from "react";
import {
    createTeam,
    TEAM_FORMATS,
    type Team,
    type TeamFormat,
    updateTeam,
} from "../../../services/TeamService";
import AddSportDialog from "./AddSportDialog";
import "./CreateTeam.css";
import { type Sport, getSports, createSport } from "../../../services/SportService";
import { showError, showSuccess, showWarning } from "../../../services/common/AlertService";
import { useTeamSportPlayerData } from "../../../context/TeamSportPlayerContext";

interface CreateTeamProps {
    team?: Team | null;
    isDialog?: boolean;
    onClose?: () => void;
    onSaveSuccess?: () => void;
}

const CreateTeam: React.FC<CreateTeamProps> = ({
    team,
    isDialog = false,
    onClose,
    onSaveSuccess
}) => {
const [teamName, setTeamName] = useState("");
const [selectedColor, setSelectedColor] = useState("#9B5DE5");
const [showSportDialog, setShowSportDialog] = useState(false);
const [selectedSport, setSelectedSport] = useState("");
const [selectedFormat, setSelectedFormat] = useState<TeamFormat | "">("");
const { loadTeams, sports, loadSports, } = useTeamSportPlayerData();

  useEffect(() => {
  loadSports();
      if (team) {
        setTeamName(team.teamName);
        setSelectedSport(team.sportId);
        setSelectedColor(team.color);
        setSelectedFormat(team.format ?? "");
    }
    else {
        setTeamName("");
        setSelectedSport("");
        setSelectedColor("");
        setSelectedFormat("");
    }
}, [team]);

const isRacquetSport = ["badminton", "pickleball"].includes(
    sports.find((sport) => sport.id === selectedSport)?.name.toLowerCase() ?? ""
);
const requiresFormat = isRacquetSport && (!team || Boolean(team.format));
  const colors = [
    "#9B5DE5",
    "#F9A826",
    "#3B82F6",
    "#22C55E",
    "#FF3B5C",
  ];
const handleAddSport = async (
    name: string,
    description: string
) => {

    try {

        var response = await createSport({
            name,
            description
        });

        if(response.success)
           await showSuccess(
             "Success",
             response.message
           );
        else
           showError(
             "Error",
             response.message || response.error?.message
           );

        // Reload dropdown
        await loadSports();

        setShowSportDialog(false);

    } catch (err) {
    if (err instanceof Error) {
        showError(
           "Error",
           err.message
        );
    } else {
        showError(
           "Error",
           "Something went wrong."
        );
    }
  }
};
const handleCreateTeam = async () => {

    if (!teamName.trim()) {
        showWarning(
           "Error",
           "Please enter team name."
        );
        return;
    }

    if (!selectedSport) {
        showWarning(
           "Error",
           "Please select a sport."
        );
        return;
    }

    const format = TEAM_FORMATS.find((item) => item === selectedFormat);
    if (requiresFormat && !format) {
        showWarning("Error", "Please select a team format.");
        return;
    }

    if (!selectedColor) {
        showWarning(
           "Error",
           "Please select a team color."
        );
        return;
    }
    try {
        if (team) {
            var response = await updateTeam({
                id: team.id,
                name: teamName,
                sportId: selectedSport,
                colorHex: selectedColor,
                format: isRacquetSport ? format : undefined,
            });

            if(response.success)
               await showSuccess(
                 "Success",
                 response.message
               );
            else
               showError(
                 "Error",
                 response.message || response.error?.message
               );

        } else {
            var teamResponse = await createTeam({
                name: teamName,
                sportId: selectedSport,
                colorHex: selectedColor,
                format: isRacquetSport ? format : undefined,
            });

           if(teamResponse.success)
              await showSuccess(
                "Success",
                teamResponse.message
              );
           else
              showError(
                "Error",
                teamResponse.message || teamResponse.error?.message
              );

              onSaveSuccess?.();  

            // Clear form
            setTeamName("");
            setSelectedSport("");
            setSelectedColor("");
            setSelectedFormat("");
        }
      await loadTeams();

        if (isDialog)
            onClose?.();

    } catch (error) {
        showError(
          "Error",
          error instanceof Error ? error.message : "Unable to create team."
        );
        console.error(error);
    }
};

  return (
    <div className="create-team-card">
      <h3>{team ? "EDIT TEAM" : "CREATE TEAM"}</h3>

      <p className="sub-title">
        Register a team under the sport it competes in.
      </p>

      <div className="form-group">
        <label>TEAM NAME</label>

        <input
          type="text"
          placeholder="e.g. NVian Strikers"
          value={teamName}
          onChange={(e) => setTeamName(e.target.value)}
        />
      </div>

      <div className="form-group">
<div className="sport-color-header">
  <label>SPORT</label>
  <label>COLOR</label>
</div>

        <div className="sport-color-row">
            <div className="sport-container">
    <select
        value={selectedSport}
        onChange={(e) => {
    setSelectedSport(e.target.value);
    setSelectedFormat("");
        }}
        disabled={team !== null}
    >
        <option value="" disabled>
            Select Sport
        </option>
    
        {sports.map((sport) => (
            <option key={sport.id} value={sport.id}>
                {sport.name}
            </option>
        ))}
    </select>
       {!team && (
         <button
            type="button"
            className="add-sport-btn"
            onClick={() => setShowSportDialog(true)}
            title="Add Sport"
          >
            + 
          </button>
        )}
    </div>
          <div className="color-section">
            

            <div className="color-list">
              {colors.map((color) => (
                <div
                  key={color}
                  className={`color-circle ${
                    selectedColor === color ? "active" : ""
                  }`}
                  style={{ background: color }}
                  onClick={() => setSelectedColor(color)}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      {isRacquetSport && (
        <div className="form-group">
          <label htmlFor="team-format">
            FORMAT{requiresFormat ? " *" : ""}
          </label>
          <select
            id="team-format"
            value={selectedFormat}
            required={requiresFormat}
            onChange={(e) =>
              setSelectedFormat(
                TEAM_FORMATS.find((item) => item === e.target.value) ?? ""
              )
            }
          >
            <option value="">Select Format</option>
            {TEAM_FORMATS.map((format) => (
              <option key={format} value={format}>
                {format}
              </option>
            ))}
          </select>
        </div>
      )}

      <button
        className="create-btn"
        onClick={handleCreateTeam}
      >
        {team ? "Update Team" : "+ Create Team"}
      </button>
<AddSportDialog
    open={showSportDialog}
    onClose={() => setShowSportDialog(false)}
    onSave={handleAddSport}
/>
    </div>
  );
};

export default CreateTeam;