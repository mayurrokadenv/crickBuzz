import { useEffect, useState } from "react";

import { getFixtureMatchDetails } from "../../services/MatchDataService.tsx";
import { useCommentaryFeed } from "../../hooks/useCommentaryFeed.ts";

import CommentaryBox, { type Comment } from "../Commentary/CommentaryBox.tsx";

import type { FixtureDetailsDto } from "../types/FixtureDetails";

type Props = {
  fixtureId?: string;
  title: string;
};

function NVianCommentary({ fixtureId, title }: Props) {
  const [fixtureDetails, setFixtureDetails] =
    useState<FixtureDetailsDto | null>(null);

  const [comments, setComments] = useState<Comment[]>([]);

  const { commentaryByMatch } = useCommentaryFeed(fixtureId ?? "");

  const liveComment = fixtureId ? commentaryByMatch[fixtureId] : undefined;
  useEffect(() => {
    if (!fixtureId) return;
    setComments([]);
    const loadFixture = async () => {
      try {
        const response = await getFixtureMatchDetails(fixtureId);
        setFixtureDetails(response);
      } catch (error) {
        console.error(error);
      }
    };
    loadFixture();
  }, [fixtureId]);

  // Load initial commentary from API

  useEffect(() => {
    if (!fixtureDetails) return;
    const apiComments: Comment[] = fixtureDetails.commentary.map((item) => ({
      id: item.id,
      time: new Date(item.createdAtUtc).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
      ball: item.ball,
      type: item.action,
      player: item.playerName,
      team: item.side,
      text: item.note && item.note.trim() !== "" ? item.note : item.action,
      fixture: item.fixtureName,
    }));

    setComments(apiComments);
  }, [fixtureDetails]);

  // Append live commentary from SignalR
  useEffect(() => {
    if (!liveComment) return;
    const mappedComment: Comment = {
      id: liveComment.id,
      time: new Date(liveComment.createdAtUtc).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
      ball: liveComment.ball,
      type: liveComment.action,
      player: liveComment.playerName,
      team: liveComment.side,
      text:
        liveComment.note && liveComment.note.trim() !== ""
          ? liveComment.note
          : liveComment.action,
      fixture: liveComment.fixtureName,
    };

    setComments((previous) => {
      if (previous.some((x) => x.id === mappedComment.id)) {
        return previous;
      }
      return [mappedComment, ...previous];
    });
  }, [liveComment]);

  return <CommentaryBox title={title} comments={comments} />;
}

export default NVianCommentary;
