import { LoreBibleDocument, Entry } from "../types";
import { compileLoreManifest } from "./artifacts/loreManifest";
import { serializeNativeLumiverseWorldBook, serializePortableCharacterBook } from "./artifacts/loreSerializers";
import { compileCharacterArtifact } from "./artifacts/characterArtifact";
import { serializeCharacterCardV2, serializeCharacterCardV3 } from "./artifacts/cardSerializers";

/**
 * 1. Markdown Export: Clean, readable, typeset manuscript representation.
 */
export function generateMarkdownExport(doc: LoreBibleDocument): string {
  const parts: string[] = [];

  parts.push(`# ${doc.core.title.toUpperCase()}`);
  parts.push(`*A Scenario Blueprint authored with Lore Bible*\n`);
  parts.push(`> **Premise Spark:** "${doc.sparkText}"\n`);

  parts.push(`## 1. CORE SCENARIO SEED [P]`);
  parts.push(`**Pitch:** ${doc.core.pitch}`);
  parts.push(`**Genre / Tone:** ${doc.core.genreTone} · **Era / Scale:** ${doc.core.eraScale}`);
  parts.push(`- **The Rule:** ${doc.core.theRule}`);
  parts.push(`- **The Cost:** ${doc.core.theCost}`);
  parts.push(`- **The Situation:** ${doc.core.theSituation}`);
  parts.push(`- **The Pressure:** ${doc.core.thePressure}`);
  parts.push(`- **The Question:** *${doc.core.theQuestion}*\n`);

  parts.push(`## 2. USER ROLE & HOOKS [P]`);
  parts.push(`- **Role & Position:** ${doc.user.rolePosition}`);
  parts.push(`- **Starts With:** ${doc.user.startsWith}`);
  parts.push(`- **Wants:** ${doc.user.wants}`);
  parts.push(`- **Fears:** ${doc.user.fears}`);
  parts.push(`- **Hook (Pull):** ${doc.user.hookPull}`);
  parts.push(`- **Hook (Push):** ${doc.user.hookPush}`);
  parts.push(`- **Hook (Trap):** ${doc.user.hookTrap}\n`);

  parts.push(`## 3. WORLD PHYSICS & FRICTION RULES [C]`);
  doc.worldPhysics.rules.forEach((r, idx) => {
    parts.push(`### Rule ${idx + 1}: ${r.fields.rule || r.fields.name}`);
    if (r.fields.profits) parts.push(`- *Profits:* ${r.fields.profits}`);
    if (r.fields.pays) parts.push(`- *Pays:* ${r.fields.pays}`);
    if (r.keys && r.keys.length > 0) parts.push(`- *Keys:* \`${r.keys.join(", ")}\``);
  });
  parts.push(`- **Authority Check:** ${doc.worldPhysics.authorityCheck}`);
  parts.push(`- **Power Ceiling:** ${doc.worldPhysics.powerCeiling}\n`);

  parts.push(`## 4. CURRENT STATUS BLOCK [P]`);
  parts.push(`\`\`\`\n${doc.status.content}\n\`\`\``);
  parts.push(`*Settings:* ${doc.status.settings}\n`);

  const omitted = doc.omittedSections || [];

  if (!omitted.includes("locations") && doc.locations && doc.locations.length > 0) {
    parts.push(`## 5. LOCATION SEEDS [C]`);
    doc.locations.forEach((loc) => {
      if (!loc.fields?.name) return;
      parts.push(`### ${loc.fields.name} — *${loc.fields.function || "Site"}*`);
      if (loc.fields.mood) parts.push(`- **Mood:** ${loc.fields.mood}`);
      if (loc.fields.whatsWrong) parts.push(`- **What's Wrong:** ${loc.fields.whatsWrong}`);
      if (loc.keys?.length) parts.push(`- **Keys:** \`${loc.keys.join(", ")}\``);
    });
    parts.push("");
  }

  if (!omitted.includes("factions") && doc.factions && doc.factions.length > 0) {
    const validFactions = doc.factions.filter((f) => f.fields?.name);
    if (validFactions.length > 0) {
      parts.push(`## 6. FACTION SEEDS [C]`);
      validFactions.forEach((f) => {
        parts.push(`### ${f.fields.name}`);
        if (f.fields.publicFace) parts.push(`- **Public Face:** ${f.fields.publicFace}`);
        if (f.fields.trueAgenda) parts.push(`- **True Agenda:** ${f.fields.trueAgenda}`);
        if (f.fields.independentWant) parts.push(`- **Independent Want:** ${f.fields.independentWant}`);
        if (f.fields.stanceTowardUser) parts.push(`- **Stance Toward User:** ${f.fields.stanceTowardUser}`);
        if (f.keys?.length) parts.push(`- **Keys:** \`${f.keys.join(", ")}\``);
      });
      parts.push("");
    }
  }

  if (!omitted.includes("npcs") && doc.npcs && doc.npcs.length > 0) {
    const validNpcs = doc.npcs.filter((npc) => npc.fields?.name);
    if (validNpcs.length > 0) {
      parts.push(`## 7. NPC CAST SEEDS [C]`);
      validNpcs.forEach((npc) => {
        parts.push(`### ${npc.fields.name} — *${npc.fields.role || "Character"}*`);
        if (npc.fields.wants) parts.push(`- **WANTS:** ${npc.fields.wants}`);
        if (npc.fields.body) parts.push(`- **BODY:** ${npc.fields.body}`);
        if (npc.fields.voice) parts.push(`- **VOICE:** ${npc.fields.voice}`);
        if (npc.fields.notDefault) parts.push(`- **NOT-DEFAULT:** ${npc.fields.notDefault}`);
        if (npc.fields.holds) parts.push(`- **HOLDS:** ${npc.fields.holds}`);
        if (npc.fields.connection) parts.push(`- **CONNECTION:** ${npc.fields.connection}`);
        if (npc.keys?.length) parts.push(`- **KEYS:** \`${npc.keys.join(", ")}\``);
      });
      parts.push("");
    }
  }

  if (!omitted.includes("relationshipWeb") && doc.relationshipWeb && doc.relationshipWeb.length > 0) {
    parts.push(`## 8. RELATIONSHIP WEB [C]`);
    doc.relationshipWeb.forEach((w) => {
      const rel = w.fields.relation || `${w.fields.source || "A"} → ${w.fields.target || "B"}: ${w.fields.bond || "Tied"}`;
      parts.push(`- ${rel} *(Pressure: ${w.fields.pressure || "Unresolved"})*`);
    });
    parts.push("");
  }

  if (!omitted.includes("items") && doc.items && doc.items.length > 0) {
    const validItems = doc.items.filter((item) => item.fields?.name);
    if (validItems.length > 0) {
      parts.push(`## 9. ITEM & ABILITY SEEDS [C]`);
      validItems.forEach((item) => {
        parts.push(`### ${item.fields.name}`);
        if (item.fields.whatItDoes) parts.push(`- **What It Does:** ${item.fields.whatItDoes}`);
        if (item.fields.costOrLimit) parts.push(`- **Cost / Limit:** ${item.fields.costOrLimit}`);
        if (item.fields.unfiredGun) parts.push(`- **Unfired Gun:** ${item.fields.unfiredGun}`);
        if (item.keys?.length) parts.push(`- **Keys:** \`${item.keys.join(", ")}\``);
      });
      parts.push("");
    }
  }

  if (!omitted.includes("secrets") && doc.secrets && doc.secrets.length > 0) {
    const validSecrets = doc.secrets.filter((s) => s.fields?.truth || s.fields?.name);
    if (validSecrets.length > 0) {
      parts.push(`## 10. SECRET SEEDS [C]`);
      validSecrets.forEach((s) => {
        parts.push(`### Truth: ${s.fields.truth || s.fields.name}`);
        if (s.fields.whoKeepsIt) parts.push(`- **Who Keeps It:** ${s.fields.whoKeepsIt}`);
        if (s.fields.howKept) parts.push(`- **How Kept:** ${s.fields.howKept}`);
        if (s.fields.discoveryTrigger) parts.push(`- **Discovery Trigger:** ${s.fields.discoveryTrigger}`);
        if (s.fields.whatItChanges) parts.push(`- **What It Changes:** ${s.fields.whatItChanges}`);
        if (s.disabledUntilEarned) parts.push(`- *[Disabled until earned]*`);
        if (s.keys?.length) parts.push(`- **Keys:** \`${s.keys.join(", ")}\``);
      });
      parts.push("");
    }
  }

  parts.push(`## 11. CONFLICT ARCHITECTURE [P]`);
  parts.push(`- **Central Conflict:** ${doc.conflict.central}`);
  parts.push(`- **Opposition:** ${doc.conflict.opposition}`);
  parts.push(`- **Stakes (Bad Future):** ${doc.conflict.stakesBad}`);
  parts.push(`- **Stakes (Acceptable Future):** ${doc.conflict.stakesAcceptable}`);
  parts.push(`- **Countdown Clock:** ${doc.conflict.clock}\n`);

  parts.push(`## 12. OPENING SCENE [T]`);
  parts.push(`- **First Location:** ${doc.opening.firstLocation}`);
  parts.push(`- **First NPC:** ${doc.opening.firstNpc}`);
  parts.push(`- **First Choice:** ${doc.opening.firstChoice}`);
  parts.push(`\n**First Message:**\n\n${doc.opening.firstMessage}\n`);

  return parts.join("\n");
}

