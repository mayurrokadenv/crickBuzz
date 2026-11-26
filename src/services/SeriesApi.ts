import type { CreateSeriesRequest, Series, SeriesDetails } from "./SeriesService";
import type { TeamFormat } from "./TeamService";

export type { SeriesDetails, SeriesFormat } from "./SeriesService";

const baseUrl = (import.meta.env.VITE_API_BASE_URL || "/api").replace(/\/+$/, "");

async function request(path: string, init?: RequestInit): Promise<Response> {
  const headers = new Headers(init?.headers);
  headers.set("Accept", "application/json");
  if (init?.body) headers.set("Content-Type", "application/json");
  const token = localStorage.getItem("token");
  if (token) headers.set("Authorization", `Bearer ${token}`);

  const response = await fetch(`${baseUrl}/${path}`, { ...init, headers });
  const contentType = response.headers.get("content-type") ?? "";
  if (!response.ok) {
    const problem = contentType.includes("json") ? await response.json().catch(() => null) : null;
    throw new Error(problem?.detail ?? problem?.title ?? `API request failed (${response.status}).`);
  }
  if (response.status !== 204 && !contentType.includes("json")) {
    throw new Error("The series API returned an unexpected response. Check the API URL and Vite proxy.");
  }
  return response;
}

export async function getSeries(): Promise<Series[]> {
  return (await request("series")).json();
}

export async function getSeriesDetails(seriesId: string): Promise<SeriesDetails> {
  return (await request(`series/${encodeURIComponent(seriesId)}`)).json();
}

export async function createSeries(data: CreateSeriesRequest): Promise<string> {
  const response = await request("series", { method: "POST", body: JSON.stringify(data) });
  const id: unknown = await response.json();
  if (typeof id !== "string") throw new Error("The series API did not return a series ID.");
  return id;
}

export async function deleteSeries(seriesId: string): Promise<void> {
  await request(`series/${encodeURIComponent(seriesId)}`, { method: "DELETE" });
}

export async function getSeriesSports(): Promise<{ id: string; name: string }[]> {
  return (await request("sports")).json();
}

export async function getSeriesTeams(): Promise<{ id: string; teamName: string; sportId: string; format?: TeamFormat }[]> {
  return (await request("teams")).json();
}