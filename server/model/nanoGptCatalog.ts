const MAX_PUBLIC_PAGE_BYTES = 2_000_000;

export function nanoGptSubscriptionModelsUrl(baseUrl: string): string {
  const canonical = baseUrl.replace(/\/+$/, "");
  return `${canonical.replace(/\/api\/v1$/i, "/api/subscription/v1")}/models?detailed=true`;
}

export function parseNanoGptPopularModelIds(html: string): string[] {
  if (html.length > MAX_PUBLIC_PAGE_BYTES) return [];
  const ids: string[] = [];
  const seen = new Set<string>();
  const expression = /href=["']\/models\/text\/([^"'#?]+(?:\/[^"'#?]+)*)["']/gi;
  for (const match of html.matchAll(expression)) {
    let id: string;
    try { id = decodeURIComponent(match[1]).trim(); } catch { continue; }
    if (!id || id.length > 200 || /\p{Cc}/u.test(id) || seen.has(id)) continue;
    seen.add(id);
    ids.push(id);
  }
  return ids;
}
