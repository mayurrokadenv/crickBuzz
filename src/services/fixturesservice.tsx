import axios from "axios";

export interface SportRole {
  roleId: string;
  roleName: string;
  description: string;
}

export interface Sport {
  id: string;
  name: string;
  description: string;
  sportRoles: SportRole[];
}

export interface Fixture {
  id: string;
  homeTeamId: string;
  homeTeamName: string;
  awayTeamId: string;
  awayTeamName: string;
  sport: string;
  sportId?: string;
  scheduledAtUtc: string;
  status: string;
  homeScore: number;
  homeWickets: number;
  homeOvers?: string;
  totalOvers?: string;
  awayScore: number;
  awayWickets: number;
  awayOvers?: string;
  phase: string;
  battingTeamId: string;
}

const api = axios.create({ baseURL: import.meta.env.VITE_API_BASE_URL || "/api" });

export const sportService = {
  getSports: async (): Promise<Sport[]> => {
    return (await api.get<Sport[]>("/sports")).data;
  },
};

export interface CreateFixtureRequest {
  homeTeamId: string;
  awayTeamId: string;
  scheduledAtUtc?: string;
  totalOvers?: string;
  seriesId?: string | null;
}

export const fixtureService = {
  async getLiveFixtures(): Promise<Fixture[]> {
    return (await api.get<Fixture[]>("/fixtures/all")).data;
  },
  async createFixture(request: CreateFixtureRequest): Promise<void> {
    await api.post("/fixtures", request);
  },
  async updateFixture(id: string, status: number, phase: number, scheduledAtUtc: string,
    battingTeamId: string | null, winningTeamId?: string | null): Promise<Fixture> {
    return (await api.patch<Fixture>(`/fixtures/${id}`, {
      status, phase, scheduledAtUtc, battingTeamId, winningTeamId,
    })).data;
  },
  async deleteFixture(id: string): Promise<void> {
    await api.delete(`/fixtures/${id}`);
  },
};

export default api;