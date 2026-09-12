/**
 * geminiService.ts
 * Centralized service layer for API calls, parsing, streaming, and export generation.
 */

import {
  CanonConfig,
  DivergenceTake,
  LoreBibleDocument,
  PhysicsConfig,
  SparkParse,
  ProceduralRollGroup,
  TestBenchMessage,
  GravityScores,
  VoiceCheckResult,
  OpeningAuditResult,
  Entry,
  ConsistencyFinding,
  VariantSlip,
  GenerationSettings,
  SemanticRerollType,
} from "../types";
import type { GenerationProgressEvent, GenerationStreamEvent, GenerationUsage } from "../contracts/generationProgress";
import { consumeGenerationSse } from "./sseStream";
import { GenerationRequestError, parseGenerationFailurePayload } from "../contracts/generationFailure";
import { parsePremiseSuggestionSet, type PremiseSuggestionSet } from "../contracts/premiseSuggestions";

async function throwResponseFailure(res: Response, fallback: string): Promise<never> {
  const data = await res.json().catch(() => null);
  try {
    throw new GenerationRequestError(parseGenerationFailurePayload(data), res.status);
  } catch (error) {
    if (error instanceof GenerationRequestError) throw error;
    const record = data && typeof data === "object" ? data as Record<string, unknown> : {};
    throw new Error(typeof record.message === "string" ? record.message : typeof record.error === "string" ? record.error : fallback);
  }
}

export interface ParseSparkResult extends SparkParse {}

export interface DivergenceResult {
  takes: DivergenceTake[];
}

export async function generatePremiseSuggestionsApi(
  settings: GenerationSettings,
  options?: { signal?: AbortSignal; onEvent?: (event: GenerationStreamEvent) => void },
): Promise<PremiseSuggestionSet> {
  const res = await fetch("/api/premise-suggestions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "text/event-stream" },
    body: JSON.stringify({ settings }),
    signal: options?.signal,
  });
  if (!res.ok) return throwResponseFailure(res, `Premise generation failed with HTTP ${res.status}`);
  const terminal = await consumeGenerationSse(res, {
    signal: options?.signal,
    onEvent: (event) => {
      if (event.type !== "done" && event.type !== "error" && event.type !== "cancelled") options?.onEvent?.(event);
    },
  });
  if (terminal.type === "cancelled") throw new DOMException(terminal.message, "AbortError");
  if (terminal.type === "error") throw new GenerationRequestError({
    error: "generation_failed",
    message: terminal.message,
    code: terminal.code as any || "INTERNAL_ERROR",
    action: terminal.action || "retry",
    retryable: terminal.retryable ?? false,
    retryAfterMs: terminal.retryAfterMs,
    operation: terminal.task,
  }, 0);
  return parsePremiseSuggestionSet(terminal.result);
}

export async function parseSparkApi(sparkText: string, settings?: GenerationSettings, signal?: AbortSignal): Promise<ParseSparkResult> {
  const res = await fetch("/api/parse-spark", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sparkText, settings }),
    signal,
  });
  if (!res.ok) {
    return throwResponseFailure(res, `Parse failed with HTTP ${res.status}`);
  }
  return await res.json();
}

