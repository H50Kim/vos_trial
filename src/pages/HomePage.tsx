import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../lib/supabase";
import type { Topic } from "../lib/database.types";
import { PostCard, type PostWithTopic } from "../components/PostCard";
import { Sidebar } from "../components/Sidebar";
import { RightRail } from "../components/RightRail";

const CHIPS = [
  "이직·커리어",
  "회사생활",
  "연봉",
  "개발",
  "투자·재테크",
  "라이프",
  "블라블라",
];

export function HomePage() {
  const { user } = useAuth();
  const [params] = useSearchParams();
  const q = params.get("q")?.trim() ?? "";
  const [topics, setTopics] = useState<Topic[]>([]);
  const [posts, setPosts] = useState<PostWithTopic[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void supabase
      .from("topics")
      .select("*")
      .order("sort_order")
      .then(({ data }) => setTopics(data ?? []));
  }, []);

  useEffect(() => {
    setLoading(true);
    let query = supabase
      .from("posts")
      .select("*, topics(name, slug)")
      .order("created_at", { ascending: false })
      .limit(40);
    if (q) {
      query = query.or(`title.ilike.%${q}%,body.ilike.%${q}%`);
    }
    void query.then(({ data }) => {
      setPosts((data as PostWithTopic[]) ?? []);
      setLoading(false);
    });
  }, [q]);

  const topicByName = useMemo(
    () => Object.fromEntries(topics.map((t) => [t.name, t.slug])),
    [topics],
  );

  if (!user) {
    return (
      <div className="bg-black text-white">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 lg:grid-cols-[220px_1fr_260px]">
          <div className="hidden lg:block" />
          <div>
            <form action="#/" className="mb-8">
              <input
                defaultValue={q}
                name="q"
                placeholder="관심있는 내용을 검색해보세요!"
                className="h-14 w-full rounded-full border border-white/20 bg-white px-6 text-black outline-none"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    const value = (e.target as HTMLInputElement).value.trim();
                    window.location.hash = value ? `#/?q=${encodeURIComponent(value)}` : "#/";
                  }
                }}
              />
            </form>
            <div className="mb-4 text-sm font-semibold text-neutral-400">토픽 베스트</div>
            {loading ? (
              <p className="text-neutral-500">불러오는 중...</p>
            ) : (
              posts.map((post) => <PostCard key={post.id} post={post} dark />)
            )}
            <div className="mt-8 flex flex-wrap justify-center gap-2 pb-16">
              {CHIPS.map((chip) => (
                <Link
                  key={chip}
                  to={topicByName[chip] ? `/channel/${topicByName[chip]}` : "/auth"}
                  className="rounded-full border border-white/20 px-4 py-2 text-sm text-neutral-200 hover:bg-white/10"
                >
                  {chip}
                </Link>
              ))}
            </div>
          </div>
          <div className="hidden text-sm text-neutral-400 xl:block">
            <div className="rounded-xl border border-white/10 p-4">
              회사 이메일로 인증하면 익명으로 커리어, 연봉, 이직 이야기를 나눌 수 있습니다.
              <Link to="/auth" className="mt-3 block font-semibold text-[#FFD400]">
                지금 시작하기
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-6xl gap-6 px-4 py-6">
      <Sidebar topics={topics} />
      <main className="min-w-0 flex-1 rounded-xl bg-white px-5 py-2">
        <h1 className="border-b border-neutral-100 py-4 text-lg font-bold">
          {q ? `"${q}" 검색 결과` : "홈"}
        </h1>
        {loading ? (
          <p className="py-10 text-sm text-neutral-500">불러오는 중...</p>
        ) : posts.length === 0 ? (
          <p className="py-10 text-sm text-neutral-500">게시글이 없습니다.</p>
        ) : (
          posts.map((post) => <PostCard key={post.id} post={post} />)
        )}
      </main>
      <RightRail />
    </div>
  );
}
