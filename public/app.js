const state = {
  token: localStorage.getItem("voc_token") || "",
  lang: localStorage.getItem("voc_lang") === "en" ? "en" : "ko",
  anonId: "",
  role: "",
  isAdmin: false,
  editingId: "",
  selectedId: "",
  view: "home",
  sort: "new",
  status: "all",
  kind: "proposal",
  topic: "all",
  query: "",
  afterAuth: "",
  banner: null,
  saving: false,
  editingCommentId: "",
  items: [],
};

const els = {
  backBtn: document.querySelector("#back-btn"),
  headerWrite: document.querySelector("#header-write"),
  statusTabs: document.querySelector("#status-tabs"),
  kindTabs: document.querySelector("#kind-tabs"),
  sortTabs: document.querySelector("#sort-tabs"),
  viewHome: document.querySelector("#view-home"),
  viewDetail: document.querySelector("#view-detail"),
  viewWrite: document.querySelector("#view-write"),
  viewMe: document.querySelector("#view-me"),
  gate: document.querySelector("#gate"),
  meCard: document.querySelector("#me-card"),
  identity: document.querySelector("#me-card"),
  anonLabel: document.querySelector("#anon-label"),
  roleLabel: document.querySelector("#role-label"),
  logout: document.querySelector("#logout"),
  composerTitle: document.querySelector("#composer-title"),
  composerHint: document.querySelector("#composer-hint"),
  submit: document.querySelector("#submit-opinion"),
  authForm: document.querySelector("#auth-form"),
  opinionForm: document.querySelector("#opinion-form"),
  authError: document.querySelector("#auth-error"),
  formError: document.querySelector("#form-error"),
  feed: document.querySelector("#feed"),
  detail: document.querySelector("#detail"),
  boardMeta: document.querySelector("#board-meta"),
  search: document.querySelector("#search"),
  myPosts: document.querySelector("#my-posts"),
  myComments: document.querySelector("#my-comments"),
  myPostList: document.querySelector("#my-post-list"),
  myCommentList: document.querySelector("#my-comment-list"),
  myPostsBtn: document.querySelector("#my-posts-btn"),
  langToggle: document.querySelector("#lang-toggle"),
};

