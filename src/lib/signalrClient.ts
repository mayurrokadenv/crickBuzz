import {
  HubConnection,
  HubConnectionBuilder,
  LogLevel,
  type IRetryPolicy,
  type RetryContext,
} from "@microsoft/signalr";

const reconnectPolicy: IRetryPolicy = {
  nextRetryDelayInMilliseconds: (retryContext: RetryContext) => {
    // Keep retrying while the app is open. A finite policy leaves live views
    // permanently stale after a longer network interruption.
    const retryDelay = Math.min(30_000, 1_000 * 2 ** Math.min(retryContext.previousRetryCount, 5));
    return retryDelay;
  },
};

export function createCommentaryHubConnection(): HubConnection {
  const hubUrl = import.meta.env.VITE_SIGNALR_HUB_URL || "/hubs/commentary";
  return new HubConnectionBuilder()
    .withUrl(hubUrl, {
      // Negotiate lets SignalR fall back when WebSockets are unavailable.
      withCredentials: true,
    })
    .withAutomaticReconnect(reconnectPolicy)
    .configureLogging(LogLevel.Warning)
    .build();
}
