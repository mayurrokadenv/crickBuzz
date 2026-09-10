import axios from "axios";
import type { ResponseResult } from "./SportService";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "/api";

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    Accept: "*/*",
  },
});

export interface CreateSeriesRequest {

}


export const getSeries = async (): Promise<[]> => {
  try {
    const response = await fetch(`${API_BASE_URL}/series`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error("Failed to fetch series.");
    }

    return await response.json();
  } catch (error) {
    console.error("Error fetching series:", error);
    throw error;
  }
};

export const createSeries = async (
  request: CreateSeriesRequest
): Promise<string> => {

  const response = await fetch(`${API_BASE_URL}/series`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(request),
  });

  const result: ResponseResult<string> =
    await response.json();

  return result.data;
};