export async function fetchDivergenceTakes(
  sparkText: string,
  parse: SparkParse,
  canon: CanonConfig,
  pushInstruction?: string,
  settings?: GenerationSettings,
  options?: {
    signal?: AbortSignal;
    onEvent?: (event: GenerationStreamEvent) => void;
    sourceTake?: DivergenceTake;
    operation?: "initial" | "reroll_all" | "push_further";
  },
): Promise<DivergenceTake[]> {
  const sourceTake = options?.sourceTake
    ? (() => {
        const { versions: _versions, versionIndex: _versionIndex, ...selectedSnapshot } = options.sourceTake;
        return selectedSnapshot;
      })()
    : undefined;
  const res = await fetch("/api/divergence", {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "text/event-stream" },
    body: JSON.stringify({
      sparkText,
      parse,
      canon,
      pushInstruction,
      settings,
      sourceTake,
      operation: options?.operation,
    }),
    signal: options?.signal,
  });
  if (!res.ok) {
    return throwResponseFailure(res, `Divergence failed with HTTP ${res.status}`);
  }
  const contentType = res.headers.get("Content-Type") || "";
  let data: any;
  if (contentType.includes("text/event-stream")) {
    const terminal = await consumeGenerationSse(res, { signal: options?.signal, onEvent: (event) => options?.onEvent?.(event) });
    if (terminal.type === "error") throw new GenerationRequestError({
      error: "generation_failed",
      message: terminal.message,
      code: terminal.code as any || "INTERNAL_ERROR",
      action: terminal.action || "retry",
      retryable: terminal.retryable ?? false,
      retryAfterMs: terminal.retryAfterMs,
      operation: terminal.task,
    }, 0);
    if (terminal.type === "cancelled") throw new DOMException(terminal.message, "AbortError");
    data = terminal.result;
  } else {
    data = await res.json();
  }
  if (!data.takes || data.takes.length === 0) {
    throw new Error("Divergence endpoint returned zero takes.");
  }
  return data.takes;
}

export async function fetchSingleDivergenceTake(params: {
  sparkText: string;
  parse: SparkParse;
  canon: CanonConfig;
  targetAngle: string;
  currentTake?: DivergenceTake;
  steerInstruction?: string;
  settings?: GenerationSettings;
  rerollType?: SemanticRerollType;
  signal?: AbortSignal;
}): Promise<DivergenceTake> {
  const { signal, ...body } = params;
  const res = await fetch("/api/divergence-single", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal,
  });
  if (!res.ok) {
    return throwResponseFailure(res, `Single divergence failed with HTTP ${res.status}`);
  }
  const data = await res.json();
  if (!data.take) {
    throw new Error("Divergence single endpoint returned empty take.");
  }
  return data.take;
}

export interface ForgeCallbacks {
  onLog: (log: { stage: string; label: string; status: "pending" | "active" | "done" }) => void;
  onSection: (sectionKey: string, data: any) => void;
  onComplete: (document: LoreBibleDocument) => void;
  onError: (error: string) => void;
  onProgress?: (event: GenerationProgressEvent) => void;
  onUsage?: (usage: GenerationUsage) => void;
  onReasoning?: (delta: string, complete?: boolean) => void;
  onHeartbeat?: () => void;
  onProviderActivity?: (at: number) => void;
  onOutputDelta?: (characters: number) => void;
  onCancelled?: (message: string) => void;
}

export async function streamForgeDocument(
  params: {
    sparkText: string;
    parse: SparkParse;
    canon: CanonConfig;
    physics: PhysicsConfig;
    chosenTake: DivergenceTake;
    settings?: GenerationSettings;
  },
  callbacks: ForgeCallbacks,
  signal?: AbortSignal,
): Promise<void> {
  try {
    const res = await fetch("/api/forge", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(params),
      signal,
    });

    if (!res.ok || !res.body) {
      throw new Error(`Forge request failed with HTTP ${res.status}`);
    }

    const terminal = await consumeGenerationSse(res, { signal, onEvent: (event) => {
      if (event.type === "progress") callbacks.onProgress?.(event);
      else if (event.type === "usage") callbacks.onUsage?.(event.usage);
      else if (event.type === "reasoning") callbacks.onReasoning?.(event.delta, event.complete);
      else if (event.type === "heartbeat") callbacks.onHeartbeat?.();
      else if (event.type === "provider_activity") callbacks.onProviderActivity?.(event.at);
      else if (event.type === "output_delta") callbacks.onOutputDelta?.(event.characters);
      else if (event.type === "section") callbacks.onSection(event.key, event.data);
    } });
    if (terminal.type === "done") callbacks.onComplete((terminal.result as { document: LoreBibleDocument }).document);
    else if (terminal.type === "cancelled") callbacks.onCancelled?.(terminal.message);
    else callbacks.onError(terminal.message);
  } catch (err: any) {
    if (err?.name === "AbortError") callbacks.onCancelled?.("Forge stopped.");
    else {
      console.error("Stream forge error:", err);
      callbacks.onError(err.message || "Forge error");
    }
  }
}

