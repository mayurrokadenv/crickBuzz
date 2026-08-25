import "./Comments.css";

interface CommentData {
  ball?: string;
  id: string;
  time: string;
  type: string;
  player: string;
  team: string;
  text: string;
  fixture: string;
}

interface CommentsProps {
  comment: CommentData;
}

function Comments({ comment }: CommentsProps) {
  return (
    <article className="comment">
      {comment.ball && <div className="comment__time">{comment.ball}</div>}

      <div className="comment__dot"></div>

      <div className="comment__content">
        <div className="comment__header">
          <span className={`comment__badge ${comment.type.toLowerCase()}`}>
            {comment.type}
          </span>

          <h4 className="comment__player">{comment.player}</h4>

          <span className="comment__team">{comment.team}</span>
        </div>

        <p className="comment__text">{comment.text}</p>

        <small className="comment__fixture">{comment.fixture}</small>
      </div>
    </article>
  );
}

export default Comments;
