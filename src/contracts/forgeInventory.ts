import type { BlueprintCategoryStatus, BlueprintDetail } from "./blueprint";

/** Browser-safe, accepted Blueprint inventory; labels are display text, never identity. */
export type ForgeInventoryDestination = "rules" | "locations" | "factions" | "npcs" | "relationshipWeb" | "knowledgeMap" | "items" | "secrets" | "history" | "pressures" | "additionalLore";

export interface ForgeInventoryCategory {
  categoryId: string;
  categoryLabel: string;
  destination: ForgeInventoryDestination;
  castTier?: "principal" | "roster";
  purpose: string;
  status: BlueprintCategoryStatus;
  min: number;
  target: number;
  max: number;
  detail: BlueprintDetail;
  userLocked: boolean;
}

export interface ForgeAllocatedInventoryCategory extends ForgeInventoryCategory {
  completed: number;
  pending: number;
}

export interface ForgeInventoryAllocation {
  categories: ForgeAllocatedInventoryCategory[];
  totalTarget: number;
  totalCompleted: number;
  totalPending: number;
  /** Planning estimate only, never an exact output quota or runtime activation budget. */
  estimatedLibraryTokens: number;
}

export type ForgeInventoryIssueCode =
  | "invalid_category_range"
  | "duplicate_category_id"
  | "overlapping_category_destination"
  | "category_minima_exceed_total_max"
  | "category_maxima_below_total_min"
  | "completed_exceeds_category_max"
  | "completed_in_omitted_category"
  | "completed_unplanned_category"
  | "completed_exceeds_total_max";

export type ForgeInventoryAllocationResult =
  | { ok: true; value: ForgeInventoryAllocation }
  | { ok: false; issues: Array<{ code: ForgeInventoryIssueCode; categoryId?: string; actual: number; limit: number }> };