/**
 * Format document as clean Markdown conforming to Section 3 of the Generator System Prompt
 */
function legacyExportToMarkdown(doc: LoreBibleDocument): string {
  let md = `# ${doc.core.title}\n\n`;
  md += `> ${doc.core.pitch}\n\n`;

  md += `### CORE [P]\n`;
  md += `- **TITLE** — ${doc.core.title}\n`;
  md += `- **PITCH** — ${doc.core.pitch}\n`;
  md += `- **GENRE / TONE** — ${doc.core.genreTone}\n`;
  md += `- **ERA / SCALE** — ${doc.core.eraScale}\n`;
  md += `- **THE RULE** — ${doc.core.theRule}\n`;
  md += `- **THE COST** — ${doc.core.theCost}\n`;
  md += `- **THE SITUATION** — ${doc.core.theSituation}\n`;
  md += `- **THE PRESSURE** — ${doc.core.thePressure}\n`;
  md += `- **THE QUESTION** — ${doc.core.theQuestion}\n\n`;

  md += `### USER [P]\n`;
  md += `- **ROLE / POSITION** — ${doc.user.rolePosition}\n`;
  md += `- **STARTS WITH** — ${doc.user.startsWith}\n`;
  md += `- **WANTS / FEARS** — ${doc.user.wants} / ${doc.user.fears}\n`;
  md += `- **HOOK — PULL / PUSH / TRAP** — ${doc.user.hookPull} · ${doc.user.hookPush} · ${doc.user.hookTrap}\n\n`;

  md += `### WORLD PHYSICS [C]\n`;
  doc.worldPhysics.rules.forEach((r, idx) => {
    md += `${r.fields.rule || `RULE ${idx + 1}: ${r.fields.name}`} · PROFITS: ${r.fields.profits || "—"} · PAYS: ${r.fields.pays || "—"} KEYS: ${r.keys.join(", ")}\n`;
  });
  md += `- **AUTHORITY CHECK:** ${doc.worldPhysics.authorityCheck}\n`;
  md += `- **POWER CEILING:** ${doc.worldPhysics.powerCeiling}\n`;
  md += `- **FAULT LINES:** ${doc.worldPhysics.faultLines.join(" · ")}\n\n`;

  md += `### STATUS [P]\n`;
  md += `> ${doc.status.content}\n`;
  md += `\`${doc.status.settings}\`\n\n`;

  md += `### LOCATION SEEDS [C]\n`;
  doc.locations.forEach((loc) => {
    md += `${loc.fields.name} — ${loc.fields.function} — ${loc.fields.mood} — ${loc.fields.whatsWrong} KEYS: ${loc.keys.join(", ")}\n`;
  });
  md += `\n`;

  md += `### FACTION SEEDS [C]\n`;
  doc.factions.forEach((f) => {
    md += `${f.fields.name} — ${f.fields.publicFace} — ${f.fields.trueAgenda} — ${f.fields.independentWant} — ${f.fields.stanceTowardUser} KEYS: ${f.keys.join(", ")}\n`;
  });
  md += `\n`;

  md += `### NPC SEEDS [C]\n`;
  doc.npcs.forEach((n) => {
    md += `\`\`\`\n`;
    md += `${n.fields.name} — ${n.fields.role}\n`;
    md += `WANTS: ${n.fields.wants}\n`;
    md += `BODY: ${n.fields.body}\n`;
    md += `VOICE: ${n.fields.voice}\n`;
    md += `NOT-DEFAULT: ${n.fields.notDefault}\n`;
    md += `HOLDS: ${n.fields.holds}\n`;
    md += `CONNECTION: ${n.fields.connection}\n`;
    md += `KEYS: ${n.keys.join(", ")}\n`;
    md += `\`\`\`\n\n`;
  });

  md += `### RELATIONSHIP WEB [C]\n`;
  doc.relationshipWeb.forEach((w) => {
    md += `${w.fields.relation || w.fields.source + " → " + w.fields.target + ": " + w.fields.bond}\n`;
  });
  md += `\n`;

  md += `### KNOWLEDGE MAP [C]\n`;
  doc.knowledgeMap.forEach((k) => {
    md += `${k.fields.truth} — KNOWS: ${k.fields.knows} — SUSPECTS: ${k.fields.suspects} — BELIEVES FALSE: ${k.fields.believesFalse} — surfaces when: ${k.fields.surfacesWhen} FILTER: ${k.fields.filter || "none"}\n`;
  });
  md += `\n`;

  md += `### ITEM / ABILITY SEEDS [C]\n`;
  doc.items.forEach((item) => {
    md += `${item.fields.name} — ${item.fields.whatItDoes} — ${item.fields.costOrLimit} — ${item.fields.unfiredGun} KEYS: ${item.keys.join(", ")}\n`;
  });
  md += `\n`;

  md += `### SECRET SEEDS [C]\n`;
  doc.secrets.forEach((sec) => {
    md += `${sec.fields.truth} — WHO KEEPS IT: ${sec.fields.whoKeepsIt} — HOW: ${sec.fields.howKept} — TRIGGER: ${sec.fields.discoveryTrigger} — CHANGES: ${sec.fields.whatItChanges} KEYS: ${sec.keys.join(", ")}\n`;
  });
  md += `\n`;

  md += `### CONFLICT [P]\n`;
  md += `- **CENTRAL** — ${doc.conflict.central}\n`;
  md += `- **OPPOSITION** — ${doc.conflict.opposition}\n`;
  md += `- **STAKES** — Bad: ${doc.conflict.stakesBad} | Acceptable: ${doc.conflict.stakesAcceptable}\n`;
  md += `- **CLOCK** — ${doc.conflict.clock}\n`;
  md += `- **MORAL KNOT** — ${doc.conflict.moralKnot}\n`;
  md += `- **THE YIELD** — ${doc.conflict.theYield}\n`;
  md += `- **SPEED BUMPS** — ${doc.conflict.speedBumps.join(" · ")}\n\n`;

  md += `### PRESSURE PROTOCOL [P]\n`;
  md += `> ${doc.pressureProtocol}\n\n`;

  md += `### OPENING [T]\n`;
  md += `- **FIRST LOCATION / FIRST NPC / FIRST CHOICE** — ${doc.opening.firstLocation} · ${doc.opening.firstNpc} · ${doc.opening.firstChoice}\n`;
  md += `- **STYLE:** ${doc.opening.style}\n`;
  md += `- **FIRST MESSAGE:**\n\n${doc.opening.firstMessage}\n\n`;

  md += `### EXPANSION NOTES [P]\n`;
  md += `EXPLICIT [${doc.expansionNotes.explicit}] · VIOLENCE [${doc.expansionNotes.violence}] · HORROR [${doc.expansionNotes.horror}] · ROMANCE [${doc.expansionNotes.romance}] · HUMOR [${doc.expansionNotes.humor}] · PACING [${doc.expansionNotes.pacing}] · PLAYER DEATH [${doc.expansionNotes.playerDeath}] · ALL CHARACTERS ADULT [${doc.expansionNotes.allCharactersAdult ? "Yes" : "No"}]\n\n`;

  md += `### ANTI-GRAVITY NOTE [P]\n`;
  doc.antiGravity.temptations.forEach((t) => {
    md += `- **${t.temptation}**: ${t.counter}\n`;
  });

  return md;
}