const I18N = {
  ko: {
    back: "뒤로",
    home: "홈",
    write: "글쓰기",
    me: "내 정보",
    mainMenu: "주요 메뉴",
    mobileMenu: "모바일 메뉴",
    status: "진행 상태",
    all: "전체",
    waiting: "대기",
    done: "완료",
    sort: "정렬",
    hot: "인기",
    latest: "최신",
    searchPlaceholder: "글, 익명 ID, 고유번호 검색",
    writeHint: "@gm.com 이메일로 등록한 뒤 익명으로 게시됩니다. 이메일은 노출되지 않습니다.",
    postKind: "글 종류",
    propose: "제안하기",
    share: "공유하기",
    shareChip: "공유",
    notice: "공지사항",
    noticeChip: "공지",
    title: "제목",
    required: "필수",
    titlePlaceholder: "동료들에게 전하고 싶은 의견을 적어 주세요.",
    body: "내용",
    bodyPlaceholder: "상세 내용을 적어 주세요.",
    priority: "우선순위",
    priorityHint: "1은 낮음, 5는 높음입니다.",
    email: "이메일",
    posting: "게시 중…",
    loginToWrite: "글을 쓰려면 @gm.com 이메일로 먼저 등록해 주세요. 등록이 끝나면 글쓰기로 돌아갑니다.",
    noticeAdminOnly: "공지사항은 관리자만 작성할 수 있습니다.",
    voteOnce: "추천은 한 번만 할 수 있습니다.",
    voteOwn: "내 글에는 추천할 수 없습니다.",
    postAnonymous: "익명으로 게시",
    anonymous: "익명",
    admin: "관리자",
    user: "User",
    meHint: "@gm.com 이메일로 등록하면 고정 익명 ID가 유지됩니다. 메일 주소는 공개되지 않습니다.",
    viewMyPosts: "내 글 보기",
    logout: "로그아웃",
    myPosts: "내 글",
    myComments: "내 댓글",
    emailRegister: "이메일 등록",
    registerHint: "@gm.com 이메일로 등록한 뒤 익명으로 참여합니다. 메일 주소는 공개되지 않습니다.",
    registerEnter: "등록하고 입장",
    switchToEn: "Switch to English",
    switchToKo: "한국어로 전환",
    noTitle: "제목 없음",
    justNow: "방금",
    minutesAgo: "{n}분 전",
    hoursAgo: "{n}시간 전",
    daysAgo: "{n}일 전",
    recommend: "추천 {n}",
    comments: "댓글 {n}",
    priorityAria: "우선순위 {n}",
    searchResults: "{n}개 검색 결과",
    noMatching: "조건에 맞는 게시글이 없습니다.",
    tryOther: "다른 상태나 검색어를 선택해 보세요.",
    firstPost: "첫 익명 글을 남겨 보세요.",
    noPosts: "작성한 글이 없습니다.",
    noComments: "작성한 댓글이 없습니다.",
    editPost: "글 수정 · {n}",
    saveEdit: "수정 저장",
    posted: "게시했습니다.",
    postedFormFail: "게시는 됐습니다. 폼 저장 실패: {error}",
    gmEmailOnly: "@gm.com 이메일만 등록할 수 있습니다.",
    requestFailed: "요청에 실패했습니다.",
    edited: "수정 {n}",
    myPost: "내 글",
    revertWaiting: "대기로 되돌리기",
    markDone: "완료 처리",
    edit: "수정",
    delete: "삭제",
    cancel: "취소",
    save: "저장",
    register: "등록",
    firstComment: "첫 댓글을 남겨 보세요.",
    commentPlaceholder: "익명 댓글 남기기",
    loginToEngage: "이메일 등록 후 댓글과 추천을 남길 수 있습니다.",
    commentsCount: "댓글 {n}",
    anonymousAuthor: "익명 {id}",
    postNumber: "고유번호 {n}",
    confirmDeleteTitle: "글을 삭제할까요?",
    confirmDeletePost: "고유번호 {n} 글을 삭제합니다. 삭제하면 되돌릴 수 없습니다.",
    confirmDeleteComment: "이 댓글을 삭제할까요?",
    readMore: "자세히 보기",
    notFound: "글을 찾을 수 없습니다.",
    stars: "{n}점",
    noRating: "별점 없음",
    people: "{n}명",
    myRating: "내 별점 {n}",
    priorityLabel: "우선순위 {n}",
  },
  en: {
    back: "Back",
    home: "Home",
    write: "Write",
    me: "Me",
    mainMenu: "Main menu",
    mobileMenu: "Mobile menu",
    status: "Status",
    all: "All",
    waiting: "Open",
    done: "Done",
    sort: "Sort",
    hot: "Popular",
    latest: "Latest",
    searchPlaceholder: "Search posts, anonymous ID, or number",
    writeHint: "Register with a @gm.com email to post anonymously. Your email stays private.",
    postKind: "Post type",
    propose: "Propose",
    share: "Share",
    shareChip: "Share",
    notice: "Notice",
    noticeChip: "Notice",
    title: "Title",
    required: "Required",
    titlePlaceholder: "Share what you want colleagues to hear.",
    body: "Details",
    bodyPlaceholder: "Add more context.",
    priority: "Priority",
    priorityHint: "1 is lowest, 5 is highest.",
    email: "Email",
    posting: "Posting…",
    loginToWrite: "Register with a @gm.com email first. You will return to Write after that.",
    noticeAdminOnly: "Only admins can post notices.",
    voteOnce: "You can like a post only once.",
    voteOwn: "You cannot like your own post.",
    postAnonymous: "Post anonymously",
    anonymous: "Anonymous",
    admin: "Admin",
    user: "User",
    meHint: "A @gm.com email keeps a stable anonymous ID. Your address is never shown.",
    viewMyPosts: "View my posts",
    logout: "Log out",
    myPosts: "My posts",
    myComments: "My comments",
    emailRegister: "Email registration",
    registerHint: "Register with a @gm.com email to join anonymously. Your address is never shown.",
    registerEnter: "Register and enter",
    switchToEn: "Switch to English",
    switchToKo: "한국어로 전환",
    noTitle: "Untitled",
    justNow: "Just now",
    minutesAgo: "{n}m ago",
    hoursAgo: "{n}h ago",
    daysAgo: "{n}d ago",
    recommend: "Likes {n}",
    comments: "Comments {n}",
    priorityAria: "Priority {n}",
    searchResults: "{n} results",
    noMatching: "No posts match these filters.",
    tryOther: "Try another status or search.",
    firstPost: "Write the first anonymous post.",
    noPosts: "You have not written any posts.",
    noComments: "You have not written any comments.",
    editPost: "Edit · {n}",
    saveEdit: "Save changes",
    posted: "Posted.",
    postedFormFail: "Posted, but form save failed: {error}",
    gmEmailOnly: "Only @gm.com emails can register.",
    requestFailed: "The request failed.",
    edited: "Edited {n}",
    myPost: "Mine",
    revertWaiting: "Move back to Open",
    markDone: "Mark done",
    edit: "Edit",
    delete: "Delete",
    cancel: "Cancel",
    save: "Save",
    register: "Post",
    firstComment: "Leave the first comment.",
    commentPlaceholder: "Write an anonymous comment",
    loginToEngage: "Register your email to comment or like.",
    commentsCount: "Comments {n}",
    anonymousAuthor: "Anon {id}",
    postNumber: "No. {n}",
    confirmDeleteTitle: "Delete this post?",
    confirmDeletePost: "Post {n} will be deleted. This cannot be undone.",
    confirmDeleteComment: "Delete this comment?",
    readMore: "Read more",
    notFound: "Post not found.",
    stars: "{n} stars",
    noRating: "No rating",
    people: "{n} people",
    myRating: "My rating {n}",
    priorityLabel: "Priority {n}",
  },
};

const ERROR_KEYS = {
  "@gm.com 이메일만 등록할 수 있습니다.": "gmEmailOnly",
  "요청에 실패했습니다.": "requestFailed",
  "이메일 등록 후 입장해 주세요.": "loginToEngage",
  "Ask S&E Anything 내용을 입력해 주세요.": "titlePlaceholder",
  "Priority는 0부터 5 사이여야 합니다.": "priority",
  "상태를 변경할 권한이 없습니다.": "markDone",
  "공지사항은 관리자만 작성할 수 있습니다.": "noticeAdminOnly",
  "이미 이 의견에 투표했습니다. 투표는 한 번만 가능합니다.": "voteOnce",
};

function t(key, vars = {}) {
  const table = I18N[state.lang] || I18N.ko;
  let text = table[key] ?? I18N.ko[key] ?? key;
  for (const [name, value] of Object.entries(vars)) {
    text = text.replaceAll(`{${name}}`, String(value));
  }
  return text;
}

function tError(message) {
  const key = ERROR_KEYS[String(message || "")];
  return key ? t(key) : String(message || t("requestFailed"));
}

function applyStaticI18n() {
  document.documentElement.lang = state.lang === "en" ? "en" : "ko";
  document.querySelectorAll("[data-i18n]").forEach((node) => {
    node.textContent = t(node.dataset.i18n);
  });
  document.querySelectorAll("[data-i18n-placeholder]").forEach((node) => {
    node.placeholder = t(node.dataset.i18nPlaceholder);
  });
  document.querySelectorAll("[data-i18n-aria]").forEach((node) => {
    node.setAttribute("aria-label", t(node.dataset.i18nAria));
  });
  if (els.langToggle) {
    els.langToggle.textContent = state.lang === "en" ? "한" : "EN";
    els.langToggle.setAttribute("aria-label", state.lang === "en" ? t("switchToKo") : t("switchToEn"));
  }
}

function setLang(lang) {
  state.lang = lang === "en" ? "en" : "ko";
  localStorage.setItem("voc_lang", state.lang);
  applyStaticI18n();
  renderAll();
}

