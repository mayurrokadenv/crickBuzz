import { useEffect, useState } from "react";
import { HubConnectionState, type HubConnection } from "@microsoft/signalr";
import { createCommentaryHubConnection } from "../lib/signalrClient";
import type { CommentaryUpdate } from "../types/commentary";

const COMMENTARY_EVENT = "CommentaryReceived";

type CommentaryFeedListener = () => void;

let sharedConnection: HubConnection | null = null;
let sharedConnectionPromise: Promise<void> | null = null;
let sharedConnectionState = HubConnectionState.Disconnected;
let sharedCommentaryByMatch: Record<string, CommentaryUpdate> = {};
const commentaryFeedListeners = new Set<CommentaryFeedListener>();
const fixtureSubscribers = new Map<string, number>();

function notifyCommentaryFeedListeners() {
    commentaryFeedListeners.forEach((listener) => listener());
}

function getValue<T>(payload: Record<string, unknown>, camelCase: string, pascalCase: string): T | undefined {
    return (payload[camelCase] ?? payload[pascalCase]) as T | undefined;
}

function normalizeCommentary(raw: unknown): CommentaryUpdate | null {
    if (!raw || typeof raw !== "object") return null;
    const payload = raw as Record<string, unknown>;
    const fixtureId = getValue<string>(payload, "fixtureId", "FixtureId");
    const id = getValue<string>(payload, "id", "Id");
    if (!fixtureId || !id) return null;

    return {
        id,
        fixtureId,
        ball: getValue<string>(payload, "ball", "Ball"),
        action: getValue<string>(payload, "action", "Action") ?? "",
        note: getValue<string>(payload, "note", "Note") ?? "",
        playerName: getValue<string>(payload, "playerName", "PlayerName") ?? "",
        side: getValue<string>(payload, "side", "Side") ?? "",
        fixtureName: getValue<string>(payload, "fixtureName", "FixtureName") ?? "",
        createdAtUtc: getValue<string>(payload, "createdAtUtc", "CreatedAtUtc") ?? new Date().toISOString(),
        homeScore: getValue<number>(payload, "homeScore", "HomeScore") ?? 0,
        homeWickets: getValue<number>(payload, "homeWickets", "HomeWickets") ?? 0,
        awayScore: getValue<number>(payload, "awayScore", "AwayScore") ?? 0,
        awayWickets: getValue<number>(payload, "awayWickets", "AwayWickets") ?? 0,
    };
}

async function joinFixtureGroup(fixtureId: string) {
    const connection = sharedConnection;
    if (!connection || !fixtureId) return;
    await ensureSharedConnection();
    if (connection.state === HubConnectionState.Connected) {
        await connection.invoke("JoinFixtureGroup", fixtureId);
    }
}

function ensureSharedConnection(): Promise<void> {
    if (sharedConnectionPromise) return sharedConnectionPromise;

    const connection = createCommentaryHubConnection();
    sharedConnection = connection;
    connection.on(COMMENTARY_EVENT, (raw: unknown) => {
        const update = normalizeCommentary(raw);
        if (!update) return;
        sharedCommentaryByMatch = {
            ...sharedCommentaryByMatch,
            [update.fixtureId]: update,
            [update.fixtureId.toLowerCase()]: update,
        };
        notifyCommentaryFeedListeners();
    });
    connection.onreconnecting(() => {
        sharedConnectionState = HubConnectionState.Reconnecting;
        notifyCommentaryFeedListeners();
    });
    connection.onreconnected(() => {
        sharedConnectionState = HubConnectionState.Connected;
        notifyCommentaryFeedListeners();
        fixtureSubscribers.forEach((_count, fixtureId) => {
            void joinFixtureGroup(fixtureId).catch((error) =>
                console.error("Failed to rejoin commentary fixture group", fixtureId, error),
            );
        });
    });
    connection.onclose(() => {
        sharedConnectionState = HubConnectionState.Disconnected;
        sharedConnectionPromise = null;
        notifyCommentaryFeedListeners();
    });

    sharedConnectionPromise = connection.start()
        .then(() => {
            sharedConnectionState = HubConnectionState.Connected;
            notifyCommentaryFeedListeners();
        })
        .catch((error) => {
            sharedConnectionState = HubConnectionState.Disconnected;
            sharedConnectionPromise = null;
            console.error("Failed to connect to commentary hub", error);
            throw error;
        });

    return sharedConnectionPromise;
}

export function useCommentaryFeed(fixtureId: string) {
    const [feedVersion, setFeedVersion] = useState(0);

    useEffect(() => {
        const listener = () => setFeedVersion((version) => version + 1);
        commentaryFeedListeners.add(listener);
        return () => {
            commentaryFeedListeners.delete(listener);
        };
    }, []);

    useEffect(() => {
        if (!fixtureId) return;
        fixtureSubscribers.set(fixtureId, (fixtureSubscribers.get(fixtureId) ?? 0) + 1);
        void ensureSharedConnection()
            .then(() => joinFixtureGroup(fixtureId))
            .catch((error) => console.error("Failed to join commentary fixture group", fixtureId, error));

        return () => {
            const count = fixtureSubscribers.get(fixtureId) ?? 0;
            if (count <= 1) {
                fixtureSubscribers.delete(fixtureId);
                if (sharedConnection?.state === HubConnectionState.Connected) {
                    void sharedConnection.invoke("LeaveFixtureGroup", fixtureId).catch(() => undefined);
                }
            } else {
                fixtureSubscribers.set(fixtureId, count - 1);
            }
        };
    }, [fixtureId]);

    return { commentaryByMatch: sharedCommentaryByMatch, connectionState: sharedConnectionState, feedVersion };
}