/**
 * Format document for SillyTavern character card JSON v2 with World Info
 */
function legacyExportToSillyTavern(doc: LoreBibleDocument): string {
  const lorebookEntries = [
    ...doc.locations.map((loc, i) => ({
      uid: 250 + i,
      key: loc.keys,
      keysecondary: [],
      comment: `Location: ${loc.fields.name}`,
      content: `${loc.fields.name} — ${loc.fields.function} — ${loc.fields.mood} — ${loc.fields.whatsWrong}`,
      constant: loc.permanence === "P",
      selective: true,
      order: 250,
      position: 1,
      disable: false,
    })),
    ...doc.factions.map((f, i) => ({
      uid: 150 + i,
      key: f.keys,
      keysecondary: [],
      comment: `Faction: ${f.fields.name}`,
      content: `${f.fields.name} — ${f.fields.publicFace} — ${f.fields.trueAgenda} — ${f.fields.independentWant} — ${f.fields.stanceTowardUser}`,
      constant: false,
      selective: true,
      order: 150,
      position: 1,
      disable: false,
    })),
    ...doc.npcs.map((n, i) => ({
      uid: 100 + i,
      key: n.keys,
      keysecondary: [],
      comment: `NPC: ${n.fields.name}`,
      content: `${n.fields.name} — ${n.fields.role}\nWANTS: ${n.fields.wants}\nBODY: ${n.fields.body}\nVOICE: ${n.fields.voice}\nNOT-DEFAULT: ${n.fields.notDefault}\nHOLDS: ${n.fields.holds}\nCONNECTION: ${n.fields.connection}`,
      constant: false,
      selective: true,
      order: 100,
      position: 1,
      disable: false,
    })),
    ...(doc.secrets || []).map((s, i) => {
      const truthText = s.fields?.truth || s.fields?.name || "";
      return {
        uid: 300 + i,
        key: s.keys || [],
        keysecondary: [],
        comment: `Secret: ${truthText.slice(0, 30)}`,
        content: `${truthText} — WHO KEEPS IT: ${s.fields?.whoKeepsIt || ""} — HOW: ${s.fields?.howKept || ""} — TRIGGER: ${s.fields?.discoveryTrigger || ""} — CHANGES: ${s.fields?.whatItChanges || ""}`,
        constant: false,
        selective: true,
        order: 300,
        position: 1,
        disable: s.disabledUntilEarned || false,
      };
    }),
  ];

  const card = {
    spec: "chara_card_v2",
    spec_version: "2.0",
    data: {
      name: doc.core.title,
      description: `${doc.core.pitch}\n\n[THE RULE]: ${doc.core.theRule}\n[THE COST]: ${doc.core.theCost}\n[THE SITUATION]: ${doc.core.theSituation}\n[THE PRESSURE]: ${doc.core.thePressure}`,
      personality: `GENRE / TONE: ${doc.core.genreTone}\nERA / SCALE: ${doc.core.eraScale}\nTHE QUESTION: ${doc.core.theQuestion}`,
      scenario: `User Role: ${doc.user.rolePosition}\nStarting With: ${doc.user.startsWith}\nCentral Conflict: ${doc.conflict.central}\nClock: ${doc.conflict.clock}`,
      first_mes: doc.opening.firstMessage,
      mes_example: "",
      creator_notes: `Generated with Lore Bible Scenario Authoring Studio.\nSpark: ${doc.sparkText}`,
      character_book: {
        name: `${doc.core.title} Lorebook`,
        description: `World info generated for ${doc.core.title}`,
        scan_depth: 4,
        token_budget: 2048,
        recursive_scanning: true,
        entries: lorebookEntries,
      },
    },
  };

  return JSON.stringify(card, null, 2);
}

