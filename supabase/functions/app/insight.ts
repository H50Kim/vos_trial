const POSITIVE: Array<[string, number]> = [
  ["따라가지 못하고", 0],
  ["감사", 2],
  ["도움", 2],
  ["만족", 2],
  ["유용", 2],
  ["잘 되", 2],
  ["좋겠습니다", 1],
  ["좋습니다", 2],
  ["좋아요", 2],
  ["안전", 1],
  ["공유합니다", 2],
  ["공유", 1],
  ["기대", 1],
  ["추천", 1],
  ["thank", 2],
  ["great", 2],
  ["helpful", 2],
  ["good", 1],
];

const NEGATIVE: Array<[string, number]> = [
  ["따라가지 못하", 3],
  ["미비", 3],
  ["부족", 2],
  ["더딥", 3],
  ["느리", 2],
  ["지연", 2],
  ["문제", 2],
  ["불편", 2],
  ["불만", 3],
  ["못하", 2],
  ["안 되", 2],
  ["어렵", 2],
  ["장애", 2],
  ["오류", 2],
  ["위험", 2],
  ["inadequate", 3],
  ["missing", 2],
  ["delay", 2],
  ["issue", 2],
  ["fail", 2],
  ["slow", 2],
];

const REQUEST: Array<[string, number]> = [
  ["필요합니다", 2],
  ["필요하다", 2],
  ["필요", 1],
  ["부탁", 1],
  ["확대", 1],
  ["개선", 1],
  ["해 주", 1],
  ["되면 좋", 1],
  ["please", 1],
  ["need", 1],
];

const STOP = new Set([
  "입니다",
  "있습니다",
  "하겠습니다",
  "됩니다",
  "해주세요",
  "해주시오",
  "주시길",
  "그리고",
  "또는",
  "이번",
  "우리",
  "모두",
  "위한",
  "위해",
  "하는",
  "하여",
  "해서",
  "되는",
  "관련",
  "내용",
  "부분",
  "대해",
  "이후",
  "있도록",
  "구체적으로",
  "작성해",
  "연락",
  "실행을",
  "위해서는",
  "부족",
  "좋겠습니다",
  "필요합니다",
  "필요하다",
  "테스트",
  "google",
  "기본",
  "연동",
  "의견입니다",
  "도구입니다",
  "설문이란",
  "있을까요",
  "완료할",
  "this",
  "that",
  "with",
  "from",
  "have",
  "been",
  "will",
  "your",
  "post",
  "check",
  "test",
  "form",
  "able",
  "after",
  "before",
  "basic",
  "also",
  "into",
  "access",
]);

const PHRASES = [
  "세이프티",
  "체크리스트",
  "외부교육",
  "온보딩",
  "임단협",
  "인프라",
  "회의실",
  "네트워크",
  "청라",
  "브리핑",
  "우선순위",
  "파이프라인",
];

function scoreList(text: string, pairs: Array<[string, number]>) {
  let score = 0;
  for (const [term, weight] of pairs) {
    if (!term || weight <= 0) continue;
    if (text.includes(term)) score += weight;
  }
  return score;
}

function classifyText(raw: unknown) {
  const text = String(raw || "").toLowerCase();
  if (!text.trim()) return { label: "neutral", positive: 0, negative: 0, request: 0 };
  const pos = scoreList(text, POSITIVE);
  const neg = scoreList(text, NEGATIVE);
  const req = scoreList(text, REQUEST);
  let label = "neutral";
  if (pos && neg && pos >= 2 && neg >= 2) label = "mixed";
  else if (neg >= pos && neg >= 2) label = "negative";
  else if (pos > neg && pos >= 2 && req <= 1) label = "positive";
  else if (req >= 1 && neg <= 1) label = "request";
  else if (neg > pos) label = "negative";
  else if (pos > 0 && req === 0) label = "positive";
  return { label, positive: pos, negative: neg, request: req };
}

function titleOf(item: Record<string, unknown>) {
  return String(item?.ask || "")
    .split("\n")[0]
    .trim()
    .slice(0, 80);
}

function titleEnOf(item: Record<string, unknown>) {
  return String(item?.askEn || "")
    .split("\n")[0]
    .trim()
    .slice(0, 80);
}

