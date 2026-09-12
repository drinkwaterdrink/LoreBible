function safeLabel(value: string, fallback: string): string {
  const normalized = value.replace(/[\u0000-\u001f\u007f]/g, " ").trim();
  return (normalized || fallback).slice(0, 180);
}

export function formatForgeBundleFailure(bundleIndex: number, bundleName: string, modelId: string, message: string): string {
  const index = Number.isInteger(bundleIndex) && bundleIndex >= 0 ? bundleIndex + 1 : 0;
  return `Forge bundle ${index} (${safeLabel(bundleName, "unknown bundle")}) using ${safeLabel(modelId, "selected model")} failed: ${safeLabel(message, "Provider request failed.")}`;
}
