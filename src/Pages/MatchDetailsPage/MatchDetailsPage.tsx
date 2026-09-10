import "./MatchDetailsPage.css";

import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import NVianCommentary from "../../components/Commentary/NVianCommentary";
import MatchHeader from "../../components/MatchDetails/MatchHeader";
import MatchSummary from "../../components/MatchDetails/MatchSummary";
import MatchStats from "../../components/MatchDetails/MatchStats";
import MatchTabs, {
  type MatchTab,
} from "../../components/MatchDetails/MatchTabs";
import MatchInfo from "../../components/MatchDetails/MatchInfo";
import MatchCommentary from "../../components/MatchDetails/MatchCommentary";
import ScoreCard from "../../components/MatchDetails/ScoreCard";
import LiveMatchDetails from "../../components/MatchDetails/LiveMatchDetails";
import type { MatchCommentaryModel } from "../../components/types/MatchDetailsModel";
import type { CricbuzzScorecardResponse } from "../../components/types/CricbuzzScorecard";

import { getMatchDetails } from "../../services/common/MatchDetailsService";
import { useLocation, useSearchParams } from "react-router-dom";

import {
  getCricbuzzScorecard,
  getFixtureMatchDetails, // GET api/fixtures/{fixtureId}
} from "../../services/MatchDataService";

import type {
  MatchDetailsModel,
  MatchSource,
} from "../../components/types/MatchDetailsModel";
import FixtureScoreCard, {
  type FixtureScorecard,
} from "../../components/MatchDetails/FixtureScorecard";