function showError(node, message, ok) {
  if (!node) return;
  if (!message) {
    node.hidden = true;
    node.textContent = "";
    node.className = "error";
    return;
  }
  node.hidden = false;
  node.className = ok ? "ok" : "error";
  node.textContent = message;
}

let confirmLock = null;

function confirmDialog({ title, body, okLabel }) {
  const root = document.querySelector("#confirm-dialog");
  const titleEl = document.querySelector("#confirm-title");
  const bodyEl = document.querySelector("#confirm-body");
  const okBtn = document.querySelector("#confirm-ok");
  const cancelBtn = document.querySelector("#confirm-cancel");
  if (!root || !titleEl || !bodyEl || !okBtn || !cancelBtn) {
    return Promise.resolve(window.confirm([title, body].filter(Boolean).join("\n")));
  }
  if (confirmLock) return confirmLock;
  confirmLock = new Promise((resolve) => {
    titleEl.textContent = title;
    bodyEl.textContent = body;
    okBtn.textContent = okLabel || t("delete");
    cancelBtn.textContent = t("cancel");
    root.hidden = false;
    root.classList.remove("hidden");
    const finish = (value) => {
      root.hidden = true;
      root.classList.add("hidden");
      document.removeEventListener("keydown", onKey);
      root.removeEventListener("click", onClick);
      confirmLock = null;
      resolve(value);
    };
    const onKey = (event) => {
      if (event.key === "Escape") finish(false);
    };
    const onClick = (event) => {
      if (event.target.closest("#confirm-ok")) finish(true);
      else if (event.target.closest("#confirm-cancel") || event.target.closest("[data-confirm-cancel]")) finish(false);
    };
    document.addEventListener("keydown", onKey);
    root.addEventListener("click", onClick);
    cancelBtn.focus();
  });
  return confirmLock;
}

const API_BASE = "https://tkjsezhhllrpnxhqmmrm.supabase.co/functions/v1/app/";

function isGmEmail(email) {
  return /^[^\s@]+@gm\.com$/.test(String(email || "").trim().toLowerCase());
}

