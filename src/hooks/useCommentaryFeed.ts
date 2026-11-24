import { useEffect, useState } from "react";
import { HubConnectionState } from "@microsoft/signalr";
import {
  LOCAL_APP_DATA_CHANGED_EVENT,
  readLocalAppData,
} from "../services/localAppStore";
import type { CommentaryUpdate } from "../types/commentary";

function readLocalCommentary() {
  const data = readLocalAppData();
  return Object.fromEntries(
    Object.values(data.commentaryByFixture)
      .filter((entries) => entries.length > 0)
      .map((entries) => {
        const entry = entries[0];
        const update: CommentaryUpdate = {
          id: entry.id,
          fixtureId: entry.fixtureId,
          ball: "",
          action: entry.action,
          note: entry.note,
          playerName: entry.playerName,
          side: entry.side,
          fixtureName: entry.fixtureName,
          createdAtUtc: entry.createdAtUtc,
          homeScore: entry.homeScore,
          homeWickets: entry.homeWickets,
          awayScore: entry.awayScore,
          awayWickets: entry.awayWickets,
        };
        return [entry.fixtureId, update];
      }),
  ) as Record<string, CommentaryUpdate>;
}

export function useCommentaryFeed(_fixtureId: string) {
  const [commentaryByMatch, setCommentaryByMatch] = useState(readLocalCommentary);

  useEffect(() => {
    const refresh = () => {
      try {
        setCommentaryByMatch(readLocalCommentary());
      } catch (error: unknown) {
        console.error("Unable to refresh local commentary", error);
      }
    };
    window.addEventListener(LOCAL_APP_DATA_CHANGED_EVENT, refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener(LOCAL_APP_DATA_CHANGED_EVENT, refresh);
      window.removeEventListener("storage", refresh);
    };
  }, []);

  return {
    commentaryByMatch,
    connectionState: HubConnectionState.Disconnected,
    feedVersion: Object.keys(commentaryByMatch).length,
  };
}
