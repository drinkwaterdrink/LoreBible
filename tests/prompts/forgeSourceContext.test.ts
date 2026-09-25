import { expect, test } from "bun:test";
import { buildForgeSourceContext } from "../../src/lib/prompts/forgeSourceContext";

test("Forge source context preserves canon, project constraints, and established sections", () => {
  const context = buildForgeSourceContext({
    sparkText: "A city academy with six houses.",
    parse: { nonNegotiables: ["six houses"], registerWords: ["whimsical"], userRole: "new student" },
    canon: { enabled: true, franchiseName: "Example World", fidelity: "Strict" },
    chosenTake: { title: "The Sixth Bell", pitch: "A hidden academy contest.", angle: "social mystery", whatsStrange: "The bells remember.", genreTone: "whimsical suspense" },
    physics: { density: "Rich", strangeness: 4, mundanity: 3, violence: "Moderate", horror: "Psych", romance: "Subplot", pacing: "Measured", linguisticBase: "omit in canon", mustInclude: "ordinary student life", mustAvoid: "chosen-one certainty" },
    existingDoc: { core: { title: "Established title", theRule: "Rules cost favors", theCost: "Trust", theSituation: "Term begins", thePressure: "The sixth bell" }, user: { rolePosition: "Scholarship entrant", startsWith: "A sealed letter" }, worldPhysics: { authorityCheck: "Faculty seals", powerCeiling: "City scale" }, locations: [{ id: "loc-1", fields: { name: "North Hall" } }], factions: [{ id: "fac-1", fields: { name: "House Glass" } }], npcs: [{ id: "npc-1", fields: { name: "Mara", role: "roommate" } }] },
  });

  expect(context).toContain('NON-NEGOTIABLE PREMISE: "A city academy with six houses."');
  expect(context).toContain("Franchise: Example World");
  expect(context).toContain("Author Must-Include");
  expect(context).not.toContain("Linguistic Base");
  expect(context).toContain("Established Locations: North Hall");
  expect(context).toContain("Established Factions: House Glass");
  expect(context).toContain("Established NPCs: Mara (roommate)");
});
