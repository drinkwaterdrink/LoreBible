export interface CanonicalSparkDNA {
  nonNegotiables: string[];
  premisePromise: string;
  toneEnvelope: { primary: string; descriptors: string[] };
  genreSignals: string[];
  playerAgencyBoundaries: string;
  openVariables: string[];
  existingPressures: string[];
  assumptions: string[];
  opportunitySpace: string[];
  userRole: string | null;
  franchise: string | null;
}
export type SparkDNA = CanonicalSparkDNA;

type RecordValue = Record<string, unknown>;
function isRecord(value: unknown): value is RecordValue { return typeof value === "object" && value !== null && !Array.isArray(value); }
function stringAt(value: unknown, path: string, fallback = ""): string {
  if (value === undefined || value === null) return fallback;
  if (typeof value !== "string") throw new TypeError(`${path} must be a string.`);
  return value;
}
function nullableStringAt(value: unknown, path: string): string | null {
  if (value === undefined || value === null) return null;
  if (typeof value !== "string") throw new TypeError(`${path} must be a string or null.`);
  return value;
}
function stringsAt(value: unknown, path: string): string[] {
  if (value === undefined || value === null) return [];
  if (!Array.isArray(value) || value.some((item) => typeof item !== "string")) throw new TypeError(`${path} must be an array of strings.`);
  return [...value];
}

export function parseCanonicalSparkDNA(value: unknown): CanonicalSparkDNA {
  if (!isRecord(value)) throw new TypeError("sparkDNA must be an object.");
  if ("corePremise" in value || "genreArchetype" in value || "tonalRegisters" in value) throw new TypeError("Legacy SparkDNA shape detected; use migrateLegacySparkDNA().");
  if (!isRecord(value.toneEnvelope)) throw new TypeError("toneEnvelope must be an object.");
  const tone = value.toneEnvelope;
  return {
    nonNegotiables: stringsAt(value.nonNegotiables, "nonNegotiables"),
    premisePromise: stringAt(value.premisePromise, "premisePromise"),
    toneEnvelope: { primary: stringAt(tone.primary, "toneEnvelope.primary"), descriptors: stringsAt(tone.descriptors, "toneEnvelope.descriptors") },
    genreSignals: stringsAt(value.genreSignals, "genreSignals"),
    playerAgencyBoundaries: stringAt(value.playerAgencyBoundaries, "playerAgencyBoundaries"),
    openVariables: stringsAt(value.openVariables, "openVariables"),
    existingPressures: stringsAt(value.existingPressures, "existingPressures"),
    assumptions: stringsAt(value.assumptions, "assumptions"),
    opportunitySpace: stringsAt(value.opportunitySpace, "opportunitySpace"),
    userRole: nullableStringAt(value.userRole, "userRole"),
    franchise: nullableStringAt(value.franchise, "franchise"),
  };
}

export function migrateLegacySparkDNA(value: unknown): CanonicalSparkDNA {
  if (!isRecord(value)) throw new TypeError("legacy SparkDNA must be an object.");
  if ("premisePromise" in value || "toneEnvelope" in value) return parseCanonicalSparkDNA(value);
  const legacyTone = stringsAt(value.tonalRegisters, "tonalRegisters");
  const genre = stringAt(value.genreArchetype, "genreArchetype");
  return {
    nonNegotiables: stringsAt(value.nonNegotiables, "nonNegotiables"),
    premisePromise: stringAt(value.corePremise, "corePremise"),
    toneEnvelope: { primary: legacyTone[0] || genre, descriptors: legacyTone },
    genreSignals: genre ? [genre] : [],
    playerAgencyBoundaries: "{{user}} retains authority over protagonist choices.",
    openVariables: stringsAt(value.openNegotiables, "openNegotiables"),
    existingPressures: stringsAt(value.existingPressures, "existingPressures"),
    assumptions: stringsAt(value.implicitAssumptions, "implicitAssumptions"),
    opportunitySpace: stringsAt(value.wildcards, "wildcards"),
    userRole: nullableStringAt(value.userRole, "userRole"),
    franchise: nullableStringAt(value.franchise, "franchise"),
  };
}
