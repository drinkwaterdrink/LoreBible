import type { BlueprintPlanningContextV1 } from "../../contracts/blueprint";
import { USER_AGENCY_RESERVATIONS, type ProjectGraphV1 } from "../../contracts/projectGraph";

export interface BlueprintPlanningInput { graph: ProjectGraphV1; context: BlueprintPlanningContextV1 }
export interface BlueprintSignal { id: string; domain: string; concept: string; sourceRef: string; weight: number }

interface PhraseFamily { domain: string; concept: string; phrases: string[]; weight?: number }

// Only whole curated concepts qualify. Genre words such as fantasy do not imply
// magic, factions, secrets, or combat; capacity settings do not imply content.
const FAMILIES: PhraseFamily[] = [
  { domain: "social", concept: "family", phrases: ["family", "families", "siblings", "household", "reunion"], weight: 3 },
  { domain: "social", concept: "relationships", phrases: ["relationships", "relationship", "neighbors", "neighbours", "friends", "friendship", "social network"] },
  { domain: "social", concept: "romance", phrases: ["romance", "romantic", "courtship", "love story"], weight: 3 },
  { domain: "social", concept: "team", phrases: ["team", "cast", "school", "office"] },
  { domain: "ordinary_life", concept: "daily_life", phrases: ["cozy", "cosy", "bakery", "daily routines", "daily life", "ordinary life", "slice of life", "household", "workplace"] },
  { domain: "setting", concept: "locations", phrases: ["town", "city", "cities", "kingdom", "village", "academy", "neighborhood", "neighbourhood", "household", "workplace", "space station", "travel", "region"] },
  { domain: "political", concept: "factions", phrases: ["faction", "factions", "rival factions", "political intrigue", "civil war", "war-torn", "war torn", "guilds"] },
  { domain: "speculative", concept: "magic", phrases: ["magic", "magic system", "magical", "wizard", "wizards", "sorcery", "spellcasting", "spells"] },
  { domain: "speculative", concept: "technology", phrases: ["technology", "science fiction", "sci-fi", "sci fi", "robots", "robotics", "cyberpunk", "space travel"] },
  { domain: "system", concept: "economy", phrases: ["economy", "trade", "currency", "commerce"] },
  { domain: "system", concept: "law", phrases: ["law", "laws", "legal system"] },
  { domain: "system", concept: "religion", phrases: ["religion", "religions", "worship"] },
  { domain: "system", concept: "education", phrases: ["education", "school", "schools", "university"] },
  { domain: "system", concept: "resources", phrases: ["resource", "resources", "resource management"] },
  { domain: "political", concept: "organizations", phrases: ["organization", "organizations", "government", "institution", "institutions"] },
  { domain: "information", concept: "knowledge", phrases: ["rumor", "rumors", "rumour", "rumours", "belief", "misconception"] },
  { domain: "activity", concept: "exploration", phrases: ["exploration", "explore", "expedition"] },
  { domain: "temporal", concept: "schedules", phrases: ["calendar", "schedules", "schedule", "timetable"] },
  { domain: "information", concept: "secrets", phrases: ["secret", "secrets", "conspiracy", "hidden identity", "hidden identities"] },
  { domain: "conflict", concept: "combat", phrases: ["combat", "war", "warfare", "battle", "battles", "armies", "duels"] },
  { domain: "information", concept: "investigation", phrases: ["investigation", "mystery", "detective", "clues"] },
  { domain: "world", concept: "autonomy", phrases: ["independent agendas", "offscreen activity", "living world", "world autonomy", "npc goals"] },
  { domain: "mode", concept: "sandbox", phrases: ["sandbox", "open exploration", "open world", "free exploration"] },
  { domain: "mode", concept: "arc", phrases: ["story arc", "narrative arc", "quest", "mission", "single weekend", "family visit"] },
  { domain: "scale", concept: "focused", phrases: ["focused romance", "two people", "single weekend", "single location", "small cast"] },
  { domain: "scale", concept: "wide", phrases: ["large world", "continent", "continents", "multiple kingdoms", "galaxy", "full world", "full world package"] },
  { domain: "target", concept: "individual_character", phrases: ["individual character", "character card", "single character"] },
  { domain: "target", concept: "scenario_card", phrases: ["scenario card"] },
  { domain: "target", concept: "narrator_world", phrases: ["narrator world"] },
  { domain: "target", concept: "ensemble", phrases: ["ensemble", "ensemble cast"] },
  { domain: "target", concept: "full_world", phrases: ["full world"] },
  { domain: "target", concept: "full_world_package", phrases: ["full world package"] },
  { domain: "target", concept: "world_book_primary", phrases: ["world book", "worldbook", "lorebook"] },
  { domain: "runtime", concept: "efficient", phrases: ["efficient runtime", "low token budget", "minimal runtime budget"] },
  { domain: "runtime", concept: "expansive", phrases: ["expansive runtime", "expansive runtime budget", "large runtime budget"] },
  { domain: "agency", concept: "player_control", phrases: ["force player decisions", "control player feelings", "script player actions", "force player attraction", "decide player consent"] },
];

export function normalizeBlueprintText(text: string): string {
  return text.normalize("NFKC").toLowerCase().replace(/\s+/gu, " ").trim();
}

const matchers = FAMILIES.map(family => ({
  ...family,
  pattern: new RegExp(`(?:^|[^\\p{L}\\p{N}_])(?:${family.phrases.map(phrase => phrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})(?=$|[^\\p{L}\\p{N}_])`, "u"),
}));

