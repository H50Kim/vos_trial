import { useState, type FormEvent } from "react";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Logo } from "./Logo";
import { WriteModal } from "./WriteModal";

export function Layout() {
  const { user, profile, signOut } = useAuth();
  const [query, setQuery] = useState("");
  const [writeOpen, setWriteOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const isAuth = location.pathname === "/auth";

  function onSearch(e: FormEvent) {
    e.preventDefault();
    const q = query.trim();
    navigate(q ? `/?q=${encodeURIComponent(q)}` : "/");
  }

  return (
    <div className="min-h-screen bg-[#f3f4f6]">
      <header className="sticky top-0 z-30 border-b border-neutral-200 bg-white">
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-6 px-4">
          <Logo />
          <nav className="hidden items-center gap-5 text-sm font-semibold text-neutral-700 md:flex">
            <Link to="/" className="hover:text-black">
              홈
            </Link>
            <Link to="/channel/talk" className="hover:text-black">
              채널
            </Link>
            <Link to="/company/naver" className="hover:text-black">
              기업
            </Link>
          </nav>
          <form onSubmit={onSearch} className="ml-auto hidden flex-1 max-w-md sm:block">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="관심있는 내용을 검색해보세요!"
              className="h-10 w-full rounded-full border border-neutral-200 bg-neutral-50 px-4 text-sm outline-none focus:border-neutral-400"
            />
          </form>
          <div className="flex items-center gap-2">
            {user ? (
              <>
                <button
                  type="button"
                  onClick={() => setWriteOpen(true)}
                  className="hidden h-9 rounded-md bg-[#FFD400] px-3 text-sm font-bold text-black sm:inline-flex sm:items-center"
                >
                  글쓰기
                </button>
                <div className="text-right text-xs leading-tight">
                  <div className="font-semibold text-neutral-800">
                    {profile?.companies?.name ?? "직장인"} · {profile?.tenure_years ?? 1}년차
                  </div>
                  <button
                    type="button"
                    className="text-neutral-500 hover:text-black"
                    onClick={() => void signOut()}
                  >
                    로그아웃
                  </button>
                </div>
              </>
            ) : (
              !isAuth && (
                <Link
                  to="/auth"
                  className="inline-flex h-9 items-center rounded-md bg-neutral-900 px-4 text-sm font-semibold text-white"
                >
                  로그인
                </Link>
              )
            )}
          </div>
        </div>
      </header>
      <Outlet />
      {writeOpen && <WriteModal onClose={() => setWriteOpen(false)} />}
    </div>
  );
}
