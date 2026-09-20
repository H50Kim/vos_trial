import { Buffer } from "node:buffer";
import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { createClient } from "npm:@supabase/supabase-js@2";
import { createStore, type VocDb } from "./store.ts";
import { bilingualFields, needsTranslation } from "./translate.ts";

const SEED_JSON = "{\"users\":[],\"opinions\":[],\"votes\":[],\"comments\":[],\"ratings\":[],\"nextNumber\":1}";

const PAGES_ORIGIN = "https://h50kim.github.io/vos_trial/";

const ADMIN_EMAILS = new Set([
  "junhui.park@gm.com",
  "namhyuk.1.yoo@gm.com",
  "hyoyoung.kim@gm.com",
]);
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const AUTH_EMAIL_PATTERN = /^[^\s@]+@gm\.com$/;
const AUTH_EMAIL_ERROR = "@gm.com 이메일만 등록할 수 있습니다.";
const FORM_RESPONSE_URLS = [
  "https://docs.google.com/forms/d/e/1FAIpQLSdn3H9cm8OGe8UC5geN3Ogy_MGxi7BGUSKwsHOIAuGxeJwXaQ/formResponse",
  "https://docs.google.com/forms/d/12jEITV1PpsrhIaDekBKpE5uo5nnQSuZdHye6PPUvxOE/formResponse",
];
const GOOGLE_FORM_EDIT_URL =
  "https://docs.google.com/forms/d/12jEITV1PpsrhIaDekBKpE5uo5nnQSuZdHye6PPUvxOE/edit";
const MIME: Record<string, string> = {
  html: "text/html; charset=utf-8",
  js: "text/javascript; charset=utf-8",
  css: "text/css; charset=utf-8",
  json: "application/json; charset=utf-8",
};

const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "https://tkjsezhhllrpnxhqmmrm.supabase.co";
const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const db = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

let secret = "";
let store: ReturnType<typeof createStore>;
let ready: Promise<void> | null = null;

function json(data: unknown, status = 200, extra: HeadersInit = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Access-Control-Allow-Origin": "*",
      ...extra,
    },
  });
}

function normalizeEmail(email: unknown) {
  return String(email ?? "").trim().toLowerCase();
}

function isGmEmail(email: unknown) {
  return AUTH_EMAIL_PATTERN.test(normalizeEmail(email));
}

function hmacHex(key: string, value: string) {
  return createHmac("sha256", key).update(value).digest("hex");
}

function isAdmin(email: string) {
  return ADMIN_EMAILS.has(normalizeEmail(email));
}

function hashEmail(email: string) {
  return hmacHex(secret, email);
}

function makeAnonId(emailHash: string) {
  return `VOC-${hmacHex(`${secret}:anon`, emailHash).slice(0, 8).toUpperCase()}`;
}

function signToken(userId: string, email: string) {
  const payload = Buffer.from(JSON.stringify({ userId, email, v: 2 }), "utf8").toString("base64url");
  const signature = createHmac("sha256", `${secret}:token`).update(payload).digest("base64url");
  return `${payload}.${signature}`;
}

function verifyToken(token: string | null) {
  if (!token || !token.includes(".")) return null;
  const [payload, signature] = token.split(".");
  const expected = createHmac("sha256", `${secret}:token`).update(payload).digest("base64url");
  const left = Buffer.from(signature);
  const right = Buffer.from(expected);
  if (left.length !== right.length || !timingSafeEqual(left, right)) return null;
  try {
    const jsonPayload = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    if (jsonPayload.v !== 2 || typeof jsonPayload.userId !== "string") return null;
    return {
      userId: jsonPayload.userId as string,
      email: typeof jsonPayload.email === "string" ? jsonPayload.email : "",
    };
  } catch {
    return null;
  }
}