/**
 * 2. Full JSON: Complete structured document
 */
export function generateJsonExport(doc: LoreBibleDocument): string {
  return JSON.stringify(doc, null, 2);
}

/**
 * 3. Lorebook JSON: Portable world-info
 * Array where each entry has keys, content, enabled, constant, insertionOrder, depth, comment.
 * Routed by permanence:
 *   [P] -> constant: true, keyed: false, insertionOrder bands
 *   [C] -> constant: false, keyed: true, insertionOrder bands
 *   [T] -> excluded from lorebook
 * Order bands from BUILD NOTES:
 *   STATUS: 50 (constant, depth 4)
 *   NPCs: 100s
 *   Factions: 150s
 *   World Physics: 200s
 *   Locations: 250s
 *   Items/Abilities: 280s
 *   Secrets: 300s
 *   Pressures/History: 400s
 * disabledUntilEarned exports as enabled: false
 */
export interface GenericLorebookEntry {
  keys: string[];
  content: string;
  enabled: boolean;
  constant: boolean;
  insertionOrder: number;
  depth: number;
  comment: string;
}

function isSectionOmitted(doc: LoreBibleDocument, sectionKey: string): boolean {
  return Boolean(doc.omittedSections && doc.omittedSections.includes(sectionKey));
}

function buildCleanContent(pairs: [string, string | undefined | null][]): string {
  return pairs
    .filter(([_, val]) => val && typeof val === "string" && val.trim().length > 0)
    .map(([label, val]) => (label ? `${label}: ${val!.trim()}` : val!.trim()))
    .join("\n");
}

