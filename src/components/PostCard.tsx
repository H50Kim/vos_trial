import { Link } from "react-router-dom";
import type { Post, Topic } from "../lib/database.types";
import { companyColor, companyInitial, timeAgo } from "../lib/format";

export type PostWithTopic = Post & { topics: Pick<Topic, "name" | "slug"> | null };

export function PostCard({
  post,
  dark = false,
}: {
  post: PostWithTopic;
  dark?: boolean;
}) {
  return (
    <Link
      to={`/post/${post.id}`}
      className={`block border-b px-1 py-4 ${
        dark
          ? "border-white/10 hover:bg-white/5"
          : "border-neutral-100 hover:bg-neutral-50"
      }`}
    >
      <div className="flex gap-3">
        <div
          className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-sm font-bold text-white"
          style={{ background: companyColor(post.author_label) }}
        >
          {companyInitial(post.author_label)}
        </div>
        <div className="min-w-0 flex-1">
          <div className={`text-xs ${dark ? "text-neutral-400" : "text-neutral-500"}`}>
            {post.topics?.name ?? "토픽"} · {post.author_label} · {timeAgo(post.created_at)}
          </div>
          <h3
            className={`mt-1 truncate text-[15px] font-bold ${dark ? "text-white" : "text-neutral-900"}`}
          >
            {post.title}
          </h3>
          <p
            className={`mt-1 line-clamp-2 text-sm ${dark ? "text-neutral-400" : "text-neutral-600"}`}
          >
            {post.body}
          </p>
        </div>
        <div
          className={`flex w-16 shrink-0 flex-col items-end gap-1 text-xs ${
            dark ? "text-neutral-400" : "text-neutral-500"
          }`}
        >
          <span>공감 {post.like_count}</span>
          <span>댓글 {post.comment_count}</span>
        </div>
      </div>
    </Link>
  );
}
