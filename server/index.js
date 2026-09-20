import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import express from "express";
import { GOOGLE_FORM_EDIT_URL, submitToGoogleForm } from "./googleForm.js";
import { createStore } from "./store.js";
import { bilingualFields, bilingualText, needsCommentTranslation, needsTranslation } from "./translate.js";

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
