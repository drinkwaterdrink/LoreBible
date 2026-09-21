import type { GenerationErrorCode } from "../../src/contracts/generation.js";

export function safeForgeFailureReason(code: GenerationErrorCode | undefined, truncated = false): string {
  if (truncated) return "This request reached its output limit. Connected-model Forge requests currently ask for up to 16,000 output tokens; the provider may allow less. Saved bundles are unchanged.";
  switch (code) {
    case "INVALID_STRUCTURED_OUTPUT": return "The model response did not match the Forge contract after one correction; saved bundles are unchanged.";
    case "RATE_LIMITED": return "The provider rate limit was reached; saved bundles are unchanged.";
    case "QUOTA_EXHAUSTED": return "The provider quota was exhausted; saved bundles are unchanged.";
    case "REQUEST_TIMEOUT": return "The provider request timed out; saved bundles are unchanged.";
    case "AUTHENTICATION_FAILED": return "The provider rejected the connection credentials; saved bundles are unchanged.";
    case "CREDENTIAL_MISSING":
    case "PROFILE_NOT_FOUND": return "The selected connection is unavailable; saved bundles are unchanged.";
    case "MODEL_UNAVAILABLE": return "The selected model is unavailable; saved bundles are unchanged.";
    case "PROVIDER_UNAVAILABLE": return "The provider could not complete the request; saved bundles are unchanged.";
    default: return "Forge could not complete this request; saved bundles are unchanged.";
  }
}

function safeLabel(value: string, fallback: string): string {
  const normalized = value.replace(/[\u0000-\u001f\u007f]/g, " ").trim();
  return (normalized || fallback).slice(0, 180);
}

export function formatForgeBundleFailure(bundleIndex: number, bundleName: string, modelId: string, message: string): string {
  const index = Number.isInteger(bundleIndex) && bundleIndex >= 0 ? bundleIndex + 1 : 0;
  return `Forge bundle ${index} (${safeLabel(bundleName, "unknown bundle")}) using ${safeLabel(modelId, "selected model")} failed: ${safeLabel(message, "Provider request failed.")}`;
}
