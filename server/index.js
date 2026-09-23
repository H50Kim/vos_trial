import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import express from "express";
import { GOOGLE_FORM_EDIT_URL, submitToGoogleForm } from "./googleForm.js";
import { createStore } from "./store.js";
import { bilingualFields, bilingualText, needsCommentTranslation, needsTranslation } from "./translate.js";
import { summarizeContent } from "./insight.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");
const dataDir = path.join(rootDir, "data");
const secretFile = path.join(dataDir, ".secret");
const dbFile = path.join(dataDir, "db.json");

const PORT = Number(process.env.PORT) || 4173;
const ADMIN_EMAILS = new Set([
  "junhui.park@gm.com",
  "namhyuk.1.yoo@gm.com",
  "hyoyoung.kim@gm.com",
]);
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const AUTH_EMAIL_PATTERN = /^[^\s@]+@gm\.com$/;
const AUTH_EMAIL_ERROR = "@gm.com 이메일만 등록할 수 있습니다.";

const store = createStore(dbFile);
let secret = "";

async function loadSecret() {
  await mkdir(dataDir, { recursive: true });
  try {
    secret = (await readFile(secretFile, "utf8")).trim();
    if (secret.length >= 32) return;
  } catch (error) {
    if (!error || error.code !== "ENOENT") throw error;
  }
  secret = randomBytes(32).toString("hex");
  await writeFile(secretFile, secret, "utf8");
}

function normalizeEmail(email) {
  return String(email ?? "")
    .trim()
    .toLowerCase();
}

function isGmEmail(email) {
  return AUTH_EMAIL_PATTERN.test(normalizeEmail(email));
}

function hashEmail(email) {
  return createHmac("sha256", secret).update(email).digest("hex");
}

function isAdmin(email) {
  return ADMIN_EMAILS.has(normalizeEmail(email));
}

function makePostId(id) {
  return `POST-${String(id || "").replace(/-/g, "").slice(0, 8).toUpperCase()}`;
}

function formatNumber(value) {
  const number = Number(value);
  if (!Number.isFinite(number) || number < 1) return "";
  return `#${String(Math.round(number)).padStart(3, "0")}`;
}

function formatDateTime(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(date);
  const pick = (type) => parts.find((part) => part.type === type)?.value ?? "";
  return `${pick("year")}-${pick("month")}-${pick("day")} ${pick("hour")}:${pick("minute")}`;
}

function canManage(email, userId, opinion) {
  if (isAdmin(email)) return true;
  return Boolean(opinion && userId && opinion.userId === userId);
}

function makeAnonId(emailHash) {
  const digest = createHmac("sha256", `${secret}:anon`)
    .update(emailHash)
    .digest("hex")
    .slice(0, 8)
    .toUpperCase();
  return `VOC-${digest}`;
}

function signToken(userId, email) {
  const payload = Buffer.from(JSON.stringify({ userId, email, v: 2 }), "utf8").toString(
    "base64url",
  );
  const signature = createHmac("sha256", `${secret}:token`)
    .update(payload)
    .digest("base64url");
  return `${payload}.${signature}`;
}

function verifyToken(token) {
  if (!token || !token.includes(".")) return null;
  const [payload, signature] = token.split(".");
  const expected = createHmac("sha256", `${secret}:token`)
    .update(payload)
    .digest("base64url");
  const left = Buffer.from(signature);
  const right = Buffer.from(expected);
  if (left.length !== right.length || !timingSafeEqual(left, right)) {
    return null;
  }
  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    if (data.v !== 2 || typeof data.userId !== "string") return null;
    return {
      userId: data.userId,
      email: typeof data.email === "string" ? data.email : "",
    };
  } catch {
    return null;
  }
}

