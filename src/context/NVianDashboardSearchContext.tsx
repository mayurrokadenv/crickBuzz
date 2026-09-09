import { createContext, useContext, useEffect, useState, useCallback } from "react";
import {
  getLiveFixtures,
  searchLiveFixtures,
} from "../services/MatchDataService";
import type { Fixture } from "../components/types/Fixture";

interface NVianDashboardSearchContextType {
  searchTerm: string;
  setSearchTerm: React.Dispatch<React.SetStateAction<string>>;
  matches: Fixture[];
  loading: boolean;
  loadMatches: () => Promise<void>;
}

const NVianDashboardSearchContext =
  createContext<NVianDashboardSearchContextType | null>(null);

export const NVianDashboardSearchProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [matches, setMatches] = useState<Fixture[]>([]);
  const [loading, setLoading] = useState(false);

  // Memoize loadMatches so it can be safely used in effects
  const loadMatches = useCallback(async () => {
    setLoading(true);
    try {
      const response =
        searchTerm.trim() === ""
          ? await getLiveFixtures()
          : await searchLiveFixtures(searchTerm);
      setMatches(response);
    } catch (error) {
      console.error("Failed to fetch fixtures:", error);
    } finally {
      setLoading(false);
    }
  }, [searchTerm]);

  // Debounced search – fires 500ms after user stops typing
  useEffect(() => {
    const timer = setTimeout(loadMatches, 500);
    return () => clearTimeout(timer);
  }, [searchTerm, loadMatches]);

  return (
    <NVianDashboardSearchContext.Provider
      value={{
        searchTerm,
        setSearchTerm,
        matches,
        loading,
        loadMatches,
      }}
    >
      {children}
    </NVianDashboardSearchContext.Provider>
  );
};

export const useNVianDashboardSearch = () => {
  const context = useContext(NVianDashboardSearchContext);
  if (!context) {
    throw new Error(
      "useNVianDashboardSearch must be used inside NVianDashboardSearchProvider",
    );
  }
  return context;
};