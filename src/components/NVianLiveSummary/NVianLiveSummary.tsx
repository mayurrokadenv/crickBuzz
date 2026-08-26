import { useEffect, useState } from "react";
import { getFixtureMatchDetails } from "../../services/MatchDataService";
import useScoreUpdateFeed from "../../hooks/useScoreUpdateFeed";
import { useCommentaryFeed } from "../../hooks/useCommentaryFeed";
import type { FixtureDetailsDto } from "../types/FixtureDetails";
import "./NVianLiveSummary.css";

type Props = {
  fixtureId?: string;
};

function NVianLiveSummary({ fixtureId }: Props) {
  const [fixture, setFixture] = useState<FixtureDetailsDto | null>(null);
  const { scoreByMatch } = useScoreUpdateFeed(fixtureId ?? "");
  const { commentaryByMatch } = useCommentaryFeed(fixtureId ?? "");
  const liveCommentary = fixtureId ? commentaryByMatch[fixtureId] : undefined;
  const realtime = fixtureId ? scoreByMatch[fixtureId] : undefined;

  useEffect(() => {
    if (!fixtureId) {
      setFixture(null);
      return;
    }

    let cancelled = false;
    getFixtureMatchDetails(fixtureId)
      .then((response) => {
        if (!cancelled) setFixture(response);
      })
      .catch((error) => console.error("Failed to load live summary", error));

    return () => {
      cancelled = true;
    };
  }, [fixtureId]);

  if (!fixtureId) return null;

  if (!fixture) {
    return (
      <section className="nvian-live-summary">
        <div className="nvian-live-summary__item">
          <span>Live match summary</span>
          <strong>Loading...</strong>
        </div>
      </section>
    );
  }

  const comments = liveCommentary
    ? [...fixture.commentary, liveCommentary]
    : fixture.commentary;
  const latestWicket = [...comments]
    .filter((comment) => comment.action.toLowerCase() === "wicket")
    .sort(
      (first, second) =>
        new Date(second.createdAtUtc).getTime() -
        new Date(first.createdAtUtc).getTime(),
    )[0];
  const performers = fixture.topPerformers ?? [];
  const partnershipRuns = performers
    .slice(0, 2)
    .reduce((total, performer) => total + (performer.runsScored ?? 0), 0);
  const partnershipBalls = comments.filter(
    (comment) => comment.action.toLowerCase() !== "wicket",
  ).length;
  const score = realtime?.homeScore ?? fixture.homeScore;
  const wickets = realtime?.homeWickets ?? fixture.homeWickets ?? 0;

  return (
    <section className="nvian-live-summary">
      <div className="nvian-live-summary__item">
        <span>Partnership</span>
        <strong>
          {partnershipRuns} runs ({partnershipBalls} balls)
        </strong>
      </div>
      <div className="nvian-live-summary__item">
        <span>Last Wicket</span>
        <strong>
          {latestWicket
            ? `${latestWicket.playerName} (${score}/${wickets})`
            : "No wicket yet"}
        </strong>
      </div>
    </section>
  );
}

export default NVianLiveSummary;
