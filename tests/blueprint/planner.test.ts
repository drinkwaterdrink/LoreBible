import { expect, test } from "bun:test";
import { parseBlueprintPlan } from "../../src/contracts/blueprint";
import { createBlueprintPlan } from "../../src/lib/blueprint/planner";
import { collectBlueprintSignals } from "../../src/lib/blueprint/signals";
import { blankPremise, cozyBakery, familyVisit, focusedRomance, mustAvoidMagic, premiseInput, scienceFictionCity, warTornKingdom } from "../fixtures/blueprintPremises";

const options = { createdAt: "2026-09-10T12:00:00.000Z" };
const plan = (input: ReturnType<typeof premiseInput>) => createBlueprintPlan(input, options);
const category = (input: ReturnType<typeof premiseInput>, id: string) => plan(input).categories.find(item => item.id === id)!;

test("cozy bakery omits unsupported faction, magic, secret, and combat structures", () => {
  for (const id of ["factions", "magic_system", "secrets", "combat"]) expect(category(cozyBakery(), id).status).toBe("omitted");
  expect(category(cozyBakery(), "ordinary_life").status).toBe("recommended");
});

test("family visits support rich relationships and a social ecosystem", () => {
  expect(category(familyVisit(), "relationships").detail).toBe("rich");
  expect(plan(familyVisit()).mechanicPacks.find(item => item.id === "social_ecosystem")?.status).toBe("recommended");
});

test("focused romance stays small even at production quality", () => {
  expect(plan(focusedRomance()).inventory.nodes.max).toBeLessThanOrEqual(24);
  const input = focusedRomance(); input.context.generationQuality = "production";
  expect(plan(input).inventory.nodes.max).toBeLessThanOrEqual(24);
});

test("war and science fiction receive their supported categories without genre spillover", () => {
  expect(category(warTornKingdom(), "factions").status).toBe("recommended");
  expect(category(warTornKingdom(), "combat").status).toBe("recommended");
  expect(category(scienceFictionCity(), "technology").status).toBe("recommended");
  expect(category(scienceFictionCity(), "magic_system").status).toBe("omitted");
});

test("blank input proposes only a lean scenario with unknown coverage and insufficient evidence", () => {
  const output = plan(blankPremise());
  expect(output.buildIntensity.value).toBe("lean");
  expect(output.artifactTargets.map(item => item.value)).toEqual(["scenario_card"]);
  expect(output.categories.map(item => item.id)).toEqual(["factions", "magic_system", "secrets", "combat"]);
  expect(output.categories.every(item => item.status === "omitted")).toBe(true);
  expect(output.mechanicPacks).toEqual([]);
  expect(output.assessments.ordinaryLife.status).toBe("unknown");
  expect(output.assessments.worldAutonomy.status).toBe("unknown");
  expect(output.findings.some(item => item.code === "blueprint.insufficient_evidence")).toBe(true);
});

test("mustAvoid suppresses synonym signals from every source and supplies constraint evidence", () => {
  const input = mustAvoidMagic();
  input.context.selectedTake = { id: "take:1", title: "Wizard", pitch: "Sorcery", angle: "Spellcasting", genres: ["magic"], tone: [], retainedNonNegotiables: [] };
  input.context.graphFacts = [{ id: "fact:magic", predicate: "magic system", value: "Hidden value", status: "canon", origin: "user", visibility: "public", temporalClass: "evergreen" }];
  expect(category(input, "magic_system")).toMatchObject({ status: "omitted", evidenceRefs: ["constraint:mustAvoid:magic"] });
  const signals = collectBlueprintSignals(input);
  expect(signals.filter(item => item.concept === "magic" && item.weight > 0)).toEqual([]);
  expect(signals.some(item => item.sourceRef === "constraint:mustAvoid:magic")).toBe(true);
});

test("curated whole-concept matches cannot be triggered by substrings or non-Latin word fragments", () => {
  const input = premiseInput("Armiesque factionalism magicality secretariat technologyish émagic 魔法magic.");
  expect(plan(input).categories.every(item => item.status === "omitted")).toBe(true);
  const normalized = premiseInput("ＳＣＩＥＮＣＥ   FICTION\nCITY");
  expect(category(normalized, "technology").status).toBe("recommended");
});

test("duplicated legacy genreTone concepts cannot increase selected take evidence weight", () => {
  const input = blankPremise();
  input.context.selectedTake = { id: "take:1", title: "", pitch: "", angle: "", genres: ["  Cozy   Romance "], tone: [], retainedNonNegotiables: [] };
  const before = collectBlueprintSignals(input);
  input.context.selectedTake.tone = ["cozy romance", "COZY ROMANCE", "romance"];
  expect(collectBlueprintSignals(input)).toEqual(before);
  expect(plan(input).categories).toEqual(plan({ ...input, context: { ...input.context, selectedTake: { ...input.context.selectedTake, tone: [] } } }).categories);
});

