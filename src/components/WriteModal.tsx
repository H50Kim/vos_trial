import { useEffect, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import type { Topic } from "../lib/database.types";

export function WriteModal({ onClose }: { onClose: () => void }) {
  const [topics, setTopics] = useState<Topic[]>([]);
  const [topicId, setTopicId] = useState<number | null>(null);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    void supabase
      .from("topics")
      .select("*")
      .order("sort_order")
      .then(({ data }) => {
        const rows = data ?? [];
        setTopics(rows);
        setTopicId(rows[0]?.id ?? null);
      });
  }, []);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!topicId) return;
    setSaving(true);
    setError(null);
    const { data, error: insertError } = await supabase
      .from("posts")
      .insert({ topic_id: topicId, title: title.trim(), body: body.trim() })
      .select("id")
      .single();
    setSaving(false);
    if (insertError) {
      setError(insertError.message);
      return;
    }
    onClose();
    if (data?.id) navigate(`/post/${data.id}`);
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4">
      <form
        onSubmit={(e) => void onSubmit(e)}
        className="w-full max-w-xl rounded-xl bg-white p-5 shadow-2xl"
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold">글쓰기</h2>
          <button type="button" onClick={onClose} className="text-neutral-500">
            닫기
          </button>
        </div>
        <select
          className="mb-3 h-10 w-full rounded-md border border-neutral-200 px-3 text-sm"
          value={topicId ?? ""}
          onChange={(e) => setTopicId(Number(e.target.value))}
        >
          {topics.map((topic) => (
            <option key={topic.id} value={topic.id}>
              {topic.name}
            </option>
          ))}
        </select>
        <input
          required
          maxLength={120}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="제목을 입력하세요"
          className="mb-3 h-11 w-full rounded-md border border-neutral-200 px-3 text-sm"
        />
        <textarea
          required
          maxLength={10000}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="직장인 익명으로 이야기를 나눠보세요"
          className="h-48 w-full resize-none rounded-md border border-neutral-200 p-3 text-sm"
        />
        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
        <button
          disabled={saving}
          className="mt-4 h-11 w-full rounded-md bg-[#FFD400] text-sm font-bold text-black disabled:opacity-60"
        >
          {saving ? "등록 중..." : "등록"}
        </button>
      </form>
    </div>
  );
}