function readToken(req: Request) {
  const header = req.headers.get("authorization") ?? "";
  if (header.startsWith("Bearer ")) return header.slice(7).trim();
  const cookie = req.headers.get("cookie") ?? "";
  const match = cookie.match(/(?:^|;\s*)voc_session=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : "";
}

function sessionCookie(token: string) {
  return `voc_session=${encodeURIComponent(token)}; HttpOnly; SameSite=Lax; Path=/; Secure`;
}

function sanitizeText(value: unknown, maxLength: number) {
  return String(value ?? "").replace(/\r\n/g, "\n").trim().slice(0, maxLength);
}

function parsePriority(value: unknown) {
  const priority = Number(value);
  if (!Number.isInteger(priority) || priority < 0 || priority > 5) return null;
  return priority;
}

function parseStatus(value: unknown) {
  const raw = String(value ?? "").trim().toLowerCase();
  if (raw === "done" || raw === "완료" || raw === "closed") return "done";
  if (raw === "open" || raw === "대기" || raw === "pending" || raw === "") return "open";
  return null;
}

function parseKind(value: unknown) {
  const raw = String(value ?? "").trim().toLowerCase();
  if (raw === "share" || raw === "공유" || raw === "공유하기") return "share";
  if (raw === "notice" || raw === "공지" || raw === "공지사항") return "notice";
  return "proposal";
}

function kindOf(opinion: Record<string, unknown> | null) {
  const kind = parseKind(opinion?.kind);
  return kind === "share" || kind === "notice" ? kind : "proposal";
}

function kindLabelOf(kind: string) {
  if (kind === "share") return "공유";
  if (kind === "notice") return "공지";
  return "제안";
}

function isStatelessKind(kind: string) {
  return kind === "share" || kind === "notice";
}

function statusOf(opinion: Record<string, unknown> | null) {
  if (isStatelessKind(kindOf(opinion))) return "none";
  return parseStatus(opinion?.status) === "done" ? "done" : "open";
}

function statusLabel(status: string) {
  if (status === "none") return "";
  return status === "done" ? "완료" : "대기";
}

function formatNumber(value: unknown) {
  const number = Number(value);
  if (!Number.isFinite(number) || number < 1) return "";
  return `#${String(Math.round(number)).padStart(3, "0")}`;
}

function formatDateTime(value: unknown) {
  const date = new Date(String(value ?? ""));
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
  const pick = (type: string) => parts.find((part) => part.type === type)?.value ?? "";
  return `${pick("year")}-${pick("month")}-${pick("day")} ${pick("hour")}:${pick("minute")}`;
}

function canManage(email: string, userId: string, opinion: Record<string, unknown> | null) {
  if (isAdmin(email)) return true;
  return Boolean(opinion && userId && opinion.userId === userId);
}

function summarizeRatings(opinionId: string, currentUserId: string) {
  const ratings = store.listRatings(opinionId);
  const total = ratings.reduce((sum, rating) => sum + Number(rating.stars || 0), 0);
  const mine = currentUserId
    ? Number(ratings.find((rating) => rating.userId === currentUserId)?.stars ?? 0)
    : 0;
  return {
    avg: ratings.length ? Math.round((total / ratings.length) * 10) / 10 : 0,
    count: ratings.length,
    mine,
  };
}

function publicComment(comment: Record<string, unknown>, currentUserId: string, email = "") {
  const author = store.findUserById(String(comment.userId ?? ""));
  const mine = currentUserId === comment.userId;
  return {
    id: comment.id,
    anonId: author?.anonId ?? "VOC-UNKNOWN",
    body: comment.body,
    createdAt: comment.createdAt,
    createdAtLabel: formatDateTime(comment.createdAt),
    mine,
    canManage: isAdmin(email) || mine,
  };
}

function publicOpinion(opinion: Record<string, unknown>, currentUserId: string, email = "") {
  const author = store.findUserById(String(opinion.userId ?? ""));
  const mine = currentUserId === opinion.userId;
  const rating = summarizeRatings(String(opinion.id), currentUserId);
  return {
    id: opinion.id,
    number: Number(opinion.number) || 0,
    numberLabel: formatNumber(opinion.number),
    postId: `POST-${String(opinion.id || "").replace(/-/g, "").slice(0, 8).toUpperCase()}`,
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
    votes: store.countVotes(String(opinion.id)),
    voted: currentUserId ? Boolean(store.findVote(currentUserId, String(opinion.id))) : false,
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
    comments: store.listComments(String(opinion.id)).map((comment) =>
      publicComment(comment, currentUserId, email)
    ),
  };
}

async function applyTranslations(opinion: Record<string, unknown> | null) {
  if (!opinion?.id || !needsTranslation(opinion)) return opinion;
  const fields = await bilingualFields(opinion.ask, opinion.others, opinion);
  return (await store.saveTranslations(String(opinion.id), fields)) || { ...opinion, ...fields };
}

let hydrateQueued = false;
function enqueueTranslationHydration() {
  if (hydrateQueued) return;
  hydrateQueued = true;
  const run = async () => {
    try {
      for (const item of store.listOpinions()) {
        await applyTranslations(item as Record<string, unknown>);
      }
    } catch (error) {
      console.error("translation hydrate failed", error);
    } finally {
      hydrateQueued = false;
    }
  };
  const runtime = (globalThis as { EdgeRuntime?: { waitUntil?: (task: Promise<unknown>) => void } }).EdgeRuntime;
  if (runtime?.waitUntil) runtime.waitUntil(run());
  else void run();
}

async function persist(payload: VocDb) {
  const { error } = await db.from("voc_store").upsert({
    id: "main",
    payload,
    secret,
    updated_at: new Date().toISOString(),
  });
  if (error) console.error("voc_store persist failed", error.message);
}

async function ensureReady() {
  if (!ready) {
    ready = (async () => {
      const { data } = await db.from("voc_store").select("payload, secret").eq("id", "main").maybeSingle();
      let payload = (data?.payload ?? null) as VocDb | null;
      secret = String(data?.secret || "");
      if (!payload) {
        try {
          payload = JSON.parse(SEED_JSON) as VocDb;
        } catch {
          payload = null;
        }
      }
      if (secret.length < 32) secret = randomBytes(32).toString("hex");
      store = createStore(payload, persist);
      await persist(payload ?? { users: [], opinions: [], votes: [], comments: [], ratings: [], nextNumber: 1 });
    })();
  }
  await ready;
}

function requireUser(req: Request) {
  const session = verifyToken(readToken(req));
  const user = session?.userId ? store.findUserById(session.userId) : null;
  if (!user || !session) return null;
  return { user, email: session.email };
}

async function readBody(req: Request) {
  try {
    return await req.json();
  } catch {
    return {};
  }
}

async function issueSession(email: string) {
  if (!isGmEmail(email)) throw new Error(AUTH_EMAIL_ERROR);
  const emailHash = hashEmail(email);
  let user = store.findUserByEmailHash(emailHash);
  if (!user) {
    user = await store.createUser({ emailHash, anonId: makeAnonId(emailHash) });
  }
  const token = signToken(String(user.id), email);
  return {
    body: {
      anonId: user.anonId,
      token,
      role: isAdmin(email) ? "admin" : "user",
      isAdmin: isAdmin(email),
    },
    cookie: sessionCookie(token),
  };
}

async function submitToGoogleForm({
  email,
  ask,
  others,
  priority,
}: {
  email: string;
  ask: string;
  others: string;
  priority: number;
}) {
  const body = new URLSearchParams();
  body.set("entry.1173889863", ask);
  body.set("entry.619676855", others);
  body.set("entry.499148274", String(priority));
  if (email) body.set("emailAddress", email);
  body.set("fvv", "1");
  body.set("partialResponse", '[null,null,"-1"]');
  body.set("pageHistory", "0");
  for (const url of FORM_RESPONSE_URLS) {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
      redirect: "follow",
    });
    if (response.status >= 200 && response.status < 400) {
      return { ok: true, formUrl: GOOGLE_FORM_EDIT_URL };
    }
  }
  return { ok: false, error: "Google Form에 저장하지 못했습니다.", formUrl: GOOGLE_FORM_EDIT_URL };
}

