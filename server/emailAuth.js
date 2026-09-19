import { createHmac, randomInt, timingSafeEqual } from "node:crypto";

const SUPABASE_URL =
  process.env.SUPABASE_URL ||
  process.env.VITE_SUPABASE_URL ||
  "https://tkjsezhhllrpnxhqmmrm.supabase.co";
const SUPABASE_ANON_KEY =
  process.env.SUPABASE_ANON_KEY ||
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  "sb_publishable_tCaTrctAWCbkD_Y36KpzPA_goWqBo4U";

const OTP_TTL_MS = 10 * 60 * 1000;
const RESEND_MS = 60 * 1000;
const MAX_ATTEMPTS = 5;

function supabaseHeaders(token = SUPABASE_ANON_KEY) {
  return {
    apikey: SUPABASE_ANON_KEY,
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
}

function hashOtp(secret, email, code) {
  return createHmac("sha256", `${secret}:otp`).update(`${email}:${code}`).digest("hex");
}

function codesMatch(left, right) {
  const a = Buffer.from(String(left || ""));
  const b = Buffer.from(String(right || ""));
  if (a.length !== b.length || a.length === 0) return false;
  return timingSafeEqual(a, b);
}

function koreanAuthError(payload, fallback) {
  const code = payload?.error_code || "";
  if (code === "over_email_send_rate_limit" || payload?.msg?.includes("rate limit")) {
    return "인증 메일 발송 한도를 초과했습니다. 잠시 후 다시 시도해 주세요.";
  }
  if (code === "email_address_invalid") {
    return "올바른 이메일 주소를 입력해 주세요.";
  }
  if (code === "otp_expired") {
    return "인증 코드가 만료되었습니다. 코드를 다시 받아 주세요.";
  }
  if (code === "otp_disabled") {
    return "이메일 인증이 비활성화되어 있습니다.";
  }
  return fallback;
}

export function createEmailAuth(getSecret) {
  const challenges = new Map();

  function issueLocal(email) {
    const code = String(randomInt(100000, 999999));
    challenges.set(email, {
      hash: hashOtp(getSecret(), email, code),
      expiresAt: Date.now() + OTP_TTL_MS,
      lastSentAt: Date.now(),
      attempts: 0,
    });
    console.log(`[auth] ${email} 로컬 인증 코드: ${code}`);
    return code;
  }

  async function sendSupabaseOtp(email) {
    const response = await fetch(`${SUPABASE_URL}/auth/v1/otp`, {
      method: "POST",
      headers: supabaseHeaders(),
      body: JSON.stringify({
        email,
        create_user: true,
      }),
    });
    const payload = await response.json().catch(() => ({}));
    return { ok: response.ok, status: response.status, payload };
  }

  async function verifySupabaseOtp(email, code) {
    const response = await fetch(`${SUPABASE_URL}/auth/v1/verify`, {
      method: "POST",
      headers: supabaseHeaders(),
      body: JSON.stringify({
        type: "email",
        email,
        token: code,
      }),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      return { ok: false, error: koreanAuthError(payload, "인증 코드가 올바르지 않습니다.") };
    }
    const verifiedEmail = normalizeFromPayload(payload);
    return { ok: true, email: verifiedEmail || email };
  }

  function normalizeFromPayload(payload) {
    const value = payload?.user?.email || payload?.email || "";
    return String(value).trim().toLowerCase();
  }

  return {
    async request(email) {
      const existing = challenges.get(email);
      if (existing && Date.now() - existing.lastSentAt < RESEND_MS) {
        const wait = Math.ceil((RESEND_MS - (Date.now() - existing.lastSentAt)) / 1000);
        throw new Error(`인증 코드를 이미 보냈습니다. ${wait}초 후에 다시 시도해 주세요.`);
      }

      const sent = await sendSupabaseOtp(email);
      if (sent.ok) {
        challenges.set(email, {
          hash: "",
          expiresAt: Date.now() + OTP_TTL_MS,
          lastSentAt: Date.now(),
          attempts: 0,
          supabase: true,
        });
        return { sent: true };
      }

      const message = koreanAuthError(sent.payload, "");
      if (sent.payload?.error_code === "email_address_invalid") {
        throw new Error(message);
      }

      issueLocal(email);
      return { sent: true };
    },

    async verify(email, code) {
      const trimmed = String(code || "").replace(/\s+/g, "");
      if (!/^\d{6,8}$/.test(trimmed)) {
        throw new Error("이메일로 받은 6자리 인증 코드를 입력해 주세요.");
      }

      const challenge = challenges.get(email);
      if (challenge?.hash) {
        if (Date.now() > challenge.expiresAt) {
          challenges.delete(email);
          throw new Error("인증 코드가 만료되었습니다. 코드를 다시 받아 주세요.");
        }
        challenge.attempts += 1;
        if (challenge.attempts > MAX_ATTEMPTS) {
          challenges.delete(email);
          throw new Error("인증 시도 횟수를 초과했습니다. 코드를 다시 받아 주세요.");
        }
        const expected = hashOtp(getSecret(), email, trimmed);
        if (codesMatch(challenge.hash, expected)) {
          challenges.delete(email);
          return { email };
        }
      }

      const remote = await verifySupabaseOtp(email, trimmed);
      if (!remote.ok) {
        throw new Error(remote.error);
      }
      challenges.delete(email);
      return { email: remote.email || email };
    },

    async completeWithAccessToken(accessToken) {
      const token = String(accessToken || "").trim();
      if (!token) throw new Error("이메일 인증이 필요합니다.");
      const response = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
        headers: supabaseHeaders(token),
      });
      const payload = await response.json().catch(() => ({}));
      const email = String(payload?.email || "")
        .trim()
        .toLowerCase();
      if (!response.ok || !email) {
        throw new Error("이메일 인증에 실패했습니다. 인증 메일의 코드를 입력해 주세요.");
      }
      return { email };
    },
  };
}