function readToken(req) {
  const header = req.get("authorization") ?? "";
  if (header.startsWith("Bearer ")) return header.slice(7).trim();
  const cookie = req.get("cookie") ?? "";
  const match = cookie.match(/(?:^|;\s*)voc_session=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : "";
}

function requireUser(req, res, next) {
  const session = verifyToken(readToken(req));
  const user = session?.userId ? store.findUserById(session.userId) : null;
  if (!user) {
    res.status(401).json({ error: "이메일 등록 후 입장해 주세요." });
    return;
  }
  req.user = user;
  req.email = session.email;
  next();
}

function sanitizeText(value, maxLength) {
  return String(value ?? "")
    .replace(/\r\n/g, "\n")
    .trim()
    .slice(0, maxLength);
}

function sanitizeMultiline(value, maxLength) {
  return String(value ?? "")
    .replace(/\r\n/g, "\n")
    .replace(/\t/g, "  ")
    .replace(/^\n+/, "")
    .replace(/\s+$/, "")
    .slice(0, maxLength);
}

function parsePriority(value) {
  const priority = Number(value);
  if (!Number.isInteger(priority) || priority < 0 || priority > 5) return null;
  return priority;
}

function parseStatus(value) {
  const raw = String(value ?? "").trim().toLowerCase();
  if (raw === "done" || raw === "완료" || raw === "closed") return "done";
  if (raw === "open" || raw === "대기" || raw === "pending" || raw === "") return "open";
  return null;
}

function parseKind(value) {
  const raw = String(value ?? "").trim().toLowerCase();
  if (raw === "share" || raw === "공유" || raw === "공유하기") return "share";
  if (raw === "notice" || raw === "공지" || raw === "공지사항") return "notice";
  return "proposal";
}

function kindOf(opinion) {
  const kind = parseKind(opinion?.kind);
  return kind === "share" || kind === "notice" ? kind : "proposal";
}

function kindLabelOf(kind) {
  if (kind === "share") return "공유";
  if (kind === "notice") return "공지";
  return "제안";
}

function isStatelessKind(kind) {
  return kind === "share" || kind === "notice";
}

function statusOf(opinion) {
  if (isStatelessKind(kindOf(opinion))) return "none";
  return parseStatus(opinion?.status) === "done" ? "done" : "open";
}

function statusLabel(status) {
  if (status === "none") return "";
  return status === "done" ? "완료" : "대기";
}

function summarizeRatings(opinionId, currentUserId) {
  const ratings = store.listRatings(opinionId);
  const total = ratings.reduce((sum, rating) => sum + Number(rating.stars || 0), 0);
  const mine = currentUserId
    ? ratings.find((rating) => rating.userId === currentUserId)?.stars ?? 0
    : 0;
  return {
    avg: ratings.length ? Math.round((total / ratings.length) * 10) / 10 : 0,
    count: ratings.length,
    mine,
  };
}

function publicComment(comment, currentUserId, email = "") {
  const author = store.findUserById(comment.userId);
  const mine = currentUserId === comment.userId;
  return {
    id: comment.id,
    anonId: author?.anonId ?? "VOC-UNKNOWN",
    body: comment.body,
    bodyEn: comment.bodyEn || "",
    createdAt: comment.createdAt,
    createdAtLabel: formatDateTime(comment.createdAt),
    mine,
    canManage: isAdmin(email) || mine,
  };
}

function publicOpinion(opinion, currentUserId, email = "") {
  const author = store.findUserById(opinion.userId);
  const mine = currentUserId === opinion.userId;
  const rating = summarizeRatings(opinion.id, currentUserId);
  return {
    id: opinion.id,
    number: Number(opinion.number) || 0,
    numberLabel: formatNumber(opinion.number),
    postId: makePostId(opinion.id),
    anonId: author?.anonId ?? "VOC-UNKNOWN",
    ask: opinion.ask,
    others: opinion.others,
    askEn: opinion.askEn || "",
    othersEn: opinion.othersEn || "",
    priority: opinion.priority,
    severity: Number(opinion.priority) || 0,
    kind: kindOf(opinion),
    kindLabel: kindLabelOf(kindOf(opinion)),
    status: statusOf(opinion),
    statusLabel: statusLabel(statusOf(opinion)),
    votes: store.countVotes(opinion.id),
    voted: currentUserId ? Boolean(store.findVote(currentUserId, opinion.id)) : false,
    ratingAvg: rating.avg,
    ratingCount: rating.count,
    myRating: rating.mine,
    mine,
    canManage: canManage(email, currentUserId, opinion),
    source: opinion.source === "google" ? "google" : "app",
    createdAt: opinion.createdAt,
    createdAtLabel: formatDateTime(opinion.createdAt),
    updatedAt: opinion.updatedAt,
    updatedAtLabel: formatDateTime(opinion.updatedAt),
    comments: store.listComments(opinion.id).map((comment) =>
      publicComment(comment, currentUserId, email),
    ),
  };
}

function seoulDayKey(value = new Date()) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const pick = (type) => parts.find((part) => part.type === type)?.value ?? "";
  return `${pick("year")}-${pick("month")}-${pick("day")}`;
}

