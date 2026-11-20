import { useOutletContext } from 'react-router-dom';
import RecentEntries from '../../components/RecentEntries/RecentEntries';
import AddCommentary from '../../components/Commentary/AddCommentary';
import BadmintonScoreEntry from '../../components/Commentary/BadmintonScoreEntry';
import type { AdminOutletContext } from './Admin';
import { isLocalRacquetSport } from '../../utils/localRacquetSports';
import './Admin.css';

function Commentary() {
    const { selectedMatch, selectedFixtureId, setSelectedFixtureId, refreshTick, triggerRefresh, onScoreUpdated  } =
        useOutletContext<AdminOutletContext>();
    const isLocalRacquetMatch = isLocalRacquetSport(selectedMatch?.sport);
    const localRacquetFixtureId = isLocalRacquetMatch
        ? selectedMatch?.fixtureId ?? selectedFixtureId
        : null;

    return (
        <div className="fixtures-layout">
            {isLocalRacquetMatch ? (
                <BadmintonScoreEntry
                    fixtureId={localRacquetFixtureId}
                    sport={selectedMatch?.sport}
                />
            ) : (
                <AddCommentary
                    selectedMatch={selectedMatch}
                    onFixtureIdChange={setSelectedFixtureId}
                    onCommentaryPosted={triggerRefresh}
                    onScoreUpdated={onScoreUpdated}
                />
            )}
            <RecentEntries
                fixtureId={
                    isLocalRacquetMatch
                        ? localRacquetFixtureId
                        : selectedFixtureId
                }
                refreshTrigger={refreshTick}
            />
        </div>
    );
}

export default Commentary;