import type { BuildLogItem, LoreBibleDocument } from "../../../types";
import type { GenerationActivityProps } from "../../../components/GenerationActivity";
import { specialistPhaseLabel } from "../../../components/GenerationActivity";

export type BundleStatus = "pending" | "in_progress" | "completed" | "interrupted";

export interface ForgeBundleDefinition {
  index: number;
  title: string;
  subtitle: string;
  specialistTitle: string;
  specialistRole: string;
  sectionKeys: string[];
}

export const CANONICAL_FORGE_BUNDLES: ForgeBundleDefinition[] = [
  {
    index: 1,
    title: "Foundations & The Spine",
    subtitle: "Premise, Core Rules & Protagonist Position",
    specialistTitle: "Architect & Worldbuilder",
    specialistRole: "Establishes core truth, stakes, user position, and physical friction.",
    sectionKeys: ["core", "user", "worldPhysics", "status"],
  },
  {
    index: 2,
    title: "Spatial Geography & Power",
    subtitle: "Locations, Factions & Territorial Stances",
    specialistTitle: "Cartographer & Faction Chronicler",
    specialistRole: "Maps key anchors, institutional agendas, and sovereign limits.",
    sectionKeys: ["locations", "factions"],
  },
  {
    index: 3,
    title: "Dramatis Personae",
    subtitle: "Cast Seeds, Dynamics & Knowledge Bonds",
    specialistTitle: "Dramatist & Casting Director",
    specialistRole: "Inks distinct agents, behavioral contrasts, and relationship tensions.",
    sectionKeys: ["npcs", "relationshipWeb", "knowledgeMap"],
  },
  {
    index: 4,
    title: "Knowledge Systems & Secrets",
    subtitle: "Unfired Guns, Relics & Covenants",
    specialistTitle: "Chamberlain & Keeper of Secrets",
    specialistRole: "Secures restricted items, latent covenants, and friction clocks.",
    sectionKeys: ["items", "secrets", "conflict", "pressureProtocol"],
  },
  {
    index: 5,
    title: "Pressures, Chronology & Atmosphere",
    subtitle: "History, Sensory Palettes & Escalation Clocks",
    specialistTitle: "Historian & Sensory Stylist",
    specialistRole: "Chronicles origin crises, tactile textures, and time horizons.",
    sectionKeys: ["history", "aesthetic", "naming", "pressures"],
  },
  {
    index: 6,
    title: "Narrative Opening & Engagement",
    subtitle: "Procedural Rolls, First Choice & Anti-Gravity",
    specialistTitle: "Master of Revels & Opening Scribe",
    specialistRole: "Crafts the immersive threshold, first choice, and gameplay constraints.",
    sectionKeys: ["proceduralRolls", "opening", "expansionNotes", "antiGravity", "buildNotes", "rulesOfEngagement", "sensoryPalette", "openLoops"],
  },
];

export interface ForgeBundleView extends ForgeBundleDefinition {
  status: BundleStatus;
  isPreserved: boolean;
  entryCount: number;
  previewSummary?: string;
}

export interface ActiveSpecialistTelemetry {
  title: string;
  role: string;
  jobProgress: string;
  isPreserved: boolean;
  currentActivityText: string;
  pulseActive: boolean;
}

export interface AdventureForgeInput {
  isForging: boolean;
  workingTitle: string;
  forgeError?: string | null;
  hasCheckpoint?: boolean;
  buildLogs?: BuildLogItem[];
  streamedSections?: Record<string, any>;
  document?: LoreBibleDocument | null;
  generationActivity?: GenerationActivityProps;
  boundedSpecialists?: boolean;
  activeSpecialistPhase?: string;
  specialistProgress?: {
    currentJob: number;
    totalJobs: number;
    phaseName: string;
    isPreserved?: boolean;
  };
  jobRecords?: Array<{
    id: string;
    bundleIndex: number;
    splitDepth?: number;
    isReplaced?: boolean;
    entryCount?: number;
  }>;
}

export interface AdventureForgeViewModel {
  workingTitle: string;
  isForging: boolean;
  hasError: boolean;
  errorMessage: string | null;
  isCompleted: boolean;
  hasCheckpoint: boolean;
  bundles: ForgeBundleView[];
  activeSpecialist: ActiveSpecialistTelemetry | null;
  completedBundleCount: number;
  totalBundleCount: number;
  totalEntriesCount: number;
  wordCount: number;
  latestLogs: BuildLogItem[];
  canProceedToRefine: boolean;
  cancellationNotice: {
    label: string;
    truthfulExplanation: string;
  };
}

/**
 * Pure helper to filter out superseded parent jobs when split child jobs exist.
 * This guarantees no double-counting of entries or progress.
 */
export function resolveEffectiveJobs<T extends { id: string; splitDepth?: number; isReplaced?: boolean }>(
  jobs: T[]
): T[] {
  // Exclude explicitly replaced or parent jobs that were split
  return jobs.filter((job) => !job.isReplaced);
}