function addSeoulDays(key, delta) {
  const stamp = Date.parse(`${key}T12:00:00+09:00`);
  if (!Number.isFinite(stamp)) return key;
  return seoulDayKey(new Date(stamp + delta * 86400000));
}

function seoulWeekday(key) {
  const stamp = Date.parse(`${key}T12:00:00+09:00`);
  if (!Number.isFinite(stamp)) return 0;
  return new Date(stamp).getUTCDay();
}

function sanitizeId(value) {
  const raw = String(value ?? "").trim();
  if (!/^[A-Za-z0-9_-]{8,80}$/.test(raw)) return "";
  return raw;
}

function visitOverlapsDay(visit, dayKey) {
  const startKey = seoulDayKey(visit.startedAt);
  const endKey = seoulDayKey(visit.lastSeenAt || visit.startedAt);
  if (!startKey || !endKey) return false;
  return startKey <= dayKey && dayKey <= endKey;
}

function pushActivity(events, userId, ts, kind) {
  const at = new Date(ts || 0).getTime();
  if (!userId || !Number.isFinite(at) || at <= 0) return;
  events.push({ userId: String(userId), at, day: seoulDayKey(at), kind });
}

function activityEvents() {
  const events = [];
  for (const user of store.listUsers()) pushActivity(events, user.id, user.createdAt, "signup");
  for (const item of store.listOpinions()) {
    pushActivity(events, item.userId, item.createdAt, "post");
    if (item.updatedAt && item.updatedAt !== item.createdAt) {
      pushActivity(events, item.userId, item.updatedAt, "edit");
    }
  }
  for (const comment of store.listAllComments()) pushActivity(events, comment.userId, comment.createdAt, "comment");
  for (const vote of store.listAllVotes()) pushActivity(events, vote.userId, vote.createdAt, "vote");
  for (const rating of store.listAllRatings()) {
    pushActivity(events, rating.userId, rating.updatedAt || rating.createdAt, "rating");
  }
  return events;
}

function emptyDay(key) {
  return {
    key,
    weekday: seoulWeekday(key),
    people: 0,
    visits: 0,
    dwellSeconds: 0,
    actions: 0,
    _people: new Set(),
    _presenceUserIds: new Set(),
    _activityTimes: new Map(),
  };
}

function estimatedDwell(times) {
  const stamps = [...times].sort((a, b) => a - b);
  if (!stamps.length) return 0;
  if (stamps.length === 1) return 60;
  const span = Math.floor((stamps[stamps.length - 1] - stamps[0]) / 1000) + 60;
  return Math.min(8 * 3600, Math.max(60, span));
}

const DASH_MAX_DAYS = 90;
const DAY_KEY = /^\d{4}-\d{2}-\d{2}$/;

function queryValue(query, key) {
  if (!query) return "";
  if (typeof query.get === "function") return String(query.get(key) || "");
  const value = query[key];
  return Array.isArray(value) ? String(value[0] || "") : String(value || "");
}

