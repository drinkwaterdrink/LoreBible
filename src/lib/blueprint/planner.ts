import {
  BLUEPRINT_PLAN_SCHEMA, type ArtifactTarget, type BlueprintAssessment, type BlueprintDetail,
  type BlueprintGenerationQuality, type BlueprintPlanV1, type BlueprintRecommendation, type BlueprintRuntimeRole,
  type BlueprintWorldMode, type BuildIntensity, type EstimateRange, type LoreCategoryPlan,
  type MechanicPackRecommendation, type RuntimeBudget,
} from "../../contracts/blueprint";
import type { ProjectGraphV1 } from "../../contracts/projectGraph";
import { canonicalizeJson, sha256Hex } from "../projectGraph/canonicalJson";
import { collectBlueprintSignals, normalizeBlueprintText, type BlueprintPlanningInput, type BlueprintSignal } from "./signals";

const positives = (signals: BlueprintSignal[], concepts: string[]) => signals.filter(signal => signal.weight > 0 && concepts.includes(signal.concept));
const exclusions = (signals: BlueprintSignal[], concepts: string[]) => signals.filter(signal => signal.domain === "constraint" && concepts.includes(signal.concept));
const refs = (signals: BlueprintSignal[]) => [...new Set(signals.map(signal => signal.sourceRef))].sort();
const proposal = <T>(value: T, reason: string, evidence: BlueprintSignal[], defaultRef?: string): BlueprintRecommendation<T> => ({
  value, status: "proposed", reason, evidenceRefs: evidence.length ? refs(evidence) : defaultRef ? [defaultRef] : [],
});

function recommendArtifactTargets(signals: BlueprintSignal[], _graph: ProjectGraphV1): BlueprintRecommendation<ArtifactTarget>[] {
  const excluded = new Set(signals.filter(signal => signal.domain === "constraint").map(signal => signal.concept));
  const explicit = signals.filter(signal => signal.domain === "target" && signal.weight > 0);
  // Structured types provide domain breadth without interpreting names or values.
  // Related types share a domain, so faction + organization are not two votes.
  const entityDomains: Record<string, string> = { characters: "social", locations: "setting", factions: "political", organizations: "political", systems: "system", items: "objects", culture: "culture", species: "species", events: "temporal" };
  const contentDomain = (signal: BlueprintSignal) => signal.domain === "entity" ? entityDomains[signal.concept] : signal.domain;
  const breadthEvidence = signals.filter(signal => signal.weight > 0 && ["social", "ordinary_life", "setting", "political", "speculative", "system", "information", "conflict", "objects", "culture", "species", "temporal"].includes(contentDomain(signal)));
  const contentDomains = new Set(breadthEvidence.map(contentDomain));
  const broadScope = positives(signals, ["wide"]).length > 0 && contentDomains.size >= 3;
  // A package already includes its world; overlapping phrases must not add a duplicate target.
  const targets = [...new Set(explicit.map(signal => signal.concept as ArtifactTarget))]
    .filter(target => target !== "full_world" || !explicit.some(signal => signal.concept === "full_world_package"))
    .filter(target => !["full_world", "full_world_package"].includes(target) || broadScope);
  if (targets.length) return targets.map(target => {
    const targetEvidence = explicit.filter(signal => signal.concept === target);
    const fullWorld = target === "full_world" || target === "full_world_package";
    return proposal(target, fullWorld ? "Explicit target intent, wide scope, and multiple content domains support this target." : "An explicit artifact concept supports this target.", fullWorld ? [...targetEvidence, ...positives(signals, ["wide"]), ...breadthEvidence] : targetEvidence);
  });
  const world = positives(signals, ["sandbox", "autonomy"]);
  if (world.length && !excluded.has("narrator_world")) return [proposal("narrator_world", "Explicit open-world or independent activity supports a narrator world proposal.", world)];
  const ensemble = positives(signals, ["cast_roster", "family", "team"]);
  if (ensemble.length && !excluded.has("ensemble")) return [proposal("ensemble", "The existing cast supports an ensemble proposal.", ensemble)];
  if (excluded.has("scenario_card")) return [];
  return [proposal("scenario_card", "A scenario card is the smallest provisional starting target.", [], "policy:default:scenario_card")];
}

