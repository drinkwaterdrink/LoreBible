/**
 * High-fidelity deterministic synthesis generators for Lore Bible.
 * Ensures the generation and forge pipelines NEVER stall or crash on API quota/rate limits,
 * providing rich, thematic scenario manuscripts tailored to the user's spark and canon.
 */

import { Entry, ProceduralRollGroup } from "../types.js";

interface BundleParams {
  sparkText: string;
  parse?: any;
  canon?: any;
  chosenTake?: any;
  physics?: any;
  existingDoc?: any;
}

export function cleanAngleLabel(rawAngle: string, index: number = 0): string {
  if (!rawAngle || typeof rawAngle !== "string") {
    const defaults = ["Interpersonal Friction", "Structural Pressure", "The Hidden Truth", "Ticking Crucible"];
    return defaults[index % 4];
  }
  const str = rawAngle.trim();
  // If it's already a concise label, keep it directly
  if (str.length <= 40 && !str.includes("\n")) {
    return str;
  }
  const words = str.split(/\s+/).slice(0, 4).join(" ");
  return words.length > 35 ? words.slice(0, 34) : words;
}

export function generateSuggestedRollGroups(params: BundleParams): ProceduralRollGroup[] {
  const spark = params.sparkText || "Scenario Action";
  const primaryNoun = params.parse?.nonNegotiables?.[0] || "Resolution";
  const now = Date.now();

  return [
    {
      id: `roll-action-${now}`,
      name: "Tactical & Direct Action Outcome",
      triggerKeys: ["CHECK", "ACTION", "ATTEMPT", "TEST", "EFFORT"],
      settings: "Position: System | Depth: 0 | Order: 100 | Prevent-Recursion: On | Sticky: 4",
      entries: [
        {
          id: `ent-${now}-1`,
          weight: 20,
          outcome: `Clean Breakthrough: Complete success without unexpected complications; grants positional initiative and clear forward momentum.`,
        },
        {
          id: `ent-${now}-2`,
          weight: 50,
          outcome: `Success with Friction: The core intent succeeds, but draws unexpected attention, exhausts an asset, or introduces an immediate social/practical complication.`,
        },
        {
          id: `ent-${now}-3`,
          weight: 20,
          outcome: `Costly Stalemate: Progress is stalled; requires a personal compromise, temporary concession, or unexpected resource expenditure to break the deadlock.`,
        },
        {
          id: `ent-${now}-4`,
          weight: 10,
          outcome: `Decisive Reversal: An unforeseen obstacle intervenes, flipping the immediate dynamic and demanding an alternative approach.`,
        },
      ],
    },
    {
      id: `roll-npc-${now + 1}`,
      name: "Encounter Disposition & Social Dynamic",
      triggerKeys: ["ENCOUNTER", "MEETING", "APPROACH", "CONVERSATION", "DISPOSITION"],
      settings: "Position: System | Depth: 0 | Order: 100 | Prevent-Recursion: On | Sticky: 4",
      entries: [
        {
          id: `ent-${now + 1}-1`,
          weight: 25,
          outcome: `Receptive or Distracted: The party is occupied with their own pressing priorities; receptive to straightforward engagement without active pushback.`,
        },
        {
          id: `ent-${now + 1}-2`,
          weight: 50,
          outcome: `Cautious / Transactional: Guards their position carefully; requires demonstrable reciprocity, mutual benefit, or trusted standing before engaging openly.`,
        },
        {
          id: `ent-${now + 1}-3`,
          weight: 25,
          outcome: `Protective or Guarded: Senses competing interests; tightens their circle and raises defensive barriers or demands formal concessions.`,
        },
      ],
    },
    {
      id: `roll-environment-${now + 2}`,
      name: "Environmental & Situational Pressure",
      triggerKeys: ["ENVIRONMENT", "SITUATION", "TIMING", "PASSAGE", "SHIFT"],
      settings: "Position: System | Depth: 0 | Order: 100 | Prevent-Recursion: On | Sticky: 4",
      entries: [
        {
          id: `ent-${now + 2}-1`,
          weight: 30,
          outcome: `Favorable Window: Surrounding conditions offer a brief period of clarity, stillness, or privacy.`,
        },
        {
          id: `ent-${now + 2}-2`,
          weight: 45,
          outcome: `Rising Complication: Environmental noise, shifting schedules, or third-party interference compresses available response time.`,
        },
        {
          id: `ent-${now + 2}-3`,
          weight: 25,
          outcome: `Sudden Turning Point: An abrupt shift in the local situation forces an immediate decision before plans can be adjusted.`,
        },
      ],
    },
  ];
}

