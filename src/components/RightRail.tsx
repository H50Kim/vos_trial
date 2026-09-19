import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../lib/supabase";
import type { Company } from "../lib/database.types";
import type { PostWithTopic } from "./PostCard";

export function RightRail() {
  const [hot, setHot] = useState<PostWithTopic[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);

  useEffect(() => {
    void supabase
      .from("posts")
      .select("*, topics(name, slug)")
      .order("like_count", { ascending: false })
      .limit(8)
      .then(({ data }) => setHot((data as PostWithTopic[]) ?? []));
    void supabase
      .from("companies")
      .select("*")
      .order("name")
      .then(({ data }) => setCompanies(data ?? []));
  }, []);

  return (
    <aside className="hidden w-72 shrink-0 xl:block">
      <div className="sticky top-20 space-y-4">
        <div className="rounded-xl bg-white p-4">
          <h3 className="mb-3 text-sm font-bold">실시간 인기글</h3>
          <ol className="space-y-2">
            {hot.map((post, idx) => (
              <li key={post.id}>
                <Link to={`/post/${post.id}`} className="flex gap-2 text-sm hover:text-[#E11D2E]">
                  <span className="w-4 font-bold text-neutral-400">{idx + 1}</span>
                  <span className="line-clamp-2">{post.title}</span>
                </Link>
              </li>
            ))}
          </ol>
        </div>
        <div className="rounded-xl bg-white p-4">
          <h3 className="mb-3 text-sm font-bold">기업 채널</h3>
          <div className="flex flex-wrap gap-2">
            {companies.map((company) => (
              <Link
                key={company.id}
                to={`/company/${company.slug}`}
                className="rounded-full bg-neutral-100 px-3 py-1 text-xs font-medium hover:bg-neutral-200"
              >
                {company.name}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </aside>
  );
}
