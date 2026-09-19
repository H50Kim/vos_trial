import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../lib/supabase";
import type { Topic } from "../lib/database.types";
import { PostCard, type PostWithTopic } from "../components/PostCard";
import { Sidebar } from "../components/Sidebar";
import { RightRail } from "../components/RightRail";

export function BookmarksPage() {
  const { user } = useAuth();
  const [topics, setTopics] = useState<Topic[]>([]);
  const [posts, setPosts] = useState<PostWithTopic[]>([]);

  useEffect(() => {
    void supabase
      .from("topics")
      .select("*")
      .order("sort_order")
      .then(({ data }) => setTopics(data ?? []));
  }, []);

  useEffect(() => {
    if (!user) return;
    void supabase
      .from("bookmarks")
      .select("created_at, posts(*, topics(name, slug))")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        const rows = (data ?? [])
          .map((row) => (row as { posts: PostWithTopic | null }).posts)
          .filter((post): post is PostWithTopic => Boolean(post));
        setPosts(rows);
      });
  }, [user?.id]);

  if (!user) {
    return (
      <div className="p-10 text-center text-sm">
        <Link to="/auth" className="text-[#E11D2E]">
          로그인
        </Link>
        이 필요합니다.
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-6xl gap-6 px-4 py-6">
      <Sidebar topics={topics} />
      <main className="min-w-0 flex-1 rounded-xl bg-white px-5 py-2">
        <h1 className="border-b border-neutral-100 py-4 text-lg font-bold">북마크</h1>
        {posts.length === 0 ? (
          <p className="py-10 text-sm text-neutral-500">저장한 글이 없습니다.</p>
        ) : (
          posts.map((post) => <PostCard key={post.id} post={post} />)
        )}
      </main>
      <RightRail />
    </div>
  );
}