function recommendWorldMode(signals: BlueprintSignal[]): BlueprintRecommendation<BlueprintWorldMode> {
  const arc = positives(signals, ["arc"]); const sandbox = positives(signals, ["sandbox", "autonomy"]);
  if (arc.length && sandbox.length) return proposal("hybrid", "Both directed progression and open activity are evidenced.", [...arc, ...sandbox]);
  if (sandbox.length) return proposal("sandbox", "Open activity or independent world activity is evidenced.", sandbox);
  if (arc.length) return proposal("arc", "A bounded progression concept is evidenced.", arc);
  return proposal("arc", "A bounded arc is a provisional default pending scope evidence.", [], "policy:default:arc");
}

function recommendIntensity(signals: BlueprintSignal[]): BlueprintRecommendation<BuildIntensity> {
  const explicit = signals.filter(signal => signal.domain === "intensity" && signal.weight > 0);
  if (explicit.length) return proposal(explicit[0].concept === "rich" ? "rich" : "lean", "The supplied density selects category depth and inventory ranges.", explicit);
  const wide = positives(signals, ["wide"]);
  if (wide.length) return proposal("rich", "Broad scope supports larger category inventories.", wide);
  return proposal("lean", "Start with a compact inventory supported by available evidence.", [], "policy:default:lean");
}

interface CategoryProfile {
  id: string; label: string; concepts: string[]; purpose: string; role: BlueprintRuntimeRole; diagnostic?: boolean;
}
const CATEGORY_PROFILES: CategoryProfile[] = [
  { id: "principal_cast", label: "Principal Cast", concepts: ["characters", "family", "team", "romance", "relationships"], purpose: "Define the principal NPC cast while reserving player authorship.", role: "evergreen" },
  { id: "roster_cast", label: "Roster Cast", concepts: ["cast_roster", "family", "team"], purpose: "Support the evidenced wider NPC cast with concise roster entries.", role: "reference" },
  { id: "locations", label: "Locations", concepts: ["locations"], purpose: "Anchor the evidenced places.", role: "reference" },
  { id: "relationships", label: "Relationships", concepts: ["family", "relationships", "romance"], purpose: "Describe NPC social dynamics while reserving player choices.", role: "mixed" },
  { id: "ordinary_life", label: "Ordinary Life", concepts: ["daily_life"], purpose: "Support routines and everyday activity.", role: "ambient" },
  { id: "organizations", label: "Organizations", concepts: ["organizations"], purpose: "Describe evidenced organized groups.", role: "reference" },
  { id: "technology", label: "Technology", concepts: ["technology"], purpose: "Clarify evidenced technological capabilities and limits.", role: "reference" },
  { id: "systems", label: "Systems", concepts: ["systems"], purpose: "Describe explicitly typed systems without assuming their domain.", role: "reference" },
  { id: "economy", label: "Economy", concepts: ["economy"], purpose: "Describe evidenced exchange and economic activity.", role: "reference" },
  { id: "law", label: "Law", concepts: ["law"], purpose: "Describe evidenced legal constraints.", role: "reference" },
  { id: "religion", label: "Religion", concepts: ["religion"], purpose: "Describe evidenced beliefs and practices.", role: "reference" },
  { id: "education", label: "Education", concepts: ["education"], purpose: "Describe evidenced learning structures.", role: "reference" },
  { id: "resources", label: "Resources", concepts: ["resources"], purpose: "Describe evidenced resources and their limits.", role: "reference" },
  { id: "temporal_context", label: "Temporal Context", concepts: ["schedules"], purpose: "Organize evidenced calendars and schedules.", role: "reference" },
  { id: "opportunities", label: "Roleplay Opportunities", concepts: ["exploration"], purpose: "Plan opportunities for evidenced exploration without authoring events.", role: "dynamic" },
  { id: "items", label: "Items", concepts: ["items"], purpose: "Describe evidenced objects and their use.", role: "reference" },
  { id: "culture", label: "Culture", concepts: ["culture"], purpose: "Describe evidenced customs and practices.", role: "evergreen" },
  { id: "species", label: "Species", concepts: ["species"], purpose: "Describe evidenced species.", role: "reference" },
  { id: "events", label: "Events", concepts: ["events"], purpose: "Organize evidenced event context.", role: "reference" },
  { id: "investigation", label: "Investigation", concepts: ["investigation"], purpose: "Structure the evidenced investigation and clue boundaries.", role: "mixed" },
  { id: "factions", label: "Factions", concepts: ["factions"], purpose: "Describe evidenced collective interests and conflicts.", role: "mixed", diagnostic: true },
  { id: "magic_system", label: "Magic System", concepts: ["magic"], purpose: "Define evidenced magical capabilities and limits.", role: "reference", diagnostic: true },
  { id: "secrets", label: "Secrets", concepts: ["secrets"], purpose: "Plan explicitly requested hidden information without exposing facts.", role: "secret", diagnostic: true },
  { id: "combat", label: "Combat", concepts: ["combat"], purpose: "Define evidenced conflict procedures and limits.", role: "reference", diagnostic: true },
];

