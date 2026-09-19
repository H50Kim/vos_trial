const REPO = "https://raw.githubusercontent.com/H50Kim/vos_trial/main/web";

const MIME: Record<string, string> = {
  html: "text/html; charset=utf-8",
  js: "text/javascript; charset=utf-8",
  css: "text/css; charset=utf-8",
  svg: "image/svg+xml",
  ico: "image/x-icon",
  json: "application/json",
  txt: "text/plain; charset=utf-8",
};

function assetPath(pathname: string) {
  let rest = pathname.replace(/^\/functions\/v1\/app\/?/, "");
  if (!rest || rest.endsWith("/")) rest += "index.html";
  return rest.replace(/^\/+/, "");
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "*",
      },
    });
  }

  const url = new URL(req.url);
  const rest = assetPath(url.pathname);
  const upstream = await fetch(`${REPO}/${rest}`);
  const ext = rest.split(".").pop() ?? "html";

  if (!upstream.ok) {
    const fallback = await fetch(`${REPO}/index.html`);
    return new Response(await fallback.arrayBuffer(), {
      status: fallback.ok ? 200 : 503,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "no-cache",
        "Access-Control-Allow-Origin": "*",
      },
    });
  }

  return new Response(await upstream.arrayBuffer(), {
    headers: {
      "Content-Type": MIME[ext] ?? "application/octet-stream",
      "Cache-Control": ext === "html" ? "no-cache" : "public, max-age=31536000, immutable",
      "Access-Control-Allow-Origin": "*",
    },
  });
});
