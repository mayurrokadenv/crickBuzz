import {
  createLocalId,
  readLocalAppData,
  updateLocalAppData,
} from "./localAppStore";


export interface ErrorResponse {
  message: string;
  statusCode: number;
}

export interface ResponseResult<T> {
  success: boolean;
  data: T;
  message: string;
  error?: ErrorResponse;
}

export interface Sport {
  id: string;
  name: string;
  description: string;
}

export interface CreateSportRequest {
    name: string;
    description: string;
}

export interface SportRole {
    roleId: string;
    roleName: string;
    description: string;
    sportId: string;
}

export interface CreateSportRoleRequest{
  roleName: string;
  description: string;
  sportId: string;
}

export const getSports = async (): Promise<Sport[]> => {
  return readLocalAppData().sports.map(({ id, name, description }) => ({
    id,
    name,
    description,
  }));
};

export const createSport = async (
  request: CreateSportRequest
): Promise<ResponseResult<string>> => {
  return updateLocalAppData((data) => {
    if (data.sports.some((sport) => sport.name.toLowerCase() === request.name.toLowerCase())) {
      throw new Error("A sport with this name already exists.");
    }
    const id = createLocalId("sport");
    data.sports.push({
      id,
      name: request.name,
      description: request.description,
      sportRoles: [],
    });
    return { success: true, data: id, message: "Sport created." };
  });
};

export const getSportRoles = async (): Promise<SportRole[]> => {
    return readLocalAppData().sportRoles;
};

export const getSportRolesBySportId = async (
  sportId: string
): Promise<SportRole[]> => {
  return readLocalAppData().sportRoles.filter((role) => role.sportId === sportId);
};

export const createSportRole = async (
  request: CreateSportRoleRequest
): Promise<ResponseResult<string>> => {
  return updateLocalAppData((data) => {
    const sport = data.sports.find((item) => item.id === request.sportId);
    if (!sport) throw new Error("The selected sport does not exist.");
    const roleId = createLocalId("sport-role");
    const role = { ...request, roleId };
    data.sportRoles.push(role);
    sport.sportRoles.push({
      roleId,
      roleName: request.roleName,
      description: request.description,
    });
    return { success: true, data: roleId, message: "Sport role created." };
  });
};

