import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "../lib/supabase";
import type { Topic } from "../lib/database.types";
import { PostCard, type PostWithTopic } from "../components/PostCard";
import { Sidebar } from "../components/Sidebar";
import { RightRail } from "../components/RightRail";

export function ChannelPage() {
  const { slug } = useParams();
  const [topics, setTopics] = useState<Topic[]>([]);
  const [posts, setPosts] = useState<PostWithTopic[]>([]);
  const topic = topics.find((item) => item.slug === slug);

  useEffect(() => {
    void supabase
      .from("topics")
      .select("*")
      .order("sort_order")
      .then(({ data }) => setTopics(data ?? []));
  }, []);

  useEffect(() => {
    if (!topic) return;
    void supabase
      .from("posts")
      .select("*, topics(name, slug)")
      .eq("topic_id", topic.id)
      .order("created_at", { ascending: false })
      .then(({ data }) => setPosts((data as PostWithTopic[]) ?? []));
  }, [topic?.id]);

  return (
    <div className="mx-auto flex max-w-6xl gap-6 px-4 py-6">
      <Sidebar topics={topics} />
      <main className="min-w-0 flex-1 rounded-xl bg-white px-5 py-2">
        <h1 className="border-b border-neutral-100 py-4 text-lg font-bold">
          {topic?.name ?? "채널"}
        </h1>
        {posts.map((post) => (
          <PostCard key={post.id} post={post} />
        ))}
      </main>
      <RightRail />
    </div>
  );
}