function apiUrl(path) {
  const relative = String(path).replace(/^\//, "");
  if (location.pathname.includes("/functions/v1/app")) {
    return new URL(relative, new URL("./", location.href)).href;
  }
  if (location.hostname === "localhost" || location.hostname === "127.0.0.1") {
    return new URL(relative, `${location.origin}/`).href;
  }
  return new URL(relative, API_BASE).href;
}

async function api(path, options = {}) {
  const headers = { ...(options.headers || {}) };
  if (options.body && !(options.body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
  }
  if (state.token) headers.Authorization = `Bearer ${state.token}`;
  const response = await fetch(apiUrl(path), { ...options, headers, credentials: "same-origin" });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || t("requestFailed"));
  return data;
}

function kindOf(item) {
  if (item?.kind === "notice" || item?.kindLabel === "공지" || item?.kindLabel === "공지사항") return "notice";
  if (item?.kind === "share" || item?.kindLabel === "공유") return "share";
  return "proposal";
}

function isShare(item) {
  return kindOf(item) === "share";
}

function isNotice(item) {
  return kindOf(item) === "notice";
}

function isProposal(item) {
  return kindOf(item) === "proposal";
}

function statusOf(item) {
  if (!isProposal(item)) return "none";
  return item?.status === "done" || item?.statusLabel === "완료" ? "done" : "open";
}

function statusLabel(item) {
  if (isNotice(item)) return t("noticeChip");
  if (isShare(item)) return t("shareChip");
  return statusOf(item) === "done" ? t("done") : t("waiting");
}

function statusChip(item) {
  if (isNotice(item)) {
    return `<span class="status-chip notice"><span class="chip-emoji" aria-hidden="true">📌</span>${escapeHtml(t("noticeChip"))}</span>`;
  }
  if (isShare(item)) {
    return `<span class="status-chip share"><span class="chip-emoji" aria-hidden="true">📢</span>${escapeHtml(t("shareChip"))}</span>`;
  }
  const status = statusOf(item);
  const emoji = status === "done" ? "✅" : "⏳";
  return `<span class="status-chip ${status}"><span class="chip-emoji" aria-hidden="true">${emoji}</span>${escapeHtml(status === "done" ? t("done") : t("waiting"))}</span>`;
}

function postNumberOf(item) {
  if (item?.numberLabel) return String(item.numberLabel);
  const number = Number(item?.number);
  if (Number.isFinite(number) && number > 0) return `#${String(Math.round(number)).padStart(3, "0")}`;
  return String(item?.postId || "");
}

function renderPostIdentity(item) {
  const number = postNumberOf(item);
  const author = String(item?.anonId || "");
  return `${number ? `<span class="post-number" title="${escapeHtml(t("postNumber", { n: number }))}">${escapeHtml(number)}</span>` : ""}
    ${author ? `<span class="post-author">${escapeHtml(t("anonymousAuthor", { id: author }))}</span>` : ""}`;
}

function matchesStatus(item, status) {
  if (status === "all") return true;
  if (status === "notice") return isNotice(item);
  if (status === "share") return isShare(item);
  return isProposal(item) && statusOf(item) === status;
}

function statusCounts() {
  const counts = { all: 0, notice: 0, share: 0, open: 0, done: 0 };
  for (const item of state.items) {
    counts.all += 1;
    if (isNotice(item)) counts.notice += 1;
    else if (isShare(item)) counts.share += 1;
    else if (statusOf(item) === "done") counts.done += 1;
    else counts.open += 1;
  }
  return counts;
}

function renderStatusTabs() {
  if (!els.statusTabs) return;
  const counts = statusCounts();
  els.statusTabs.querySelectorAll(".status-tab").forEach((tab) => {
    const status = tab.dataset.status;
    const countNode = tab.querySelector("[data-count]");
    if (countNode) countNode.textContent = String(counts[status] ?? 0);
    const active = state.status === status;
    tab.classList.toggle("active", active);
    tab.setAttribute("aria-pressed", active ? "true" : "false");
  });
}

function severityOf(item) {
  const value = Number(item?.severity ?? item?.priority);
  return Number.isFinite(value) ? value : 0;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function relativeTime(iso, fallback) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return fallback || "";
  const diff = Date.now() - date.getTime();
  if (diff < 60_000) return t("justNow");
  if (diff < 3_600_000) return t("minutesAgo", { n: Math.floor(diff / 60_000) });
  if (diff < 86_400_000) return t("hoursAgo", { n: Math.floor(diff / 3_600_000) });
  if (diff < 86_400_000 * 7) return t("daysAgo", { n: Math.floor(diff / 86_400_000) });
  return fallback || "";
}

function titleOf(item) {
  return String(item.ask || "").split("\n")[0].trim() || t("noTitle");
}

function previewOf(item) {
  const src = String(item.others || "").replace(/\s+/g, " ").trim();
  if (!src) return "";
  if (isNotice(item) && src.length > 80) return `${src.slice(0, 80).trim()}…`;
  return src;
}

const HANGUL_RE = /[\uac00-\ud7a3]/;
const translationCache = new Map();

function hasKorean(text) {
  return HANGUL_RE.test(String(text || ""));
}

function englishOf(primary, english) {
  const src = String(primary || "").trim();
  const en = String(english || "").trim();
  if (!src || !en || en === src) return "";
  return en;
}

function titleEnOf(item) {
  return englishOf(titleOf(item), String(item.askEn || "").split("\n")[0].trim());
}

function bilingualHeading(tag, korean, english) {
  const en = englishOf(korean, english);
  if (state.lang === "en" && en) {
    return `<${tag}>${escapeHtml(en)}</${tag}><p class="i18n-en"><span class="lang-tag">KO</span>${escapeHtml(korean)}</p>`;
  }
  const enBlock = en
    ? `<p class="i18n-en"><span class="lang-tag">EN</span>${escapeHtml(en)}</p>`
    : "";
  return `<${tag}>${escapeHtml(korean)}</${tag}>${enBlock}`;
}

function bilingualParagraph(className, korean, english) {
  const src = String(korean || "").trim();
  if (!src) return "";
  const en = englishOf(src, english);
  if (state.lang === "en" && en) {
    return `<p class="${className}">${escapeHtml(en)}</p><p class="${className} i18n-en"><span class="lang-tag">KO</span>${escapeHtml(src)}</p>`;
  }
  const enBlock = en
    ? `<p class="${className} i18n-en"><span class="lang-tag">EN</span>${escapeHtml(en)}</p>`
    : "";
  return `<p class="${className}">${escapeHtml(src)}</p>${enBlock}`;
}

function bilingualCommentBody(korean, english) {
  const src = String(korean || "");
  if (!src) return "";
  const en = englishOf(src, english);
  if (state.lang === "en" && en) {
    return `<p class="comment-body">${escapeHtml(en)}</p><p class="comment-body i18n-en"><span class="lang-tag">KO</span>${escapeHtml(src)}</p>`;
  }
  const enBlock = en
    ? `<p class="comment-body i18n-en"><span class="lang-tag">EN</span>${escapeHtml(en)}</p>`
    : "";
  return `<p class="comment-body">${escapeHtml(src)}</p>${enBlock}`;
}

async function translateKoToEnClient(text) {
  const src = String(text || "").trim();
  if (!src || !hasKorean(src)) return "";
  if (translationCache.has(src)) return translationCache.get(src);

  const pending = (async () => {
    try {
      const chunks = [];
      let rest = src;
      const max = 450;
      while (rest.length) {
        let piece = rest;
        if (rest.length > max) {
          let cut = rest.lastIndexOf("\n", max);
          if (cut < 80) cut = rest.lastIndexOf(" ", max);
          if (cut < 80) cut = max;
          piece = rest.slice(0, cut);
          rest = rest.slice(cut);
        } else {
          rest = "";
        }
        const url =
          "https://api.mymemory.translated.net/get?q=" +
          encodeURIComponent(piece) +
          "&langpair=ko|en";
        const res = await fetch(url);
        if (!res.ok) return "";
        const data = await res.json();
        const translated = String(data?.responseData?.translatedText || "").trim();
        if (!translated) return "";
        chunks.push(translated);
      }
      const joined = chunks.join("\n").trim();
      return joined && joined !== src ? joined : "";
    } catch {
      return "";
    }
  })();

  translationCache.set(src, pending);
  return pending;
}

async function hydrateItemTranslations(items) {
  for (const item of items) {
    let changed = false;
    if (hasKorean(item.ask) && !String(item.askEn || "").trim()) {
      const en = await translateKoToEnClient(item.ask);
      if (en) {
        item.askEn = en;
        changed = true;
      }
    }
    if (hasKorean(item.others) && !String(item.othersEn || "").trim()) {
      const en = await translateKoToEnClient(item.others);
      if (en) {
        item.othersEn = en;
        changed = true;
      }
    }
    for (const comment of item.comments || []) {
      if (hasKorean(comment.body) && !String(comment.bodyEn || "").trim()) {
        const en = await translateKoToEnClient(comment.body);
        if (en) {
          comment.bodyEn = en;
          changed = true;
        }
      }
    }
    if (changed) {
      renderFeed();
      if (state.view === "detail") renderDetail();
      renderMyActivity();
    }
  }
}

function signalBars(level) {
  const value = Math.max(0, Math.min(5, Number(level) || 0));
  const bars = [1, 2, 3, 4, 5]
    .map((bar) => `<i class="${bar <= value ? "on" : ""}"></i>`)
    .join("");
  return `<span class="signal" aria-label="${t("priorityAria", { n: value })}"><span class="signal-bars">${bars}</span></span>`;
}

function renderMetrics(item, options = {}) {
  const comments = item.comments?.length || 0;
  const canVote = options.vote !== false && Boolean(state.anonId) && !item.mine && !item.voted;
  const voteLabel = item.mine ? t("voteOwn") : item.voted ? t("voteOnce") : t("recommend", { n: item.votes || 0 });
  return `<div class="eng">
      <span class="metric${canVote ? " metric-vote" : ""}" ${canVote ? `data-vote="${item.id}"` : ""} aria-label="${escapeHtml(voteLabel)}"><span class="metric-icon" aria-hidden="true">❤️</span>${item.votes || 0}</span>
      <span class="metric" aria-label="${t("comments", { n: comments })}"><span class="metric-icon" aria-hidden="true">💬</span>${comments}</span>
      ${isProposal(item) ? signalBars(severityOf(item)) : ""}
    </div>`;
}

function findItem(id) {
  return state.items.find((item) => item.id === id) ?? null;
}

function visibleItems() {
  const query = state.query.trim().toLowerCase();
  const items = state.items.filter((item) => {
    if (state.topic === "mine" && !item.mine) return false;
    if (!matchesStatus(item, state.status)) return false;
    if (!query) return true;
    const haystack = [
      item.ask,
      item.others,
      item.askEn,
      item.othersEn,
      item.anonId,
      item.numberLabel,
      item.postId,
      statusLabel(item),
      t("propose"),
      t("share"),
      t("notice"),
      t("noticeChip"),
      t("priorityLabel", { n: severityOf(item) }),
      item.source === "google" ? "form google" : "s&e app",
    ]
      .join(" ")
      .toLowerCase();
    return haystack.includes(query);
  });
  const byBoard = (a, b) => {
    if (state.sort === "new") return String(b.createdAt).localeCompare(String(a.createdAt));
    if ((b.votes || 0) !== (a.votes || 0)) return (b.votes || 0) - (a.votes || 0);
    return (b.comments?.length || 0) - (a.comments?.length || 0);
  };
  const notices = items.filter(isNotice).sort(byBoard);
  const rest = items.filter((item) => !isNotice(item)).sort(byBoard);
  if (state.status === "all") return [...notices, ...rest];
  return items.sort(byBoard);
}

function setView(view) {
  state.view = view;
  document.body.dataset.view = view;
  els.viewHome.classList.toggle("hidden", view !== "home");
  els.viewDetail.classList.toggle("hidden", view !== "detail");
  els.viewWrite.classList.toggle("hidden", view !== "write");
  els.viewMe.classList.toggle("hidden", view !== "me");
  els.backBtn.classList.toggle("hidden", view === "home");
  document.querySelectorAll(".nav-btn").forEach((button) => {
    button.classList.toggle("active", button.dataset.view === view || (view === "detail" && button.dataset.view === "home"));
  });
  window.scrollTo(0, 0);
}

function renderIdentity() {
  const loggedIn = Boolean(state.anonId);
  els.meCard.classList.toggle("hidden", !loggedIn);
  els.gate.classList.toggle("hidden", loggedIn);
  if (els.anonLabel) els.anonLabel.textContent = state.anonId || "";
  if (els.roleLabel) {
    els.roleLabel.textContent = state.isAdmin ? t("admin") : t("user");
    els.roleLabel.className = state.isAdmin ? "chip admin" : "chip role";
  }
  renderMyActivity();
}

function myComments() {
  return state.items.flatMap((item) =>
    (item.comments || [])
      .filter((comment) => comment.mine)
      .map((comment) => ({ ...comment, opinionId: item.id, numberLabel: item.numberLabel, title: titleOf(item) })),
  );
}

function renderMyActivity() {
  const posts = state.items.filter((item) => item.mine);
  const comments = myComments();
  if (els.myPosts) els.myPosts.classList.toggle("hidden", !state.anonId);
  if (els.myComments) els.myComments.classList.toggle("hidden", !state.anonId);
  if (els.myPostList) {
    els.myPostList.innerHTML = posts.length
      ? posts
          .map(
            (item) =>
              `<button type="button" class="me-list-item" data-open="${item.id}"><strong>${escapeHtml(titleOf(item))}</strong>${titleEnOf(item) ? `<span class="i18n-en"><span class="lang-tag">EN</span>${escapeHtml(titleEnOf(item))}</span>` : ""}<span>${escapeHtml(postNumberOf(item))} · ${escapeHtml(t("anonymousAuthor", { id: item.anonId || "" }))} · ${escapeHtml(item.createdAtLabel || "")} · ${escapeHtml(statusLabel(item))} · ❤️ ${item.votes || 0} · 💬 ${(item.comments || []).length}${isProposal(item) ? ` · ${escapeHtml(t("priorityLabel", { n: severityOf(item) }))}` : ""}</span></button>`,
          )
          .join("")
      : `<p class="hint">${t("noPosts")}</p>`;
  }
  if (els.myCommentList) {
    els.myCommentList.innerHTML = comments.length
      ? comments
          .map(
            (comment) =>
              `<button type="button" class="me-list-item" data-open="${comment.opinionId}"><strong>${escapeHtml(comment.body)}</strong><span>${escapeHtml(comment.numberLabel || "")} · ${escapeHtml(comment.title)}</span></button>`,
          )
          .join("")
      : `<p class="hint">${t("noComments")}</p>`;
  }
}

function canWriteNotice() {
  const editing = findItem(state.editingId);
  return Boolean(state.isAdmin || (editing && isNotice(editing)));
}

function setKind(kind) {
  const allowNotice = canWriteNotice();
  if (kind === "notice" && !allowNotice) kind = "proposal";
  state.kind = kind === "share" || kind === "notice" ? kind : "proposal";
  renderKindTabs();
  const priorityField = document.querySelector(".priority");
  if (priorityField) priorityField.hidden = !isProposal({ kind: state.kind });
}

function renderKindTabs() {
  if (!els.kindTabs) return;
  const allowNotice = canWriteNotice();
  els.kindTabs.classList.toggle("two", !allowNotice);
  els.kindTabs.querySelectorAll(".kind-tab").forEach((node) => {
    if (node.dataset.kind === "notice") node.hidden = !allowNotice;
    node.classList.toggle("active", node.dataset.kind === state.kind);
  });
}

function tabForKind(kind) {
  if (kind === "share") return "share";
  if (kind === "notice") return "notice";
  return "open";
}

function fillForm(item) {
  document.querySelector("#ask").value = item?.ask ?? "";
  document.querySelector("#others").value = item?.others ?? "";
  const priority = String(item?.priority ?? 3);
  const radio = document.querySelector(`input[name="priority"][value="${priority}"]`)
    || document.querySelector(`input[name="priority"][value="3"]`);
  if (radio) radio.checked = true;
  setKind(item ? kindOf(item) : "proposal");
}

function renderComposer() {
  const editing = findItem(state.editingId);
  renderKindTabs();
  if (editing) {
    els.composerTitle.textContent = t("editPost", { n: editing.numberLabel });
    els.composerHint.textContent = `${editing.anonId} · ${editing.createdAtLabel}`;
    if (!state.saving) els.submit.textContent = t("saveEdit");
  } else {
    els.composerTitle.textContent = t("write");
    els.composerHint.textContent = t("writeHint");
    if (!state.saving) els.submit.textContent = t("postAnonymous");
  }
}

function renderRating(item) {
  const disabled = !state.anonId || item.mine ? "disabled" : "";
  const buttons = [1, 2, 3, 4, 5]
    .map((stars) => {
      let filled = stars <= Math.round(item.ratingAvg || 0) ? " filled" : "";
      if (item.myRating && stars <= item.myRating) filled = " filled mine";
      return `<button type="button" class="star-btn${filled}" data-id="${item.id}" data-stars="${stars}" ${disabled} aria-label="${t("stars", { n: stars })}">★</button>`;
    })
    .join("");
  let summary = item.ratingCount ? `${Number(item.ratingAvg).toFixed(1)} · ${t("people", { n: item.ratingCount })}` : t("noRating");
  if (item.myRating) summary += ` · ${t("myRating", { n: item.myRating })}`;
  return `<div class="rating"><div class="stars">${buttons}</div><span class="rating-meta">${summary}</span></div>`;
}

function renderComments(item) {
  const comments = item.comments || [];
  const list = comments.length
    ? comments
        .map((comment) => {
          const manage = comment.canManage
            ? `<button type="button" class="ghost comment-edit-btn" data-comment-id="${comment.id}">${t("edit")}</button><button type="button" class="comment-del" data-comment-id="${comment.id}">${t("delete")}</button>`
            : "";
          const body =
            state.editingCommentId === comment.id
              ? `<form class="comment-edit" data-comment-id="${comment.id}"><textarea name="body" rows="3" maxlength="1000" required>${escapeHtml(comment.body)}</textarea><button type="submit">${t("save")}</button></form>`
              : bilingualCommentBody(comment.body, comment.bodyEn);
          return `<li class="comment">
            <div class="comment-meta">
              <span class="comment-author">${escapeHtml(t("anonymousAuthor", { id: comment.anonId || "" }))}</span>
              <time>${escapeHtml(relativeTime(comment.createdAt, comment.createdAtLabel))}</time>
              ${manage}
            </div>
            ${body}
          </li>`;
        })
        .join("")
    : `<li class="hint">${t("firstComment")}</li>`;
  const form = state.anonId
    ? `<form class="comment-form" data-id="${item.id}">
        <textarea name="body" rows="3" maxlength="1000" required placeholder="${t("commentPlaceholder")}"></textarea>
        <button type="submit">${t("register")}</button>
      </form>`
    : `<p class="hint">${t("loginToEngage")}</p>`;
  return `<div class="comments"><h3 class="subhead">${t("commentsCount", { n: comments.length })}</h3><ul class="comment-list">${list}</ul>${form}</div>`;
}

function renderPostCard(item) {
  return `<button type="button" class="post${isNotice(item) ? " notice" : ""}" data-open="${item.id}">
        <div class="post-top">
          <span class="company">${item.source === "google" ? "Form" : "S&E"}</span>
          ${statusChip(item)}
          ${renderPostIdentity(item)}
          <span>${escapeHtml(item.createdAtLabel || relativeTime(item.createdAt, ""))}</span>
        </div>
        ${bilingualHeading("h2", titleOf(item), titleEnOf(item))}
        ${bilingualParagraph("preview", previewOf(item), isNotice(item) ? "" : item.othersEn)}
        ${isNotice(item) ? `<p class="notice-more">${escapeHtml(t("readMore"))}</p>` : ""}
        ${renderMetrics(item)}
      </button>`;
}

function renderFeed() {
  const items = visibleItems();
  const searching = Boolean(state.query.trim()) || state.topic === "mine";
  els.boardMeta.textContent = state.banner
    ? t(state.banner.key, state.banner.vars || {})
    : items.length
      ? searching
        ? t("searchResults", { n: items.length })
        : ""
      : t("noMatching");
  els.boardMeta.classList.toggle("ok", Boolean(state.banner));
  if (!items.length) {
    els.feed.innerHTML = `<div class="empty">${state.items.length ? t("tryOther") : t("firstPost")}</div>`;
    return;
  }
  const notices = items.filter(isNotice);
  const rest = items.filter((item) => !isNotice(item));
  const noticeBlock = notices.length
    ? `<section class="notice-board" aria-label="${escapeHtml(t("notice"))}">${notices.map(renderPostCard).join("")}</section>`
    : "";
  els.feed.innerHTML = noticeBlock + rest.map(renderPostCard).join("");
}

function renderDetail() {
  const item = findItem(state.selectedId);
  if (!item) {
    els.detail.innerHTML = `<div class="empty">${t("notFound")}</div>`;
    return;
  }
  const voteDisabled = !state.anonId || item.mine || item.voted ? "disabled" : "";
  const voteClass = item.voted ? "ghost vote-btn on" : "ghost vote-btn";
  const manage = item.canManage
    ? `<button type="button" class="ghost edit-btn" data-id="${item.id}">${t("edit")}</button>
        <button type="button" class="danger delete-btn" data-id="${item.id}">${t("delete")}</button>`
    : "";
  const statusToggle = state.isAdmin && isProposal(item)
    ? `<button type="button" class="ghost status-btn" data-id="${item.id}" data-status="${statusOf(item) === "done" ? "open" : "done"}">${statusOf(item) === "done" ? t("revertWaiting") : t("markDone")}</button>`
    : "";
  els.detail.innerHTML = `
    <article class="detail-page">
    <div class="detail">
    <div class="post-top">
      <span class="company">${item.source === "google" ? "Form" : "S&E"}</span>
      ${statusChip(item)}
      ${renderPostIdentity(item)}
      <span>${escapeHtml(item.createdAtLabel || "")}</span>
      ${item.updatedAt && item.updatedAt !== item.createdAt ? `<span>· ${escapeHtml(t("edited", { n: item.updatedAtLabel || "" }))}</span>` : ""}
      ${item.mine ? `<span>· ${t("myPost")}</span>` : ""}
    </div>
    ${bilingualHeading("h1", titleOf(item), titleEnOf(item))}
    ${bilingualParagraph("body", item.others, item.othersEn)}
    ${renderMetrics(item, { vote: false })}
      <div class="actions">
      <button type="button" class="${voteClass}" data-id="${item.id}" ${voteDisabled}>❤️ ${item.votes || 0}</button>
      ${statusToggle}
      ${manage}
      </div>
    ${item.voted ? `<p class="hint">${t("voteOnce")}</p>` : item.mine ? `<p class="hint">${t("voteOwn")}</p>` : ""}
    </div>
    ${renderComments(item)}
    </article>
  `;
}

function renderAll() {
  applyStaticI18n();
  renderStatusTabs();
  renderIdentity();
  renderComposer();
  renderFeed();
  if (state.view === "detail") renderDetail();
}

function openDetail(id) {
  state.selectedId = id;
  setView("detail");
  renderDetail();
}

function startCreate() {
  if (!state.anonId) {
    state.afterAuth = "write";
    showError(els.authError, t("loginToWrite"));
    setView("me");
    return;
  }
  state.editingId = "";
  fillForm(null);
  showError(els.formError, "");
  renderComposer();
  setView("write");
}

function startEdit(id) {
  const item = findItem(id);
  if (!item || !item.canManage) return;
  state.editingId = item.id;
  fillForm(item);
  showError(els.formError, "");
  renderComposer();
  setView("write");
}

function applySession(data) {
  state.token = data.token || "";
  state.anonId = data.anonId || "";
  state.role = data.role || "";
  state.isAdmin = Boolean(data.isAdmin);
  if (state.token) localStorage.setItem("voc_token", state.token);
}

function clearSession() {
  state.token = "";
  state.anonId = "";
  state.role = "";
  state.isAdmin = false;
  state.editingId = "";
  localStorage.removeItem("voc_token");
}

async function loadOpinions() {
  const data = await api("/api/opinions");
  state.items = data.items || [];
  if (state.editingId && !findItem(state.editingId)) state.editingId = "";
  if (state.selectedId && !findItem(state.selectedId) && state.view === "detail") setView("home");
  renderAll();
  void hydrateItemTranslations(state.items);
}

async function restoreSession() {
  setView("home");
  if (!state.token) {
    renderAll();
    await loadOpinions();
    return;
  }
  try {
    const me = await api("/api/me");
    state.anonId = me.anonId;
    state.role = me.role || "";
    state.isAdmin = Boolean(me.isAdmin);
    await loadOpinions();
  } catch {
    clearSession();
    await loadOpinions();
  }
}

els.headerWrite.addEventListener("click", startCreate);
els.backBtn.addEventListener("click", () => setView("home"));
if (els.langToggle) {
  els.langToggle.addEventListener("click", () => {
    setLang(state.lang === "en" ? "ko" : "en");
  });
}

document.querySelectorAll(".nav-btn").forEach((button) => {
  button.addEventListener("click", () => {
    const view = button.dataset.view;
    if (view === "write") {
      startCreate();
      return;
    }
    setView(view);
  });
});

if (els.kindTabs) {
  els.kindTabs.addEventListener("click", (event) => {
    const tab = event.target.closest(".kind-tab");
    if (!tab) return;
    setKind(tab.dataset.kind || "proposal");
  });
}

if (els.statusTabs) {
  els.statusTabs.addEventListener("click", (event) => {
    const tab = event.target.closest(".status-tab");
    if (!tab) return;
    state.status = tab.dataset.status || "all";
    state.topic = "all";
    state.banner = null;
    renderStatusTabs();
    renderFeed();
  });
}

if (els.sortTabs) {
  els.sortTabs.addEventListener("click", (event) => {
    const tab = event.target.closest(".sort-tab");
    if (!tab) return;
    state.sort = tab.dataset.sort || "new";
    els.sortTabs.querySelectorAll(".sort-tab").forEach((node) => node.classList.toggle("active", node === tab));
    renderFeed();
  });
}

if (els.search) {
  els.search.addEventListener("input", () => {
    state.query = els.search.value;
    renderFeed();
  });
}

if (els.myPostsBtn) {
  els.myPostsBtn.addEventListener("click", () => {
    state.topic = "mine";
    state.status = "all";
    state.sort = "new";
    renderStatusTabs();
    if (els.sortTabs) {
      els.sortTabs.querySelectorAll(".sort-tab").forEach((node) => {
        node.classList.toggle("active", node.dataset.sort === "new");
      });
    }
    setView("home");
    renderFeed();
  });
}

els.logout.addEventListener("click", async () => {
  try {
    await api("/api/auth/logout", { method: "POST" });
  } catch {
    // ignore
  }
  clearSession();
  state.topic = "all";
  state.status = "all";
  state.sort = "new";
  state.afterAuth = "";
  state.query = "";
  state.editingCommentId = "";
  if (els.search) els.search.value = "";
  document.querySelector("#email").value = "";
  fillForm(null);
  showError(els.authError, "");
  showError(els.formError, "");
  renderAll();
  await loadOpinions();
  setView("me");
});

els.authForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  showError(els.authError, "");
  const email = document.querySelector("#email").value;
  try {
    if (!isGmEmail(email)) {
      throw new Error(t("gmEmailOnly"));
    }
    const data = await api("/api/auth", {
      method: "POST",
      body: JSON.stringify({ email }),
    });
    applySession(data);
    renderIdentity();
    await loadOpinions();
    const next = state.afterAuth;
    state.afterAuth = "";
    if (next === "write") startCreate();
    else setView("home");
  } catch (error) {
    showError(els.authError, tError(error.message));
  }
});

