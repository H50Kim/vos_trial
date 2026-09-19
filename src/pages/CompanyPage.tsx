import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "../lib/supabase";
import type { Company, Topic } from "../lib/database.types";
import { PostCard, type PostWithTopic } from "../components/PostCard";
import { Sidebar } from "../components/Sidebar";
import { RightRail } from "../components/RightRail";

export function CompanyPage() {
  const { slug } = useParams();
  const [topics, setTopics] = useState<Topic[]>([]);
  const [company, setCompany] = useState<Company | null>(null);
  const [posts, setPosts] = useState<PostWithTopic[]>([]);

  useEffect(() => {
    void supabase
      .from("topics")
      .select("*")
      .order("sort_order")
      .then(({ data }) => setTopics(data ?? []));
  }, []);

  useEffect(() => {
    if (!slug) return;
    void supabase
      .from("companies")
      .select("*")
      .eq("slug", slug)
      .maybeSingle()
      .then(({ data }) => setCompany(data));
  }, [slug]);

  useEffect(() => {
    if (!company) return;
    void supabase
      .from("posts")
      .select("*, topics(name, slug)")
      .eq("company_id", company.id)
      .order("created_at", { ascending: false })
      .then(({ data }) => setPosts((data as PostWithTopic[]) ?? []));
  }, [company?.id]);

  return (
    <div className="mx-auto flex max-w-6xl gap-6 px-4 py-6">
      <Sidebar topics={topics} />
      <main className="min-w-0 flex-1 rounded-xl bg-white px-5 py-2">
        <h1 className="border-b border-neutral-100 py-4 text-lg font-bold">
          {company?.name ?? "기업"} 채널
        </h1>
        {posts.length === 0 ? (
          <p className="py-10 text-sm text-neutral-500">아직 이 회사 관련 글이 없습니다.</p>
        ) : (
          posts.map((post) => <PostCard key={post.id} post={post} />)
        )}
      </main>
      <RightRail />
    </div>
  );
}