function appPath(pathname: string) {
  let path = pathname;
  for (const prefix of ["/functions/v1/app", "/app"]) {
    if (path === prefix) return "/";
    if (path.startsWith(`${prefix}/`)) {
      path = path.slice(prefix.length);
      break;
    }
  }
  return path.startsWith("/") ? path : `/${path}`;
}

async function staticFile(name: string) {
  const ext = name.split(".").pop() ?? "html";
  const res = await fetch(new URL(name, PAGES_ORIGIN));
  if (!res.ok) return json({ error: "파일을 찾을 수 없습니다." }, 404);
  return new Response(await res.text(), {
    headers: {
      "Content-Type": MIME[ext] ?? "text/plain; charset=utf-8",
      "Cache-Control": ext === "html" ? "no-cache" : "public, max-age=60",
      "Access-Control-Allow-Origin": "*",
    },
  });
}

Deno.serve(async (req) => {
  try {
    if (req.method === "OPTIONS") {
      return new Response(null, {
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Headers": "authorization, content-type",
          "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS",
        },
      });
    }

    const url = new URL(req.url);
    const path = appPath(url.pathname);
    const method = req.method;

    if (method === "GET" && (path === "/app" || url.pathname === "/functions/v1/app")) {
      return Response.redirect(`${url.origin}${url.pathname}/`, 302);
    }
    if (method === "GET" && (path === "/" || path === "/index.html")) return await staticFile("index.html");
    if (method === "GET" && path === "/styles.css") return await staticFile("styles.css");
    if (method === "GET" && path === "/app.js") return await staticFile("app.js");

    await ensureReady();
    const params = path.match(/^\/api\/opinions\/([^/]+)(?:\/(comments|rate|vote))?$/);
    const commentParams = path.match(/^\/api\/comments\/([^/]+)$/);

    if (method === "POST" && path === "/api/auth/logout") {
      return json({ ok: true }, 200, { "Set-Cookie": "voc_session=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0; Secure" });
    }
    if (
      method === "POST" &&
      (path === "/api/auth" || path === "/api/auth/request" || path === "/api/auth/verify")
    ) {
      const body = await readBody(req);
      const email = normalizeEmail(body?.email);
      if (!EMAIL_PATTERN.test(email) || !isGmEmail(email)) {
        return json({ error: AUTH_EMAIL_ERROR }, 400);
      }
      try {
        const session = await issueSession(email);
        if (path === "/api/auth/request") {
          return json(
            {
              ok: true,
              email,
              message: "등록되었습니다. 인증 코드를 입력하면 바로 입장합니다.",
              ...session.body,
            },
            200,
            { "Set-Cookie": session.cookie },
          );
        }
        return json(session.body, 200, { "Set-Cookie": session.cookie });
      } catch (error) {
        return json({ error: (error as Error).message || "이메일 등록에 실패했습니다." }, 400);
      }
    }
    if (method === "GET" && path === "/api/me") {
      const auth = requireUser(req);
      if (!auth) return json({ error: "이메일 등록 후 입장해 주세요." }, 401);
      return json({
        anonId: auth.user.anonId,
        role: isAdmin(auth.email) ? "admin" : "user",
        isAdmin: isAdmin(auth.email),
      });
    }
    if (method === "GET" && path === "/api/opinions") {
      const session = verifyToken(readToken(req));
      const userId = session?.userId ?? "";
      const email = session?.email ?? "";
      const items = store
        .listOpinions()
        .map((item) => publicOpinion(item, userId, email))
        .sort((a, b) => {
          if (b.ratingAvg !== a.ratingAvg) return b.ratingAvg - a.ratingAvg;
          if ((a.number || 0) !== (b.number || 0)) return (a.number || 0) - (b.number || 0);
          return new Date(String(b.createdAt)).getTime() - new Date(String(a.createdAt)).getTime();
        });
      enqueueTranslationHydration();
      return json({ items });
    }
    if (method === "POST" && path === "/api/opinions") {
      const auth = requireUser(req);
      if (!auth) return json({ error: "이메일 등록 후 입장해 주세요." }, 401);
      const body = await readBody(req);
      const ask = sanitizeText(body?.ask, 4000);
      const others = sanitizeText(body?.others, 4000);
      const priority = parsePriority(body?.priority);
      if (!ask) return json({ error: "Ask S&E Anything 내용을 입력해 주세요." }, 400);
      if (priority === null) return json({ error: "Priority는 0부터 5 사이여야 합니다." }, 400);
      const kind = parseKind((body as { kind?: unknown })?.kind);
      if (kind === "notice" && !isAdmin(auth.email)) {
        return json({ error: "공지사항은 관리자만 작성할 수 있습니다." }, 403);
      }
      const translations = await bilingualFields(ask, others);
      const googleForm = await submitToGoogleForm({ email: auth.email, ask, others, priority });
      const opinion = await store.createOpinion({
        userId: String(auth.user.id),
        ask,
        others,
        priority,
        kind,
        status: isStatelessKind(kind) ? "none" : "open",
        ...translations,
      });
      return json({ item: publicOpinion(opinion, String(auth.user.id), auth.email), googleForm }, 201);
    }
    if (params && method === "PUT" && !params[2]) {
      const auth = requireUser(req);
      if (!auth) return json({ error: "이메일 등록 후 입장해 주세요." }, 401);
      const existing = store.findOpinionById(params[1]);
      if (!existing) return json({ error: "의견을 찾을 수 없습니다." }, 404);
      if (!canManage(auth.email, String(auth.user.id), existing)) {
        return json({ error: "이 의견을 수정할 권한이 없습니다." }, 403);
      }
      const body = await readBody(req);
      const ask = sanitizeText(body?.ask, 4000);
      const others = sanitizeText(body?.others, 4000);
      const priority = parsePriority(body?.priority);
      if (!ask) return json({ error: "Ask S&E Anything 내용을 입력해 주세요." }, 400);
      if (priority === null) return json({ error: "Priority는 0부터 5 사이여야 합니다." }, 400);
      const googleForm = await submitToGoogleForm({ email: auth.email, ask, others, priority });
      const nextKind = (body as { kind?: unknown })?.kind !== undefined && String((body as { kind?: unknown }).kind ?? "") !== ""
        ? parseKind((body as { kind?: unknown }).kind)
        : kindOf(existing as Record<string, unknown>);
      if (nextKind === "notice" && kindOf(existing as Record<string, unknown>) !== "notice" && !isAdmin(auth.email)) {
        return json({ error: "공지사항은 관리자만 작성할 수 있습니다." }, 403);
      }
      let nextStatus = isStatelessKind(nextKind) ? "none" : (isStatelessKind(kindOf(existing as Record<string, unknown>)) ? "open" : statusOf(existing as Record<string, unknown>));
      const requestedStatus = (body as { status?: unknown })?.status;
      if (!isStatelessKind(nextKind) && requestedStatus !== undefined && requestedStatus !== null && String(requestedStatus) !== "") {
        if (!isAdmin(auth.email)) {
          return json({ error: "상태를 변경할 권한이 없습니다." }, 403);
        }
        const parsedStatus = parseStatus(requestedStatus);
        if (!parsedStatus) return json({ error: "상태는 대기 또는 완료여야 합니다." }, 400);
        nextStatus = parsedStatus;
      }
      const translations = await bilingualFields(ask, others, {
        ...(existing as Record<string, unknown>),
        ask,
        others,
      });
      const opinion = await store.updateOpinion(existing.id as string, {
        ask,
        others,
        priority,
        kind: nextKind,
        status: nextStatus,
        ...translations,
      });
      return json({ item: publicOpinion(opinion as Record<string, unknown>, String(auth.user.id), auth.email), googleForm });
    }
    if (params && method === "DELETE" && !params[2]) {
      const auth = requireUser(req);
      if (!auth) return json({ error: "이메일 등록 후 입장해 주세요." }, 401);
      const existing = store.findOpinionById(params[1]);
      if (!existing) return json({ error: "의견을 찾을 수 없습니다." }, 404);
      if (!canManage(auth.email, String(auth.user.id), existing)) {
        return json({ error: "이 의견을 삭제할 권한이 없습니다." }, 403);
      }
      await store.deleteOpinion(params[1]);
      return json({ ok: true });
    }
    if (params && method === "POST" && params[2] === "comments") {
      const auth = requireUser(req);
      if (!auth) return json({ error: "이메일 등록 후 입장해 주세요." }, 401);
      const opinion = store.findOpinionById(params[1]);
      if (!opinion) return json({ error: "의견을 찾을 수 없습니다." }, 404);
      const body = sanitizeText((await readBody(req))?.body, 1000);
      if (!body) return json({ error: "댓글 내용을 입력해 주세요." }, 400);
      const comment = await store.addComment({
        opinionId: String(opinion.id),
        userId: String(auth.user.id),
        body,
      });
      return json({ item: publicComment(comment, String(auth.user.id), auth.email) }, 201);
    }
    if (params && method === "POST" && params[2] === "rate") {
      const auth = requireUser(req);
      if (!auth) return json({ error: "이메일 등록 후 입장해 주세요." }, 401);
      const opinion = store.findOpinionById(params[1]);
      if (!opinion) return json({ error: "의견을 찾을 수 없습니다." }, 404);
      if (opinion.userId === auth.user.id) return json({ error: "본인 의견에는 별점을 줄 수 없습니다." }, 403);
      const stars = Number((await readBody(req))?.stars);
      if (!Number.isInteger(stars) || stars < 1 || stars > 5) {
        return json({ error: "별점은 1부터 5 사이여야 합니다." }, 400);
      }
      await store.upsertRating(String(auth.user.id), String(opinion.id), stars);
      return json({ item: publicOpinion(opinion, String(auth.user.id), auth.email) });
    }
    if (params && method === "POST" && params[2] === "vote") {
      const auth = requireUser(req);
      if (!auth) return json({ error: "이메일 등록 후 입장해 주세요." }, 401);
      const opinion = store.findOpinionById(params[1]);
      if (!opinion) return json({ error: "의견을 찾을 수 없습니다." }, 404);
      if (opinion.userId === auth.user.id) return json({ error: "본인 의견에는 투표할 수 없습니다." }, 403);
      if (store.findVote(String(auth.user.id), String(opinion.id))) {
        return json({ error: "이미 이 의견에 투표했습니다. 투표는 한 번만 가능합니다." }, 409);
      }
      await store.addVote(String(auth.user.id), String(opinion.id));
      const updated = store.findOpinionById(String(opinion.id));
      return json({ item: publicOpinion(updated as Record<string, unknown>, String(auth.user.id), auth.email) });
    }
    if (commentParams && method === "PUT") {
      const auth = requireUser(req);
      if (!auth) return json({ error: "이메일 등록 후 입장해 주세요." }, 401);
      const comment = store.findCommentById(commentParams[1]);
      if (!comment) return json({ error: "댓글을 찾을 수 없습니다." }, 404);
      if (!isAdmin(auth.email) && comment.userId !== auth.user.id) {
        return json({ error: "이 댓글을 수정할 권한이 없습니다." }, 403);
      }
      const body = sanitizeText((await readBody(req))?.body, 1000);
      if (!body) return json({ error: "댓글 내용을 입력해 주세요." }, 400);
      const updated = await store.updateComment(commentParams[1], body);
      return json({ item: publicComment(updated as Record<string, unknown>, String(auth.user.id), auth.email) });
    }
    if (commentParams && method === "DELETE") {
      const auth = requireUser(req);
      if (!auth) return json({ error: "이메일 등록 후 입장해 주세요." }, 401);
      const comment = store.findCommentById(commentParams[1]);
      if (!comment) return json({ error: "댓글을 찾을 수 없습니다." }, 404);
      if (!isAdmin(auth.email) && comment.userId !== auth.user.id) {
        return json({ error: "이 댓글을 삭제할 권한이 없습니다." }, 403);
      }
      await store.deleteComment(commentParams[1]);
      return json({ ok: true });
    }

    if (method === "GET") return await staticFile("index.html");
    return json({ error: "요청한 경로를 찾을 수 없습니다." }, 404);
  } catch (error) {
    console.error(error);
    return json({ error: "서버 오류가 발생했습니다." }, 500);
  }
});