const RANGE_PROFILES = {
  compact_light: { min: 1, ideal: 1, max: 2 },
  compact_standard: { min: 1, ideal: 2, max: 4 },
  compact_rich: { min: 2, ideal: 3, max: 6 },
  expanded_standard: { min: 2, ideal: 4, max: 6 },
  expanded_rich: { min: 3, ideal: 6, max: 9 },
  wide_standard: { min: 3, ideal: 6, max: 10 },
  wide_rich: { min: 4, ideal: 8, max: 12 },
} satisfies Record<string, EstimateRange>;

function categoryRange(strength: number, intensity: BuildIntensity, wide: boolean): { detail: BlueprintDetail; targetRange: EstimateRange } {
  const detail = strength >= 3 ? "rich" : strength >= 2 ? "standard" : "light";
  const key = wide ? (detail === "rich" ? "wide_rich" : "wide_standard")
    : intensity !== "lean" ? (detail === "rich" ? "expanded_rich" : "expanded_standard")
      : detail === "rich" ? "compact_rich" : detail === "standard" ? "compact_standard" : "compact_light";
  return { detail, targetRange: { ...RANGE_PROFILES[key] } };
}

function buildLoreMatrix(signals: BlueprintSignal[], _graph: ProjectGraphV1): LoreCategoryPlan[] {
  const intensity = recommendIntensity(signals).value;
  const wide = positives(signals, ["wide"]).length > 0 && intensity !== "lean";
  return CATEGORY_PROFILES.flatMap(profile => {
    const evidence = positives(signals, profile.concepts);
    // A category's own excluded concept vetoes alternate supporting concepts.
    // Multi-concept cast support is not itself a relationship recommendation.
    const constraints = exclusions(signals, [profile.id, ...(profile.concepts.length === 1 ? profile.concepts : [])]);
    if (!evidence.length && !profile.diagnostic && !constraints.length) return [];
    const supported = evidence.length > 0 && constraints.length === 0;
    return [{
      id: profile.id, label: profile.label, purpose: profile.purpose,
      justification: supported ? "Curated concepts or graph structure support this category." : constraints.length ? "An explicit constraint excludes this category." : "No qualifying evidence supports this category.",
      status: supported ? "recommended" as const : "omitted" as const,
      ...(supported ? categoryRange(evidence.reduce((total, signal) => total + signal.weight, 0), intensity, wide) : { detail: "light" as const }),
      likelyRuntimeRole: profile.role,
      candidateArchitectures: supported ? [proposal(profile.id === "secrets" ? "disabled_secret_reference" : "focused_reference_entries", "Keep each entry focused on one supported subject.", evidence)] : [],
      userLocked: false as const, evidenceRefs: refs(supported ? evidence : constraints),
    }];
  });
}