els.opinionForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  showError(els.formError, "");
  if (!state.anonId) {
    state.afterAuth = "write";
    showError(els.authError, t("loginToWrite"));
    setView("me");
    return;
  }
  if (state.kind === "notice" && !canWriteNotice()) {
    showError(els.formError, t("noticeAdminOnly"));
    setKind("proposal");
    return;
  }
  const payload = {
    ask: document.querySelector("#ask").value,
    others: document.querySelector("#others").value,
    priority: Number(document.querySelector("input[name=\"priority\"]:checked").value),
    kind: state.kind === "share" || state.kind === "notice" ? state.kind : "proposal",
  };
  state.saving = true;
  els.submit.disabled = true;
  els.submit.textContent = t("posting");
  try {
    const result = state.editingId
      ? await api(`/api/opinions/${state.editingId}`, { method: "PUT", body: JSON.stringify(payload) })
      : await api("/api/opinions", { method: "POST", body: JSON.stringify(payload) });
    state.banner = result.googleForm && !result.googleForm.ok
      ? { key: "postedFormFail", vars: { error: result.googleForm.error } }
      : { key: "posted" };
    const posted = result.item || findItem(state.editingId);
    state.editingId = "";
    fillForm(null);
    await loadOpinions();
    state.status = tabForKind(kindOf(posted || payload));
    state.topic = "all";
    setView("home");
    renderAll();
  } catch (error) {
    showError(els.formError, tError(error.message));
  } finally {
    state.saving = false;
    els.submit.disabled = false;
    renderComposer();
  }
});

