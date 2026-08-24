import axios from "axios";
import type { ResponseResult } from "./SportService";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "/api";
export interface CreateTeamRequest {
    name: string;
    sportId: string;
    colorHex: string;
}
export interface Team {
    id: string;
    teamName: string;
    sportId: string;
    sportName: string;
    color: string;
    players:Player[];
}
export interface CreatePlayerRequest {
  playerName: string;
  teamId: string;
  sportRoleId: string;
}
export interface UpdatelayerRequest {
 playerId: string;
  playerName: string;
  teamId: string;
  sportRoleId: string;
}

export interface Player {
    playerName: string,
    role: string,
    playerId: string,
    roleId: string,
    teamId:string
}
export interface UpdateTeamRequest {
    id: string;
    name: string;
    sportId: string;
    colorHex: string;
}
export const createTeam = async (
  request: CreateTeamRequest
): Promise<ResponseResult<string>> => {

  const response = await fetch(`${API_BASE_URL}/teams`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(request),
  });

  const result: ResponseResult<string> =
    await response.json();

  return result;
};

export const getTeams = async (): Promise<Team[]> => {
    const response = await axios.get(`${API_BASE_URL}/teams`);
    return response.data.map((item: any) => ({
        id: item.id,
        teamName: item.teamName,
        sportName: item.sport.name,
        sportId: item.sportId,
        color: item.color,
        players: item.players.map((player: any) => ({
            playerId: player.playerId,
            playerName: player.playerName,
            role: player.role,
            roleId: player.roleId,
            teamId: item.id 
        }))
    }));
};

export const getPlayers = async (teamId?: string): Promise<Player[]> => {
    const response = await axios.get(`${API_BASE_URL}/players/team/${teamId}`);
    return response.data.map((item: any) => ({
        playerId: item.id,
        playerName: item.playerName,
        role: item.sportRole.roleName,
        roleId: item.sportRoleId,
        teamId: item.teamId 
    }));
};

export const createPlayer = async (
  request: CreatePlayerRequest
): Promise<ResponseResult<string>> => {

  const response = await fetch(`${API_BASE_URL}/players`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(request),
  });

  const result: ResponseResult<string> =
    await response.json();

  return result;
};

export const deleteTeam = async (teamId: string): Promise<ResponseResult<boolean>> => {
      const response = await axios.delete(`${API_BASE_URL}/teams/${teamId}`);
      return response.data;
};

export const deletePlayer = async (
    playerId: string
): Promise<ResponseResult<boolean>> => {
      const response = await axios.delete(`${API_BASE_URL}/players/${playerId}`);
      return response.data;
    
};

export const updateTeam = async (
  request: UpdateTeamRequest
): Promise<ResponseResult<boolean>> => {

  const response = await fetch(`${API_BASE_URL}/teams/${request.id}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(request),
  });

  const result: ResponseResult<boolean> =
    await response.json();
  return result;
};

export const updatePlayer = async (
  request: UpdatelayerRequest
): Promise<ResponseResult<boolean>> => {

  const response = await fetch(`${API_BASE_URL}/players/${request.playerId}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(request),
  });

  const result: ResponseResult<boolean> =
    await response.json();
  return result;
};