function recommendMechanicPacks(signals: BlueprintSignal[], mode: BlueprintWorldMode): MechanicPackRecommendation[] {
  const profiles = [
    { id: "social_ecosystem", label: "Social Ecosystem", concepts: ["family", "relationships", "romance"], excludedBy: ["relationships"], reason: "Evidenced social dynamics support NPC relationship tracking with player agency reserved." },
    { id: "procedural_ambience", label: "Procedural Ambience", concepts: ["daily_life"], reason: "Evidenced routines support everyday activity." },
    { id: "rumor_belief_truth", label: "Rumor / Belief / Truth", concepts: ["knowledge", "secrets"], reason: "Information structure supports tracking what NPCs know without exposing hidden values." },
    { id: "faction_politics", label: "Faction Politics", concepts: ["factions"], reason: "Evidenced collective interests support faction activity." },
    { id: "living_world", label: "Living World", concepts: ["autonomy"], reason: "Explicit independent activity supports offscreen NPC agendas." },
    { id: "mystery_architecture", label: "Mystery Architecture", concepts: ["investigation"], reason: "Explicit investigation supports clue and revelation planning." },
    { id: "exploration", label: "Exploration", concepts: ["exploration", "sandbox"], excludedBy: ["exploration"], reason: "Explicit exploration supports discovery planning." },
    { id: "arc_state", label: "Arc State", concepts: ["arc"], reason: "Explicit directed progression supports tracking arc state." },
    { id: "calendar_schedules", label: "Calendar & Schedules", concepts: ["schedules"], reason: "Explicit time structures support schedule planning." },
  ];
  return profiles.flatMap<MechanicPackRecommendation>(profile => {
    const evidence = positives(signals, profile.concepts);
    const constraints = exclusions(signals, [profile.id, ...(profile.excludedBy ?? profile.concepts)]);
    if (constraints.length) return [{ id: profile.id, label: profile.label, status: "ineligible" as const, reason: "An explicit constraint excludes this mechanic, including inferred support.", evidenceRefs: refs(constraints) }];
    if (!evidence.length) return [];
    return [{ id: profile.id, label: profile.label, status: profile.id === "living_world" && mode === "arc" ? "optional" as const : "recommended" as const, reason: profile.reason, evidenceRefs: refs(evidence) }];
  });
}

function assessCoverage(signals: BlueprintSignal[], mode: BlueprintWorldMode): BlueprintPlanV1["assessments"] {
  const meaningful = signals.some(signal => signal.weight > 0 && !["runtime", "intensity"].includes(signal.domain));
  const assess = (concepts: string[], gap: string, notApplicable = false): BlueprintAssessment => {
    const evidence = positives(signals, concepts);
    if (evidence.length) return { status: "supported", evidenceRefs: refs(evidence), gaps: [], explanation: "Qualifying concepts provide planning evidence; generated coverage is not yet verified." };
    return { status: !meaningful ? "unknown" : notApplicable ? "not_applicable" : "thin", evidenceRefs: [], gaps: !meaningful || !notApplicable ? [gap] : [], explanation: !meaningful ? "Insufficient evidence to assess this dimension." : notApplicable ? "This dimension is not required by the evidenced bounded scope." : "The supplied concepts do not yet establish this dimension." };
  };
  return {
    ordinaryLife: assess(["daily_life"], "Everyday routines are not evidenced."),
    worldAutonomy: assess(["autonomy", "factions", "organizations"], "Independent activity is not evidenced.", mode === "arc" && positives(signals, ["focused"]).length > 0),
  };
}

function estimateInventory(categories: LoreCategoryPlan[], targets: ArtifactTarget[], quality: BlueprintGenerationQuality): BlueprintPlanV1["inventory"] {
  const nodes = categories.reduce((range, category) => {
    if (category.status === "omitted" || !category.targetRange) return range;
    return { min: range.min + category.targetRange.min, ideal: range.ideal + category.targetRange.ideal, max: range.max + category.targetRange.max };
  }, { min: 0, ideal: 0, max: 0 });
  const passes = { fast: 1, balanced: 2, deep_craft: 3, production: 4 }[quality];
  // Estimates only: quality changes review passes, never lore breadth or runtime.
  const modelCalls = {
    min: (Math.ceil(nodes.min / 6) + targets.length) * passes,
    ideal: (Math.ceil(nodes.ideal / 4) + targets.length) * passes,
    max: (Math.ceil(nodes.max / 2) + targets.length) * passes,
  };
  return { nodes, modelCalls, artifacts: [...targets] };
}

