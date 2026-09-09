import { createHash } from "node:crypto";

const OMIT = Symbol("omit");

function normalize(value: unknown, seen: Set<object>, inArray = false): unknown | typeof OMIT {
  if (value === undefined) return inArray ? null : OMIT;
  if (value === null || typeof value === "string" || typeof value === "boolean") return value;
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value !== "object") throw new Error("Project source must be entirely JSON-serializable.");
  if (seen.has(value)) throw new Error("Project source must be entirely JSON-serializable.");
  seen.add(value);
  try {
    if (Array.isArray(value)) return value.map((item) => normalize(item, seen, true));
    const output: Record<string, unknown> = {};
    for (const key of Object.keys(value as Record<string, unknown>).sort()) {
      const item = (value as Record<string, unknown>)[key];
      if (typeof item === "function" || typeof item === "symbol" || typeof item === "bigint") throw new Error("Project source must be entirely JSON-serializable.");
      const normalized = normalize(item, seen);
      if (normalized !== OMIT) output[key] = normalized;
    }
    return output;
  } finally { seen.delete(value); }
}

export function canonicalizeJson(value: unknown): string {
  const normalized = normalize(value, new Set());
  if (normalized === OMIT) throw new Error("Project source must be entirely JSON-serializable.");
  return JSON.stringify(normalized);
}

export function sha256Hex(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}
