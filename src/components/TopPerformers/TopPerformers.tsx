import "./TopPerformers.css";
import { useEffect, useState } from "react";
import { getTopPerformers } from "../../services/MatchDataService";

export interface Performer {
  rank: number;
  name: string;
  team: string;
  score: number;
  color: string;
}

type Props = {
  fixtureId: string;
};

function TopPerformers({ fixtureId }: Props) {
  const [performers, setPerformers] = useState<Performer[]>([]);

  useEffect(() => {
    if (!fixtureId) return;

    const loadPerformers = async () => {
      try {
        const response = await getTopPerformers(fixtureId);

        const colors = [
          "#d1d984",
          "#2F80ED",
          "#F5A623",
          "#6eed2f",
        ];

        const mapped = response.map((player, index) => ({
          rank: index + 1,
          name: player.playerName,
          team: player.teamName,
          score: player.runsScored,
          color: colors[index] ?? "#933e78",
        }));

        setPerformers(mapped);
      } catch (error) {
        console.error("Failed to load performers", error);
      }
    };

    loadPerformers();
  }, [fixtureId]);

  return (
    <div className="top-performers-card">
      <div className="tp-header">
        <h4>TOP PERFORMERS</h4>
      </div>

      <div className="tp-body">
        {performers.length > 0 ? (
          performers.map((player) => (
            <div className="tp-row" key={player.rank}>
              <div
                className="tp-rank"
                style={{ backgroundColor: player.color }}
              >
                {player.rank}
              </div>

              <div className="tp-player">
                <div className="tp-name">
                  {player.name}
                </div>

                <div
                  className="tp-team"
                  style={{ color: player.color }}
                >
                  {player.team}
                </div>
              </div>

              <div className="tp-score">
                {player.score}
              </div>
            </div>
          ))
        ) : (
          <div className="no-data">
            No data available
          </div>
        )}
      </div>
    </div>
  );
}

export default TopPerformers;