function matches(text: string) {
  // This genre describes an aesthetic, not a system. Additional explicit magic
  // evidence elsewhere in the same field can still qualify.
  const normalized = normalizeBlueprintText(text).replace(/(^|[^\p{L}\p{N}_])magical realism(?=$|[^\p{L}\p{N}_])/gu, "$1 ");
  return matchers.filter(family => family.pattern.test(normalized));
}

export function collectBlueprintSignals({ graph, context }: BlueprintPlanningInput): BlueprintSignal[] {
  const signals = new Map<string, BlueprintSignal>();
  const excluded = new Set<string>();
  const add = (domain: string, concept: string, sourceRef: string, weight = 2) => {
    if (weight > 0 && excluded.has(concept)) return;
    const id = `${sourceRef}:${concept}`;
    if (!signals.has(id)) signals.set(id, { id, domain, concept, sourceRef, weight });
  };
  const exclude = (concept: string, sourceRef: string) => {
    excluded.add(concept);
    add("constraint", concept, sourceRef, 0);
  };

  for (const family of matches(context.physicsConstraints?.mustAvoid ?? "")) exclude(family.concept, `constraint:mustAvoid:${family.concept}`);
  if (context.physicsConstraints?.violence === "None") exclude("combat", "constraint:physics:violence");
  if (context.physicsConstraints?.romance === "None") exclude("romance", "constraint:physics:romance");
  // Reservations apply to authored player control, never to NPC relationship lore.
  if (graph.agency.reserved.some(value => (USER_AGENCY_RESERVATIONS as readonly string[]).includes(value))) {
    exclude("player_control", "constraint:agency:player_control");
  }
  if (context.sparkDna?.playerAgencyBoundaries.trim()) exclude("player_control", "constraint:spark:player_control");

  const scan = (text: string | null | undefined, sourceRef: string) => {
    for (const family of matches(text ?? "")) add(family.domain, family.concept, sourceRef, family.weight ?? 2);
  };
  const scanList = (texts: string[], sourceRef: string) => texts.forEach(text => scan(text, sourceRef));
  const spark = context.sparkDna;
  if (spark) {
    scan(spark.premisePromise, "spark:premise");
    scanList([spark.toneEnvelope.primary, ...spark.toneEnvelope.descriptors], "spark:tone");
    scanList(spark.genreSignals, "spark:genre");
    scan(spark.userRole, "spark:userRole");
    scanList(spark.nonNegotiables, "spark:nonNegotiables");
    scanList(spark.opportunitySpace, "spark:opportunities");
    scanList(spark.existingPressures, "spark:pressures");
    // Assumptions and open variables are unresolved; they are not positive evidence.
  }
  const take = context.selectedTake;
  if (take) {
    scan(take.title, "take:title"); scan(take.pitch, "take:pitch"); scan(take.angle, "take:angle");
    // One source bucket deduplicates normalized concepts, including legacy genreTone
    // copied into both lists and synonyms that resolve to the same curated concept.
    scanList([...take.genres, ...take.tone], "take:genreTone");
    scanList(take.retainedNonNegotiables, "take:nonNegotiables");
  }
  const physics = context.physicsConstraints;
  if (physics) {
    for (const key of ["genre", "subgenre", "horror", "humor", "mustInclude"] as const) scan(physics[key], `physics:${key}`);
    if (physics.romance && physics.romance !== "None") add("social", "romance", "physics:romance", physics.romance === "Subplot" ? 1 : 3);
    if (physics.density) add("intensity", physics.density === "Quick" ? "lean" : physics.density === "Rich" ? "rich" : "standard", "physics:density");
  }

  const entityConcepts: Partial<Record<ProjectGraphV1["entities"][number]["type"], string>> = {
    character: "characters", location: "locations", faction: "factions", organization: "organizations", item: "items", culture: "culture", species: "species", event: "events", system: "systems",
  };
  const entities = new Map<string, Pick<ProjectGraphV1["entities"][number], "id" | "type">>(graph.entities.map(entity => [entity.id, entity]));
  for (const entity of context.graphEntities ?? []) if (!entities.has(entity.id)) entities.set(entity.id, entity);
  for (const entity of entities.values()) {
    const concept = entityConcepts[entity.type];
    if (concept) add("entity", concept, `graph:entities:${entity.type}`);
  }
  if (entities.size >= 12) add("scale", "wide", "graph:entityCount");
  const characterCount = [...entities.values()].filter(entity => entity.type === "character").length;
  if (characterCount >= 2) add("scale", "cast_roster", "graph:characterCount");
  if (characterCount === 1) add("target", "individual_character", "graph:characterCount");

  const graphIds = new Set(graph.canon.map(fact => fact.id));
  const scanFact = (fact: Pick<ProjectGraphV1["canon"][number], "predicate" | "status" | "visibility" | "temporalClass">, sourceRef: string) => {
    if (fact.visibility !== "public" || fact.temporalClass === "current" || fact.temporalClass === "future_possible" || fact.status === "conflicted" || fact.status === "deprecated") return;
    scan(fact.predicate.replace(/[_-]+/gu, " "), sourceRef);
  };
  graph.canon.forEach((fact, index) => scanFact(fact, `graph:fact:${index}:predicate`));
  (context.graphFacts ?? []).forEach((fact, index) => { if (!graphIds.has(fact.id)) scanFact(fact, `context:fact:${index}:predicate`); });
  const relationshipCount = Math.max(graph.relationships.length, context.relationshipCount ?? 0);
  const knowledgeCount = Math.max(graph.knowledge.length, context.knowledgeClaimCount ?? 0);
  if (relationshipCount > 0) add("social", "relationships", "graph:relationshipCount", Math.min(relationshipCount, 4));
  if (knowledgeCount > 0) add("information", "knowledge", "graph:knowledgeCount", Math.min(knowledgeCount, 4));
  return [...signals.values()].sort((a, b) => a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
}
