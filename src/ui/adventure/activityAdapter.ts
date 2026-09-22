import type { GenerationProgressEvent, GenerationUsage } from "../../contracts/generationProgress";
import type { GenerationTelemetryView } from "./types";

export interface ActivitySourceInput {
  progress: GenerationProgressEvent | null;
  startedAt: number | null;
  usage?: GenerationUsage;
  status: "idle" | "active" | "cancelled" | "complete" | "error";
  outputCharacters?: number;
  onCancel?: () => void;
  modelName?: string | null;
}

export interface GenerationActivityMap {
  forge?: ActivitySourceInput | null;
  divergence?: ActivitySourceInput | null;
  anchor?: ActivitySourceInput | null;
  premise?: ActivitySourceInput | null;
}

function formatTaskName(key: string): string {
  switch (key) {
    case "forge":
      return "Forge Synthesis";
    case "divergence":
      return "Divergence Angles";
    case "anchor":
      return "Anchor Analysis";
    case "premise":
      return "Premise Sparks";
    default:
      return "Generation";
  }
}

/**
 * Pure selector that derives a truthful GenerationTelemetryView
 * from existing activity states without fabricating values or adding a parallel store.
 */
export function selectActiveGenerationTelemetry(
  activities: GenerationActivityMap,
  now: number = Date.now(),
): GenerationTelemetryView {
  const priorityKeys: (keyof GenerationActivityMap)[] = ["forge", "divergence", "anchor", "premise"];

  for (const key of priorityKeys) {
    const act = activities[key];
    if (act && act.status === "active") {
      const elapsed = act.startedAt ? Math.max(0, now - act.startedAt) : null;
      const prog = act.progress;
      const specialistPhase = prog?.specialistPhase ?? null;
      const specialistIndex = typeof prog?.specialistIndex === "number" ? prog.specialistIndex : null;
      const specialistTotal = typeof prog?.specialistTotal === "number" ? prog.specialistTotal : null;
      const outputChars = act.outputCharacters && act.outputCharacters > 0 ? act.outputCharacters : null;
      const outputTokens = act.usage?.outputTokens && act.usage.outputTokens > 0 ? act.usage.outputTokens : null;

      const phase = prog?.label || prog?.phase || "Processing";

      return {
        isGenerating: true,
        taskLabel: formatTaskName(key),
        phaseLabel: phase,
        modelName: act.modelName || null,
        elapsedMs: elapsed,
        outputCharacters: outputChars,
        outputTokens: outputTokens,
        specialistPhase,
        specialistIndex,
        specialistTotal,
        canCancel: typeof act.onCancel === "function",
        onCancel: act.onCancel,
      };
    }
  }

  return {
    isGenerating: false,
    taskLabel: "",
    phaseLabel: "",
    modelName: null,
    elapsedMs: null,
    outputCharacters: null,
    outputTokens: null,
    specialistPhase: null,
    specialistIndex: null,
    specialistTotal: null,
    canCancel: false,
  };
}
