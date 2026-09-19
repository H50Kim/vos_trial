import { useEffect, useState, type FormEvent } from "react";
import { Link, useParams } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { useAuth } from "../context/AuthContext";
import type { Comment } from "../lib/database.types";
import type { PostWithTopic } from "../components/PostCard";
import { companyColor, companyInitial, timeAgo } from "../lib/format";
import { Sidebar } from "../components/Sidebar";
import { RightRail } from "../components/RightRail";
import type { Topic } from "../lib/database.types";

export function PostPage() {
  const { id } = useParams();
  const postId = Number(id);
  const { user } = useAuth();
  const [post, setPost] = useState<PostWithTopic | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [liked, setLiked] = useState(false);
  const [bookmarked, setBookmarked] = useState(false);
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  async function reload() {
    const { data } = await supabase
      .from("posts")
      .select("*, topics(name, slug)")
      .eq("id", postId)
      .maybeSingle();
    setPost((data as PostWithTopic) ?? null);
    const { data: commentRows } = await supabase
      .from("comments")
      .select("*")
      .eq("post_id", postId)
      .order("created_at");
    setComments(commentRows ?? []);
    if (user) {
      const { data: likeRow } = await supabase
        .from("post_likes")
        .select("post_id")
        .eq("post_id", postId)
        .eq("user_id", user.id)
        .maybeSingle();
      setLiked(Boolean(likeRow));
      const { data: bookmarkRow } = await supabase
        .from("bookmarks")
        .select("post_id")
        .eq("post_id", postId)
        .eq("user_id", user.id)
        .maybeSingle();
        setBookmarked(Boolean(bookmarkRow));
    }
    setLoading(false);
  }

  useEffect(() => {
    void supabase
      .from("topics")
      .select("*")
      .order("sort_order")
      .then(({ data }) => setTopics(data ?? []));
  }, []);

  useEffect(() => {
    if (!Number.isFinite(postId)) return;
    void reload();
  }, [postId, user?.id]);

  async function toggleLike() {
    if (!user) return;
    if (liked) {
      await supabase.from("post_likes").delete().eq("post_id", postId).eq("user_id", user.id);
    } else {
      await supabase.from("post_likes").insert({ post_id: postId, user_id: user.id });
    }
    await reload();
  }

  async function toggleBookmark() {
    if (!user) return;
    if (bookmarked) {
      await supabase.from("bookmarks").delete().eq("post_id", postId).eq("user_id", user.id);
    } else {
      await supabase.from("bookmarks").insert({ post_id: postId, user_id: user.id });
    }
    setBookmarked(!bookmarked);
  }

  async function onComment(e: FormEvent) {
    e.preventDefault();
    if (!user) return;
    setError(null);
    const { error: insertError } = await supabase.from("comments").insert({
      post_id: postId,
      body: body.trim(),
    });
    if (insertError) {
      setError(insertError.message);
      return;
    }
    setBody("");
    await reload();
  }

  if (loading) {
    return <div className="p-10 text-center text-sm text-neutral-500">불러오는 중...</div>;
  }

  if (!post) {
    return <div className="p-10 text-center text-sm text-neutral-500">글을 찾을 수 없습니다.</div>;
  }

  return (
    <div className="mx-auto flex max-w-6xl gap-6 px-4 py-6">
      <Sidebar topics={topics} />
      <main className="min-w-0 flex-1 rounded-xl bg-white p-6">
        <Link to="/" className="text-sm text-neutral-500">
          ← 목록
        </Link>
        <div className="mt-4 flex items-center gap-3">
          <div
            className="grid h-12 w-12 place-items-center rounded-full font-bold text-white"
            style={{ background: companyColor(post.author_label) }}
          >
            {companyInitial(post.author_label)}
          </div>
          <div>
            <div className="font-semibold">{post.author_label}</div>
            <div className="text-xs text-neutral-500">
              {post.topics?.name} · {timeAgo(post.created_at)}
            </div>
          </div>
        </div>
        <h1 className="mt-5 text-2xl font-bold">{post.title}</h1>
        <p className="mt-4 whitespace-pre-wrap text-[15px] leading-7 text-neutral-800">
          {post.body}
        </p>
        <div className="mt-6 flex gap-2">
          <button
            type="button"
            onClick={() => void toggleLike()}
            className={`rounded-full px-4 py-2 text-sm font-semibold ${
              liked ? "bg-[#E11D2E] text-white" : "bg-neutral-100"
            }`}
          >
            공감 {post.like_count}
          </button>
          <button
            type="button"
            onClick={() => void toggleBookmark()}
            className={`rounded-full px-4 py-2 text-sm font-semibold ${
              bookmarked ? "bg-neutral-900 text-white" : "bg-neutral-100"
            }`}
          >
            {bookmarked ? "북마크됨" : "북마크"}
          </button>
        </div>

        <section className="mt-8 border-t border-neutral-100 pt-5">
          <h2 className="mb-4 text-sm font-bold">댓글 {comments.length}</h2>
          {user ? (
            <form onSubmit={(e) => void onComment(e)} className="mb-6">
              <textarea
                required
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="익명으로 댓글을 남겨보세요"
                className="h-24 w-full rounded-md border border-neutral-200 p-3 text-sm"
              />
              {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
              <button className="mt-2 h-9 rounded-md bg-neutral-900 px-4 text-sm font-semibold text-white">
                등록
              </button>
            </form>
          ) : (
            <Link to="/auth" className="mb-6 inline-block text-sm text-[#E11D2E]">
              로그인하고 댓글 달기
            </Link>
          )}
          <div className="space-y-4">
            {comments.map((comment) => (
              <div key={comment.id} className="rounded-lg bg-neutral-50 p-3">
                <div className="text-xs text-neutral-500">
                  {comment.author_label} · {timeAgo(comment.created_at)}
                </div>
                <p className="mt-1 text-sm">{comment.body}</p>
              </div>
            ))}
          </div>
        </section>
      </main>
      <RightRail />
    </div>
  );
}