function parseDashboardRange(query) {
  const today = seoulDayKey();
  const maxStart = addSeoulDays(today, -(DASH_MAX_DAYS - 1));
  const presetRaw = queryValue(query, "preset") || queryValue(query, "days") || "7";
  let from = queryValue(query, "from") || queryValue(query, "start");
  let to = queryValue(query, "to") || queryValue(query, "end");
  const allowed = { 7: 7, 14: 14, 30: 30, 90: 90 };

  if (presetRaw === "month") {
    const monthStart = `${today.slice(0, 7)}-01`;
    return { start: monthStart < maxStart ? maxStart : monthStart, end: today, preset: "month" };
  }
  if (allowed[Number(presetRaw)]) {
    const span = allowed[Number(presetRaw)];
    return { start: addSeoulDays(today, -(span - 1)), end: today, preset: String(span) };
  }
  if (DAY_KEY.test(from) && DAY_KEY.test(to)) {
    if (from > to) {
      const swap = from;
      from = to;
      to = swap;
    }
    if (to > today) to = today;
    if (from > today) from = today;
    if (from < maxStart) from = maxStart;
    return { start: from, end: to, preset: "custom" };
  }
  return { start: addSeoulDays(today, -6), end: today, preset: "7" };
}

function buildRangeDays(start, end) {
  const days = [];
  let key = start;
  for (let i = 0; i < DASH_MAX_DAYS && key <= end; i += 1) {
    days.push(emptyDay(key));
    key = addSeoulDays(key, 1);
  }
  return days;
}

function buildAdminDashboard(query) {
  const range = parseDashboardRange(query);
  const days = buildRangeDays(range.start, range.end);
  const byKey = new Map(days.map((day) => [day.key, day]));
  const weekPeople = new Set();
  const weekRegistered = new Set();
  const now = Date.now();
  const online = new Set();

  for (const visit of store.listVisits()) {
    const visitor = String(visit.visitorId || visit.userId || visit.id || "");
    const userId = String(visit.userId || "");
    const last = new Date(visit.lastSeenAt || visit.startedAt || 0).getTime();
    if ((userId || visitor) && Number.isFinite(last) && now - last <= 3 * 60 * 1000) {
      online.add(userId || visitor);
    }
    const startKey = seoulDayKey(visit.startedAt);
    for (const day of days) {
      if (!visitOverlapsDay(visit, day.key)) continue;
      const person = userId || visitor;
      if (person) {
        day._people.add(person);
        weekPeople.add(person);
      }
      if (userId) {
        day._presenceUserIds.add(userId);
        weekRegistered.add(userId);
      }
      if (day.key === startKey) {
        day.visits += 1;
        day.dwellSeconds += Math.max(0, Number(visit.seconds) || 0);
      }
    }
  }

  for (const event of activityEvents()) {
    const day = byKey.get(event.day);
    if (!day) continue;
    day.actions += 1;
    day._people.add(event.userId);
    weekPeople.add(event.userId);
    weekRegistered.add(event.userId);
    if (!day._activityTimes.has(event.userId)) day._activityTimes.set(event.userId, []);
    day._activityTimes.get(event.userId).push(event.at);
  }

  for (const day of days) {
    for (const [userId, times] of day._activityTimes) {
      if (day._presenceUserIds.has(userId)) continue;
      day.visits += 1;
      day.dwellSeconds += estimatedDwell(times);
    }
    day.people = day._people.size;
    delete day._people;
    delete day._presenceUserIds;
    delete day._activityTimes;
  }

  const dwellSeconds = days.reduce((sum, day) => sum + day.dwellSeconds, 0);
  const visits = days.reduce((sum, day) => sum + day.visits, 0);
  const opinions = store.listOpinions();
  const board = {
    users: store.countUsers(),
    posts: opinions.length,
    comments: store.countComments(),
    votes: store.countVotesAll(),
    notices: 0,
    shares: 0,
    open: 0,
    done: 0,
  };
  for (const item of opinions) {
    const kind = kindOf(item);
    if (kind === "notice") board.notices += 1;
    else if (kind === "share") board.shares += 1;
    else if (statusOf(item) === "done") board.done += 1;
    else board.open += 1;
  }

  const periodOpinions = opinions.filter((item) => {
    const key = seoulDayKey(item.createdAt);
    return key && key >= range.start && key <= range.end;
  });
  const periodBoard = {
    posts: periodOpinions.length,
    notices: 0,
    shares: 0,
    open: 0,
    done: 0,
  };
  for (const item of periodOpinions) {
    const kind = kindOf(item);
    if (kind === "notice") periodBoard.notices += 1;
    else if (kind === "share") periodBoard.shares += 1;
    else if (statusOf(item) === "done") periodBoard.done += 1;
    else periodBoard.open += 1;
  }
  const period = {
    people: weekPeople.size,
    registered: weekRegistered.size,
    guests: Math.max(0, weekPeople.size - weekRegistered.size),
    visits,
    dwellSeconds,
    avgDwellSeconds: weekPeople.size ? Math.round(dwellSeconds / weekPeople.size) : 0,
    avgVisitSeconds: visits ? Math.round(dwellSeconds / visits) : 0,
  };

  return {
    timezone: "Asia/Seoul",
    source: "store+presence",
    range: {
      start: days[0]?.key || range.start,
      end: days[days.length - 1]?.key || range.end,
      preset: range.preset,
    },
    onlinePeople: online.size,
    week: period,
    period,
    days,
    board,
    periodBoard,
    insights: summarizeContent(periodOpinions),
    insightsAll: summarizeContent(opinions),
  };
}

