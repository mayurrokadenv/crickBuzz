import { useEffect, useState } from "react";

import { getFixtureMatchDetails } from "../../services/MatchDataService.tsx";
import { useCommentaryFeed } from "../../hooks/useCommentaryFeed.ts";

import CommentaryBox, { type Comment } from "../Commentary/CommentaryBox.tsx";
import Loader from "../Loader/Loader";

import type { FixtureDetailsDto } from "../types/FixtureDetails";

type Props = {
  fixtureId?: string;
  title: string;
};

function NVianCommentary({ fixtureId, title }: Props) {
  const [fixtureDetails, setFixtureDetails] =
    useState<FixtureDetailsDto | null>(null);

  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(false);

  const { commentaryByMatch, connectionState } = useCommentaryFeed(fixtureId ?? "");

  const liveComment = fixtureId
    ? commentaryByMatch[fixtureId] ?? commentaryByMatch[fixtureId.toLowerCase()]
    : undefined;
  useEffect(() => {
    let cancelled = false;

    if (!fixtureId) {
      setComments([]);
      setFixtureDetails(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setComments([]);

    const loadFixture = async () => {
      try {
        const response = await getFixtureMatchDetails(fixtureId);
        if (cancelled) return;
        setFixtureDetails(response);
      } catch (error) {
        console.error(error);
        if (!cancelled) {
          setFixtureDetails(null);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    loadFixture();

    return () => {
      cancelled = true;
    };
  }, [fixtureId, connectionState]);

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

  if (loading) {
    return (
      <div className="commentary-box card">
        <div className="commentary-box__header">
          <h2>{title}</h2>
        </div>
        <div className="commentary-box__body">
          <Loader label="Loading commentary..." />
        </div>
      </div>
    );
  }

  return <CommentaryBox title={title} comments={comments} />;
}

export default NVianCommentary;
