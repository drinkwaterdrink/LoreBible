import type {
  BlueprintPhysicsConstraintsV1,
  BlueprintPlanningContextV1,
  BlueprintSparkDnaV1,
} from "../../contracts/blueprint";
import type { SavedLoreBibleProjectV2 } from "../projectPersistence";
import type { DivergenceTake, PhysicsConfig, SparkParse } from "../../types";

const QUALITY_MAP = {
  Fast: "fast",
  Balanced: "balanced",
  "Deep Craft": "deep_craft",
} as const;

function copyStrings(values: string[]): string[] {
  return values.map((value) => value);
}

function pickSpark(sparkParse: SparkParse | null): BlueprintSparkDnaV1 | undefined {
  const spark = sparkParse?.sparkDNA;
  if (!spark) return undefined;

  return {
    nonNegotiables: copyStrings(spark.nonNegotiables),
    premisePromise: spark.premisePromise,
    toneEnvelope: {
      primary: spark.toneEnvelope.primary,
      descriptors: copyStrings(spark.toneEnvelope.descriptors),
    },
    genreSignals: copyStrings(spark.genreSignals),
    playerAgencyBoundaries: spark.playerAgencyBoundaries,
    openVariables: copyStrings(spark.openVariables),
    existingPressures: copyStrings(spark.existingPressures),
    assumptions: copyStrings(spark.assumptions),
    opportunitySpace: copyStrings(spark.opportunitySpace),
    userRole: spark.userRole,
    franchise: spark.franchise,
  };
}

function pickTake(take: DivergenceTake): NonNullable<BlueprintPlanningContextV1["selectedTake"]> {
  return {
    id: take.id,
    title: take.title,
    pitch: take.pitch,
    angle: take.angle,
    genres: [take.genreTone],
    tone: [take.genreTone],
    retainedNonNegotiables: copyStrings(take.retainedNonNegotiables),
  };
}

function pickPhysics(physics: PhysicsConfig): BlueprintPhysicsConstraintsV1 {
  const constraints: BlueprintPhysicsConstraintsV1 = {
    density: physics.density,
    densityTokens: physics.densityTokens,
    strangeness: physics.strangeness,
    mundanity: physics.mundanity,
    violence: physics.violence,
    romance: physics.romance,
    pacing: physics.pacing,
    explicitContent: physics.explicitContent,
    playerDeath: physics.playerDeath,
  };
  for (const [key, value] of [
    ["genre", physics.genre],
    ["subgenre", physics.subgenre],
    ["horror", physics.horror],
    ["humor", physics.humor],
    ["linguisticBase", physics.linguisticBase],
    ["mustInclude", physics.mustInclude],
    ["mustAvoid", physics.mustAvoid],
  ] as const) {
    if (typeof value === "string" && value.trim()) constraints[key] = value.trim();
  }
  return constraints;
}

export function createBlueprintPlanningContext(
  project: SavedLoreBibleProjectV2,
  source: { projectId: string; projectRevision: number },
): BlueprintPlanningContextV1 {
  const selected = project.workflow.takes.find((take) => take.id === project.workflow.selectedTakeId);
  const sparkDna = pickSpark(project.workflow.sparkParse);
  const context: BlueprintPlanningContextV1 = {
    projectId: source.projectId,
    projectRevision: source.projectRevision,
    physicsConstraints: pickPhysics(project.workflow.physics),
    generationQuality: QUALITY_MAP[project.generation.settings.quality],
  };

  if (sparkDna) context.sparkDna = sparkDna;
  if (selected) context.selectedTake = pickTake(selected);
  return context;
}
