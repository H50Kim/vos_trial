const HANGUL_RE = /[\uac00-\ud7a3]/;
const cache = new Map();

export function hasKorean(text) {
  return HANGUL_RE.test(String(text || ""));
}

function chunkText(text, max = 400) {
  const src = String(text || "");
  if (src.length <= max) return [src];
  const chunks = [];
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

function extractGtx(data) {
  if (!Array.isArray(data) || !Array.isArray(data[0])) return "";
  return data[0]
    .map((part) => (Array.isArray(part) ? String(part[0] || "") : ""))
    .join("")
    .trim();
}

async function translateChunkGoogle(text) {
  const url =
    "https://translate.googleapis.com/translate_a/single?client=gtx&sl=ko&tl=en&dt=t&q=" +
    encodeURIComponent(text);
  const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
  if (!res.ok) throw new Error(`gtx ${res.status}`);
  return extractGtx(await res.json());
}

async function translateChunkMyMemory(text) {
  const url =
    "https://api.mymemory.translated.net/get?q=" +
    encodeURIComponent(text.slice(0, 500)) +
    "&langpair=ko|en";
  const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
  if (!res.ok) throw new Error(`mymemory ${res.status}`);
  const data = await res.json();
  return String(data?.responseData?.translatedText || "").trim();
}

async function translateChunk(text) {
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

export async function translateKoToEn(text) {
  const src = String(text || "").trim();
  if (!src || !hasKorean(src)) return "";
  if (cache.has(src)) return cache.get(src);

  const pending = (async () => {
    const parts = [];
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

export async function bilingualFields(ask, others, existing = {}) {
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

export function needsTranslation(opinion) {
  const ask = String(opinion?.ask || "");
  const others = String(opinion?.others || "");
  if (hasKorean(ask) && opinion?.askTranslatedFrom !== ask) return true;
  if (hasKorean(others) && opinion?.othersTranslatedFrom !== others) return true;
  if (!hasKorean(ask) && opinion?.askEn) return true;
  if (!hasKorean(others) && opinion?.othersEn) return true;
  return false;
}