export function createBlueprintPlan(input: BlueprintPlanningInput, options: { createdAt: string }): BlueprintPlanV1 {
  const { context, graph } = input;
  const signals = collectBlueprintSignals(input);
  const quality = context.generationQuality ?? "balanced";
  const artifactTargets = recommendArtifactTargets(signals, graph);
  const worldMode = recommendWorldMode(signals);
  const categories = buildLoreMatrix(signals, graph);
  const runtimeSignals = signals.filter(signal => signal.domain === "runtime" && signal.weight > 0);
  const runtimeValues = new Set(runtimeSignals.map(signal => signal.concept));
  const runtime: RuntimeBudget = runtimeValues.size === 1 ? runtimeSignals[0].concept as RuntimeBudget : "balanced";
  const assessments = assessCoverage(signals, worldMode.value);
  const findings: BlueprintPlanV1["findings"] = [];
  if (worldMode.value !== "arc") {
    for (const [key, code] of [["ordinaryLife", "ordinary_life"], ["worldAutonomy", "world_autonomy"]] as const) {
      if (assessments[key].status === "thin") findings.push({ id: `finding:${code}_thin`, severity: "minor", code: `blueprint.${code}_thin`, message: assessments[key].gaps.join(" "), evidenceRefs: worldMode.evidenceRefs });
    }
  }
  if (!artifactTargets.length) findings.push({ id: "finding:no_eligible_target", severity: "blocker", code: "blueprint.no_eligible_target", message: "Available evidence and exclusions leave no eligible artifact target.", evidenceRefs: refs(signals.filter(signal => signal.domain === "constraint")) });
  if (!signals.some(signal => signal.weight > 0 && !["runtime", "intensity"].includes(signal.domain))) {
    findings.push({ id: "finding:insufficient_evidence", severity: "info", code: "blueprint.insufficient_evidence", message: "Insufficient premise evidence; the lean scenario proposal remains provisional.", evidenceRefs: [] });
  }
  if (runtimeValues.size > 1) findings.push({ id: "finding:runtime_conflict", severity: "minor", code: "blueprint.runtime_conflict", message: "Conflicting runtime requests leave the runtime budget balanced.", evidenceRefs: refs(runtimeSignals) });
  const constraints = signals.filter(signal => signal.domain === "constraint" && !signal.sourceRef.includes("agency") && !signal.sourceRef.includes("spark"));
  if (constraints.length) findings.push({ id: "finding:constraints_applied", severity: "info", code: "blueprint.constraints_applied", message: "Explicit exclusions were applied before positive evidence collection.", evidenceRefs: refs(constraints) });
  return {
    schema: BLUEPRINT_PLAN_SCHEMA,
    source: {
      projectId: context.projectId, projectRevision: context.projectRevision, plannerVersion: "1",
      // Fingerprint the planning projection, never the graph object or fact values.
      inputSha256: sha256Hex(canonicalizeJson({ projectId: context.projectId, projectRevision: context.projectRevision, authored: normalizeAuthoredInput({ sparkDna: context.sparkDna, selectedTake: context.selectedTake, physicsConstraints: context.physicsConstraints }), quality, signals })),
    },
    interfaceMode: "smart_auto", artifactTargets, worldMode, buildIntensity: recommendIntensity(signals),
    generationQuality: proposal(quality, context.generationQuality ? "Use the explicitly supplied generation quality for call estimates." : "Balanced generation quality is the provisional default.", [], context.generationQuality ? "context:generationQuality" : "policy:default:generationQuality"),
    runtimeBudget: proposal(runtime, runtimeSignals.length ? "Explicit runtime requests determine the runtime budget; conflicting requests retain balanced." : "No explicit runtime request is evidenced; retain balanced.", runtimeSignals, "policy:default:runtimeBudget"),
    categories, mechanicPacks: recommendMechanicPacks(signals, worldMode.value), assessments,
    inventory: estimateInventory(categories, artifactTargets.map(item => item.value), quality), findings, createdAt: options.createdAt,
  };
}

// Called only on the explicitly selected authored fields, never on graph records.
function normalizeAuthoredInput(value: unknown): unknown {
  if (typeof value === "string") return normalizeBlueprintText(value);
  if (Array.isArray(value)) return value.map(normalizeAuthoredInput);
  if (value && typeof value === "object") return Object.fromEntries(Object.entries(value).map(([key, child]) => [key, normalizeAuthoredInput(child)]));
  return value;
}