function generateLegacyLorebookExport(doc: LoreBibleDocument): string {
  const entries: GenericLorebookEntry[] = [];

  // 1. NPCs [C] -> Order band 100s
  if (!isSectionOmitted(doc, "npcs") && doc.npcs?.length) {
    doc.npcs.forEach((npc, i) => {
      const header = npc.fields?.name ? (npc.fields?.role ? `${npc.fields.name} — ${npc.fields.role}` : npc.fields.name) : "";
      const content = buildCleanContent([
        ["", header],
        ["WANTS", npc.fields?.wants],
        ["BODY", npc.fields?.body],
        ["VOICE", npc.fields?.voice ? `"${npc.fields.voice}"` : ""],
        ["NOT-DEFAULT", npc.fields?.notDefault],
        ["HOLDS", npc.fields?.holds],
        ["CONNECTION", npc.fields?.connection],
      ]);
      if (content) {
        entries.push({
          keys: npc.keys || [],
          content,
          enabled: true,
          constant: false,
          insertionOrder: 100 + i,
          depth: 4,
          comment: `NPC: ${npc.fields?.name || `Character ${i + 1}`}`,
        });
      }
    });
  }

  // 3. Relationship Web [C] -> Order band 120s
  if (!isSectionOmitted(doc, "relationshipWeb") && doc.relationshipWeb?.length) {
    doc.relationshipWeb.forEach((w, i) => {
      const rel = w.fields?.relation || (w.fields?.source && w.fields?.target ? `${w.fields.source} → ${w.fields.target}` : "");
      const content = buildCleanContent([
        ["RELATION", rel],
        ["BOND", w.fields?.bond],
        ["PRESSURE", w.fields?.pressure],
      ]);
      if (content) {
        entries.push({
          keys: w.keys || [],
          content,
          enabled: true,
          constant: false,
          insertionOrder: 120 + i,
          depth: 4,
          comment: `Relation: ${rel || `Bond ${i + 1}`}`,
        });
      }
    });
  }

  // 4. Factions [C] -> Order band 150s (omitted if scenario doesn't have them)
  if (!isSectionOmitted(doc, "factions") && doc.factions?.length) {
    doc.factions.forEach((f, i) => {
      const content = buildCleanContent([
        ["FACTION", f.fields?.name],
        ["PUBLIC FACE", f.fields?.publicFace],
        ["TRUE AGENDA", f.fields?.trueAgenda],
        ["INDEPENDENT WANT", f.fields?.independentWant],
        ["STANCE TOWARD USER", f.fields?.stanceTowardUser],
      ]);
      if (content) {
        entries.push({
          keys: f.keys || [],
          content,
          enabled: true,
          constant: false,
          insertionOrder: 150 + i,
          depth: 4,
          comment: `Faction: ${f.fields?.name || `Group ${i + 1}`}`,
        });
      }
    });
  }

  // 5. World Physics Rules [C] -> Order band 200s
  if (!isSectionOmitted(doc, "rules") && doc.worldPhysics?.rules?.length) {
    doc.worldPhysics.rules.forEach((rule, i) => {
      const content = buildCleanContent([
        ["WORLD LAW", rule.fields?.rule || rule.fields?.name],
        ["PROFITS", rule.fields?.profits],
        ["PAYS", rule.fields?.pays],
      ]);
      if (content) {
        entries.push({
          keys: rule.keys || [],
          content,
          enabled: true,
          constant: false,
          insertionOrder: 200 + i,
          depth: 4,
          comment: `World Physics: ${rule.fields?.name || `Rule ${i + 1}`}`,
        });
      }
    });
  }

  // 6. Locations [C] -> Order band 250s
  if (!isSectionOmitted(doc, "locations") && doc.locations?.length) {
    doc.locations.forEach((loc, i) => {
      const content = buildCleanContent([
        ["LOCATION", loc.fields?.name],
        ["FUNCTION", loc.fields?.function],
        ["MOOD", loc.fields?.mood],
        ["WHAT'S WRONG", loc.fields?.whatsWrong],
      ]);
      if (content) {
        entries.push({
          keys: loc.keys || [],
          content,
          enabled: true,
          constant: false,
          insertionOrder: 250 + i,
          depth: 4,
          comment: `Location: ${loc.fields?.name || `Site ${i + 1}`}`,
        });
      }
    });
  }

  // 7. Items / Abilities [C] -> Order band 280s (omitted if scenario doesn't have them)
  if (!isSectionOmitted(doc, "items") && doc.items?.length) {
    doc.items.forEach((item, i) => {
      const content = buildCleanContent([
        ["ITEM", item.fields?.name],
        ["WHAT IT DOES", item.fields?.whatItDoes],
        ["COST OR LIMIT", item.fields?.costOrLimit],
        ["UNFIRED GUN", item.fields?.unfiredGun],
      ]);
      if (content) {
        entries.push({
          keys: item.keys || [],
          content,
          enabled: true,
          constant: false,
          insertionOrder: 280 + i,
          depth: 4,
          comment: `Item: ${item.fields?.name || `Item ${i + 1}`}`,
        });
      }
    });
  }

  // 8. Secrets [C] -> Order band 300s
  if (!isSectionOmitted(doc, "secrets") && doc.secrets?.length) {
    doc.secrets.forEach((s, i) => {
      const truthText = s.fields?.truth || s.fields?.name || "";
      const content = buildCleanContent([
        ["SECRET", truthText],
        ["WHO KEEPS IT", s.fields?.whoKeepsIt],
        ["HOW KEPT", s.fields?.howKept],
        ["DISCOVERY TRIGGER", s.fields?.discoveryTrigger],
        ["WHAT IT CHANGES", s.fields?.whatItChanges],
      ]);
      if (content) {
        entries.push({
          keys: s.keys || [],
          content,
          enabled: !s.disabledUntilEarned,
          constant: false,
          insertionOrder: 300 + i,
          depth: 4,
          comment: `Secret: ${truthText.slice(0, 32)}...`,
        });
      }
    });
  }

  // 9. Pressures in Motion [C] -> Order band 400s
  if (!isSectionOmitted(doc, "pressures") && doc.pressures?.length) {
    doc.pressures.forEach((p, i) => {
      const content = buildCleanContent([
        ["PRESSURE IN MOTION", p.fields?.force || p.fields?.name],
        ["SCOPE", p.fields?.scope],
        ["CLOCK", p.fields?.clock],
      ]);
      if (content) {
        entries.push({
          keys: p.keys || [],
          content,
          enabled: true,
          constant: false,
          insertionOrder: 400 + i,
          depth: 4,
          comment: `Pressure: ${p.fields?.name || p.id}`,
        });
      }
    });
  }

  return JSON.stringify(entries, null, 2);
}