/**
 * Helper to check if a section value contains real authored/generated content,
 * rather than empty arrays or blank placeholder objects from draft creation.
 */
export function hasSectionContent(key: string, val: unknown): boolean {
  if (val === undefined || val === null) return false;
  if (Array.isArray(val)) return val.length > 0;
  if (typeof val === "object") {
    if (key === "worldPhysics") {
      const obj = val as Record<string, unknown>;
      return (Array.isArray(obj.rules) && obj.rules.length > 0) || Boolean(obj.authorityCheck) || Boolean(obj.powerCeiling);
    }
    if (key === "status") {
      const obj = val as Record<string, unknown>;
      return typeof obj.content === "string" && obj.content.trim().length > 0;
    }
    if (key === "conflict") {
      const obj = val as Record<string, unknown>;
      return typeof obj.central === "string" && obj.central.trim().length > 0;
    }
    if (key === "opening") {
      const obj = val as Record<string, unknown>;
      return typeof obj.firstMessage === "string" && obj.firstMessage.trim().length > 0;
    }
    return Object.values(val as Record<string, unknown>).some((v) => {
      if (typeof v === "string") return v.trim().length > 0;
      if (Array.isArray(v)) return v.length > 0;
      return Boolean(v);
    });
  }
  if (typeof val === "string") return val.trim().length > 0;
  return false;
}

/**
 * Pure adapter deriving the Adventure Forge Command Center view state.
 * Never fabricates progress, token counts, or fake ETAs.
 */
