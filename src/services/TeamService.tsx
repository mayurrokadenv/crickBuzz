import type { ResponseResult } from "./SportService";
import {
  createLocalId,
  readLocalAppData,
  updateLocalAppData,
} from "./localAppStore";
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

function assertUniquePlayerName(
    teams: Team[],
    sportId: string,
    playerName: string,
    excludedPlayerId?: string,
) {
    const normalizedName = normalizeName(playerName);
    if (!normalizedName) throw new Error("Player name is required.");
    if (
        teams.some(
            (team) =>
                team.sportId === sportId &&
                team.players.some(
                    (player) =>
                        player.playerId !== excludedPlayerId &&
                        normalizeName(player.playerName) === normalizedName,
                ),
        )
    ) {
        throw new Error("A player with this name already exists in this sport.");
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
    return updateLocalAppData((data) => {
        const sport = data.sports.find((item) => item.id === request.sportId);
        if (!sport) throw new Error("The selected sport does not exist.");
        assertUniqueTeamName(data.teams, sport.id, request.name);
        if (isRacquetSport(sport.name) && !isTeamFormat(request.format)) {
            throw new Error("Select a format for Badminton or Pickleball teams.");
        }
        const id = createLocalId("team");
        data.teams.push({
            id,
            teamName: request.name.trim(),
            sportId: sport.id,
            sportName: sport.name,
            color: request.colorHex,
            format: request.format,
            players: [],
        });
        return { success: true, data: id, message: "Team created." };
    });
};

export const getTeams = async (): Promise<Team[]> => {
    return readLocalAppData().teams;
};

export const getPlayers = async (teamId?: string): Promise<Player[]> => {
    return readLocalAppData().teams
        .filter((team) => !teamId || team.id === teamId)
        .flatMap((team) => team.players);
};

export const createPlayer = async (
  request: CreatePlayerRequest
): Promise<ResponseResult<string>> => {
    return updateLocalAppData((data) => {
        const team = data.teams.find((item) => item.id === request.teamId);
        if (!team) throw new Error("The selected team does not exist.");
        const sport = data.sports.find((item) => item.id === team.sportId);
        if (!sport) throw new Error("The selected sport does not exist.");
        assertUniquePlayerName(data.teams, sport.id, request.playerName);
        assertPlayerCapacity(team, sport.name);
        const role = data.sportRoles.find((item) => item.roleId === request.sportRoleId);
        if (!role) throw new Error("The selected sport role does not exist.");
        if (role.sportId !== team.sportId) {
            throw new Error("The selected role does not belong to this team's sport.");
        }
        const playerId = createLocalId("player");
        team.players.push({
            playerId,
            playerName: request.playerName.trim(),
            role: role.roleName,
            roleId: role.roleId,
            teamId: team.id,
        });
        return { success: true, data: playerId, message: "Player created." };
    });
};

export const deleteTeam = async (teamId: string): Promise<ResponseResult<boolean>> => {
    return updateLocalAppData((data) => {
        const exists = data.teams.some((team) => team.id === teamId);
        data.teams = data.teams.filter((team) => team.id !== teamId);
        data.series.forEach((series) => {
            series.teams = series.teams.filter((team) => team.teamId !== teamId);
        });
        const deletedFixtures = data.fixtures.filter(
            (fixture) => fixture.homeTeamId === teamId || fixture.awayTeamId === teamId,
        );
        data.fixtures = data.fixtures.filter(
            (fixture) => fixture.homeTeamId !== teamId && fixture.awayTeamId !== teamId,
        );
        deletedFixtures.forEach((fixture) => {
            delete data.commentaryByFixture[fixture.id];
            delete data.scorecardsByFixture[fixture.id];
        });
        data.racquetMatches = data.racquetMatches.filter(
            (match) =>
                match.fixture.homeTeamId !== teamId &&
                match.fixture.awayTeamId !== teamId,
        );
        return {
            success: exists,
            data: exists,
            message: exists ? "Team deleted." : "Team not found.",
        };
    });
};

export const deletePlayer = async (
    playerId: string
): Promise<ResponseResult<boolean>> => {
    return updateLocalAppData((data) => {
        let deleted = false;
        data.teams.forEach((team) => {
            const previousLength = team.players.length;
            team.players = team.players.filter((player) => player.playerId !== playerId);
            deleted ||= previousLength !== team.players.length;
        });
        return {
            success: deleted,
            data: deleted,
            message: deleted ? "Player deleted." : "Player not found.",
        };
    });
};

export const updateTeam = async (
  request: UpdateTeamRequest
): Promise<ResponseResult<boolean>> => {
    return updateLocalAppData((data) => {
        const team = data.teams.find((item) => item.id === request.id);
        if (!team) throw new Error("Team not found.");
        const sport = data.sports.find((item) => item.id === request.sportId);
        if (!sport) throw new Error("The selected sport does not exist.");
        assertUniqueTeamName(data.teams, sport.id, request.name, team.id);
        if (isRacquetSport(sport.name) && team.format && !isTeamFormat(request.format)) {
            throw new Error("Select a format for Badminton or Pickleball teams.");
        }
        if (request.format) {
            assertPlayerCapacity({ ...team, format: request.format }, sport.name, 0);
        }
        team.teamName = request.name.trim();
        team.sportId = sport.id;
        team.sportName = sport.name;
        team.color = request.colorHex;
        team.format = request.format;
        return { success: true, data: true, message: "Team updated." };
    });
};

export const updatePlayer = async (
  request: UpdatelayerRequest
): Promise<ResponseResult<boolean>> => {
    return updateLocalAppData((data) => {
        const team = data.teams.find((item) => item.id === request.teamId);
        const player = data.teams
            .flatMap((item) => item.players)
            .find((item) => item.playerId === request.playerId);
        const role = data.sportRoles.find((item) => item.roleId === request.sportRoleId);
        if (!team || !player || !role) throw new Error("Player, team, or role not found.");
        if (role.sportId !== team.sportId) {
            throw new Error("The selected role does not belong to this team's sport.");
        }
        const sport = data.sports.find((item) => item.id === team.sportId);
        if (!sport) throw new Error("The selected sport does not exist.");
        assertUniquePlayerName(data.teams, sport.id, request.playerName, player.playerId);
        const previousTeam = data.teams.find((item) =>
            item.players.some((candidate) => candidate.playerId === request.playerId),
        );
        if (previousTeam && previousTeam.id !== team.id) {
            assertPlayerCapacity(team, sport.name);
            previousTeam.players = previousTeam.players.filter(
                (candidate) => candidate.playerId !== request.playerId,
            );
            player.teamId = team.id;
            team.players.push(player);
        }
        player.playerName = request.playerName.trim();
        player.role = role.roleName;
        player.roleId = role.roleId;
        return { success: true, data: true, message: "Player updated." };
    });
};