export function generateLorebookExport(doc: LoreBibleDocument): string {
  const portable = serializePortableCharacterBook(compileLoreManifest(doc));
  return JSON.stringify(portable.entries, null, 2);
}

export function generateLumiverseWorldBookExport(doc: LoreBibleDocument): string {
  const native = serializeNativeLumiverseWorldBook(compileLoreManifest(doc));
  return JSON.stringify(native, null, 2);
}

/**
 * 4. Character-Card JSON (V2 chara_card_v2 spec)
 * Routed per permanence: nothing volatile in scenario!
 */
function generateLegacyCharacterCardExport(doc: LoreBibleDocument): string {
  // Build lorebook character_book entries from doc using cleaned generator
  const rawLorebook = JSON.parse(generateLorebookExport(doc)) as GenericLorebookEntry[];
  const lorebookEntries = rawLorebook.map((e, idx) => ({
    keys: e.keys,
    content: e.content,
    constant: e.constant,
    insertion_order: e.insertionOrder,
    position: 1,
    enabled: e.enabled,
    comment: e.comment,
  }));

  const card = {
    spec: "chara_card_v2",
    spec_version: "2.0",
    data: {
      name: doc.core?.title || "Untitled Scenario",
      description: `${doc.core?.pitch || ""}\n\n[THE RULE]: ${doc.core?.theRule || ""}\n[THE COST]: ${doc.core?.theCost || ""}\n[THE SITUATION]: ${doc.core?.theSituation || ""}\n[THE PRESSURE]: ${doc.core?.thePressure || ""}`,
      personality: `GENRE / TONE: ${doc.core?.genreTone || ""}\nERA / SCALE: ${doc.core?.eraScale || ""}\nTHE CORE QUESTION: ${doc.core?.theQuestion || ""}`,
      scenario: `User Role: ${doc.user?.rolePosition || ""}\nStarting Inventory / Status: ${doc.user?.startsWith || ""}\nCentral Conflict: ${doc.conflict?.central || ""}\nCountdown Clock: ${doc.conflict?.clock || ""}`,
      first_mes: doc.opening?.firstMessage || "",
      mes_example: "",
      creator_notes: `Generated with Lore Bible Scenario Authoring Studio.\nSpark: ${doc.sparkText || ""}\nDensity: ${doc.physics?.density || "Standard"}`,
      character_book: {
        name: `${doc.core?.title || "Scenario"} Lorebook`,
        description: `Portable world-info generated for ${doc.core?.title || "Scenario"}`,
        extensions: {},
        scan_depth: 4,
        token_budget: 2048,
        recursive_scanning: true,
        entries: lorebookEntries.map((entry) => ({ ...entry, extensions: {} })),
      },
    },
  };

  return JSON.stringify(card, null, 2);
}