function MatchDetailsPage() {
  const { matchId } = useParams();

  const { pathname, state } = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();

  const source: MatchSource = pathname.startsWith("/fixture")
    ? "fixture"
    : "cricbuzz";
  const showStats = (state as { dashboard?: string } | null)?.dashboard !== "nvian";

  const [matchDetails, setMatchDetails] = useState<MatchDetailsModel | null>(
    null,
  );

  const [scorecard, setScorecard] = useState<CricbuzzScorecardResponse | null>(
    null,
  );

  const [fixtureScorecard, setFixtureScorecard] =
    useState<FixtureScorecard | null>(null);

  const requestedTab = searchParams.get("tab");
  const initialTab: MatchTab =
    requestedTab === "Scorecard" || requestedTab === "Commentary"
      ? requestedTab
      : requestedTab === "Stats" && showStats
        ? "Stats"
        : "Live";
  const [activeTab, setActiveTab] = useState<MatchTab>(initialTab);

  useEffect(() => {
    const nextTab: MatchTab =
      requestedTab === "Scorecard" || requestedTab === "Commentary"
        ? requestedTab
        : requestedTab === "Stats" && showStats
          ? "Stats"
          : "Live";

    setActiveTab((currentTab) =>
      currentTab === nextTab ? currentTab : nextTab,
    );
  }, [requestedTab]);

  const handleTabChange = (tab: MatchTab) => {
    setActiveTab(tab);
    setSearchParams({ tab }, { replace: true });
  };

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [scorecardLoading, setScorecardLoading] = useState(false);
  const [scorecardError, setScorecardError] = useState<string | null>(null);

  const [fixtureScorecardLoading, setFixtureScorecardLoading] = useState(false);
  const [fixtureScorecardError, setFixtureScorecardError] = useState<
    string | null
  >(null);

  // ---------- LOAD MATCH DETAILS (initial request) ----------
  useEffect(() => {
    let ignore = false;

    const loadMatchDetails = async () => {
      if (!matchId) {
        setError("Invalid match ID");
        setLoading(false);
        return;
      }

      if (source === "cricbuzz" && Number.isNaN(Number(matchId))) {
        setError("Invalid match ID");
        setLoading(false);
        return;
      }

      try {
        if (!matchDetails) {
          setLoading(true);
        }

        setError(null);

        const response = await getMatchDetails(matchId, source);

        if (!ignore) {
          setMatchDetails(response);
        }
      } catch (error) {
        console.error("Failed to load match details", error);

        if (!ignore) {
          setError("Failed to load match details");
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    };

    loadMatchDetails();

    return () => {
      ignore = true;
    };
  }, [matchId, source]);

  // ---------- LOAD SCORECARD for Cricbuzz (only on Scorecard tab) ----------
  useEffect(() => {
    if (activeTab !== "Scorecard") return;
    if (source !== "cricbuzz") return;
    if (!matchId || Number.isNaN(Number(matchId))) return;

    let ignore = false;

    const loadScorecard = async () => {
      try {
        setScorecardLoading(true);
        setScorecardError(null);

        const response = await getCricbuzzScorecard(Number(matchId));

        if (!ignore) {
          setScorecard(response);
        }
      } catch (error) {
        console.error("Failed to load scorecard", error);

        if (!ignore) {
          setScorecardError("Scorecard is not available yet.");
        }
      } finally {
        if (!ignore) {
          setScorecardLoading(false);
        }
      }
    };

    loadScorecard();

    return () => {
      ignore = true;
    };
  }, [activeTab, matchId, source]);

  // ---------- LOAD SCORECARD for Fixture (always, regardless of tab) ----------
  useEffect(() => {
    // Only for fixture matches
    if (source !== "fixture") return;
    if (!matchId) return;

    let ignore = false;

    const loadFixtureScorecard = async () => {
      try {
        setFixtureScorecardLoading(true);
        setFixtureScorecardError(null);

        const response = await getFixtureMatchDetails(matchId);

        if (!ignore) {
          setFixtureScorecard(response as unknown as FixtureScorecard);
        }
      } catch (error) {
        console.error("Failed to load fixture scorecard", error);

        if (!ignore) {
          setFixtureScorecardError("Scorecard is not available yet.");
        }
      } finally {
        if (!ignore) {
          setFixtureScorecardLoading(false);
        }
      }
    };

    loadFixtureScorecard();

    return () => {
      ignore = true;
    };
  }, [matchId, source]); // No dependency on activeTab – loads on mount

  // ---------- PAGE STATES ----------
  if (loading) {
    return (
      <div className="match-details-page__state">Loading match details...</div>
    );
  }

  if (error) {
    return <div className="match-details-page__state">{error}</div>;
  }

  if (!matchDetails) {
    return (
      <div className="match-details-page__state">Match details not found.</div>
    );
  }

  // =========================================================
  // TAB CONTENT
  // =========================================================

  const renderTabContent = () => {
    switch (activeTab) {
      // -------------------------------------------------------
      // LIVE
      // -------------------------------------------------------
      case "Live": {
        if (!matchDetails.live) {
          return (
            <div className="match-details-page__state">
              {matchDetails.header?.status ||
                "Match has not started yet. Live score will be available once play begins."}
            </div>
          );
        }

        // Show only the current batsmen and bowler – do NOT pass scorecards
        return (
          <LiveMatchDetails
            live={matchDetails.live}
            fixtureId={matchId ?? ""}
          />
        );
      }

      // -------------------------------------------------------
      // SCORECARD
      // -------------------------------------------------------
      case "Scorecard": {
        // ---- FIXTURE MATCHES ----
        if (source === "fixture") {
          if (fixtureScorecardLoading) {
            return (
              <div className="match-details-page__state">
                Loading scorecard...
              </div>
            );
          }

          if (fixtureScorecardError) {
            return (
              <div className="match-details-page__state">
                {fixtureScorecardError}
              </div>
            );
          }

          if (!fixtureScorecard) {
            return (
              <div className="match-details-page__state">
                Scorecard is not available yet.
              </div>
            );
          }

          return <FixtureScoreCard fixture={fixtureScorecard} />;
        }

        // ---- CRICBUZZ MATCHES ----
        if (scorecardLoading) {
          return (
            <div className="match-details-page__state">
              Loading scorecard...
            </div>
          );
        }

        if (scorecardError) {
          return (
            <div className="match-details-page__state">{scorecardError}</div>
          );
        }

        if (!scorecard) {
          return (
            <div className="match-details-page__state">
              Scorecard is not available yet.
            </div>
          );
        }

        if (!scorecard.scoreCard?.length) {
          return (
            <div className="match-details-page__state">
              Scorecard will be available once the match begins.
            </div>
          );
        }

        return <ScoreCard scorecards={scorecard.scoreCard as any} />;
      }

      // -------------------------------------------------------
      // COMMENTARY
      // -------------------------------------------------------
      case "Commentary": {
        if (source === "fixture") {
          return (
            <NVianCommentary
              fixtureId={matchId}
              title={matchDetails.header.matchDescription}
            />
          );
        }

        if (
          !matchDetails.commentary ||
          Object.keys(matchDetails.commentary).length === 0
        ) {
          return (
            <div className="match-details-page__state">
              Commentary will be available once the match begins.
            </div>
          );
        }

        return <MatchCommentary commentary={matchDetails.commentary} />;
      }

      // -------------------------------------------------------
      // STATS
      // -------------------------------------------------------
      case "Stats":
        if (!showStats) {
          return <div className="match-details-page__state">Live</div>;
        }

        if (!matchDetails.live) {
          return (
            <div className="match-details-page__state">
              Stats will be available once the match begins.
            </div>
          );
        }

        return <MatchStats live={matchDetails.live} />;

      default:
        return null;
    }
  };

  // =========================================================
  // UI
  // =========================================================

  return (
    <main className="match-details-page">
      <MatchHeader header={matchDetails.header} />

      {matchDetails.live ? (
        <MatchSummary header={matchDetails.header} live={matchDetails.live} />
      ) : (
        <div className="match-details-page__state">
          {matchDetails.header?.status || "Match has not started yet."}
        </div>
      )}

      <MatchTabs
        activeTab={activeTab}
        onTabChange={handleTabChange}
        showStats={showStats}
      />

      <section className="match-details-page__content">
        <div className="match-details-page__left">{renderTabContent()}</div>

        <aside className="match-details-page__right">
          <MatchInfo header={matchDetails.header} />
        </aside>
      </section>
    </main>
  );
}

export default MatchDetailsPage;