async function importGoogleRespondents() {
  let payload = { responses: [] };
  try {
    payload = JSON.parse(await readFile(path.join(dataDir, "google-responses.json"), "utf8"));
  } catch (error) {
    if (!error || error.code !== "ENOENT") throw error;
  }

  const responses = Array.isArray(payload.responses) ? payload.responses : [];
  for (const item of responses) {
    const email = normalizeEmail(item.email);
    if (!EMAIL_PATTERN.test(email)) continue;
    const emailHash = hashEmail(email);
    const user = await store.createUser({
      emailHash,
      anonId: makeAnonId(emailHash),
    });
    const ask = sanitizeText(item.ask, 4000);
    if (!ask) continue;
    const others = sanitizeText(item.others, 4000);
    const priority = parsePriority(item.priority);
    if (priority === null) continue;
    await store.upsertFormOpinion({
      userId: user.id,
      ask,
      others,
      priority,
      formKey: `google:${emailHash}`,
      createdAt: item.submittedAt || new Date().toISOString(),
    });
  }
}

async function syncGoogleForm(payload) {
  try {
    await submitToGoogleForm(payload);
    return { ok: true, formUrl: GOOGLE_FORM_EDIT_URL };
  } catch (error) {
    return {
      ok: false,
      error: error.message,
      formUrl: GOOGLE_FORM_EDIT_URL,
    };
  }
}

function setSessionCookie(res, token) {
  res.setHeader(
    "Set-Cookie",
    `voc_session=${encodeURIComponent(token)}; HttpOnly; SameSite=Lax; Path=/`,
  );
}

function clearSessionCookie(res) {
  res.setHeader("Set-Cookie", "voc_session=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0");
}

const app = express();
app.disable("x-powered-by");
app.use(express.json({ limit: "32kb" }));
app.use(express.static(path.join(rootDir, "public")));

app.post("/api/auth/logout", (req, res) => {
  clearSessionCookie(res);
  res.json({ ok: true });
});

