import { useEffect, useRef, useState } from "react";
import "./CommentaryBox.css";
import Comments from "../Comments/Comments";

export interface Comment {
  id: string;
  time: string;
  type: string;
  player: string;
  team: string;
  text: string;
  fixture: string;
  ball?: string;
}

interface CommentaryBoxProps {
  title: string;
  comments: Comment[];
}

function CommentaryBox({
  title,
  comments: initialComments,
}: CommentaryBoxProps) {
  const [comments, setComments] = useState<Comment[]>(initialComments);

  const [newComment, setNewComment] = useState("");

  const bodyRef = useRef<HTMLDivElement>(null);

  // API se naye comments aaye to state update ho
  useEffect(() => {
    setComments(initialComments);
  }, [initialComments]);

  useEffect(() => {
    if (bodyRef.current) {
      bodyRef.current.scrollTo({
        top: 0,
        behavior: "smooth",
      });
    }
  }, [comments]);

  const handleAddComment = () => {
    if (!newComment.trim()) return;

    const comment: Comment = {
      id: Date.now().toString(),
      time: new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
      type: "Update",
      player: "Admin",
      team: "NVian Sports",
      text: newComment,
      fixture: "Manual Update",
    };

    setComments((prev) => [comment, ...prev]);

    setNewComment("");
  };

  return (
    <section className="commentary-box card">
      <div className="commentary-box__header">
        <h2>{title}</h2>

        <span>{comments.length} updates</span>
      </div>

      <div className="commentary-box__body" ref={bodyRef}>
        {comments.map((comment) => (
          <Comments key={comment.id} comment={comment} />
        ))}
      </div>
    </section>
  );
}

export default CommentaryBox;
