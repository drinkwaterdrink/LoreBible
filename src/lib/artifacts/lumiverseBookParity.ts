import type { NativeLumiverseWorldBookV1 } from "../../contracts/lumiverseWorldBook";

export interface LumiverseBookParityResult {
  equal: boolean;
  ignored: ["exported_at"];
  mismatches: string[];
}

function collectMismatches(left: unknown, right: unknown, path: string, output: string[]): void {
  if (Object.is(left, right)) return;
  if (Array.isArray(left) && Array.isArray(right)) {
    if (left.length !== right.length) output.push(`${path}.length`);
    const length = Math.min(left.length, right.length);
    for (let index = 0; index < length; index += 1) collectMismatches(left[index], right[index], `${path}[${index}]`, output);
    return;
  }
  if (left && right && typeof left === "object" && typeof right === "object") {
    const leftRecord = left as Record<string, unknown>;
    const rightRecord = right as Record<string, unknown>;
    const keys = [...new Set([...Object.keys(leftRecord), ...Object.keys(rightRecord)])].sort();
    for (const key of keys) collectMismatches(leftRecord[key], rightRecord[key], path ? `${path}.${key}` : key, output);
    return;
  }
  output.push(path);
}

export function compareNativeLumiverseWorldBooks(
  standalone: NativeLumiverseWorldBookV1,
  attached: NativeLumiverseWorldBookV1,
): LumiverseBookParityResult {
  const left = { ...standalone, exported_at: 0 };
  const right = { ...attached, exported_at: 0 };
  const mismatches: string[] = [];
  collectMismatches(left, right, "", mismatches);
  return { equal: mismatches.length === 0, ignored: ["exported_at"], mismatches };
}