function bodyOf(item: Record<string, unknown>) {
  return `${item?.ask || ""}\n${item?.others || ""}`;
}

function bodyEnOf(item: Record<string, unknown>) {
  return `${item?.askEn || ""}\n${item?.othersEn || ""}`;
}

function insightKind(item: Record<string, unknown>) {
  const kind = String(item?.kind || "");
  if (kind === "notice" || item?.kindLabel === "공지" || item?.kindLabel === "공지사항") return "notice";
  if (kind === "share" || item?.kindLabel === "공유") return "share";
  return "proposal";
}

function insightStatus(item: Record<string, unknown>) {
  if (insightKind(item) !== "proposal") return "none";
  return item?.status === "done" || item?.statusLabel === "완료" ? "done" : "open";
}

type Sample = { title: string; titleEn: string };

function rankedKeywords(counts: Map<string, number>) {
  return [...counts.entries()]
    .filter(([term]) => !STOP.has(term))
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "ko"))
    .slice(0, 12)
    .map(([term, count]) => ({ term, count }));
}

function extractKeywords(text: string) {
  const src = String(text || "").toLowerCase();
  const counts = new Map<string, number>();
  function add(term: string, weight = 1) {
    const key = String(term || "")
      .trim()
      .replace(/[이가을를은는의에로와과]$/, "");
    if (key.length < 2 || STOP.has(key)) return;
    if (/^[a-z0-9]{1,3}$/.test(key)) return;
    counts.set(key, (counts.get(key) || 0) + weight);
  }
  for (const phrase of PHRASES) {
    if (src.includes(phrase.toLowerCase())) add(phrase, 3);
  }
  for (const token of src.match(/[가-힣]{2,8}/g) || []) add(token, 1);
  for (const token of src.match(/[a-z][a-z0-9-]{3,}/g) || []) add(token, 1);
  return counts;
}

export function summarizeContent(opinions: Array<Record<string, unknown>> = []) {
  const posts = Array.isArray(opinions) ? opinions : [];
  const sentiment = { positive: 0, negative: 0, mixed: 0, request: 0, neutral: 0, total: posts.length };
  const samples: Record<string, Sample[]> = { positive: [], negative: [], mixed: [], request: [], neutral: [] };
  const keywordCounts = new Map<string, number>();
  const keywordCountsEn = new Map<string, number>();
  const progress = { open: 0, done: 0 };

  for (const item of posts) {
    const title = titleOf(item);
    const titleEn = titleEnOf(item);
    const text = bodyOf(item);
    const textEn = bodyEnOf(item);
    const result = classifyText(text);
    const label = result.label as keyof typeof sentiment;
    sentiment[label] += 1;
    if (samples[result.label].length < 3 && title) {
      samples[result.label].push({ title, titleEn: titleEn && titleEn !== title ? titleEn : "" });
    }
    for (const [term, count] of extractKeywords(`${title}\n${text}`)) {
      keywordCounts.set(term, (keywordCounts.get(term) || 0) + count);
    }
    if (textEn.trim()) {
      for (const [term, count] of extractKeywords(`${titleEn}\n${textEn}`)) {
        keywordCountsEn.set(term, (keywordCountsEn.get(term) || 0) + count);
      }
    }
    const status = insightStatus(item);
    if (status === "open") progress.open += 1;
    if (status === "done") progress.done += 1;
  }

  const keywords = rankedKeywords(keywordCounts);
  const keywordsEn = rankedKeywords(keywordCountsEn);
  const proposalTotal = Math.max(1, progress.open + progress.done);
  return {
    posts: posts.length,
    sentiment,
    positiveShare: Math.round((sentiment.positive / Math.max(1, posts.length)) * 100),
    negativeShare: Math.round(((sentiment.negative + sentiment.request) / Math.max(1, posts.length)) * 100),
    keywords,
    keywordsEn,
    samples,
    progress: {
      ...progress,
      total: progress.open + progress.done,
      openShare: Math.round((progress.open / proposalTotal) * 100),
      doneShare: Math.round((progress.done / proposalTotal) * 100),
    },
  };
}