// ==========================================
// STAGE 5 (REFINE) CLIENT API FUNCTIONS
// ==========================================

export async function rerollEntryApi(
  document: LoreBibleDocument,
  sectionKey: string,
  entryId: string,
  instruction?: string,
  settings?: GenerationSettings,
): Promise<Entry> {
  const res = await fetch("/api/refine/entry-reroll", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ document, sectionKey, entryId, instruction, settings }),
  });
  if (!res.ok) {
    return throwResponseFailure(res, `Reroll failed with HTTP ${res.status}`);
  }
  const data = await res.json();
  return data.updatedEntry;
}

export async function fetchVariantsApi(
  document: LoreBibleDocument,
  sectionKey: string,
  entryId: string,
  settings?: GenerationSettings,
): Promise<VariantSlip[]> {
  const res = await fetch("/api/refine/variants", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ document, sectionKey, entryId, settings }),
  });
  if (!res.ok) {
    return throwResponseFailure(res, `Failed to fetch variants with HTTP ${res.status}`);
  }
  const data = await res.json();
  return data.variants || [];
}

export async function pushEntryApi(
  document: LoreBibleDocument,
  sectionKey: string,
  entryId: string,
  pushInstruction: string,
  settings?: GenerationSettings,
): Promise<Entry> {
  const res = await fetch("/api/refine/entry-push", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ document, sectionKey, entryId, pushInstruction, settings }),
  });
  if (!res.ok) {
    return throwResponseFailure(res, `Push failed with HTTP ${res.status}`);
  }
  const data = await res.json();
  return data.updatedEntry;
}

