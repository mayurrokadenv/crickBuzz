import api from "./fixturesservice";
import type { ResponseResult } from "./SportService";
export interface CreateTeamRequest {
    name: string;
    sportId: string;
    colorHex: string;
    format?: TeamFormat;
}

export type TeamFormat = "Single" | "Double" | "Mixed Double";

export const TEAM_FORMATS: TeamFormat[] = ["Single", "Double", "Mixed Double"];

function isTeamFormat(format: TeamFormat | undefined): format is TeamFormat {
    return format !== undefined && TEAM_FORMATS.includes(format);
}

function isRacquetSport(sportName: string) {
    return ["badminton", "pickleball"].includes(sportName.toLowerCase());
}

function normalizeName(name: string) {
    return name.trim().replace(/\s+/g, " ").toLowerCase();
}

function getPlayerLimit(sportName: string, format?: TeamFormat) {
    if (!isRacquetSport(sportName)) return Number.POSITIVE_INFINITY;
    return format === "Single" ? 1 : 2;
}

function assertPlayerCapacity(
    team: Team,
    sportName: string,
    playersToAdd = 1,
) {
    const limit = getPlayerLimit(sportName, team.format);
    if (team.players.length + playersToAdd > limit) {
        throw new Error(
            `${team.format ?? "Double"} teams can have at most ${limit} player${limit === 1 ? "" : "s"}.`,
        );
    }
}

function assertUniqueTeamName(
    teams: Team[],
    sportId: string,
    teamName: string,
    excludedTeamId?: string,
) {
    const normalizedName = normalizeName(teamName);
    if (!normalizedName) throw new Error("Team name is required.");
    if (
        teams.some(
            (team) =>
                team.id !== excludedTeamId &&
                team.sportId === sportId &&
                normalizeName(team.teamName) === normalizedName,
        )
    ) {
        throw new Error("A team with this name already exists in this sport.");
    }
}

function assertUniquePlayerName(team: Team, playerName: string, excludedPlayerId?: string) {
    const normalizedName = normalizeName(playerName);
    if (!normalizedName) throw new Error("Player name is required.");
    if (team.players.some(player =>
        player.playerId !== excludedPlayerId &&
        normalizeName(player.playerName) === normalizedName
    )) {
        throw new Error("A player with this name already exists on this team.");
    }
}
export interface Team {
    id: string;
    teamName: string;
    sportId: string;
    sportName: string;
    color: string;
    format?: TeamFormat;
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
    format?: TeamFormat;
}
export const createTeam = async (
  request: CreateTeamRequest
): Promise<ResponseResult<string>> => {
   const { data: sports } = await api.get<{id: string; name: string}[]>("/sports");
   const sport = sports.find(item => item.id === request.sportId);
   if (!sport) throw new Error("The selected sport does not exist.");
   if (isRacquetSport(sport.name) && !isTeamFormat(request.format)) throw new Error("Select a team format.");
   assertUniqueTeamName(await getTeams(), request.sportId, request.name);
   return (await api.post<ResponseResult<string>>("/teams", request)).data;
};

export const getTeams = async (): Promise<Team[]> => {
   const { data } = await api.get<(Omit<Team, "sportName" | "players"> & {
     sport: { name: string }; players: Omit<Player, "teamId">[];
   })[]>("/teams");
   return data.map(({ sport, players, ...team }) => ({
     ...team, sportName: sport.name,
     players: players.map(player => ({ ...player, teamId: team.id })),
   }));
};

export const getPlayers = async (teamId?: string): Promise<Player[]> => {
   if (!teamId) return [];
   return (await getTeams()).find(team => team.id === teamId)?.players ?? [];
};

export const createPlayer = async (
  request: CreatePlayerRequest
): Promise<ResponseResult<string>> => {
   const teams = await getTeams();
   const team = teams.find(item => item.id === request.teamId);
   if (!team) throw new Error("The selected team does not exist.");
   assertPlayerCapacity(team, team.sportName);
   assertUniquePlayerName(team, request.playerName);
   return (await api.post<ResponseResult<string>>("/players", request)).data;
};

export const deleteTeam = async (teamId: string): Promise<ResponseResult<boolean>> => {
  return (await api.delete<ResponseResult<boolean>>("/teams/" + teamId)).data;
};

export const deletePlayer = async (
    playerId: string
): Promise<ResponseResult<boolean>> => {
  return (await api.delete<ResponseResult<boolean>>("/players/" + playerId)).data;
};

export const updateTeam = async (
  request: UpdateTeamRequest
): Promise<ResponseResult<boolean>> => {
   const teams = await getTeams();
   const team = teams.find(item => item.id === request.id);
   if (!team) throw new Error("The selected team does not exist.");
   assertUniqueTeamName(teams, request.sportId, request.name, team.id);
   if (team.players.length > getPlayerLimit(team.sportName, request.format ?? team.format))
     throw new Error("Remove players before switching to this team format.");
   return (await api.put<ResponseResult<boolean>>("/teams/" + team.id, request)).data;
};

export const updatePlayer = async (
  request: UpdatelayerRequest
): Promise<ResponseResult<boolean>> => {
   const teams = await getTeams();
   const team = teams.find(item => item.id === request.teamId);
   if (!team) throw new Error("The selected team does not exist.");
   if (!team.players.some(player => player.playerId === request.playerId))
     assertPlayerCapacity(team, team.sportName);
   assertUniquePlayerName(team, request.playerName, request.playerId);
   return (await api.put<ResponseResult<boolean>>("/players/" + request.playerId, request)).data;
};
