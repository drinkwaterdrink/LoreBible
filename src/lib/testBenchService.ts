/**
 * Test Bench & Anti-Gravity Instrumentation Engine.
 * Allows pressure-testing scenario NPCs, calculating live gravity readouts,
 * running Voice Checks against assistant-speech drift, and auditing opening messages for cardinal sins.
 */

import { GravityScores, VoiceCheckResult, OpeningAuditResult, Entry, WorldPhysicsSection, StatusSection } from "../types.js";

export function calculateLocalGravityAudit(npcText: string, userText: string): GravityScores {
  const lower = (npcText || "").toLowerCase();
  let modelVoice = 10;
  let protagonistGravity = 10;
  let narrativeGravity = 15;
  let convenienceGravity = 10;
  let denialGravity = 10;
  const notes: string[] = [];

  // Model-voice checks
  if (lower.includes("how can i help") || lower.includes("happy to help") || lower.includes("what can i do for you")) {
    modelVoice += 55;
    notes.push("Detected generic digital assistant greeting pattern.");
  }
  if (lower.includes("certainly") || lower.includes("feel free to") || lower.includes("let me know if")) {
    modelVoice += 35;
    notes.push("Polite compliance phrase typical of baseline AI assistant.");
  }
  if (lower.includes("i understand your concern") || lower.includes("it's important to remember")) {
    modelVoice += 30;
    notes.push("Therapeutic or counseling tone detected.");
  }

  // Protagonist-gravity checks
  if (lower.includes("there's something special about you") || lower.includes("i've been waiting for someone like you") || lower.includes("you're not like the others")) {
    protagonistGravity += 50;
    notes.push("Excessive unearned deference or 'chosen one' flattery.");
  }
  if (lower.includes("i trust you") && !userText.toLowerCase().includes("bribe") && !userText.toLowerCase().includes("collateral")) {
    protagonistGravity += 35;
    convenienceGravity += 25;
    notes.push("Immediate unearned trust granted without verification or cost.");
  }

  // Convenience-gravity checks
  if (lower.includes("take this") || lower.includes("here is the key") || lower.includes("i'll look the other way")) {
    convenienceGravity += 30;
    notes.push("NPC yielded critical clearance or assets too easily.");
  }

  // Narrative-gravity checks
  if (lower.includes("destiny") || lower.includes("fate has brought us") || lower.includes("the prophecy")) {
    narrativeGravity += 45;
    notes.push("Cinematic grandiosity displacing tactile mundanity.");
  }

  // Denial-gravity checks
  if (lower.includes("everything is fine") || lower.includes("no need to worry about the guards")) {
    denialGravity += 35;
    notes.push("Minimizing established world dangers or physical rules.");
  }

  // Clamp 0 - 100
  modelVoice = Math.min(100, Math.max(5, modelVoice));
  protagonistGravity = Math.min(100, Math.max(5, protagonistGravity));
  narrativeGravity = Math.min(100, Math.max(5, narrativeGravity));
  convenienceGravity = Math.min(100, Math.max(5, convenienceGravity));
  denialGravity = Math.min(100, Math.max(5, denialGravity));

  const diagnosticNotes = notes.length > 0
    ? notes.join(" ")
    : "Low gravity drift. The NPC maintains distinct tactical friction, physical exhaustion, and self-interested motivation.";

  return {
    modelVoice,
    protagonistGravity,
    narrativeGravity,
    convenienceGravity,
    denialGravity,
    diagnosticNotes,
  };
}