async function issueSession(res, email) {
  if (!isGmEmail(email)) {
    throw new Error(AUTH_EMAIL_ERROR);
  }
  const emailHash = hashEmail(email);
  let user = store.findUserByEmailHash(emailHash);
  if (!user) {
    user = await store.createUser({
      emailHash,
      anonId: makeAnonId(emailHash),
    });
  }
  const token = signToken(user.id, email);
  setSessionCookie(res, token);
  return {
    anonId: user.anonId,
    token,
    role: isAdmin(email) ? "admin" : "user",
    isAdmin: isAdmin(email),
  };
}

async function registerByEmail(req, res) {
  const email = normalizeEmail(req.body?.email);
  if (!EMAIL_PATTERN.test(email) || !isGmEmail(email)) {
    res.status(400).json({ error: AUTH_EMAIL_ERROR });
    return;
  }
  try {
    const session = await issueSession(res, email);
    if (req.path === "/api/auth/request") {
      res.json({
        ok: true,
        email,
        message: "등록되었습니다. 인증 코드를 입력하면 바로 입장합니다.",
        ...session,
      });
      return;
    }
    res.json(session);
  } catch (error) {
    res.status(400).json({ error: error.message || "이메일 등록에 실패했습니다." });
  }
}

app.post("/api/auth", registerByEmail);
app.post("/api/auth/request", registerByEmail);
app.post("/api/auth/verify", registerByEmail);

app.get("/api/me", requireUser, (req, res) => {
  res.json({
    anonId: req.user.anonId,
    role: isAdmin(req.email) ? "admin" : "user",
    isAdmin: isAdmin(req.email),
  });
});

app.post("/api/presence", async (req, res) => {
  const sessionId = sanitizeId(req.body?.sessionId);
  const visitorId = sanitizeId(req.body?.visitorId);
  if (!sessionId || !visitorId) {
    res.status(400).json({ error: "접속 정보를 확인할 수 없습니다." });
    return;
  }
  const session = verifyToken(readToken(req));
  await store.touchVisit({
    sessionId,
    visitorId,
    userId: session?.userId || "",
  });
  res.json({ ok: true });
});

function sendDashboard(req, res) {
  res.json(buildAdminDashboard(req.query));
}

app.get("/api/dashboard", sendDashboard);
app.get("/api/admin/dashboard", sendDashboard);

async function applyTranslations(opinion) {
  if (!opinion || !needsTranslation(opinion)) return opinion;
  const fields = await bilingualFields(opinion.ask, opinion.others, opinion);
  return (await store.saveTranslations(opinion.id, fields)) || { ...opinion, ...fields };
}

async function applyCommentTranslations(comment) {
  if (!comment || !needsCommentTranslation(comment)) return comment;
  const fields = await bilingualText(comment.body, comment);
  return (await store.saveCommentTranslations(comment.id, fields)) || { ...comment, ...fields };
}

let hydrateQueued = false;
function enqueueTranslationHydration() {
  if (hydrateQueued) return;
  hydrateQueued = true;
  setImmediate(async () => {
    try {
      for (const item of store.listOpinions()) {
        await applyTranslations(item);
        for (const comment of store.listComments(item.id)) {
          await applyCommentTranslations(comment);
        }
      }
    } catch (error) {
      console.error("translation hydrate failed", error);
    } finally {
      hydrateQueued = false;
    }
  });
}

