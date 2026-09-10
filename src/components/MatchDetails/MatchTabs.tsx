import FixtureScoreCard from "./FixtureScorecard";
import "./MatchTabs.css";

export type MatchTab =
  | "Live"
  | "Scorecard"
  | "Commentary"
  | "Stats"
  // | "Squads";

type MatchTabsProps = {
  activeTab: MatchTab;
  onTabChange: (tab: MatchTab) => void;
  showStats?: boolean;
};

function MatchTabs({
  activeTab,
  onTabChange,
  showStats = true,
}: MatchTabsProps) {

  const tabs: MatchTab[] = [
    "Live",
    "Scorecard",
    "Commentary",
    ...(showStats ? ["Stats" as const] : []),
    // "Squads"
  ];

  return (
    <nav className="match-tabs">

      {tabs.map((tab) => (
        <button
          key={tab}
          type="button"
          onClick={() => onTabChange(tab)}
          className={`match-tabs__item ${
            activeTab === tab
              ? "match-tabs__item--active"
              : ""
          }`}
        >
          {tab}
        </button>
      ))}



    </nav>
  );
}

export default MatchTabs;