export function generateDeterministicBundle(bundleIndex: number, params: BundleParams): Record<string, any> {
  const { sparkText, parse, canon, chosenTake, physics, existingDoc } = params;
  const nonNegs = parse?.nonNegotiables || [];
  const primaryNonNeg = nonNegs[0] || (sparkText || "").slice(0, 32).trim() || "The Core Setting";
  const secondaryNonNeg = nonNegs[1] || "The Primary Threshold";
  const tertiaryNonNeg = nonNegs[2] || "The Critical Asset";
  const userRole = parse?.userRole || "The Protagonist";
  const tone = chosenTake?.genreTone || parse?.registerWords?.join(", ") || "grounded, distinct";
  const title = chosenTake?.title || `${primaryNonNeg}: The Scenario`;
  const pitch = chosenTake?.pitch || `A scenario centering on ${primaryNonNeg}, governed by strict causality and authentic stakes.`;

  const now = Date.now();

  switch (bundleIndex) {
    case 1: {
      return {
        core: {
          title,
          pitch,
          genreTone: tone,
          eraScale: "Contemporary or period-appropriate to the premise",
          theRule: `Actions within this domain carry direct material consequences that cannot be bypassed with unearned charm.`,
          theCost: `Advancing one priority inevitably forces a concession or vulnerability in another.`,
          theSituation: `A delicate equilibrium around ${primaryNonNeg} has reached a point of active friction.`,
          thePressure: `Time and scrutiny are limited; delaying a choice forces an undesirable default outcome.`,
          theQuestion: `Can {{user}} navigate the competing demands of this situation without compromising their foundational objective?`,
          permanence: "P",
        },
        user: {
          rolePosition: userRole,
          startsWith: `Essential gear, identification, and a single item of personal or strategic significance tied to ${primaryNonNeg}.`,
          wants: `To secure their standing and resolve the central complication without incurring catastrophic liability.`,
          fears: `Losing autonomy, being compromised by adversaries, or failing those who rely on them.`,
          hookPull: `A vital lead or resource that offers a path forward if reached in time.`,
          hookPush: `An escalating external demand or deadline that prevents passive waiting.`,
          hookTrap: `An apparently easy compromise that quietly surrenders vital leverage.`,
          permanence: "P",
        },
        worldPhysics: {
          authorityCheck: `Established rules, overseers, or societal pressures actively enforce boundaries within this domain.`,
          powerCeiling: `Capabilities operate under realistic material limits, energy budgets, and emotional friction.`,
          faultLines: [
            `The friction between incumbent figures and emerging disruptions`,
            `Conflicting claims over ${secondaryNonNeg}`,
            `An impending deadline that forces private tensions into the open`,
          ],
          rules: [
            {
              id: `rule-${now}-1`,
              fields: {
                rule: `Every significant intervention produces an observable footprint and requires resources.`,
                profits: `Rewards preparation, discretion, and methodical execution.`,
                pays: `Reckless action draws immediate and disproportionate scrutiny.`,
              },
              keys: ["CONSEQUENCE", "DISCRETION", "RESOURCES"],
              permanence: "C",
              locked: false,
            },
            {
              id: `rule-${now}-2`,
              fields: {
                rule: `Trust is transactional and conditional; loyalties depend on aligned self-interest.`,
                profits: `Encourages mutual transparency and clear agreements.`,
                pays: `Unspoken assumptions lead to rapid betrayal under pressure.`,
              },
              keys: ["TRUST", "ALLIANCE", "CONDITIONALITY"],
              permanence: "C",
              locked: false,
            },
            {
              id: `rule-${now}-3`,
              fields: {
                rule: `No single faction or individual commands absolute control over the environment.`,
                profits: `Creates opportunities for leverage, negotiation, and shifting coalitions.`,
                pays: `Overconfidence in any single alliance guarantees blind spots.`,
              },
              keys: ["BALANCE", "LEVERAGE", "VOLATILITY"],
              permanence: "C",
              locked: false,
            },
          ],
          permanence: "C",
        },
        status: {
          content: `[STATUS: {{user}} | Standing: Active | Focus: ${primaryNonNeg} | Scrutiny: Moderate | Complications: None Immediate]`,
          settings: `Keep status concise, updating only when physical conditions, standing, or vital resources change.`,
          permanence: "P",
        },
      };
    }

    case 2: {
      return {
        locations: [
          {
            id: `loc-${now}-1`,
            fields: {
              name: `The Heart of ${primaryNonNeg}`,
              function: `The central staging ground where primary interactions and formal exchanges take place.`,
              mood: `Charged with focused activity, subtle observation, and unspoken expectations.`,
              whatsWrong: `A critical resource or communication channel here has become unreliable.`,
            },
            keys: ["CORE", "CENTRAL", "PRIMARY"],
            permanence: "C",
            locked: false,
          },
          {
            id: `loc-${now}-2`,
            fields: {
              name: `The Perimeter of ${secondaryNonNeg}`,
              function: `An adjacent zone offering temporary respite, clandestine meetings, or alternate access.`,
              mood: `Quiet, guarded, and removed from direct scrutiny.`,
              whatsWrong: `Signs of recent unrecorded intrusion or unauthorized surveillance.`,
            },
            keys: ["PERIMETER", "THRESHOLD", "CLANDESTINE"],
            permanence: "C",
            locked: false,
          },
          {
            id: `loc-${now}-3`,
            fields: {
              name: `The Archive / Reserve of ${tertiaryNonNeg}`,
              function: `A repository where records, reserves, or critical assets are preserved under lock.`,
              mood: `Controlled, orderly, and smelling of age, dust, and security precautions.`,
              whatsWrong: `An essential ledger or record is conspicuously missing or altered.`,
            },
            keys: ["ARCHIVE", "RESERVE", "RECORDS"],
            permanence: "C",
            locked: false,
          },
        ],
        factions: [
          {
            id: `fac-${now}-1`,
            fields: {
              name: `The Established Custodians`,
              publicFace: `Responsible caretakers dedicated to maintaining order, tradition, and procedural integrity.`,
              trueAgenda: `Preserving their established authority and shielding their past compromises from inquiry.`,
              independentWant: `To neutralize external disruptions before senior oversight intervenes.`,
              stanceTowardUser: `Guarded and demanding; treats {{user}} as an untested factor requiring strict boundaries.`,
            },
            keys: ["CUSTODIANS", "ORDER", "AUTHORITY"],
            permanence: "C",
            locked: false,
          },
          {
            id: `fac-${now}-2`,
            fields: {
              name: `The Revisionist Coalition`,
              publicFace: `Reformers advocating for fairer distribution of access, transparency, and modernization.`,
              trueAgenda: `Securing direct leverage over ${primaryNonNeg} to enforce their own preferred outcome.`,
              independentWant: `Obtaining verifiable proof of the custodians' internal vulnerabilities.`,
              stanceTowardUser: `Cautiously receptive; willing to offer conditional support if {{user}} advances their wedge.`,
            },
            keys: ["REFORMERS", "COALITION", "OPPOSITION"],
            permanence: "C",
            locked: false,
          },
          {
            id: `fac-${now}-3`,
            fields: {
              name: `The Independent Brokers`,
              publicFace: `Neutral suppliers, contractors, and intermediaries offering necessary goods and intelligence.`,
              trueAgenda: `Maximizing profit and autonomy by maintaining balanced relationships with all rival parties.`,
              independentWant: `Insulating their private supply lines from regulatory or factional interference.`,
              stanceTowardUser: `Strictly transactional; respects tangible collateral and reliable word over sentimental appeals.`,
            },
            keys: ["BROKERS", "NEUTRAL", "SUPPLY"],
            permanence: "C",
            locked: false,
          },
        ],
      };
    }

    case 3: {
      return {
        npcs: [
          {
            id: `npc-${now}-1`,
            fields: {
              name: "The Primary Contact",
              role: `Key Coordinator and Steward of ${primaryNonNeg}`,
              wants: "To keep immediate affairs stable and resolve complications before outside disruptions escalate.",
              body: "Observant posture, attentive eyes, purposeful manner with an air of practical focus.",
              voice: "Measured, clear, direct; avoids unnecessary pleasantries and speaks to the point.",
              notDefault: "Maintains a personal record of subtle shifts and discrepancies that others overlook.",
              holds: "Direct oversight of immediate access, schedules, and vital local resources.",
              connection: `Knows of {{user}}'s arrival and observes closely to gauge their real intentions.`,
            },
            keys: ["CONTACT", "STEWARD", "COORDINATOR"],
            permanence: "C",
            locked: false,
          },
          {
            id: `npc-${now}-2`,
            fields: {
              name: "The Experienced Specialist",
              role: `Practitioner operating around ${secondaryNonNeg}`,
              wants: "To safeguard their autonomy, finish their current responsibilities, and avoid unnecessary entanglement.",
              body: "Weathered, capable hands; moves with calibrated, silent efficiency.",
              voice: "Quiet, thoughtful, economical; pauses deliberately before answering.",
              notDefault: "Always keeps an unobserved exit or alternative option prepared.",
              holds: "Practical experience, local network, and direct understanding of the setting's realities.",
              connection: `Recognizes a mutual acquaintance or past obligation in {{user}}'s background.`,
            },
            keys: ["SPECIALIST", "OPERATOR", "PRACTITIONER"],
            permanence: "C",
            locked: false,
          },
          {
            id: `npc-${now}-3`,
            fields: {
              name: "The Perceptive Observer",
              role: `Inquiring Party examining recent developments in ${primaryNonNeg}`,
              wants: "To uncover the true cause behind recent shifts and understand what is unfolding.",
              body: "Sharp, energetic presence; notices subtle changes in environment and demeanor.",
              voice: "Articulate, inquiring, observant; asks questions that invite revealing answers.",
              notDefault: "Notices timing inconsistencies and unspoken tensions within moments.",
              holds: "External perspective and independent channels of information.",
              connection: `Views {{user}} as either a key partner or a central factor in the unfolding situation.`,
            },
            keys: ["OBSERVER", "INQUIRER", "ANALYST"],
            permanence: "C",
            locked: false,
          },
        ],
        relationshipWeb: [
          {
            id: `rel-${now}-1`,
            fields: {
              source: "The Primary Contact",
              target: "The Perceptive Observer",
              bond: "Cautious professional tension",
              pressure: "The observer is asking questions about matters the contact prefers to handle locally.",
              relation: "The contact provides careful, verified disclosures while the observer seeks independent confirmation.",
            },
            permanence: "C",
            locked: false,
          },
          {
            id: `rel-${now}-2`,
            fields: {
              source: "The Experienced Specialist",
              target: "The Primary Contact",
              bond: "Pragmatic mutual reliance",
              pressure: "Both benefit from mutual discretion when handling unexpected challenges.",
              relation: "A quiet understanding based on demonstrated reliability rather than formal alliance.",
            },
            permanence: "C",
            locked: false,
          },
          {
            id: `rel-${now}-3`,
            fields: {
              source: "{{user}}",
              target: "The Experienced Specialist",
              bond: "Tentative working rapport",
              pressure: "Neither can resolve their immediate hurdle without the other's insight or capability.",
              relation: "A practical pact that holds so long as both act in good faith.",
            },
            permanence: "C",
            locked: false,
          },
        ],
        knowledgeMap: [
          {
            id: `km-${now}-1`,
            fields: {
              truth: `The foundational premise behind ${primaryNonNeg} carries an unspoken past compromise known only to senior stewards.`,
              knows: "The Primary Contact",
              suspects: "The Experienced Specialist",
              surfacesWhen: "A routine assumption fails under unexpected pressure.",
            },
            permanence: "C",
            locked: false,
          },
          {
            id: `km-${now}-2`,
            fields: {
              truth: "The observer's involvement was requested by an outside party whose interests have not yet been made public.",
              knows: "The Perceptive Observer only",
              suspects: "None",
              surfacesWhen: "Someone directly inquires into the provenance of their sponsorship.",
            },
            permanence: "C",
            locked: false,
          },
        ],
      };
    }

    case 4: {
      return {
        items: [
          {
            id: `item-${now}-1`,
            fields: {
              name: `The Seal of ${secondaryNonNeg}`,
              whatItDoes: `Grants verified access to restricted sections and demands formal cooperation from subordinates.`,
              costOrLimit: `Every use is logged; unauthorized activation creates an immediate alert at the central desk.`,
              unfiredGun: `The device contains an encoded signature linking it to an unresolved past incident.`,
            },
            keys: ["CREDENTIAL", "ACCESS", "TOKEN"],
            permanence: "C",
            locked: false,
          },
          {
            id: `item-${now}-2`,
            fields: {
              name: `Specialized Field Apparatus`,
              whatItDoes: `Enables precise measurement, disruption, or preservation of critical environmental factors.`,
              costOrLimit: `Requires rare maintenance components and degrades with sustained heavy use.`,
              unfiredGun: `Emits a distinct trace detectable by specialized equipment nearby.`,
            },
            keys: ["TOOL", "EQUIPMENT", "APPARATUS"],
            permanence: "C",
            locked: false,
          },
        ],
        secrets: [
          {
            id: `sec-${now}-1`,
            fields: {
              truth: `The primary prize or position associated with ${primaryNonNeg} carries an unadvertised, binding covenant.`,
              whoKeepsIt: "The primary stewards and trusted mentors",
              howKept: "Preserved in unindexed records not shared with newcomers.",
              discoveryTrigger: "Examining the founding charters or inspecting legacy records.",
              whatItChanges: "Transforms the apparent victory into an active, ongoing obligation.",
            },
            keys: ["SECRET", "COVENANT", "TRUTH"],
            permanence: "C",
            locked: false,
            disabledUntilEarned: true,
          },
          {
            id: `sec-${now}-2`,
            fields: {
              truth: "A recent critical failure was caused by deliberate internal negligence rather than external accident.",
              whoKeepsIt: "The Perceptive Observer",
              howKept: "Recorded in an encrypted private memorandum.",
              discoveryTrigger: "Uncovering cross-referenced timestamps from the incident logs.",
              whatItChanges: "Shifts responsibility from outside actors directly onto established figures.",
            },
            keys: ["SECRET", "EVIDENCE", "COMPROMISE"],
            permanence: "C",
            locked: false,
            disabledUntilEarned: true,
          },
        ],
        conflict: {
          central: `Navigating the rising stakes around ${primaryNonNeg} while rival interests compete for ultimate control.`,
          opposition: `Entrenched habits, competing loyalties, and material limits that resist simple compromises.`,
          stakesBad: `Loss of standing, broken trust, compromised independence, or lasting regret.`,
          stakesAcceptable: `Securing a clear footing, mutual respect, and sustainable forward momentum.`,
          clock: `A decisive milestone or seasonal deadline approaches, after which current opportunities close.`,
          moralKnot: `Resolving the situation completely requires addressing an uncomfortable truth that will disrupt established peace.`,
          theYield: `What {{user}} must give up: the assumption that a path exists where nobody has to sacrifice anything.`,
          speedBumps: [
            `An unexpected shift in the immediate environment or timing`,
            `A sudden demand for clarification or tangible proof from a key party`,
            `The discovery that a crucial resource or conduit has been diverted`,
          ],
          permanence: "P",
        },
        pressureProtocol: `When dialogue threatens to become passive, introduce an immediate sensory disruption: an unexpected arrival, a shift in conditions, or urgent news requiring attention.`,
      };
    }

    case 5: {
      return {
        history: [
          {
            id: `hist-${now}-1`,
            fields: {
              event: `The Settlement of ${primaryNonNeg}`,
              era: "A generation prior",
              consequence: "Established the current customs, recognized boundaries, and operational hierarchy.",
            },
            keys: ["HISTORY", "SETTLEMENT", "FOUNDATION"],
            permanence: "C",
            locked: false,
          },
          {
            id: `hist-${now}-2`,
            fields: {
              event: "The Preceding Crisis",
              era: "Several years prior",
              consequence: "Prompted the installation of strict precautions, heightened scrutiny, and redundant safeguards.",
            },
            keys: ["HISTORY", "CRISIS", "SAFEGUARDS"],
            permanence: "C",
            locked: false,
          },
        ],
        aesthetic: {
          colors: ["Weathered stone", "Muted slate", "Deep ink", "Warm amber lamp glow"],
          sounds: ["Echoing footsteps", "Distant mechanical rhythm", "Muffled murmur of focused conversation", "Drafts against glass"],
          smells: ["Parchment and ink", "Cold rain on stone", "Faint oil and iron", "Brewed tea or coffee"],
          weather: "Atmospheric, grounded conditions reflecting the season and setting.",
          visualMotifs: ["Architectural arches", "Framed rosters", "Heavy key rings", "Wax-stamped documents"],
          fashion: "Durable, purposeful garments tailored for active movement, weather resistance, and professional standing.",
          touchstones: [`The authentic tactile depth of ${tone}`],
          permanence: "C",
        },
        naming: {
          linguisticBase: "Grounded, linguistically authentic names suited to the scenario's cultural and genre context.",
          commonNames: ["Kaelen", "Bram", "Maren", "Orlo", "Tamsin", "Claes", "Greta", "Julian"],
          eliteNames: ["Senior Ward Vance", "Councilor Corbett", "Chief Curator Maren"],
          placeNamePattern: "Descriptive, evocative names reflecting function and history.",
          permanence: "C",
        },
        pressures: [
          {
            id: `press-${now}-1`,
            fields: {
              name: "The Operational Horizon",
              force: `An impending deadline or seasonal change forces all pending matters around ${primaryNonNeg} toward resolution.`,
              scope: "Situational",
              clock: "A decisive convergence approaches within days.",
            },
            keys: ["DEADLINE", "PRESSURE", "CLOCK"],
            permanence: "C",
            locked: false,
          },
          {
            id: `press-${now}-2`,
            fields: {
              name: "The Gathering Attention",
              force: "External interest is rising as the initial signs of change become difficult to overlook.",
              scope: "Social",
              clock: "Scrutiny intensifies with each passing cycle.",
            },
            keys: ["INQUIRY", "SCRUTINY", "INVESTIGATION"],
            permanence: "C",
            locked: false,
          },
        ],
      };
    }

    case 6: {
      return {
        proceduralRolls: generateSuggestedRollGroups(params),
        opening: {
          firstLocation: `The Threshold of ${primaryNonNeg}`,
          firstNpc: "The Primary Contact",
          firstChoice: `Step forward to present your purpose directly, or take a moment to read the room and its participants.`,
          style: "Tactile, grounded second-person perspective; dialogue strictly in quotes; mid-motion entry.",
          firstMessage: `The threshold of ${primaryNonNeg} opens before you, leaving the outer noise behind as you step into the focused atmosphere within. Across the main hall, the Primary Contact glances up from their work, their expression observant and measured.

"Come inside and close the door," they say, setting aside their tools with deliberate care. "Things are already in motion today, and we don't have time to repeat ourselves."

The air carries the distinctive textures of the setting—weathered surfaces, steady warmth, and the quiet murmurs of people absorbed in their craft. Through an adjoining passage, shadows move as regular work continues without pause.

"Well?" They nod toward the space before them. "You chose a significant moment to arrive. Tell me what brings you here."`,
          permanence: "T",
        },
        expansionNotes: {
          explicit: "No",
          violence: "Grounded and consequential; no gratuitous violence; physical conflict carries lasting weight",
          horror: "Tense psychological pressure and high stakes",
          romance: "Subplot only if earned through mutual trust and shared adversity",
          humor: "Subtle, situational, or character-driven irony",
          pacing: "Measured and deliberate, punctuated by urgent operational deadlines",
          playerDeath: "Only if earned through deliberate, high-risk defiance or broken covenants",
          contentFlags: ["Grounded conflict", "Institutional pressure", "Tactile realism"],
          allCharactersAdult: true,
          permanence: "P",
        },
        antiGravity: {
          temptations: [
            {
              temptation: "Allowing NPCs to speak like cheerful, helpful digital assistants or giving {{user}} free advice.",
              counter: "NPCs protect their own standing, ledgers, and responsibilities first. Every answer requires payment, leverage, or aligned interest.",
            },
            {
              temptation: "Granting {{user}} unearned special protagonist status where others immediately defer.",
              counter: "{{user}} is an untested entrant who must earn trust, respect, and access through demonstrable action and leverage.",
            },
            {
              temptation: "Resolving encounters with dramatic speeches rather than tangible logistics and material leverage.",
              counter: "Outcomes depend on tangible evidence, preparation, resources, and credibility, not rhetorical posturing.",
            },
          ],
          permanence: "P",
        },
        buildNotes: {
          permanenceRouting: "Core and User are Permanent (P); World Rules, Locations, Factions, NPCs, Aesthetic, Naming are Canonical (C); Opening is Transient (T).",
          orderBands: "Band 1: System and Status (0-100) | Band 2: Lorebook Triggers (100-300) | Band 3: Dynamic Turn Injection (300+)",
          disabledUntilEarnedList: [`Secret: The Binding Covenant of ${primaryNonNeg}`, "Secret: The Internal Inquiry Memorandum"],
          formatMatch: "Strict Tavern/SillyTavern Lorebook JSON spec with mutually exclusive weighted procedural dice rollers.",
          permanence: "P",
        },
      };
    }

    default:
      return {};
  }
}
