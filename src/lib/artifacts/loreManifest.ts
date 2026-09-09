import type {
  ArtifactFinding,
  LoreActivationIntent,
  LoreCategory,
  LoreEntryIR,
  LoreManifest,
  LoreVisibility,
} from "../../contracts/artifacts";
import type { Entry, LoreBibleDocument } from "../../types";

interface CategoryDefinition {
  sectionKey: string;
  category: LoreCategory;
  entries: (document: LoreBibleDocument) => Entry[];
  order: number;
  priority: number;
  title: (entry: Entry, index: number) => string;
  content: (entry: Entry) => string;
  visibility?: LoreVisibility;
  historical?: boolean;
  preventRecursion?: boolean;
}

function cleanParts(parts: Array<[string, string | undefined]>): string {
  return parts
    .filter(([, value]) => typeof value === "string" && value.trim().length > 0)
    .map(([label, value]) => (label ? `${label}: ${value!.trim()}` : value!.trim()))
    .join("\n");
}

function cleanKeys(keys: string[] | undefined): string[] {
  return [...new Set((keys ?? []).map((key) => key.trim()).filter(Boolean))];
}

function hash32(value: string, seed: number): number {
  let hash = seed >>> 0;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

function stableUid(value: string): string {
  const hex = [0x811c9dc5, 0x9e3779b9, 0x85ebca6b, 0xc2b2ae35]
    .map((seed) => hash32(value, seed).toString(16).padStart(8, "0"))
    .join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-5${hex.slice(13, 16)}-8${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
}

const definitions: CategoryDefinition[] = [
  {
    sectionKey: "npcs",
    category: "character",
    entries: (document) => document.npcs ?? [],
    order: 100,
    priority: 170,
    title: (entry, index) => entry.fields.name || `Character ${index + 1}`,
    content: (entry) => cleanParts([
      ["CHARACTER", entry.fields.name], ["ROLE", entry.fields.role], ["WANTS", entry.fields.wants],
      ["BODY", entry.fields.body], ["VOICE", entry.fields.voice], ["NOT-DEFAULT", entry.fields.notDefault],
      ["HOLDS", entry.fields.holds], ["CONNECTION", entry.fields.connection],
    ]),
  },
  {
    sectionKey: "relationshipWeb",
    category: "relationship",
    entries: (document) => document.relationshipWeb ?? [],
    order: 120,
    priority: 140,
    title: (entry, index) => entry.fields.relation || `Relationship ${index + 1}`,
    content: (entry) => cleanParts([
      ["RELATIONSHIP", entry.fields.relation || (entry.fields.source && entry.fields.target ? `${entry.fields.source} → ${entry.fields.target}` : "")],
      ["BOND", entry.fields.bond], ["PRESSURE", entry.fields.pressure], ["SOURCE VIEW", entry.fields.sourceView], ["TARGET VIEW", entry.fields.targetView],
    ]),
    visibility: "limited",
  },
  {
    sectionKey: "factions",
    category: "faction",
    entries: (document) => document.factions ?? [],
    order: 150,
    priority: 155,
    title: (entry, index) => entry.fields.name || `Faction ${index + 1}`,
    content: (entry) => cleanParts([
      ["FACTION", entry.fields.name], ["PUBLIC FACE", entry.fields.publicFace], ["TRUE AGENDA", entry.fields.trueAgenda],
      ["INDEPENDENT WANT", entry.fields.independentWant], ["STANCE TOWARD USER", entry.fields.stanceTowardUser],
    ]),
  },
  {
    sectionKey: "rules",
    category: "world_rule",
    entries: (document) => document.worldPhysics?.rules ?? [],
    order: 200,
    priority: 190,
    title: (entry, index) => entry.fields.name || entry.fields.rule || `World Rule ${index + 1}`,
    content: (entry) => cleanParts([["WORLD LAW", entry.fields.rule || entry.fields.name], ["PROFITS", entry.fields.profits], ["PAYS", entry.fields.pays]]),
    preventRecursion: true,
  },
  {
    sectionKey: "locations",
    category: "location",
    entries: (document) => document.locations ?? [],
    order: 250,
    priority: 160,
    title: (entry, index) => entry.fields.name || `Location ${index + 1}`,
    content: (entry) => cleanParts([["LOCATION", entry.fields.name], ["FUNCTION", entry.fields.function], ["MOOD", entry.fields.mood], ["WHAT'S WRONG", entry.fields.whatsWrong]]),
  },
  {
    sectionKey: "items",
    category: "item",
    entries: (document) => document.items ?? [],
    order: 280,
    priority: 135,
    title: (entry, index) => entry.fields.name || `Item ${index + 1}`,
    content: (entry) => cleanParts([["ITEM", entry.fields.name], ["WHAT IT DOES", entry.fields.whatItDoes], ["COST OR LIMIT", entry.fields.costOrLimit], ["UNFIRED GUN", entry.fields.unfiredGun]]),
  },
  {
    sectionKey: "knowledgeMap",
    category: "knowledge",
    entries: (document) => document.knowledgeMap ?? [],
    order: 290,
    priority: 150,
    title: (entry, index) => entry.fields.name || entry.fields.fact || `Knowledge ${index + 1}`,
    content: (entry) => cleanParts([["FACT", entry.fields.fact || entry.fields.name], ["KNOWN BY", entry.fields.knownBy], ["BELIEVED BY", entry.fields.believedBy], ["MISUNDERSTOOD AS", entry.fields.misunderstoodAs]]),
    visibility: "limited",
  },
  {
    sectionKey: "secrets",
    category: "secret",
    entries: (document) => document.secrets ?? [],
    order: 300,
    priority: 145,
    title: (entry, index) => entry.fields.name || entry.fields.truth || `Secret ${index + 1}`,
    content: (entry) => cleanParts([["SECRET", entry.fields.truth || entry.fields.name], ["WHO KEEPS IT", entry.fields.whoKeepsIt], ["HOW KEPT", entry.fields.howKept], ["DISCOVERY TRIGGER", entry.fields.discoveryTrigger], ["WHAT IT CHANGES", entry.fields.whatItChanges]]),
    visibility: "secret",
    preventRecursion: true,
  },
  {
    sectionKey: "history",
    category: "history",
    entries: (document) => document.history ?? [],
    order: 350,
    priority: 120,
    title: (entry, index) => entry.fields.name || entry.fields.event || `History ${index + 1}`,
    content: (entry) => cleanParts([["HISTORY", entry.fields.event || entry.fields.name], ["WHEN", entry.fields.when], ["CONSEQUENCE", entry.fields.consequence], ["REMEMBERED AS", entry.fields.rememberedAs]]),
    historical: true,
  },
  {
    sectionKey: "pressures",
    category: "pressure",
    entries: (document) => document.pressures ?? [],
    order: 400,
    priority: 175,
    title: (entry, index) => entry.fields.name || entry.fields.force || `Pressure ${index + 1}`,
    content: (entry) => cleanParts([["PRESSURE IN MOTION", entry.fields.force || entry.fields.name], ["SCOPE", entry.fields.scope], ["CLOCK", entry.fields.clock]]),
    visibility: "limited",
  },
];

function activationFor(entry: Entry, keys: string[], preventRecursion: boolean): LoreActivationIntent {
  return {
    state: entry.disabledUntilEarned ? "disabled" : "conditional",
    primaryKeys: keys,
    secondaryKeys: [],
    selective: false,
    selectiveLogic: "AND",
    caseSensitive: false,
    wholeWord: false,
    useRegex: false,
    scanDepth: null,
    useProbability: false,
    probability: 100,
    sticky: 0,
    cooldown: 0,
    delay: 0,
    group: "",
    groupOverride: false,
    groupWeight: 100,
    preventRecursion,
    excludeRecursion: false,
    delayUntilRecursion: false,
    vectorized: false,
    vectorDependency: "none",
  };
}

export function compileLoreManifest(document: LoreBibleDocument): LoreManifest {
  const findings: ArtifactFinding[] = [];
  const entries: LoreEntryIR[] = [];
  const omitted = new Set(document.omittedSections ?? []);

  for (const definition of definitions) {
    if (omitted.has(definition.sectionKey)) continue;
    definition.entries(document).forEach((source, index) => {
      const content = definition.content(source);
      if (!content) return;
      const keys = cleanKeys(source.keys);
      const title = definition.title(source, index).trim();
      if (keys.length === 0) {
        findings.push({
          code: "lore.missing_keys",
          severity: "major",
          message: `${title} has content but no viable activation key.`,
          sourceId: source.id,
        });
      }
      const sourceIdentity = `${document.id}:${definition.category}:${source.id}`;
      entries.push({
        id: `lore:${definition.category}:${source.id}`,
        nativeUid: stableUid(sourceIdentity),
        sourceId: source.id,
        sourceFactIds: [source.id],
        title,
        category: definition.category,
        canonicalOwner: "worldBook",
        content,
        temporalClass: definition.historical ? "historical" : "evergreen",
        visibility: definition.visibility ?? "public",
        activation: activationFor(source, keys, Boolean(definition.preventRecursion)),
        injection: { position: 0, depth: 4, role: null, order: definition.order + index, priority: definition.priority },
        contentRationale: "Focused projection of one authored source entry.",
        activationRationale: source.disabledUntilEarned
          ? "Disabled because the source marks this entry as earned-only."
          : "Conditional retrieval uses authored keys; advanced mechanics require later evidence.",
        expectedActivationTests: keys.slice(0, 1).map((key) => ({ kind: "positive" as const, text: key, shouldActivate: true })),
        estimatedTokens: Math.ceil(content.length / 4),
        findings: [],
      });
    });
  }

  const duplicateUids = entries.filter((entry, index) => entries.findIndex((candidate) => candidate.nativeUid === entry.nativeUid) !== index);
  duplicateUids.forEach((entry) => findings.push({ code: "lore.duplicate_uid", severity: "blocker", message: `Duplicate native UID for ${entry.title}.`, sourceId: entry.sourceId }));

  return {
    id: `lore-manifest:${document.id}`,
    name: `${document.core?.title || document.title || "Untitled Scenario"} Lorebook`,
    description: `Runtime lore compiled from ${document.core?.title || document.title || "Untitled Scenario"}.`,
    entries,
    findings,
    portabilityFindings: [],
  };
}
