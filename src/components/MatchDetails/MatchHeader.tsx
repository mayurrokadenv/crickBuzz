import "./MatchHeader.css";
import type { MatchHeaderModel } from "../types/MatchDetailsModel";
import Header from "../Header/Header";

// type MatchHeaderProps = {
//   matchHeader: CricbuzzMatchHeader;
// };
type MatchHeaderProps = {
  header: MatchHeaderModel;
};

function MatchHeader({ header }: MatchHeaderProps) {
  const resultText = header.result.winningTeam
    ? `${header.result.winningTeam} won the match`
    : header.status;

  return (
  <>
  {/* <main className="container"> */}
    <Header />
    {/* </main> */}
    <section className="match-header">
      <div className="match-header__top">
        <span className="match-header__sport">
          {header.matchFormat.toUpperCase()}
        </span>

        <span className="match-header__status">
          {header.complete ? "ENDED" : "LIVE"}
        </span>
      </div>

      <h1 className="match-header__title">
        {header.team1.name} vs {header.team2.name}
      </h1>

      <div className="match-header__meta">
        <span>{header.matchDescription}</span>

        <span>•</span>

        <span>{header.seriesName}</span>

        <span>•</span>

        <span>
          {new Date(header.matchStartTimestamp).toLocaleDateString()}
        </span>
      </div>

      <div className="match-header__result" aria-live="polite">
        {resultText}
      </div>

    </section>
    
  </>
  );
}

export default MatchHeader;