test("all fixture plans satisfy contracts and positive category/pack recommendations cite evidence", () => {
  for (const fixture of [cozyBakery, familyVisit, focusedRomance, warTornKingdom, scienceFictionCity, blankPremise, mustAvoidMagic]) {
    const input = fixture(); const output = plan(input);
    expect(parseBlueprintPlan(output)).toMatchObject({ ok: true });
    const knownRefs = new Set(collectBlueprintSignals(input).map(item => item.sourceRef));
    for (const item of [...output.categories.filter(item => item.status === "recommended" || item.status === "required"), ...output.mechanicPacks.filter(item => item.status === "recommended")]) {
      expect(item.evidenceRefs.length).toBeGreaterThan(0);
      expect(item.evidenceRefs.every(ref => knownRefs.has(ref))).toBe(true);
    }
  }
});

test("private, secret, current, and rejected facts never influence recommendations or expose values", () => {
  const input = blankPremise(); const before = plan(input);
  for (const [index, flags] of [{ visibility: "private" }, { visibility: "secret" }, { visibility: "limited" }, { temporalClass: "current" }, { status: "deprecated" }, { status: "conflicted" }].entries()) {
    input.graph.canon.push({ id: `fact:${index}`, subjectId: "entity:1", predicate: "magic factions combat", value: `PRIVATE-VALUE-${index}`, status: "canon", origin: "user", confidence: 1, visibility: "public", temporalClass: "evergreen", sourceEvidenceIds: [], ...flags } as typeof input.graph.canon[number]);
  }
  expect(plan(input)).toEqual(before);
  expect(JSON.stringify(collectBlueprintSignals(input))).not.toContain("PRIVATE-VALUE");
});

test("public fact predicates and entity types contribute without reading fact values or entity names", () => {
  const input = blankPremise();
  input.graph.canon.push({ id: "fact:1", subjectId: "entity:1", predicate: "technology", get value() { throw new Error("Do not read values"); }, status: "canon", origin: "user", confidence: 1, visibility: "public", temporalClass: "evergreen", sourceEvidenceIds: [] });
  input.graph.entities.push({ id: "entity:1", type: "faction", name: "RAW-NAME-magic", aliases: [], importance: "major", lifecycle: "active", factIds: [], relationshipIds: [], sourceEvidenceIds: [] });
  expect(category(input, "technology").status).toBe("recommended");
  expect(category(input, "factions").status).toBe("recommended");
  expect(category(input, "magic_system").status).toBe("omitted");
  expect(JSON.stringify(plan(input))).not.toContain("RAW-NAME");
});

test("extensions are never accessed and deterministic plans do not mutate inputs", () => {
  const input = familyVisit(); const before = structuredClone(input);
  const expected = plan(input);
  expect(input).toEqual(before);
  Object.defineProperty(input.graph, "extensions", { get() { throw new Error("Forbidden extensions access"); } });
  expect(plan(input)).toEqual(expected);
  expect(plan(input)).toEqual(plan(input));
});

test("quality changes only generation recommendation, fingerprint, and model call estimates", () => {
  const input = familyVisit(); input.context.generationQuality = "fast";
  const fast = plan(input); input.context.generationQuality = "production"; const production = plan(input);
  expect(production.inventory.modelCalls.ideal).toBeGreaterThan(fast.inventory.modelCalls.ideal);
  const stable = ({ source, generationQuality, inventory, ...rest }: ReturnType<typeof plan>) => ({ ...rest, inventory: { nodes: inventory.nodes, artifacts: inventory.artifacts } });
  expect(stable(fast)).toEqual(stable(production));
});

test("density affects category ranges without changing runtime, targets, mode, or quality", () => {
  const input = familyVisit(); input.context.physicsConstraints = { density: "Quick" }; const lean = plan(input);
  input.context.physicsConstraints.density = "Rich"; const rich = plan(input);
  expect(rich.inventory.nodes.ideal).toBeGreaterThan(lean.inventory.nodes.ideal);
  for (const key of ["runtimeBudget", "artifactTargets", "worldMode", "generationQuality", "mechanicPacks"] as const) expect(rich[key]).toEqual(lean[key]);
});

test("runtime defaults balanced for large worlds and responds only to explicit runtime requests", () => {
  const input = premiseInput("A full world package spanning a kingdom with factions.");
  expect(plan(input).runtimeBudget.value).toBe("balanced");
  input.context.physicsConstraints = { mustInclude: "efficient runtime" };
  expect(plan(input).runtimeBudget.value).toBe("efficient");
  input.context.physicsConstraints.mustInclude = "expansive runtime";
  expect(plan(input).runtimeBudget.value).toBe("expansive");
});