app.get("/api/opinions", async (req, res) => {
  await importGoogleRespondents();
  const session = verifyToken(readToken(req));
  const userId = session?.userId ?? "";
  const email = session?.email ?? "";
  const items = store
    .listOpinions()
    .map((item) => publicOpinion(item, userId, email))
    .sort((a, b) => {
      if (b.ratingAvg !== a.ratingAvg) return b.ratingAvg - a.ratingAvg;
      if ((a.number || 0) !== (b.number || 0)) return (a.number || 0) - (b.number || 0);
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  res.json({ items });
  enqueueTranslationHydration();
});

app.post("/api/opinions", requireUser, async (req, res) => {
  const ask = sanitizeText(req.body?.ask, 4000);
  const others = sanitizeText(req.body?.others, 4000);
  const priority = parsePriority(req.body?.priority);
  if (!ask) {
    res.status(400).json({ error: "Ask S&E Anything 내용을 입력해 주세요." });
    return;
  }
  if (priority === null) {
    res.status(400).json({ error: "Priority는 0부터 5 사이여야 합니다." });
    return;
  }

  const kind = parseKind(req.body?.kind);
  if (kind === "notice" && !isAdmin(req.email)) {
    res.status(403).json({ error: "공지사항은 관리자만 작성할 수 있습니다." });
    return;
  }
  const translations = await bilingualFields(ask, others);
  const googleForm = await syncGoogleForm({
    email: req.email,
    ask,
    others,
    priority,
  });

  const opinion = await store.createOpinion({
    userId: req.user.id,
    ask,
    others,
    priority,
    kind,
    status: isStatelessKind(kind) ? "none" : "open",
    ...translations,
  });
  res.status(201).json({
    item: publicOpinion(opinion, req.user.id, req.email),
    googleForm,
  });
});

app.put("/api/opinions/:id", requireUser, async (req, res) => {
  const existing = store.findOpinionById(req.params.id);
  if (!existing) {
    res.status(404).json({ error: "의견을 찾을 수 없습니다." });
    return;
  }
  if (!canManage(req.email, req.user.id, existing)) {
    res.status(403).json({ error: "이 의견을 수정할 권한이 없습니다." });
    return;
  }

  const ask = sanitizeText(req.body?.ask, 4000);
  const others = sanitizeText(req.body?.others, 4000);
  const priority = parsePriority(req.body?.priority);
  if (!ask) {
    res.status(400).json({ error: "Ask S&E Anything 내용을 입력해 주세요." });
    return;
  }
  if (priority === null) {
    res.status(400).json({ error: "Priority는 0부터 5 사이여야 합니다." });
    return;
  }

  const googleForm = await syncGoogleForm({
    email: req.email,
    ask,
    others,
    priority,
  });

  const nextKind = req.body?.kind !== undefined && String(req.body.kind ?? "") !== ""
    ? parseKind(req.body.kind)
    : kindOf(existing);
  if (nextKind === "notice" && kindOf(existing) !== "notice" && !isAdmin(req.email)) {
    res.status(403).json({ error: "공지사항은 관리자만 작성할 수 있습니다." });
    return;
  }
  let nextStatus = isStatelessKind(nextKind) ? "none" : (isStatelessKind(kindOf(existing)) ? "open" : statusOf(existing));
  if (!isStatelessKind(nextKind) && req.body?.status !== undefined && req.body?.status !== null && String(req.body.status) !== "") {
    if (!isAdmin(req.email)) {
      res.status(403).json({ error: "상태를 변경할 권한이 없습니다." });
      return;
    }
    const parsedStatus = parseStatus(req.body.status);
    if (!parsedStatus) {
      res.status(400).json({ error: "상태는 대기 또는 완료여야 합니다." });
      return;
    }
    nextStatus = parsedStatus;
  }

  const translations = await bilingualFields(ask, others, {
    ...existing,
    ask,
    others,
  });
  const opinion = await store.updateOpinion(existing.id, {
    ask,
    others,
    priority,
    kind: nextKind,
    status: nextStatus,
    ...translations,
  });
  res.json({
    item: publicOpinion(opinion, req.user.id, req.email),
    googleForm,
  });
});

app.delete("/api/opinions/:id", requireUser, async (req, res) => {
  const existing = store.findOpinionById(req.params.id);
  if (!existing) {
    res.status(404).json({ error: "의견을 찾을 수 없습니다." });
    return;
  }
  if (!canManage(req.email, req.user.id, existing)) {
    res.status(403).json({ error: "이 의견을 삭제할 권한이 없습니다." });
    return;
  }
  await store.deleteOpinion(existing.id);
  res.json({ ok: true });
});

app.post("/api/opinions/:id/comments", requireUser, async (req, res) => {
  const opinion = store.findOpinionById(req.params.id);
  if (!opinion) {
    res.status(404).json({ error: "의견을 찾을 수 없습니다." });
    return;
  }
  const body = sanitizeMultiline(req.body?.body, 1000);
  if (!body) {
    res.status(400).json({ error: "댓글 내용을 입력해 주세요." });
    return;
  }
  const translations = await bilingualText(body);
  const comment = await store.addComment({
    opinionId: opinion.id,
    userId: req.user.id,
    body,
    ...translations,
  });
  res.status(201).json({ item: publicComment(comment, req.user.id, req.email) });
});

app.put("/api/comments/:id", requireUser, async (req, res) => {
  const comment = store.findCommentById(req.params.id);
  if (!comment) {
    res.status(404).json({ error: "댓글을 찾을 수 없습니다." });
    return;
  }
  if (!isAdmin(req.email) && comment.userId !== req.user.id) {
    res.status(403).json({ error: "이 댓글을 수정할 권한이 없습니다." });
    return;
  }
  const body = sanitizeMultiline(req.body?.body, 1000);
  if (!body) {
    res.status(400).json({ error: "댓글 내용을 입력해 주세요." });
    return;
  }
  const translations = await bilingualText(body, comment);
  const updated = await store.updateComment(comment.id, body, translations);
  res.json({ item: publicComment(updated, req.user.id, req.email) });
});

app.delete("/api/comments/:id", requireUser, async (req, res) => {
  const comment = store.findCommentById(req.params.id);
  if (!comment) {
    res.status(404).json({ error: "댓글을 찾을 수 없습니다." });
    return;
  }
  if (!isAdmin(req.email) && comment.userId !== req.user.id) {
    res.status(403).json({ error: "이 댓글을 삭제할 권한이 없습니다." });
    return;
  }
  await store.deleteComment(comment.id);
  res.json({ ok: true });
});

app.post("/api/opinions/:id/rate", requireUser, async (req, res) => {
  const opinion = store.findOpinionById(req.params.id);
  if (!opinion) {
    res.status(404).json({ error: "의견을 찾을 수 없습니다." });
    return;
  }
  if (opinion.userId === req.user.id) {
    res.status(403).json({ error: "본인 의견에는 별점을 줄 수 없습니다." });
    return;
  }
  const stars = Number(req.body?.stars);
  if (!Number.isInteger(stars) || stars < 1 || stars > 5) {
    res.status(400).json({ error: "별점은 1부터 5 사이여야 합니다." });
    return;
  }
  await store.upsertRating(req.user.id, opinion.id, stars);
  res.json({ item: publicOpinion(opinion, req.user.id, req.email) });
});

app.post("/api/opinions/:id/vote", requireUser, async (req, res) => {
  const opinion = store.findOpinionById(req.params.id);
  if (!opinion) {
    res.status(404).json({ error: "의견을 찾을 수 없습니다." });
    return;
  }
  if (opinion.userId === req.user.id) {
    res.status(403).json({ error: "본인 의견에는 투표할 수 없습니다." });
    return;
  }
  if (store.findVote(req.user.id, opinion.id)) {
    res.status(409).json({ error: "이미 이 의견에 투표했습니다. 투표는 한 번만 가능합니다." });
    return;
  }

  await store.addVote(req.user.id, opinion.id);
  const updated = store.findOpinionById(opinion.id);
  res.json({ item: publicOpinion(updated, req.user.id, req.email) });
});

app.use((error, _req, res, _next) => {
  console.error(error);
  res.status(500).json({ error: "서버 오류가 발생했습니다." });
});

await loadSecret();
await store.load();
await importGoogleRespondents();

app.listen(PORT, () => {
  console.log(`VoC Tracker running at http://localhost:${PORT}`);
});
