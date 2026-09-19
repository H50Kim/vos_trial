import { useState, type FormEvent } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { useAuth } from "../context/AuthContext";
import { Logo } from "../components/Logo";

export function AuthPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState<"login" | "signup">("signup");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (user) return <Navigate to="/" replace />;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setMessage(null);

    if (mode === "signup") {
      const { data, error: signError } = await supabase.auth.signUp({
        email: email.trim(),
        password,
      });
      setBusy(false);
      if (signError) {
        setError(signError.message);
        return;
      }
      if (!data.session) {
        setMessage("가입 메일을 확인하면 익명 프로필이 활성화됩니다.");
        return;
      }
      navigate("/");
      return;
    }

    const { error: signError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    setBusy(false);
    if (signError) {
      setError(signError.message);
      return;
    }
    navigate("/");
  }

  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <div className="rounded-2xl bg-white p-8 shadow-sm">
        <div className="mb-6 flex justify-center">
          <Logo />
        </div>
        <h1 className="text-center text-xl font-bold">회사 이메일로 시작하기</h1>
        <p className="mt-2 text-center text-sm text-neutral-500">
          도메인으로 회사가 인증되고, 글에는 이름 대신{" "}
          <span className="font-semibold text-neutral-700">회사 · N년차</span>만 표시됩니다.
        </p>
        <form onSubmit={(e) => void onSubmit(e)} className="mt-6 space-y-3">
          <input
            required
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@company.com"
            className="h-11 w-full rounded-md border border-neutral-200 px-3 text-sm"
          />
          <input
            required
            minLength={6}
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="비밀번호 (6자 이상)"
            className="h-11 w-full rounded-md border border-neutral-200 px-3 text-sm"
          />
          {error && <p className="text-sm text-red-600">{error}</p>}
          {message && <p className="text-sm text-emerald-700">{message}</p>}
          <button
            disabled={busy}
            className="h-11 w-full rounded-md bg-neutral-900 text-sm font-semibold text-white disabled:opacity-60"
          >
            {busy ? "처리 중..." : mode === "signup" ? "가입하고 익명으로 시작" : "로그인"}
          </button>
        </form>
        <button
          type="button"
          className="mt-4 w-full text-sm text-neutral-500 hover:text-black"
          onClick={() => setMode(mode === "signup" ? "login" : "signup")}
        >
          {mode === "signup" ? "이미 계정이 있나요? 로그인" : "새 계정 만들기"}
        </button>
      </div>
    </div>
  );
}
