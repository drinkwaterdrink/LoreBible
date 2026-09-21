import type { ArtifactTarget } from "../../contracts/blueprint";

/** Describes planning intent, not an unsupported promise of seven distinct compilers. */
export const ARTIFACT_TARGET_DESCRIPTIONS: Record<ArtifactTarget, string> = {
  individual_character: "A focused card for one main character, with supporting lore where useful.",
  scenario_card: "A playable situation with a clear opening, stakes, and supporting setting lore.",
  narrator_world: "A narrator-led card that portrays the world and its cast while leaving your choices open.",
  ensemble: "A shared scenario centered on several important characters and their relationships.",
  full_world: "Broad world coverage for open-ended exploration, institutions, places, and daily life.",
  full_world_package: "A long-term goal: coordinated world, cards, and lore exports from one project.",
  world_book_primary: "A lore-first build focused on organized, retrievable World Book entries.",
};