test("canonical agency prevents player-control concepts without excluding NPC relationships", () => {
  const input = familyVisit(); input.context.sparkDna!.nonNegotiables = ["force player decisions", "control player feelings"];
  expect(collectBlueprintSignals(input).some(item => item.concept === "player_control" && item.weight > 0)).toBe(false);
  expect(collectBlueprintSignals(input).some(item => item.domain === "constraint" && item.concept === "player_control")).toBe(true);
  expect(category(input, "relationships").status).toBe("recommended");
});

test("relationship and knowledge counts support social and information mechanics without invented secrets", () => {
  const input = blankPremise(); input.context.relationshipCount = 4; input.context.knowledgeClaimCount = 3;
  expect(category(input, "relationships").status).toBe("recommended");
  expect(category(input, "secrets").status).toBe("omitted");
  expect(plan(input).mechanicPacks.find(item => item.id === "rumor_belief_truth")?.status).toBe("recommended");
});

test("explicit mode and artifact cues adapt recommendations without using density as scope", () => {
  expect(plan(premiseInput("A narrator world for open exploration.")).artifactTargets[0].value).toBe("narrator_world");
  expect(plan(premiseInput("An individual character for a story arc.")).worldMode.value).toBe("arc");
  expect(plan(premiseInput("A sandbox with a story arc.")).worldMode.value).toBe("hybrid");
});

test("magical realism alone does not authorize a magic system but explicit spellcasting does", () => {
  expect(category(premiseInput("A magical realism family visit."), "magic_system").status).toBe("omitted");
  expect(category(premiseInput("Magical realism with an explicit spellcasting system."), "magic_system").status).toBe("recommended");
});

test("normalized input casing and whitespace produce the same complete plan", () => {
  expect(plan(premiseInput("  A FAMILY\n visit.  "))).toEqual(plan(premiseInput("a family visit.")));
});

test("family cast has principal and roster ranges and household location coverage", () => {
  const input = familyVisit();
  expect(category(input, "principal_cast").targetRange!.ideal).toBeGreaterThan(0);
  expect(category(input, "roster_cast").targetRange!.ideal).toBeGreaterThan(0);
  expect(category(input, "locations").status).toBe("recommended");
  expect(plan(input).artifactTargets[0].value).toBe("ensemble");
});

test("full-world targets require multiple evidenced domains and wide scope", () => {
  expect(plan(premiseInput("full world package")).artifactTargets.some(item => item.value === "full_world_package")).toBe(false);
  expect(plan(premiseInput("A full world package with factions, technology, cities, and daily life.")).artifactTargets[0].value).toBe("full_world_package");
});

test("large casts alone cannot imply a narrator world and a single graph character supports a character target", () => {
  const input = blankPremise();
  input.context.graphEntities = Array.from({ length: 14 }, (_, index) => ({ id: `entity:${index}`, type: "character", name: "Name", importance: "supporting", lifecycle: "active" }));
  expect(plan(input).artifactTargets[0].value).toBe("ensemble");
  input.context.graphEntities = [input.context.graphEntities[0]];
  expect(plan(input).artifactTargets[0].value).toBe("individual_character");
});

test("named mechanics follow their explicit activity evidence", () => {
  const output = plan(premiseInput("A living world sandbox with a story arc, mystery, rumors, factions, exploration, daily routines, and a calendar."));
  expect(output.mechanicPacks.map(item => item.id)).toEqual(expect.arrayContaining(["living_world", "mystery_architecture", "rumor_belief_truth", "faction_politics", "exploration", "procedural_ambience", "arc_state", "calendar_schedules"]));
});

test("non-negotiables and supported structural system types cite their evidence", () => {
  const input = premiseInput("", { physicsConstraints: { mustInclude: "education, economy, law, religion, resources" } });
  for (const id of ["education", "economy", "law", "religion", "resources"]) expect(category(input, id).evidenceRefs).toContain("physics:mustInclude");
});

test("prohibited artifact targets cannot be reintroduced by inferred family or sandbox scope", () => {
  const input = familyVisit(); input.context.physicsConstraints = { mustAvoid: "ensemble" };
  expect(plan(input).artifactTargets.some(item => item.value === "ensemble")).toBe(false);
  const world = premiseInput("A sandbox.", { physicsConstraints: { mustAvoid: "narrator world" } });
  expect(plan(world).artifactTargets.some(item => item.value === "narrator_world")).toBe(false);
});

test("thin sandbox coverage is surfaced as findings without inventing routines or autonomy", () => {
  const output = plan(premiseInput("A sandbox for exploration."));
  expect(output.assessments.ordinaryLife.status).toBe("thin");
  expect(output.assessments.worldAutonomy.status).toBe("thin");
  expect(output.findings.some(item => item.code === "blueprint.ordinary_life_thin")).toBe(true);
  expect(output.findings.some(item => item.code === "blueprint.world_autonomy_thin")).toBe(true);
  expect(output.categories.some(item => item.id === "ordinary_life")).toBe(false);
});
