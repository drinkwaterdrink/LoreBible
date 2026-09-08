export const DEFAULT_REASONING_LIMIT = 50_000;

export function appendBoundedReasoning(current: string, delta: string, limit = DEFAULT_REASONING_LIMIT): { text: string; truncated: boolean } {
  const combined = `${current}${delta}`;
  if (combined.length <= limit) return { text: combined, truncated: false };
  return { text: combined.slice(0, Math.max(0, limit)), truncated: true };
}