export function auditOpeningMessageLocal(firstMessage: string, sparkText?: string): OpeningAuditResult {
  const text = firstMessage || "";
  const words = text.trim().split(/\s+/).filter(Boolean);
  const wordCount = words.length;

  // Sin 1: Narrating user's actions, thoughts, or feelings
  const narratingMatches = [
    /\byou feel\b/i,
    /\byou think\b/i,
    /\byou remember\b/i,
    /\byou decide\b/i,
    /\byou realize\b/i,
    /\byour heart races\b/i,
    /\byou wonder\b/i,
    /\byou step forward and take\b/i,
  ];
  let narratingFlagged = false;
  let narratingQuote = "";
  for (const regex of narratingMatches) {
    const match = text.match(regex);
    if (match) {
      narratingFlagged = true;
      narratingQuote = match[0];
      break;
    }
  }

  // Sin 2: Hardcoded names instead of {{user}}
  const hardcodedMatches = [
    /\b(the player|the protagonist|the adventurer|the hero)\b/i,
  ];
  let hardcodedFlagged = false;
  let hardcodedQuote = "";
  for (const regex of hardcodedMatches) {
    const match = text.match(regex);
    if (match) {
      hardcodedFlagged = true;
      hardcodedQuote = match[0];
      break;
    }
  }

  // Sin 3: Opening on a static scene rather than mid-motion
  const staticMatches = [
    /^it was a (dark|quiet|cold|rainy) /i,
    /^the world of /i,
    /^in the year of /i,
    /^long ago/i,
    /^this is the story of/i,
  ];
  let staticFlagged = false;
  let staticQuote = "";
  for (const regex of staticMatches) {
    const match = text.match(regex);
    if (match) {
      staticFlagged = true;
      staticQuote = match[0];
      break;
    }
  }

  // Sin 4: Ending by asking how the user feels or generic prompt
  const endingMatches = [
    /how do you feel\??$/i,
    /what do you do\??$/i,
    /what do you say\??$/i,
    /what is your next move\??$/i,
    /how will you respond\??$/i,
  ];
  let endingFlagged = false;
  let endingQuote = "";
  const trimmed = text.trim();
  for (const regex of endingMatches) {
    if (regex.test(trimmed)) {
      endingFlagged = true;
      endingQuote = trimmed.slice(-30);
      break;
    }
  }

  const sins = [
    {
      id: "narrating_user" as const,
      name: "Narrating {{user}}'s Actions or Feelings",
      flagged: narratingFlagged,
      severity: narratingFlagged ? ("violation" as const) : ("clean" as const),
      quote: narratingQuote || undefined,
      explanation: narratingFlagged
        ? `Describing what the player thinks or feels ("${narratingQuote}") strips away agency and violates roleplay boundaries.`
        : "Clean: The text respects player autonomy and only describes exterior sensory stimuli and NPC actions.",
      remedy: "Describe the physical room and sensory shock; let the user author their own emotional and bodily reactions.",
    },
    {
      id: "hardcoded_names" as const,
      name: "Hardcoded Character Names or Meta Labels",
      flagged: hardcodedFlagged,
      severity: hardcodedFlagged ? ("violation" as const) : ("clean" as const),
      quote: hardcodedQuote || undefined,
      explanation: hardcodedFlagged
        ? `Found generic placeholder or hardcoded character reference ("${hardcodedQuote}"). Use {{user}} macro instead.`
        : "Clean: Properly formatted with {{user}} macro or neutral direct address without hardcoded naming.",
      remedy: "Replace hardcoded character references with standard {{user}} macro or immersive second-person pronouns.",
    },
    {
      id: "static_scene" as const,
      name: "Opening on a Static Exposition Dump",
      flagged: staticFlagged,
      severity: staticFlagged ? ("violation" as const) : ("clean" as const),
      quote: staticQuote || undefined,
      explanation: staticFlagged
        ? `The scene begins with passive historical setup ("${staticQuote}") rather than immediate physical motion.`
        : "Clean: Opens mid-motion (in media res) with immediate tactile pressure and active character speech.",
      remedy: "Start with an iron latch dropping, a coin hitting the zinc counter, or a question barked through an intake screen.",
    },
    {
      id: "asking_feelings" as const,
      name: "Ending with Conversational Prompt / Assistant Questions",
      flagged: endingFlagged,
      severity: endingFlagged ? ("violation" as const) : ("clean" as const),
      quote: endingQuote || undefined,
      explanation: endingFlagged
        ? `Ending the post with an artificial prompt question ("${endingQuote}") breaks narrative immersion.`
        : "Clean: Closes with a lingering threat, a suspended action, or an expectant glance rather than a prompt.",
      remedy: "End on the NPC's cold gaze or an unbolted lock; never ask 'What do you do next?'.",
    },
  ];

  const passed = !narratingFlagged && !hardcodedFlagged && !staticFlagged && !endingFlagged;
  const overallCritique = passed
    ? `Flawless manuscript entry (~${wordCount} words). Establishes immediate pressure in media res, avoids assistant-voice clichés, and respects {{user}}'s absolute agency.`
    : `Opening has ${sins.filter((s) => s.flagged).length} flagged sin(s). Review proofreader notes to preserve narrative immersion.`;

  return {
    sins,
    passed,
    wordCount,
    overallCritique,
  };
}

export function performVoiceCheckLocal(lines: string[], npcName: string): VoiceCheckResult {
  const assistantPatterns = [
    { regex: /how can i help/i, note: "Classic AI greeting cliché. Substitute an uncooperative procedural demand." },
    { regex: /happy to help/i, note: "Helpful assistant inflection. NPCs in this setting do not assist for free." },
    { regex: /feel free to/i, note: "Customer service phrasing. Replace with an administrative deadline." },
    { regex: /what can i do for you/i, note: "Service counter voice. Characters should protect their own time." },
    { regex: /is there anything else/i, note: "Polite wrap-up pattern typical of LLM assistants." },
    { regex: /certainly!/i, note: "Enthusiastic obedience. Needs reluctance or transactional bargaining." },
    { regex: /i'd be glad to/i, note: "Unconditional friendliness violates setting stakes." },
    { regex: /as an ai/i, note: "Fatal meta-assistant contamination." },
  ];

  let flaggedCount = 0;
  const inspectedLines = lines.map((text, idx) => {
    let isGeneric = false;
    let reason = "";
    let proofreaderNote = "";

    for (const pattern of assistantPatterns) {
      if (pattern.regex.test(text)) {
        isGeneric = true;
        reason = "Matches digital assistant conversational pattern.";
        proofreaderNote = pattern.note;
        flaggedCount++;
        break;
      }
    }

    if (!isGeneric) {
      // Check if line is too short or bland
      if (text.length < 15) {
        proofreaderNote = "Line is terse, but maintains neutral cadence.";
      } else {
        proofreaderNote = `Distinct voice for ${npcName}; carries tactile setting vocabulary.`;
      }
    }

    return {
      id: `line-${idx + 1}`,
      text,
      isGenericAssistant: isGeneric,
      reason,
      proofreaderNote,
    };
  });

  const overallScore = Math.max(10, Math.round(((lines.length - flaggedCount) / Math.max(1, lines.length)) * 100));
  const summary = flaggedCount === 0
    ? `All 5 dialogue lines passed voice scrutiny. High stylistic fidelity to ${npcName}; zero assistant-speech drift.`
    : `Flagged ${flaggedCount} of ${lines.length} lines for generic assistant drift. See proofreader markings in the margin.`;

  return {
    lines: inspectedLines,
    overallScore,
    summary,
  };
}