export function deriveAdventureForgeView(input: AdventureForgeInput): AdventureForgeViewModel {
  const streamed = input.streamedSections || {};
  const doc = input.document || null;
  const progress = input.generationActivity?.progress;
  const isForging = Boolean(input.isForging);
  const forgeError = input.forgeError || null;
  const completedSteps = progress?.completedSteps ?? 0;
  const totalSteps = progress?.totalSteps ?? 6;

  // Derive bundle status for each of the 6 canonical bundles
  let completedCount = 0;
  let totalEntries = 0;

  const bundles: ForgeBundleView[] = CANONICAL_FORGE_BUNDLES.map((def) => {
    // Check if sections belonging to this bundle have real generated content
    const hasStreamedSections = def.sectionKeys.some(
      (k) => streamed[k] !== undefined && hasSectionContent(k, streamed[k])
    );
    const hasDocSections = def.sectionKeys.some((k) => {
      if (!doc) return false;
      const val = (doc as unknown as Record<string, unknown>)[k];
      if (def.index === 1) {
        return (
          hasSectionContent("worldPhysics", doc.worldPhysics) ||
          hasSectionContent("status", doc.status) ||
          Boolean(streamed.core)
        );
      }
      return hasSectionContent(k, val);
    });
    const hasRealContent = hasStreamedSections || hasDocSections;
    const isStepMarkedDone = completedSteps >= def.index;
    const isBundleCompleted = isStepMarkedDone || (completedSteps === 0 && hasRealContent);

    // Count entries
    let bundleEntryCount = 0;
    for (const key of def.sectionKeys) {
      const val = streamed[key] ?? (doc ? (doc as unknown as Record<string, unknown>)[key] : undefined);
      if (Array.isArray(val)) {
        bundleEntryCount += val.length;
      } else if (hasSectionContent(key, val)) {
        bundleEntryCount += 1;
      }
    }

    let status: BundleStatus = "pending";
    if (isForging) {
      if (isStepMarkedDone) {
        status = "completed";
        completedCount++;
      } else if (completedSteps + 1 === def.index || (completedSteps === 0 && def.index === 1)) {
        status = "in_progress";
      } else {
        status = "pending";
      }
    } else if (forgeError || input.hasCheckpoint) {
      if (isStepMarkedDone || (completedSteps > 0 && def.index <= completedSteps)) {
        status = "completed";
        completedCount++;
      } else if (def.index === completedSteps + 1) {
        status = "interrupted";
      } else {
        status = "pending";
      }
    } else if (completedSteps > 0) {
      if (def.index <= completedSteps) {
        status = "completed";
        completedCount++;
      } else {
        status = "pending";
      }
    } else if (hasRealContent) {
      status = "completed";
      completedCount++;
    } else {
      status = "pending";
    }

    if (status === "completed" || status === "in_progress") {
      totalEntries += bundleEntryCount;
    }

    // A bundle is preserved if it is completed and stored
    const isPreserved = status === "completed";

    // Preview summary text if available
    let previewSummary: string | undefined;
    if (def.index === 1) {
      const core = streamed.core ?? doc?.core;
      if (core?.pitch) previewSummary = `“${core.pitch}”`;
    } else if (def.index === 2) {
      const locs = streamed.locations ?? doc?.locations;
      const facs = streamed.factions ?? doc?.factions;
      const parts: string[] = [];
      if (Array.isArray(locs) && locs.length > 0) parts.push(`${locs.length} Locations`);
      if (Array.isArray(facs) && facs.length > 0) parts.push(`${facs.length} Factions`);
      if (parts.length > 0) previewSummary = parts.join(" · ");
    } else if (def.index === 3) {
      const npcs = streamed.npcs ?? doc?.npcs;
      if (Array.isArray(npcs) && npcs.length > 0) previewSummary = `${npcs.length} Characters seeded`;
    } else if (def.index === 4) {
      const items = streamed.items ?? doc?.items;
      const secrets = streamed.secrets ?? doc?.secrets;
      const parts: string[] = [];
      if (Array.isArray(items) && items.length > 0) parts.push(`${items.length} Relics`);
      if (Array.isArray(secrets) && secrets.length > 0) parts.push(`${secrets.length} Secrets`);
      if (parts.length > 0) previewSummary = parts.join(" · ");
    } else if (def.index === 5) {
      const hist = streamed.history ?? doc?.history;
      const press = streamed.pressures ?? doc?.pressures;
      const parts: string[] = [];
      if (Array.isArray(hist) && hist.length > 0) parts.push(`${hist.length} Historic Events`);
      if (Array.isArray(press) && press.length > 0) parts.push(`${press.length} Clocks`);
      if (parts.length > 0) previewSummary = parts.join(" · ");
    } else if (def.index === 6) {
      const open = streamed.opening ?? doc?.opening;
      if (open?.firstLocation) previewSummary = `Opening at ${open.firstLocation}`;
    }

    return {
      ...def,
      status,
      isPreserved,
      entryCount: bundleEntryCount,
      previewSummary,
    };
  });

  // Calculate truthful word count from available text
  let wordCount = 0;
  if (doc) {
    const textPieces = [
      doc.core?.title,
      doc.core?.pitch,
      doc.core?.theRule,
      doc.core?.theCost,
      doc.core?.theSituation,
      doc.core?.thePressure,
      doc.opening?.firstMessage,
    ];
    const joined = textPieces.filter(Boolean).join(" ");
    wordCount = joined.trim().split(/\s+/).filter(Boolean).length;
  }

  // Derive active specialist telemetry
  let activeSpecialist: ActiveSpecialistTelemetry | null = null;
  if (isForging || (input.hasCheckpoint && !forgeError)) {
    const activeBundleIndex = Math.min(Math.max(completedSteps + 1, 1), 6);
    const targetBundle = CANONICAL_FORGE_BUNDLES[activeBundleIndex - 1];

    let specialistTitle = targetBundle.specialistTitle;
    let specialistRole = targetBundle.specialistRole;
    let jobProgress = `Bundle ${activeBundleIndex} of ${totalSteps}`;
    let isPreservedSpecialist = false;
    let currentActivityText = isForging
      ? `Drafting ${targetBundle.title}...`
      : `Saved through bundle ${completedSteps}. Ready to resume.`;

    if (input.specialistProgress) {
      specialistTitle = input.specialistProgress.phaseName;
      jobProgress = `Job ${input.specialistProgress.currentJob} of ${input.specialistProgress.totalJobs}`;
      isPreservedSpecialist = Boolean(input.specialistProgress.isPreserved);
      currentActivityText = isPreservedSpecialist
        ? `Reusing preserved checkpoint for ${specialistTitle}`
        : `Running specialist job ${input.specialistProgress.currentJob} for ${specialistTitle}`;
    } else if (progress?.specialistPhase) {
      specialistTitle = specialistPhaseLabel(progress.specialistPhase);
      if (progress.specialistIndex !== undefined && progress.specialistTotal !== undefined) {
        jobProgress = `Specialist ${progress.specialistIndex} of ${progress.specialistTotal}`;
      }
      isPreservedSpecialist = Boolean(progress.isPreservedSpecialist);
      currentActivityText = progress.label || `Specialist active: ${specialistTitle}`;
    } else if (progress?.label) {
      currentActivityText = progress.label;
    }

    activeSpecialist = {
      title: specialistTitle,
      role: specialistRole,
      jobProgress,
      isPreserved: isPreservedSpecialist,
      currentActivityText,
      pulseActive: isForging,
    };
  }

  // Check if forge is fully completed
  const isCompleted = !isForging && completedCount === 6 && !forgeError;

  return {
    workingTitle: input.workingTitle || "Untitled World",
    isForging,
    hasError: Boolean(forgeError),
    errorMessage: forgeError,
    isCompleted,
    hasCheckpoint: Boolean(input.hasCheckpoint),
    bundles,
    activeSpecialist,
    completedBundleCount: completedCount,
    totalBundleCount: 6,
    totalEntriesCount: totalEntries,
    wordCount,
    latestLogs: (input.buildLogs || []).slice(-20),
    canProceedToRefine: isCompleted || (Boolean(doc) && completedCount >= 1 && !isForging),
    cancellationNotice: {
      label: "Stop generation",
      truthfulExplanation: "Completed specialist jobs are already saved. The active request may need to be retried.",
    },
  };
}
