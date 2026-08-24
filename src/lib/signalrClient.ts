import {
  HubConnection,
  HubConnectionBuilder,
  HubConnectionState,
  LogLevel,
} from "@microsoft/signalr";

export function createCommentaryHubConnection(): HubConnection {
  const hubUrl = import.meta.env.VITE_SIGNALR_HUB_URL || "/hubs/commentary";
  return new HubConnectionBuilder()
    .withUrl(hubUrl)
    .withAutomaticReconnect()
    .configureLogging(LogLevel.Debug)
    .build();
}

export { HubConnectionState };
