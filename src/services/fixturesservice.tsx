import axios from "axios";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "/api";

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
  scheduledAtUtc: string;
  status: string;
  homeScore: number;
  homeWickets: number;
  homeOvers?: string;
  awayScore: number;
  awayWickets: number;
  awayOvers?: string;
  phase: string;
}

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    Accept: "*/*",
  },
});

export const sportService = {
  getSports: async (): Promise<Sport[]> => {
    const response = await api.get<Sport[]>("/sports");
    return response.data;
  },
};

export const fixtureService = {
  getLiveFixtures: async (): Promise<Fixture[]> => {
    const response = await api.get<Fixture[]>("/fixtures/all");
    return response.data;
  },
  async updateFixture(
    id: string,
    status: number,
    phase: number,
    scheduledAtUtc: string,
  ): Promise<Fixture> {
    const response = await api.patch(`${API_BASE_URL}/fixtures/${id}`, {
      status,
      phase,
      scheduledAtUtc,
    });

    return response.data;
  },
  async deleteFixture(id: string) {
    await axios.delete(`${API_BASE_URL}/${id}`);
  },
};

export default api;
