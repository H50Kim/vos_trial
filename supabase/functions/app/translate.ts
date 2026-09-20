const HANGUL_RE = /[\uac00-\ud7a3]/;
const cache = new Map<string, Promise<string>>();

export function hasKorean(text: unknown) {
  return HANGUL_RE.test(String(text || ""));
}

function chunkText(text: string, max = 400) {
  const src = String(text || "");
  if (src.length <= max) return [src];
  const chunks: string[] = [];
  let rest = src;
  while (rest.length) {
    if (rest.length <= max) {
      chunks.push(rest);
      break;
    }
    let cut = rest.lastIndexOf("\n", max);
    if (cut < max * 0.4) cut = rest.lastIndexOf(" ", max);
    if (cut < max * 0.4) cut = max;
    chunks.push(rest.slice(0, cut));
    rest = rest.slice(cut);
  }
  return chunks;
}

function extractGtx(data: unknown) {
  if (!Array.isArray(data) || !Array.isArray(data[0])) return "";
  return (data[0] as unknown[])
    .map((part) => (Array.isArray(part) ? String(part[0] || "") : ""))
    .join("")
    .trim();
}

async function translateChunkGoogle(text: string) {
  const url =
    "https://translate.googleapis.com/translate_a/single?client=gtx&sl=ko&tl=en&dt=t&q=" +
    encodeURIComponent(text);
  const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
  if (!res.ok) throw new Error(`gtx ${res.status}`);
  return extractGtx(await res.json());
}

async function translateChunkMyMemory(text: string) {
  const url =
    "https://api.mymemory.translated.net/get?q=" +
    encodeURIComponent(text.slice(0, 500)) +
    "&langpair=ko|en";
  const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
  if (!res.ok) throw new Error(`mymemory ${res.status}`);
  const data = await res.json() as { responseData?: { translatedText?: string } };
  return String(data?.responseData?.translatedText || "").trim();
}

async function translateChunk(text: string) {
  const src = String(text || "").trim();
  if (!src) return "";
  try {
    const translated = await translateChunkGoogle(src);
    if (translated) return translated;
  } catch {
    // Fall through to MyMemory.
  }
  try {
    return await translateChunkMyMemory(src);
  } catch {
    return "";
  }
}

export async function translateKoToEn(text: unknown) {
  const src = String(text || "").trim();
  if (!src || !hasKorean(src)) return "";
  if (cache.has(src)) return cache.get(src) as Promise<string>;

  const pending = (async () => {
    const parts: string[] = [];
    for (const chunk of chunkText(src)) {
      const translated = await translateChunk(chunk);
      if (!translated) return "";
      parts.push(translated);
    }
    const joined = parts.join("\n").trim();
    return joined && joined !== src ? joined : "";
  })();

  cache.set(src, pending);
  try {
    return await pending;
  } catch (error) {
    cache.delete(src);
    throw error;
  }
}

export async function bilingualFields(
  ask: unknown,
  others: unknown,
  existing: Record<string, unknown> = {},
) {
  const askText = String(ask || "");
  const othersText = String(others || "");
  const askEn = hasKorean(askText)
    ? existing.askTranslatedFrom === askText && existing.askEn
      ? String(existing.askEn)
      : await translateKoToEn(askText)
    : "";
  const othersEn = hasKorean(othersText)
    ? existing.othersTranslatedFrom === othersText && existing.othersEn
      ? String(existing.othersEn)
      : await translateKoToEn(othersText)
    : "";
  return {
    askEn,
    othersEn,
    askTranslatedFrom: hasKorean(askText) ? askText : "",
    othersTranslatedFrom: hasKorean(othersText) ? othersText : "",
  };
}

export function needsTranslation(opinion: Record<string, unknown> | null | undefined) {
  const ask = String(opinion?.ask || "");
  const others = String(opinion?.others || "");
  if (hasKorean(ask) && opinion?.askTranslatedFrom !== ask) return true;
  if (hasKorean(others) && opinion?.othersTranslatedFrom !== others) return true;
  if (!hasKorean(ask) && opinion?.askEn) return true;
  if (!hasKorean(others) && opinion?.othersEn) return true;
  return false;
}

export async function bilingualText(text: unknown, existing: Record<string, unknown> = {}) {
  const src = String(text || "");
  const bodyEn = hasKorean(src)
    ? existing.bodyTranslatedFrom === src && existing.bodyEn
      ? String(existing.bodyEn)
      : await translateKoToEn(src)
    : "";
  return {
    bodyEn,
    bodyTranslatedFrom: hasKorean(src) ? src : "",
  };
}

export function needsCommentTranslation(comment: Record<string, unknown> | null | undefined) {
  const body = String(comment?.body || "");
  if (hasKorean(body) && comment?.bodyTranslatedFrom !== body) return true;
  if (!hasKorean(body) && comment?.bodyEn) return true;
  return false;
}
