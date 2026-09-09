import { expect, test } from "bun:test";
import { compileCharacterArtifact } from "../../src/lib/artifacts/characterArtifact";
import { compileLoreManifest } from "../../src/lib/artifacts/loreManifest";
import type { LoreBibleDocument } from "../../src/types";

const documentFixture = {
  id: "project-card-fixture",
  title: "Fixture World",
  sparkText: "A small world keeps moving without the player.",
  core: {
    title: "Fixture World",
    pitch: "A living neighborhood with independent residents.",
    genreTone: "Warm social realism",
    eraScale: "Contemporary neighborhood",
    theRule: "Promises carry social weight.",
    theCost: "Broken trust closes doors.",
    theSituation: "A long summer has just begun.",
    thePressure: "Old obligations overlap.",
    theQuestion: "Where will the summer lead?",
  },
  user: { rolePosition: "{{user}} is a newly arrived guest.", startsWith: "A suitcase and an invitation." },
  conflict: { central: "Residents want incompatible things.", opposition: "Competing obligations.", stakesBad: "Relationships fracture.", stakesAcceptable: "A workable balance.", clock: "", moralKnot: "", theYield: "", speedBumps: [] },
  physics: { density: "Rich" },
  status: { content: "CURRENT_SENTINEL" },
  opening: { firstMessage: "The screen door opens onto a noisy kitchen.", systemPrompt: "Legacy prompt should not replace the world-director contract.", postHistoryInstructions: "Legacy reminder." },
  worldPhysics: { rules: [] }, locations: [], factions: [], npcs: [], relationshipWeb: [], knowledgeMap: [], items: [], history: [], pressures: [],
  secrets: [{ id: "secret-1", fields: { truth: "SECRET_SENTINEL" }, keys: ["locked drawer"], permanence: "C", locked: false, disabledUntilEarned: true }],
} as unknown as LoreBibleDocument;

test("allocates narrator fields without duplicating conditional lore", () => {
  const artifact = compileCharacterArtifact(documentFixture, compileLoreManifest(documentFixture));

  expect(artifact.archetype).toBe("narrator_world");
  expect(artifact.fields.description).toContain(documentFixture.core.pitch);
  expect(artifact.fields.personality).toContain(documentFixture.core.genreTone);
  expect(artifact.fields.scenario).toContain(documentFixture.user.rolePosition);
  expect(artifact.fields.firstMessage).toBe(documentFixture.opening.firstMessage);
  expect(artifact.fields.systemPrompt).toContain("Do not assign voluntary actions, dialogue, thoughts, feelings, attraction, consent, decisions, relationships, abilities, or backstory to {{user}}.");
  expect(artifact.fields.description).not.toContain("SECRET_SENTINEL");
  expect(artifact.fields.systemPrompt).toContain("Legacy prompt should not replace the world-director contract.");
});

test("leaves example messages empty rather than fabricating dialogue", () => {
  const artifact = compileCharacterArtifact(documentFixture, compileLoreManifest(documentFixture));
  expect(artifact.fields.exampleMessages).toBe("");
  expect(artifact.findings.some((finding) => finding.code === "card.examples_not_authored")).toBe(true);
});
