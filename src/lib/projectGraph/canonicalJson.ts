import { createHash } from "node:crypto";

function normalize(value: unknown, seen: Set<object>): unknown {
  if (value === null || typeof value === "string" || typeof value === "boolean") return value;
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value !== "object") throw new Error("Project source must be entirely JSON-serializable.");
  if (seen.has(value)) throw new Error("Project source must be entirely JSON-serializable.");
  seen.add(value);
  try {
    if (Array.isArray(value)) return value.map((item) => normalize(item, seen));
    const output: Record<string, unknown> = {};
    for (const key of Object.keys(value as Record<string, unknown>).sort()) {
      const item = (value as Record<string, unknown>)[key];
      if (item === undefined || typeof item === "function" || typeof item === "symbol" || typeof item === "bigint") throw new Error("Project source must be entirely JSON-serializable.");
      output[key] = normalize(item, seen);
    }
    return output;
  } finally { seen.delete(value); }
}

export function canonicalizeJson(value: unknown): string {
  return JSON.stringify(normalize(value, new Set()));
}

export function sha256Hex(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}