export async function regenerateSectionApi(
  document: LoreBibleDocument,
  sectionKey: string,
  addCount?: number,
  settings?: GenerationSettings,
): Promise<Entry[]> {
  const res = await fetch("/api/refine/section-regen", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ document, sectionKey, addCount, settings }),
  });
  if (!res.ok) {
    return throwResponseFailure(res, `Section regeneration failed with HTTP ${res.status}`);
  }
  const data = await res.json();
  return data.entries || [];
}

export async function auditConsistencyApi(document: LoreBibleDocument): Promise<ConsistencyFinding[]> {
  const res = await fetch("/api/refine/consistency-audit", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ document }),
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || `Audit failed with HTTP ${res.status}`);
  }
  const data = await res.json();
  return data.findings || [];
}

export async function suggestRollsApi(params: {
  sparkText: string;
  parse?: SparkParse;
  canon?: CanonConfig;
  physics?: PhysicsConfig;
  settings?: GenerationSettings;
}): Promise<ProceduralRollGroup[]> {
  const res = await fetch("/api/suggest-rolls", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });
  if (!res.ok) {
    return throwResponseFailure(res, `Failed to fetch suggested rolls (${res.status})`);
  }
  const data = await res.json();
  return data.proceduralRolls || [];
}

export async function testBenchTurnApi(params: {
  npc: Entry;
  worldPhysics?: any;
  status?: any;
  history: TestBenchMessage[];
  userInput: string;
  sparkText?: string;
  canon?: CanonConfig;
  settings?: GenerationSettings;
}): Promise<{ reply: string; gravity: GravityScores }> {
  const res = await fetch("/api/test-bench-turn", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });
  if (!res.ok) {
    return throwResponseFailure(res, `Test bench turn failed (${res.status})`);
  }
  return await res.json();
}

export async function voiceCheckApi(params: {
  lines: string[];
  npcName: string;
  worldContext?: string;
}): Promise<VoiceCheckResult> {
  const res = await fetch("/api/voice-check", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || `Voice check failed (${res.status})`);
  }
  return await res.json();
}

export async function openingAuditApi(params: {
  firstMessage: string;
  sparkText?: string;
  rolePosition?: string;
}): Promise<OpeningAuditResult> {
  const res = await fetch("/api/opening-audit", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || `Opening audit failed (${res.status})`);
  }
  return await res.json();
}
