import {
  HubConnection,
  HubConnectionBuilder,
  LogLevel,
} from "@microsoft/signalr";

export function createCommentaryHubConnection(): HubConnection {
  const hubUrl = import.meta.env.VITE_SIGNALR_HUB_URL || "/hubs/commentary";
  return new HubConnectionBuilder()
    // Let SignalR negotiate WebSockets first, with automatic fallback when needed.
    .withUrl(hubUrl)
    .withAutomaticReconnect()
    .configureLogging(LogLevel.Debug)
    .build();
}