/**
 * 4b. Character-Card V3 & CharX bundle (Lumiverse specification)
 * Specs: https://lumiverse.chat/guides/characters/?h=Char#quick-links
 * CharacterCardV3 in card.json packaged inside a .charx zip archive.
 */
function generateLegacyCharacterCardV3(doc: LoreBibleDocument): any {
  let entryId = 1;
  const entries: any[] = [];

  // 1. World Physics Rules (band 200)
  if (!isSectionOmitted(doc, "rules") && doc.worldPhysics?.rules?.length) {
    doc.worldPhysics.rules.forEach((rule, i) => {
      const content = buildCleanContent([
        ["WORLD LAW", rule.fields?.rule || rule.fields?.name],
        ["PROFITS", rule.fields?.profits],
        ["PAYS", rule.fields?.pays],
      ]);
      if (content) {
        entries.push({
          id: entryId++,
          keys: rule.keys || [],
          secondary_keys: [],
          comment: `World Physics: ${rule.fields?.name || `Rule ${i + 1}`}`,
          content,
          constant: false,
          selective: false,
          insertion_order: 200 + i,
          enabled: true,
          position: "before_char",
          use_regex: false,
        });
      }
    });
  }

  // 3. NPCs (band 100)
  if (!isSectionOmitted(doc, "npcs") && doc.npcs?.length) {
    doc.npcs.forEach((n, i) => {
      const header = n.fields?.name ? (n.fields?.role ? `${n.fields.name} — ${n.fields.role}` : n.fields.name) : "";
      const content = buildCleanContent([
        ["", header],
        ["WANTS", n.fields?.wants],
        ["BODY", n.fields?.body],
        ["VOICE", n.fields?.voice ? `"${n.fields.voice}"` : ""],
        ["NOT-DEFAULT", n.fields?.notDefault],
        ["HOLDS", n.fields?.holds],
        ["CONNECTION", n.fields?.connection],
      ]);
      if (content) {
        entries.push({
          id: entryId++,
          keys: n.keys || [],
          secondary_keys: [],
          comment: `NPC: ${n.fields?.name || `Character ${i + 1}`}`,
          content,
          constant: false,
          selective: false,
          insertion_order: 100 + i,
          enabled: true,
          position: "before_char",
          use_regex: false,
        });
      }
    });
  }

  // 4. Relationship Web (band 120)
  if (!isSectionOmitted(doc, "relationshipWeb") && doc.relationshipWeb?.length) {
    doc.relationshipWeb.forEach((w, i) => {
      const rel = w.fields?.relation || (w.fields?.source && w.fields?.target ? `${w.fields.source} → ${w.fields.target}` : "");
      const content = buildCleanContent([
        ["RELATION", rel],
        ["BOND", w.fields?.bond],
        ["PRESSURE", w.fields?.pressure],
      ]);
      if (content) {
        entries.push({
          id: entryId++,
          keys: w.keys || [],
          secondary_keys: [],
          comment: `Relation: ${rel || `Bond ${i + 1}`}`,
          content,
          constant: false,
          selective: false,
          insertion_order: 120 + i,
          enabled: true,
          position: "before_char",
          use_regex: false,
        });
      }
    });
  }

  // 5. Factions (band 150) - Omitted if not applicable to scenario!
  if (!isSectionOmitted(doc, "factions") && doc.factions?.length) {
    doc.factions.forEach((f, i) => {
      const content = buildCleanContent([
        ["FACTION", f.fields?.name],
        ["PUBLIC FACE", f.fields?.publicFace],
        ["TRUE AGENDA", f.fields?.trueAgenda],
        ["INDEPENDENT WANT", f.fields?.independentWant],
        ["STANCE TOWARD USER", f.fields?.stanceTowardUser],
      ]);
      if (content) {
        entries.push({
          id: entryId++,
          keys: f.keys || [],
          secondary_keys: [],
          comment: `Faction: ${f.fields?.name || `Group ${i + 1}`}`,
          content,
          constant: false,
          selective: false,
          insertion_order: 150 + i,
          enabled: true,
          position: "before_char",
          use_regex: false,
        });
      }
    });
  }

  // 6. Locations (band 250)
  if (!isSectionOmitted(doc, "locations") && doc.locations?.length) {
    doc.locations.forEach((loc, i) => {
      const content = buildCleanContent([
        ["LOCATION", loc.fields?.name],
        ["FUNCTION", loc.fields?.function],
        ["MOOD", loc.fields?.mood],
        ["WHAT'S WRONG", loc.fields?.whatsWrong],
      ]);
      if (content) {
        entries.push({
          id: entryId++,
          keys: loc.keys || [],
          secondary_keys: [],
          comment: `Location: ${loc.fields?.name || `Site ${i + 1}`}`,
          content,
          constant: false,
          selective: false,
          insertion_order: 250 + i,
          enabled: true,
          position: "before_char",
          use_regex: false,
        });
      }
    });
  }

  // 7. Items / Abilities (band 280) - Omitted if not applicable to scenario!
  if (!isSectionOmitted(doc, "items") && doc.items?.length) {
    doc.items.forEach((item, i) => {
      const content = buildCleanContent([
        ["ITEM", item.fields?.name],
        ["WHAT IT DOES", item.fields?.whatItDoes],
        ["COST OR LIMIT", item.fields?.costOrLimit],
        ["UNFIRED GUN", item.fields?.unfiredGun],
      ]);
      if (content) {
        entries.push({
          id: entryId++,
          keys: item.keys || [],
          secondary_keys: [],
          comment: `Item: ${item.fields?.name || `Item ${i + 1}`}`,
          content,
          constant: false,
          selective: false,
          insertion_order: 280 + i,
          enabled: true,
          position: "before_char",
          use_regex: false,
        });
      }
    });
  }

  // 8. Secrets (band 300)
  if (!isSectionOmitted(doc, "secrets") && doc.secrets?.length) {
    doc.secrets.forEach((s, i) => {
      const truthText = s.fields?.truth || s.fields?.name || "";
      const content = buildCleanContent([
        ["SECRET", truthText],
        ["WHO KEEPS IT", s.fields?.whoKeepsIt],
        ["HOW KEPT", s.fields?.howKept],
        ["DISCOVERY TRIGGER", s.fields?.discoveryTrigger],
        ["WHAT IT CHANGES", s.fields?.whatItChanges],
      ]);
      if (content) {
        entries.push({
          id: entryId++,
          keys: s.keys || [],
          secondary_keys: [],
          comment: `Secret: ${truthText.slice(0, 30)}`,
          content,
          constant: false,
          selective: false,
          insertion_order: 300 + i,
          enabled: !s.disabledUntilEarned,
          position: "before_char",
          use_regex: false,
        });
      }
    });
  }

  // 9. Knowledge Map (band 350)
  if (!isSectionOmitted(doc, "knowledgeMap") && doc.knowledgeMap?.length) {
    doc.knowledgeMap.forEach((k, i) => {
      const content = buildCleanContent([
        ["TRUTH", k.fields?.truth],
        ["KNOWS", k.fields?.knows],
        ["SUSPECTS", k.fields?.suspects],
        ["SURFACES WHEN", k.fields?.surfacesWhen],
      ]);
      if (content) {
        entries.push({
          id: entryId++,
          keys: k.keys || [],
          secondary_keys: [],
          comment: `Knowledge: ${(k.fields?.truth || "").slice(0, 30)}`,
          content,
          constant: false,
          selective: false,
          insertion_order: 350 + i,
          enabled: true,
          position: "before_char",
          use_regex: false,
        });
      }
    });
  }

  // 10. Pressures (band 400)
  if (!isSectionOmitted(doc, "pressures") && doc.pressures?.length) {
    doc.pressures.forEach((p, i) => {
      const content = buildCleanContent([
        ["PRESSURE IN MOTION", p.fields?.force || p.fields?.name],
        ["SCOPE", p.fields?.scope],
        ["CLOCK", p.fields?.clock],
      ]);
      if (content) {
        entries.push({
          id: entryId++,
          keys: p.keys || [],
          secondary_keys: [],
          comment: `Pressure: ${p.fields?.name || p.id}`,
          content,
          constant: false,
          selective: false,
          insertion_order: 400 + i,
          enabled: true,
          position: "before_char",
          use_regex: false,
        });
      }
    });
  }

  const tags = [
    ...(doc.core?.genreTone ? doc.core.genreTone.split(/[,/]/).map((t) => t.trim().toLowerCase()) : []),
    ...(doc.canon?.franchiseName ? [doc.canon.franchiseName.toLowerCase()] : []),
    "lore-bible",
    "lumiverse",
    "charx",
    `${(doc.physics?.density || "standard").toLowerCase()}-world`,
  ].filter(Boolean);

  const normalizedEntries = entries.map((entry) => ({ ...entry, extensions: entry.extensions || {} }));

  return {
    spec: "chara_card_v3",
    spec_version: "3.0",
    data: {
      name: doc.core?.title || "Untitled Scenario",
      description: `${doc.core?.pitch || ""}\n\n[THE RULE]: ${doc.core?.theRule || ""}\n[THE COST]: ${doc.core?.theCost || ""}\n[THE SITUATION]: ${doc.core?.theSituation || ""}\n[THE PRESSURE]: ${doc.core?.thePressure || ""}`,
      personality: `GENRE / TONE: ${doc.core?.genreTone || ""}\nERA / SCALE: ${doc.core?.eraScale || ""}\nTHE CORE QUESTION: ${doc.core?.theQuestion || ""}`,
      scenario: `User Role: ${doc.user?.rolePosition || ""}\nStarting Inventory / Status: ${doc.user?.startsWith || ""}\nCentral Conflict: ${doc.conflict?.central || ""}\nCountdown Clock: ${doc.conflict?.clock || ""}`,
      first_mes: doc.opening?.firstMessage || "",
      mes_example: "",
      creator_notes: `Generated with Lore Bible Scenario Authoring Studio for Lumiverse.\nPremise Spark: ${doc.sparkText || ""}\nWorld Density: ${doc.physics?.density || "Standard"}`,
      system_prompt: (doc.opening as any)?.systemPrompt || "",
      post_history_instructions: (doc.opening as any)?.postHistoryInstructions || "",
      alternate_greetings: [],
      tags: Array.from(new Set(tags)),
      creator: "Lore Bible Studio",
      character_version: "1.0",
      character_book: {
        name: `${doc.core?.title || "Scenario"} Lorebook`,
        description: `Portable world lorebook generated for ${doc.core?.title || "Scenario"}`,
        extensions: {},
        scan_depth: 4,
        token_budget: 2048,
        recursive_scanning: true,
        entries: normalizedEntries,
      },
      extensions: {},
      group_only_greetings: [],
      assets: [],
    },
  };
}

