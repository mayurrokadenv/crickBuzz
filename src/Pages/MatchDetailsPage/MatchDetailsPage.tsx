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
import { useCommentaryFeed } from "../../hooks/useCommentaryFeed";
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

//import type {CricbuzzScorecardResponse} from "../../components/types/CricbuzzScorecard";

function MatchDetailsPage() {
  const { matchId } = useParams();

  const { pathname } = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();

  const source: MatchSource = pathname.startsWith("/fixture")
    ? "fixture"
    : "cricbuzz";

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
    requestedTab === "Scorecard" ||
    requestedTab === "Commentary" ||
    requestedTab === "Stats"
      ? requestedTab
      : "Live";
  const [activeTab, setActiveTab] = useState<MatchTab>(initialTab);

  useEffect(() => {
    const nextTab: MatchTab =
      requestedTab === "Scorecard" ||
      requestedTab === "Commentary" ||
      requestedTab === "Stats"
        ? requestedTab
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

  // LOAD MATCH DETAILS

  useEffect(() => {
    let ignore = false;
    let timeoutId: number;

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
        // Sirf first load pe loader dikhao
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

          // Next poll after 1 minute
          timeoutId = window.setTimeout(loadMatchDetails, 60000);
        }
      }
    };

    loadMatchDetails();

    return () => {
      ignore = true;
      clearTimeout(timeoutId);
    };
  }, [matchId, source]);

  // When user switches to Live tab, fetch latest match details immediately
  useEffect(() => {
    if (activeTab !== "Live") return;
    if (!matchId) return;

    let ignore = false;

    const refresh = async () => {
      try {
        const response = await getMatchDetails(matchId, source);
        if (!ignore) setMatchDetails(response);
      } catch (err) {
        console.error("Failed to refresh match details on tab switch", err);
      }
    };

    refresh();

    return () => {
      ignore = true;
    };
  }, [activeTab, matchId, source]);

  // LOAD SCORECARD Only when Scorecard tab is opened (Cricbuzz matches)

  useEffect(() => {
    // Don't call API until Scorecard tab is selected
    if (activeTab !== "Scorecard") {
      return;
    }

    // Scorecard sirf Cricbuzz ke liye hai
    if (source !== "cricbuzz") {
      return;
    }

    // Invalid match ID
    if (!matchId || Number.isNaN(Number(matchId))) {
      return;
    }

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

  // LOAD SCORECARD Only when Scorecard tab is opened (Fixture matches)

  useEffect(() => {
    // Don't call API until Scorecard tab is selected
    if (activeTab !== "Scorecard") {
      return;
    }

    // Scorecard sirf fixture matches ke liye
    if (source !== "fixture") {
      return;
    }

    if (!matchId) {
      return;
    }

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
  }, [activeTab, matchId, source]);

  // PAGE STATES

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

      case "Live":
        if (!matchDetails.live) {
          return (
            <div className="match-details-page__state">
              {matchDetails.header?.status ||
                "Match has not started yet. Live score will be available once play begins."}
            </div>
          );
        }

        return (
          <LiveMatchDetails
            live={matchDetails.live}
            fixtureId={matchId ?? ""}
          />
        );

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
        if (!matchDetails.live) {
          return (
            <div className="match-details-page__state">
              Stats will be available once the match begins.
            </div>
          );
        }

        return <MatchStats live={matchDetails.live} />;

      // -------------------------------------------------------
      // SQUADS
      // -------------------------------------------------------

      // case "Squads":
      //   return (
      //     <div className="match-details-page__state">Squads coming next...</div>
      //   );

      default:
        return null;
    }
  };

  // =========================================================
  // UI
  // =========================================================

  return (
    <main className="match-details-page">
      {/* MATCH HEADER */}

      <MatchHeader header={matchDetails.header} />

      {/* MATCH SUMMARY */}

      {matchDetails.live ? (
        <MatchSummary header={matchDetails.header} live={matchDetails.live} />
      ) : (
        <div className="match-details-page__state">
          {matchDetails.header?.status || "Match has not started yet."}
        </div>
      )}

      {/* MATCH TABS */}

      <MatchTabs activeTab={activeTab} onTabChange={handleTabChange} />

      {/* MAIN CONTENT */}

      <section className="match-details-page__content">
        {/* LEFT SIDE - ACTIVE TAB CONTENT */}

        <div className="match-details-page__left">{renderTabContent()}</div>

        {/* RIGHT SIDE - COMMON MATCH INFO */}

        <aside className="match-details-page__right">
          <MatchInfo header={matchDetails.header} />
        </aside>
      </section>
    </main>
  );
}

export default MatchDetailsPage;
