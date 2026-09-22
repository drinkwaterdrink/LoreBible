/**
 * LoreBible — Adventure Journal UI/UX Overhaul Types
 */

export type NavDestination = "home" | "write" | "world" | "build" | "timeline" | "library";

export type UiMode = "adventure_journal" | "classic";

export type LegacyStageId = 1 | 2 | 3 | 4 | 5;

export type JourneyStageStatus = "completed" | "current" | "available" | "locked";

export interface JourneyStageItem {
  id: LegacyStageId;
  name: string;
  subtitle: string;
  status: JourneyStageStatus;
}

export interface GenerationTelemetryView {
  isGenerating: boolean;
  taskLabel: string;
  phaseLabel: string;
  modelName: string | null;
  elapsedMs: number | null;
  outputCharacters: number | null;
  outputTokens: number | null;
  specialistPhase: string | null;
  specialistIndex: number | null;
  specialistTotal: number | null;
  canCancel: boolean;
  onCancel?: () => void;
}