function bindBoard(root) {
  root.addEventListener("click", async (event) => {
    const voteMetric = event.target.closest("[data-vote]");
    if (voteMetric) {
      event.preventDefault();
      event.stopPropagation();
      if (!state.anonId) {
        state.afterAuth = "";
        showError(els.authError, t("loginToEngage"));
        setView("me");
        return;
      }
      try {
        await api(`/api/opinions/${voteMetric.getAttribute("data-vote")}/vote`, { method: "POST" });
        await loadOpinions();
      } catch (error) {
        alert(tError(error.message));
      }
      return;
    }
    const open = event.target.closest("[data-open]");
    if (open) {
      openDetail(open.getAttribute("data-open"));
      return;
    }
    const editButton = event.target.closest(".edit-btn");
    if (editButton) {
      startEdit(editButton.dataset.id);
      return;
    }
    const deleteButton = event.target.closest(".delete-btn");
    if (deleteButton) {
      const target = findItem(deleteButton.dataset.id);
      if (!target) return;
      const ok = await confirmDialog({
        title: t("confirmDeleteTitle"),
        body: t("confirmDeletePost", { n: postNumberOf(target) }),
      });
      if (!ok) return;
      await api(`/api/opinions/${target.id}`, { method: "DELETE" });
      state.selectedId = "";
      await loadOpinions();
      setView("home");
      return;
    }
    const star = event.target.closest(".star-btn");
    if (star) {
      if (star.disabled) return;
      await api(`/api/opinions/${star.dataset.id}/rate`, {
        method: "POST",
        body: JSON.stringify({ stars: Number(star.dataset.stars) }),
      });
      await loadOpinions();
      return;
    }
    const vote = event.target.closest(".vote-btn");
    if (vote) {
      if (vote.disabled) return;
      try {
        await api(`/api/opinions/${vote.dataset.id}/vote`, { method: "POST" });
        await loadOpinions();
      } catch (error) {
        alert(tError(error.message));
      }
      return;
    }
    const statusButton = event.target.closest(".status-btn");
    if (statusButton) {
      const target = findItem(statusButton.dataset.id);
      if (!target || !isProposal(target)) return;
      await api(`/api/opinions/${target.id}`, {
        method: "PUT",
        body: JSON.stringify({
          ask: target.ask,
          others: target.others,
          priority: target.priority,
          kind: kindOf(target),
          status: statusButton.dataset.status,
        }),
      });
      await loadOpinions();
      return;
    }
    const commentEdit = event.target.closest(".comment-edit-btn");
    if (commentEdit) {
      state.editingCommentId = commentEdit.dataset.commentId;
      renderDetail();
      return;
    }
    const commentDel = event.target.closest(".comment-del");
    if (commentDel) {
      const ok = await confirmDialog({
        title: t("confirmDeleteComment"),
        body: t("confirmDeleteComment"),
      });
      if (!ok) return;
      await api(`/api/comments/${commentDel.dataset.commentId}`, { method: "DELETE" });
      state.editingCommentId = "";
      await loadOpinions();
    }
  });

  root.addEventListener("keydown", (event) => {
    const area = event.target.closest(".comment-form textarea, .comment-edit textarea");
    if (!area || event.key !== "Tab") return;
    event.preventDefault();
    const start = area.selectionStart ?? area.value.length;
    const end = area.selectionEnd ?? start;
    area.setRangeText("  ", start, end, "end");
  });

  root.addEventListener("submit", async (event) => {
    const editForm = event.target.closest(".comment-edit");
    if (editForm) {
      event.preventDefault();
      const input = editForm.querySelector("[name='body']");
      await api(`/api/comments/${editForm.dataset.commentId}`, {
        method: "PUT",
        body: JSON.stringify({ body: input.value }),
      });
      state.editingCommentId = "";
      await loadOpinions();
      return;
    }
    const form = event.target.closest(".comment-form");
    if (!form) return;
    event.preventDefault();
    const input = form.querySelector("[name='body']");
    await api(`/api/opinions/${form.dataset.id}/comments`, {
      method: "POST",
      body: JSON.stringify({ body: input.value }),
    });
    input.value = "";
    await loadOpinions();
  });
}

bindBoard(els.feed);
bindBoard(els.detail);
if (els.myPostList) bindBoard(els.myPostList);
if (els.myCommentList) bindBoard(els.myCommentList);
restoreSession();
