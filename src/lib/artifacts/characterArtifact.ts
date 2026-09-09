import type { ArtifactFinding, CharacterArtifactIR, LoreManifest } from "../../contracts/artifacts";
import type { LoreBibleDocument } from "../../types";

const WORLD_DIRECTOR_CONTRACT = [
  "Portray the setting, environment, and non-player characters as an autonomous living world.",
  "Respect established canon, tone, physical rules, social rules, and character knowledge boundaries.",
  "Let NPCs maintain independent goals, relationships, schedules, disagreements, and offscreen activity.",
  "Do not make every conflict, opportunity, or relationship revolve around {{user}}.",
  "Do not assign voluntary actions, dialogue, thoughts, feelings, attraction, consent, decisions, relationships, abilities, or backstory to {{user}}.",
  "Offer concrete circumstances, pressures, consequences, and choices while leaving {{user}}'s response open.",
  "Treat secret lore as world truth, but reveal it only through plausible knowledge or discovery routes.",
  "Preserve ordinary life alongside dramatic developments and do not force romance, hostility, trust, or destiny.",
].join("\n");

const CONTINUITY_REMINDER = "Maintain established continuity and bounded NPC knowledge. Advance the world naturally while preserving {{user}} agency.";

function section(label: string, value: string | undefined | null): string {
  const clean = value?.trim();
  return clean ? `${label}: ${clean}` : "";
}

function joinSections(values: string[]): string {
  return values.filter(Boolean).join("\n\n");
}

function unique(values: Array<string | null | undefined>): string[] {
  return [...new Set(values.map((value) => value?.trim()).filter((value): value is string => Boolean(value)))];
}

export function compileCharacterArtifact(document: LoreBibleDocument, lore: LoreManifest): CharacterArtifactIR {
  const title = document.core?.title?.trim() || document.title?.trim() || "Untitled Scenario";
  const examples = document.opening?.exampleMessages?.trim() || "";
  const findings: ArtifactFinding[] = [...lore.findings];
  if (!examples) {
    findings.push({
      code: "card.examples_not_authored",
      severity: "note",
      message: "Example Messages remain empty because no authored examples exist; compilation does not fabricate dialogue.",
      artifactId: `card:${document.id}`,
    });
  }

  const description = joinSections([
    section("WORLD PREMISE", document.core?.pitch),
    section("SIMULATION SCOPE", document.core?.eraScale),
    section("DURABLE RULE", document.core?.theRule),
    section("DURABLE COST", document.core?.theCost),
  ]);
  const personality = joinSections([
    section("NARRATIVE DISPOSITION", document.core?.genreTone),
    section("ATMOSPHERE", document.opening?.style),
    "Simulate differentiated people and places with concrete sensory detail, independent motives, and consequences proportionate to established circumstances.",
  ]);
  const scenario = joinSections([
    section("STARTING SITUATION", document.core?.theSituation),
    section("PLAYER POSITION", document.user?.rolePosition),
    section("STARTING RESOURCES", document.user?.startsWith),
    section("ACTIVE PRESSURE", document.core?.thePressure || document.conflict?.central),
    section("OPPOSITION", document.conflict?.opposition),
  ]);
  const creatorNotes = joinSections([
    "Compiled by LoreBible as a narrator/world-director card.",
    section("SOURCE SPARK", document.sparkText),
    `Embedded lore is a portable subset of ${lore.name}; use the native Lumiverse World Book export for full settings fidelity.`,
    "Compilation is structurally validated only; live Lumiverse import and runtime behavior are not certified.",
  ]);
  const systemPrompt = joinSections([
    WORLD_DIRECTOR_CONTRACT,
    section("PROJECT-SPECIFIC RUNTIME INSTRUCTIONS", document.opening?.systemPrompt),
  ]);
  const postHistoryInstructions = joinSections([
    CONTINUITY_REMINDER,
    section("PROJECT-SPECIFIC REMINDER", document.opening?.postHistoryInstructions),
  ]);

  return {
    id: `card:${document.id}`,
    archetype: "narrator_world",
    fields: {
      name: title,
      description,
      personality,
      scenario,
      firstMessage: document.opening?.firstMessage?.trim() || "",
      exampleMessages: examples,
      systemPrompt,
      postHistoryInstructions,
      creatorNotes,
    },
    tags: unique(["LoreBible", "Narrator", "World", document.core?.genreTone, ...(document.parse?.registerWords ?? [])]),
    alternateGreetings: [],
    loreManifestId: lore.id,
    ownership: [
      { field: "description", sourceIds: ["core.pitch", "core.eraScale", "core.theRule", "core.theCost"], rationale: "Durable world identity and load-bearing rules." },
      { field: "personality", sourceIds: ["core.genreTone", "opening.style"], rationale: "Narration behavior and atmosphere." },
      { field: "scenario", sourceIds: ["core.theSituation", "user.rolePosition", "user.startsWith", "core.thePressure", "conflict"], rationale: "Evergreen playable starting framework." },
      { field: "firstMessage", sourceIds: ["opening.firstMessage"], rationale: "Authored playable opening." },
      { field: "exampleMessages", sourceIds: examples ? ["opening.exampleMessages"] : [], rationale: "Authored examples only." },
      { field: "systemPrompt", sourceIds: [], rationale: "Genre-neutral runtime world-director and agency contract." },
      { field: "postHistoryInstructions", sourceIds: [], rationale: "Short continuity and agency reminder." },
      { field: "creatorNotes", sourceIds: ["sparkText"], rationale: "Non-runtime provenance and evidence boundaries." },
      { field: "worldBook", sourceIds: lore.entries.map((entry) => entry.sourceId), rationale: "Conditional supporting world facts." },
    ],
    findings,
  };
}
