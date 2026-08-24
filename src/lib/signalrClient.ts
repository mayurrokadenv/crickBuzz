import {
  HubConnection,
  HubConnectionBuilder,
  HubConnectionState,
  LogLevel,
  HttpTransportType,
} from "@microsoft/signalr";

export function createCommentaryHubConnection(): HubConnection {
  const hubUrl = import.meta.env.VITE_SIGNALR_HUB_URL || "/hubs/commentary";
  return new HubConnectionBuilder()
    .withUrl(hubUrl, {
      skipNegotiation: false,
      transport: HttpTransportType.ServerSentEvents | HttpTransportType.LongPolling,
    })
    .withAutomaticReconnect()
    .configureLogging(LogLevel.Debug)
    .build();
}

export { HubConnectionState };
