import type { JsonSchema } from "../../src/contracts/generation.js";
import { FORGE_REQUIRED_FIELDS } from "./forgeValidation.js";
import { normalizeForgeSchema } from "./schemaContract.js";
import { FORGE_BUNDLE_KEYS } from "./forgeResume.js";

const string = { type: "string" } as const;
const boolean = { type: "boolean" } as const;
const number = { type: "number" } as const;
const array = (items: JsonSchema): JsonSchema => ({ type: "array", items });
const object = (properties: Record<string, JsonSchema>, required = Object.keys(properties)): JsonSchema => ({ type: "object", properties, required });
const strings = array(string);
const fields = (names: readonly string[], overrides: Record<string, JsonSchema> = {}) => object(Object.fromEntries(names.map((name) => [name, overrides[name] ?? string])));
const entry = (names: readonly string[], options: { keysRequired?: boolean; extras?: Record<string, JsonSchema>; fieldOverrides?: Record<string, JsonSchema> } = {}): JsonSchema => object({
  id: string, fields: fields(names, options.fieldOverrides), keys: strings, permanence: string, locked: boolean, ...options.extras,
}, ["id", "fields", ...(options.keysRequired === false ? [] : ["keys"]), "permanence", "locked"]);

const rule = entry(FORGE_REQUIRED_FIELDS.rules);
const location = entry(FORGE_REQUIRED_FIELDS.locations);
const faction = entry(FORGE_REQUIRED_FIELDS.factions);
const npc = entry(FORGE_REQUIRED_FIELDS.npcs, { fieldOverrides: { castTier: { type: "string", enum: ["principal", "roster"] } } });
const relation = entry(FORGE_REQUIRED_FIELDS.relationshipWeb, { keysRequired: false });
const knowledge = entry(FORGE_REQUIRED_FIELDS.knowledgeMap, { keysRequired: false });
const item = entry(FORGE_REQUIRED_FIELDS.items);
const secret = entry(FORGE_REQUIRED_FIELDS.secrets, { extras: { disabledUntilEarned: { type: "boolean", nullable: true } } });
const history = entry(FORGE_REQUIRED_FIELDS.history);
const pressure = entry(FORGE_REQUIRED_FIELDS.pressures);
const additionalLore = entry(FORGE_REQUIRED_FIELDS.additionalLore);

const schemas: JsonSchema[] = [
  object({
    core: fields(["title", "pitch", "genreTone", "eraScale", "theRule", "theCost", "theSituation", "thePressure", "theQuestion", "permanence"]),
    user: fields(["rolePosition", "startsWith", "wants", "fears", "hookPull", "hookPush", "hookTrap", "permanence"]),
    worldPhysics: object({ rules: array(rule), authorityCheck: string, powerCeiling: string, faultLines: strings, permanence: string }),
    status: fields(["content", "settings", "permanence"]),
  }),
  object({ locations: array(location), factions: array(faction) }),
  object({ npcs: array(npc), relationshipWeb: array(relation), knowledgeMap: array(knowledge) }),
  object({
    items: array(item), secrets: array(secret),
    conflict: object({ central: string, opposition: string, stakesBad: string, stakesAcceptable: string, clock: string, moralKnot: string, theYield: string, speedBumps: strings, permanence: string }),
    pressureProtocol: string,
  }),
  object({
    history: array(history),
    aesthetic: object({ colors: strings, sounds: strings, smells: strings, weather: string, visualMotifs: strings, fashion: string, touchstones: strings, permanence: string }),
    naming: object({ linguisticBase: string, commonNames: strings, eliteNames: strings, placeNamePattern: string, permanence: string }),
    pressures: array(pressure), additionalLore: array(additionalLore),
  }),
  object({
    proceduralRolls: array(object({ id: string, name: string, triggerKeys: strings, settings: string, entries: array(object({ id: string, weight: number, outcome: string })) })),
    opening: fields(["firstLocation", "firstNpc", "firstChoice", "style", "firstMessage", "permanence"]),
    expansionNotes: object({ explicit: string, violence: string, horror: string, romance: string, humor: string, pacing: string, playerDeath: string, contentFlags: strings, allCharactersAdult: boolean, permanence: string }),
    antiGravity: object({ temptations: array(object({ temptation: string, counter: string })), permanence: string }),
    buildNotes: object({ permanenceRouting: string, orderBands: string, disabledUntilEarnedList: strings, formatMatch: string, permanence: string }),
  }),
];

const names = [
  "Bundle 1: Core, User, World Physics, and Status",
  "Bundle 2: Locations and Factions",
  "Bundle 3: NPCs, Relationship Web, and Knowledge Map",
  "Bundle 4: Items, Secrets, Conflict, and Pressure Protocol",
  "Bundle 5: History, Aesthetic, Naming, and Pressures",
  "Bundle 6: Procedural Rolls, Opening Scene, Expansion Notes, Anti-Gravity, and Build Notes",
];

export interface ForgeBundleDefinition { index: number; name: string; keys: readonly string[]; schema: JsonSchema }
export const FORGE_BUNDLE_DEFINITIONS: readonly ForgeBundleDefinition[] = schemas.map((schema, index) => ({ index, name: names[index], keys: FORGE_BUNDLE_KEYS[index], schema: normalizeForgeSchema(schema) }));