function compileRuntimeArtifacts(doc: LoreBibleDocument) {
  const lore = compileLoreManifest(doc);
  const portable = serializePortableCharacterBook(lore);
  const card = compileCharacterArtifact(doc, lore);
  return { lore, portable, card };
}

export function generateCharacterCardExport(doc: LoreBibleDocument): string {
  const { portable, card } = compileRuntimeArtifacts(doc);
  return JSON.stringify(serializeCharacterCardV2(card, portable), null, 2);
}

export function generateCharacterCardV3(doc: LoreBibleDocument) {
  const { portable, card } = compileRuntimeArtifacts(doc);
  return serializeCharacterCardV3(card, portable);
}

export async function generateCharXBundle(doc: LoreBibleDocument): Promise<Blob> {
  const JSZipModule = await import("jszip");
  const JSZip = JSZipModule.default;
  const zip = new JSZip();

  const { lore, portable, card } = compileRuntimeArtifacts(doc);
  const cardV3 = serializeCharacterCardV3(card, portable);

  // Lumiverse CharX bundle requires card.json at archive root
  zip.file("card.json", JSON.stringify(cardV3, null, 2));

  // Add Lumiverse metadata description
  const lumiverseManifest = {
    bundle: "CharX",
    spec: "chara_card_v3",
    spec_version: "3.0",
    title: doc.core?.title || "Untitled Scenario",
    author: "Lore Bible Authoring Studio",
    exported_at: new Date().toISOString(),
    documentation: "https://lumiverse.chat/guides/characters/?h=Char#quick-links",
  };
  zip.file("lumiverse-manifest.json", JSON.stringify(lumiverseManifest, null, 2));
  zip.file("lorebible-compilation.json", JSON.stringify({
    artifact_profile: card.archetype,
    lore_manifest_id: lore.id,
    native_companion_available: true,
    portable_omissions: portable.omissions,
    evidence_status: "static_validated",
    runtime_verified: false,
    checks: ["card_ir_compiled", "portable_book_compiled", "charx_zip_created"],
  }, null, 2));

  return await zip.generateAsync({
    type: "blob",
    mimeType: "application/zip",
    compression: "DEFLATE",
    compressionOptions: { level: 6 },
  });
}

