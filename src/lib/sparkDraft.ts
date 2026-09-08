export const SPARK_DRAFT_STORAGE_KEY = "lore_bible_active_spark_draft_v1";
const SPARK_DRAFT_VERSION = 1;
const MAX_SPARK_DRAFT_LENGTH = 100_000;

interface ReadableStorage {
  getItem(key: string): string | null;
}

interface WritableStorage extends ReadableStorage {
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export function readSparkDraft(storage: ReadableStorage): string {
  try {
    const raw = storage.getItem(SPARK_DRAFT_STORAGE_KEY);
    if (!raw) return "";
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return "";
    const record = parsed as Record<string, unknown>;
    if (record.version !== SPARK_DRAFT_VERSION || typeof record.sparkText !== "string" || typeof record.updatedAt !== "number") return "";
    if (record.sparkText.length > MAX_SPARK_DRAFT_LENGTH) return "";
    return record.sparkText;
  } catch {
    return "";
  }
}

export function writeSparkDraft(storage: WritableStorage, sparkText: string): void {
  try {
    if (!sparkText) {
      storage.removeItem(SPARK_DRAFT_STORAGE_KEY);
      return;
    }
    if (sparkText.length > MAX_SPARK_DRAFT_LENGTH) return;
    storage.setItem(SPARK_DRAFT_STORAGE_KEY, JSON.stringify({ version: SPARK_DRAFT_VERSION, sparkText, updatedAt: Date.now() }));
  } catch {
    // Draft recovery is best-effort and must never block editing.
  }
}
