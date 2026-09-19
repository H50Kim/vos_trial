import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import type { Topic } from "../lib/database.types";

export function Sidebar({ topics }: { topics: Topic[] }) {
  const { user, profile } = useAuth();

  return (
    <aside className="hidden w-52 shrink-0 lg:block">
      <div className="sticky top-20 space-y-4">
        <div className="rounded-xl bg-white p-3 text-sm">
          <Link to="/" className="block rounded-md px-2 py-2 font-semibold hover:bg-neutral-50">
            홈
          </Link>
          {user && (
            <>
              <Link
                to={`/company/${profile?.companies?.slug ?? "naver"}`}
                className="block rounded-md px-2 py-2 hover:bg-neutral-50"
              >
                우리회사
              </Link>
              <Link to="/bookmarks" className="block rounded-md px-2 py-2 hover:bg-neutral-50">
                북마크
              </Link>
            </>
          )}
        </div>
        <div className="rounded-xl bg-white p-3">
          <div className="px-2 pb-2 text-xs font-bold text-neutral-400">채널</div>
          {topics.map((topic) => (
            <Link
              key={topic.id}
              to={`/channel/${topic.slug}`}
              className="block rounded-md px-2 py-2 text-sm hover:bg-neutral-50"
            >
              {topic.name}
            </Link>
          ))}
        </div>
      </div>
    </aside>
  );
}
