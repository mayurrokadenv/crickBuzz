import api from "./fixturesservice";
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
  return (await api.get<Sport[]>("/sports")).data;
};

export const createSport = async (
  request: CreateSportRequest
): Promise<ResponseResult<string>> => {
  return (await api.post<ResponseResult<string>>("/sports", request)).data;
};

export const getSportRoles = async (): Promise<SportRole[]> => {
  return (await api.get<SportRole[]>("/sports/roles")).data;
};

export const getSportRolesBySportId = async (
  sportId: string
): Promise<SportRole[]> => {
  return (await api.get<SportRole[]>("/sports/" + encodeURIComponent(sportId) + "/roles")).data;
};

export const createSportRole = async (
  request: CreateSportRoleRequest
): Promise<ResponseResult<string>> => {
  return (await api.post<ResponseResult<string>>("/sports/roles", request)).data;
};