/**
 * 5. Plain-Text Brief: A human-readable pitch page.
 */
export function generatePlainTextBrief(doc: LoreBibleDocument): string {
  const lines: string[] = [];

  lines.push("================================================================================");
  lines.push(`                        ${doc.core.title.toUpperCase()}`);
  lines.push("                           SCENARIO PITCH BRIEF");
  lines.push("================================================================================\n");

  lines.push(`SPARK: "${doc.sparkText}"`);
  lines.push(`TONE & ERA: ${doc.core.genreTone} | ${doc.core.eraScale}`);
  lines.push(`DENSITY: ${doc.physics.density} World\n`);

  lines.push("--- THE PREMISE ---");
  lines.push(doc.core.pitch);
  lines.push("");

  lines.push("--- THE IRON RULES ---");
  lines.push(`• THE RULE: ${doc.core.theRule}`);
  lines.push(`• THE COST: ${doc.core.theCost}`);
  lines.push(`• THE SITUATION: ${doc.core.theSituation}`);
  lines.push(`• THE PRESSURE: ${doc.core.thePressure}`);
  lines.push(`• CORE QUESTION: ${doc.core.theQuestion}\n`);

  lines.push("--- THE PROTAGONIST'S POSITION ---");
  lines.push(`• ROLE: ${doc.user.rolePosition}`);
  lines.push(`• STARTS WITH: ${doc.user.startsWith}`);
  lines.push(`• WANTS: ${doc.user.wants}`);
  lines.push(`• FEARS: ${doc.user.fears}`);
  lines.push(`• THE HOOK: Pull: ${doc.user.hookPull} | Push: ${doc.user.hookPush} | Trap: ${doc.user.hookTrap}\n`);

  lines.push("--- KEY NPCS & CAST ---");
  (doc.npcs || []).slice(0, 6).forEach((npc) => {
    lines.push(`• ${npc.fields?.name || "Unnamed"} (${npc.fields?.role || "Cast"})`);
    lines.push(`  Wants: ${npc.fields?.wants || ""}`);
    lines.push(`  Voice: "${npc.fields?.voice || ""}"`);
    lines.push(`  Connection: ${npc.fields?.connection || ""}`);
  });
  lines.push("");

  lines.push("--- CENTRAL CONFLICT & CLOCK ---");
  lines.push(`• CONFLICT: ${doc.conflict.central}`);
  lines.push(`• OPPOSITION: ${doc.conflict.opposition}`);
  lines.push(`• CLOCK: ${doc.conflict.clock}`);
  lines.push(`• STAKES: ${doc.conflict.stakesBad} (Failure) / ${doc.conflict.stakesAcceptable} (Acceptable)\n`);

  lines.push("--- OPENING HOOK ---");
  lines.push(`Location: ${doc.opening.firstLocation} | NPC: ${doc.opening.firstNpc}`);
  lines.push(`First Choice: ${doc.opening.firstChoice}`);
  lines.push("");
  lines.push(doc.opening.firstMessage);
  lines.push("\n================================================================================");

  return lines.join("\n");
}
