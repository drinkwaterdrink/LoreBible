export interface StructuredOutputResult {
  parsed: unknown;
  text: string;
  repaired: boolean;
}

function balancedJsonSlice(value: string, start: number): string | null {
  const opener = value[start];
  if (opener !== "{" && opener !== "[") return null;
  const closers: Record<string, string> = { "{": "}", "[": "]" };
  const stack: string[] = [closers[opener]];
  let inString = false;
  let escaped = false;

  for (let index = start + 1; index < value.length; index += 1) {
    const character = value[index];
    if (inString) {
      if (escaped) escaped = false;
      else if (character === "\\") escaped = true;
      else if (character === '"') inString = false;
      continue;
    }
    if (character === '"') { inString = true; continue; }
    if (character === "{" || character === "[") { stack.push(closers[character]); continue; }
    if (character === "}" || character === "]") {
      if (stack.pop() !== character) return null;
      if (stack.length === 0) return value.slice(start, index + 1);
    }
  }
  return null;
}

function parseCandidate(value: string): { ok: true; value: unknown } | { ok: false } {
  try { return { ok: true, value: JSON.parse(value) }; } catch { return { ok: false }; }
}

/**
 * Parse structured model output without inventing content. Providers sometimes
 * add one markdown fence or a short preamble even when JSON mode was requested;
 * those wrappers are safe to remove only when one complete JSON document can be
 * identified and parsed.
 */
export function parseStructuredOutput(raw: string): StructuredOutputResult {
  const trimmed = raw.replace(/^\uFEFF/, "").trim();
  const direct = parseCandidate(trimmed);
  if (direct.ok) return { parsed: direct.value, text: trimmed, repaired: trimmed !== raw };

  const fenced = trimmed.match(/^```(?:json|application\/json)?\s*\n?([\s\S]*?)\n?```$/i);
  if (fenced) {
    const inner = fenced[1].trim();
    const parsed = parseCandidate(inner);
    if (parsed.ok) return { parsed: parsed.value, text: inner, repaired: true };
  }

  for (let index = 0; index < trimmed.length; index += 1) {
    if (trimmed[index] !== "{" && trimmed[index] !== "[") continue;
    const candidate = balancedJsonSlice(trimmed, index);
    if (!candidate) continue;
    const parsed = parseCandidate(candidate);
    if (parsed.ok) return { parsed: parsed.value, text: candidate, repaired: true };
  }

  throw new SyntaxError("The provider did not return one parseable JSON document.");
}
