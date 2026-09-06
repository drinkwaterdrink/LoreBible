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
    const defaults = ["Grounded / Visceral", "Strange / Uncanny Escalation", "Inverted / Subversive", "Rescaled / Concentrated"];
    return defaults[index % 4];
  }
  const str = rawAngle.trim();
  if (str.length <= 32 && !str.includes(".") && !str.includes("\n")) {
    return str;
  }
  const lower = str.toLowerCase();
  if (lower.includes("ground") || lower.includes("visceral") || lower.includes("tactile")) return "Grounded / Visceral";
  if (lower.includes("strange") || lower.includes("uncanny") || lower.includes("escalat")) return "Strange / Uncanny";
  if (lower.includes("invert") || lower.includes("subvers") || lower.includes("trap")) return "Inverted / Subversive";
  if (lower.includes("rescal") || lower.includes("concentrat") || lower.includes("chamber")) return "Rescaled / Concentrated";

  const words = str.split(/\s+/).slice(0, 3).join(" ");
  return words.length > 25 ? words.slice(0, 24) : words;
}

export function generateSuggestedRollGroups(params: BundleParams): ProceduralRollGroup[] {
  const spark = params.sparkText || "Survival Scenario";
  const primaryNoun = params.parse?.nonNegotiables?.[0] || "Intake Exam";
  const now = Date.now();

  return [
    {
      id: `roll-action-${now}`,
      name: "Tactical & Mechanical Action Outcome",
      triggerKeys: ["CHECK", "ACTION", "ATTEMPT", "TEST", "PHYSICAL"],
      settings: "Position: System | Depth: 0 | Order: 100 | Prevent-Recursion: On | Sticky: 4",
      entries: [
        {
          id: `ent-${now}-1`,
          weight: 15,
          outcome: `Decisive Breakthrough: Clear success without material or physiological attrition; grants immediate positional initiative.`,
        },
        {
          id: `ent-${now}-2`,
          weight: 45,
          outcome: `Success with Complication: The goal is attained, but produces noise, draws peripheral scrutiny, or expends critical consumables.`,
        },
        {
          id: `ent-${now}-3`,
          weight: 25,
          outcome: `Severe Standoff or Cost: The attempt is checked; requires sacrificing gear, accepting a bodily injury, or revealing an allegiance.`,
        },
        {
          id: `ent-${now}-4`,
          weight: 15,
          outcome: `Critical Reversal: Apparatus fails or misfires; active alert is raised and immediate retreat or collateral damage is demanded.`,
        },
      ],
    },
    {
      id: `roll-npc-${now + 1}`,
      name: "Encounter Disposition & Scrutiny",
      triggerKeys: ["PATROL", "GUARD", "CLERK", "ENCOUNTER", "OFFICIAL"],
      settings: "Position: System | Depth: 0 | Order: 100 | Prevent-Recursion: On | Sticky: 4",
      entries: [
        {
          id: `ent-${now + 1}-1`,
          weight: 20,
          outcome: `Distracted / Negligent: The figure is overburdened with overdue paperwork or private grievances; permits passage with minimal friction.`,
        },
        {
          id: `ent-${now + 1}-2`,
          weight: 50,
          outcome: `Strict Protocol Demand: Formal inspection required; demands physical documentation, official vouchers, or personal collateral.`,
        },
        {
          id: `ent-${now + 1}-3`,
          weight: 30,
          outcome: `Actively Suspicious / Shakedown: Detects irregularities in the bearer's credentials; demands an extortionate bribe or triggers a silent tally bell.`,
        },
      ],
    },
    {
      id: `roll-weather-${now + 2}`,
      name: "Atmospheric & Sector Friction",
      triggerKeys: ["PASSAGE", "TRAVEL", "DISTRICT", "TRANSIT", "SECTOR"],
      settings: "Position: System | Depth: 0 | Order: 100 | Prevent-Recursion: On | Sticky: 4",
      entries: [
        {
          id: `ent-${now + 2}-1`,
          weight: 25,
          outcome: `Quiet Interval: Clear visibility and damp stillness across the thoroughfare; perimeter spotlights sweep predictably.`,
        },
        {
          id: `ent-${now + 2}-2`,
          weight: 45,
          outcome: `Heavy Precipitation or Chemical Silt: Vision is cut to thirty paces; damp degrades mechanical primers and muffles footwear.`,
        },
        {
          id: `ent-${now + 2}-3`,
          weight: 30,
          outcome: `Emergency Siren / Sector Lockdown: Steam vents discharge and security gates drop into low clearance; all open movement is flagged as contraband.`,
        },
      ],
    },
  ];
}

export function generateDeterministicBundle(bundleIndex: number, params: BundleParams): Record<string, any> {
  const { sparkText, parse, canon, chosenTake, physics, existingDoc } = params;
  const primaryNonNeg = parse?.nonNegotiables?.[0] || sparkText.slice(0, 28) || "The Threshold";
  const userRole = parse?.userRole || (chosenTake?.pitch?.includes("Aleister") ? "Aleister, an exhausted apprentice" : "an unregistered applicant");
  const tone = parse?.registerWords?.join(", ") || chosenTake?.genreTone || "taut, unglamorous, tactile";
  const title = chosenTake?.title || `The Ledger of ${primaryNonNeg}`;

  const now = Date.now();

  switch (bundleIndex) {
    case 1: {
      return {
        core: {
          title,
          pitch: chosenTake?.pitch || `Survival around ${primaryNonNeg} is an unglamorous procedural trial where physical exhaustion is tracked directly in ink.`,
          genreTone: chosenTake?.genreTone || `visceral procedural (${tone})`,
          eraScale: "Late seasonal cycle, heavily weathered municipal infrastructure",
          theRule: `Every unit of energy, movement, or power expended within this perimeter incurs immediate biological or administrative friction.`,
          theCost: `The applicant's freedom and health are pledged as bond; retreating defaults the entire contract.`,
          theSituation: `The intake examination has commenced, but the true rules of qualification have been classified or altered by senior handlers.`,
          thePressure: `The registration bell tolls every six hours; unclaimed dockets are burned alongside those who held them.`,
          theQuestion: `Can {{user}} endure the trial without sacrificing the singular bond or ethical limit that keeps them human?`,
          permanence: "P",
        },
        user: {
          rolePosition: userRole,
          startsWith: `A worn leather satchel, a stamped provisional intake voucher with four days remaining, and two copper verification tokens.`,
          wants: `To clear the preliminary docket and secure genuine legal immunity before the district registers are finalized.`,
          fears: `Being quietly assigned to the subterranean intake disposal detail without an official verdict.`,
          hookPull: `A mentor's missing ledger that contains the only verified map through the quarantine locks.`,
          hookPush: `An outstanding debt warrant issued by the magistrate that takes effect at the end of the fortnight.`,
          hookTrap: `A counterfeit registration stamp that grants senior passage but trips silent alarm tallies at the third checkpoint.`,
          permanence: "P",
        },
        worldPhysics: {
          authorityCheck: `The Magistrate's Intake Bailiffs hold monopoly over summary execution and credential seizure within the walls.`,
          powerCeiling: `No operative, regardless of discipline or latent power, can sustain high-output exertion for longer than 60 seconds without violent capillary rupture.`,
          faultLines: [
            `The tension between senior credentialed veterans and desperate new applicants`,
            `The illicit trade in forged intake clearance tokens`,
            `The impending audit from regional governors that will expose mass administrative fraud`,
          ],
          rules: [
            {
              id: `rule-${now}-1`,
              fields: {
                rule: `All energetic manipulation leaves persistent chemical or biological fallout detectable by intake hounds.`,
                profits: `Enforces strict discipline and rewards surgical, silent physical competence.`,
                pays: `Reckless combatants are easily tracked and quarantined within hours.`,
              },
              keys: ["ENERGY", "DISCIPLINE", "FALLOUT", "PHYSICS"],
              permanence: "C",
              locked: false,
            },
            {
              id: `rule-${now}-2`,
              fields: {
                rule: `Physical vouchers cannot be duplicated without matching blood-oil serial chemistry.`,
                profits: `Maintains absolute institutional leverage over all applicant rosters.`,
                pays: `Applicants are forced into hazardous barter and extortion just to keep their papers valid.`,
              },
              keys: ["VOUCHER", "REGISTRATION", "LEGALITY", "BUREAUCRACY"],
              permanence: "C",
              locked: false,
            },
            {
              id: `rule-${now}-3`,
              fields: {
                rule: `Sleep within the outer ring is permitted only in designated barracks with unbolted doors.`,
                profits: `Prevents secretive faction assemblies and allows round-the-clock inspection.`,
                pays: `Constant vigilance induces chronic sleep deprivation and psychological paranoia.`,
              },
              keys: ["CURFEW", "BARRACKS", "INSPECTION", "SURVIVAL"],
              permanence: "C",
              locked: false,
            },
          ],
          permanence: "C",
        },
        status: {
          content: `[STATUS: {{user}} | Condition: Moderately Exhausted | Voucher: Day 3/7 Valid | Heat: Low (Monitored) | Contraband: Hidden]`,
          settings: `Keep status concise, updating only when physical conditions, wounds, or credentials change.`,
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
              name: "The Lower Intake Sluice & Weigh-Station",
              function: "Mandatory triage checkpoint where applicants are stripped of civilian possessions and assigned docket seals.",
              mood: "Smells of coal dust, brine, and wet wool; echoes with the clatter of iron scales and administrative stamps.",
              whatsWrong: "The drainage grates under the examination tables are clogged with washed-away parchment shavings.",
            },
            keys: ["SLUICE", "WEIGH-STATION", "TRIAGE", "INTAKE"],
            permanence: "C",
            locked: false,
          },
          {
            id: `loc-${now}-2`,
            fields: {
              name: "The Sub-Basement Silt Filter",
              function: "Flooded subterranean pipe junction through which black-market couriers bypass the outer wall curfews.",
              mood: "Dead silent save for the rhythmic drip of condensation and the hum of hydraulic valves.",
              whatsWrong: "The water level has risen four inches past the safety mark, hiding iron spikes along the catwalk floor.",
            },
            keys: ["SILT", "FILTER", "SEWER", "TUNNELS", "PIPES"],
            permanence: "C",
            locked: false,
          },
          {
            id: `loc-${now}-3`,
            fields: {
              name: "The High Registrar's Balcony",
              function: "Overlook where senior handlers observe the field trials with brass brass binoculars and ledgers.",
              mood: "Drafty and cold; smell of pipe tobacco and clean beeswax; muffled cries from the courtyard below.",
              whatsWrong: "A cracked window pane has been patched with adhesive tariff stamps from an execution docket.",
            },
            keys: ["REGISTRAR", "BALCONY", "OBSERVATION", "OVERLOOK"],
            permanence: "C",
            locked: false,
          },
        ],
        factions: [
          {
            id: `fac-${now}-1`,
            fields: {
              name: "The Board of Examiners & Triage Bailiffs",
              publicFace: "Impartial adjudicators enforcing standardized qualification requirements for all citizens.",
              trueAgenda: "To maintain an artificial fail-rate of 85% to preserve the scarcity value of official licenses.",
              independentWant: "To uncover which internal clerk is leaking the physical testing rubrics to outside bidders.",
              stanceTowardUser: "Treats {{user}} as an expendable statistic unless an extraordinary irregularity is demonstrated.",
            },
            keys: ["BOARD", "EXAMINERS", "BAILIFFS", "AUTHORITY"],
            permanence: "C",
            locked: false,
          },
          {
            id: `fac-${now}-2`,
            fields: {
              name: "The Provisional Applicant Syndicate",
              publicFace: "Mutual aid collective sharing rations, watch-shifts, and dormitory space among newcomers.",
              trueAgenda: "A ruthless pyramid scheme where weaker members are deliberately sacrificed during physical trials to advance senior runners.",
              independentWant: "Secure a stockpile of untraceable counter-stamps to slip five unregistered fighters into final testing.",
              stanceTowardUser: "Offers conditional shelter and warmth in exchange for taking point on the lethal first-phase obstacles.",
            },
            keys: ["SYNDICATE", "APPLICANTS", "UNION", "FELLOWS"],
            permanence: "C",
            locked: false,
          },
          {
            id: `fac-${now}-3`,
            fields: {
              name: "The Scrap-Cartel & Discard Salvagers",
              publicFace: "Licensed municipal janitors clearing debris and damaged apparatus from the testing grounds.",
              trueAgenda: "Looting corpses of fallen applicants before official clerks can catalogue their personal effects.",
              independentWant: "Locate a brass cylinder containing an encrypted military covenant lost in Sector Three.",
              stanceTowardUser: "Willing to sell contraband lockpicks or medical compress at exorbitant rates of debt servitude.",
            },
            keys: ["SALVAGERS", "SCAVENGERS", "SCRAP", "UNDERGROUND"],
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
              name: "Senior Clerk Vane",
              role: "Head Adjutant of the Verification Registry",
              wants: "To complete the quarterly quota without drawing an auditor's visit, then quietly retire to the coastal marshes.",
              body: "Stooped posture, severe near-sighted squint, ink-stained fingers wrapped in linen tape against calluses.",
              voice: "Dry, rhythmic rasp; cuts off explanations mid-sentence to flip through ledger leaves.",
              notDefault: "Wears a heavy bronze key on a braided horsehair string tucked beneath his collar.",
              holds: "The physical ledger of applicants marked for summary quarantine.",
              connection: "Recognized the seal on {{user}}'s paperwork from a trial that went disastrously wrong eight years ago.",
            },
            keys: ["VANE", "CLERK", "REGISTRY", "ADJUTANT"],
            permanence: "C",
            locked: false,
          },
          {
            id: `npc-${now}-2`,
            fields: {
              name: "Maren, The Sluice-Runner",
              role: "Veteran Applicant & Smuggler",
              wants: "To survive her third exam attempt and settle her sibling's medical arrears before winter frost.",
              body: "Lean, corded muscle; scars from acid wash along both forearms; keeps boots greased and silent.",
              voice: "Fast, clipped murmur; never looks interlocutors in the eye, always scanning rooflines and rafters.",
              notDefault: "Carries a hollowed-out wooden heel containing six doses of stimulant tincture.",
              holds: "A hand-drawn map of the drainage shafts beneath the primary obstacle court.",
              connection: "Owes a debt to {{user}}'s former mentor, but will not risk execution to pay it back.",
            },
            keys: ["MAREN", "RUNNER", "SMUGGLER", "SURVIVOR"],
            permanence: "C",
            locked: false,
          },
          {
            id: `npc-${now}-3`,
            fields: {
              name: "Auditor Corvis",
              role: "Inquisitorial Inspector for Regional Governance",
              wants: "To catch the examining board in a documented felony to justify seizing direct jurisdictional command.",
              body: "Tall, rigidly straight spine; immaculate wool trenchcoat with silver lapel clasps; never blinks during inquiries.",
              voice: "Polite, melodic, utterly devoid of warmth; phrases all accusations as courteous points of administrative curiosity.",
              notDefault: "Keeps an ebony stopwatch that he clicks open whenever someone pauses before replying.",
              holds: "A warrant of summary arrest signed by the Provincial Minister.",
              connection: "Suspects {{user}} is the courier carrying the falsified roster that proves the board's embezzlement.",
            },
            keys: ["CORVIS", "AUDITOR", "INSPECTOR", "MINISTRY"],
            permanence: "C",
            locked: false,
          },
        ],
        relationshipWeb: [
          {
            id: `rel-${now}-1`,
            fields: {
              source: "Senior Clerk Vane",
              target: "Auditor Corvis",
              bond: "Cold bureaucratic terror",
              pressure: "Corvis has audited three of Vane's sub-ledgers and discovered discrepancies.",
              relation: "Vane stalls Corvis with endless document requests while burning duplicate manifests.",
            },
            permanence: "C",
            locked: false,
          },
          {
            id: `rel-${now}-2`,
            fields: {
              source: "Maren, The Sluice-Runner",
              target: "Senior Clerk Vane",
              bond: "Coerced contraband pipeline",
              pressure: "Vane turns a blind eye to Maren's smuggling in exchange for untaxed lamp oil and pain relief tinctures.",
              relation: "Maren despises Vane's cowardice but relies on his stamp to avoid execution sweeps.",
            },
            permanence: "C",
            locked: false,
          },
          {
            id: `rel-${now}-3`,
            fields: {
              source: "{{user}}",
              target: "Maren, The Sluice-Runner",
              bond: "Conditional battlefield truce",
              pressure: "Neither can pass the obstacle locks alone without tripping the weight sensors.",
              relation: "Mutual survival agreement that holds only until the exit portal opens for one person.",
            },
            permanence: "C",
            locked: false,
          },
        ],
        knowledgeMap: [
          {
            id: `km-${now}-1`,
            fields: {
              truth: "The third-phase testing court has no physical exit; qualification is granted only to those who locate the subterranean drainage valve.",
              knows: "Senior Clerk Vane, Auditor Corvis",
              suspects: "Maren, The Sluice-Runner",
              surfacesWhen: "An applicant is trapped against the sealed iron door with water rising past their knees.",
            },
            permanence: "C",
            locked: false,
          },
          {
            id: `km-${now}-2`,
            fields: {
              truth: "Auditor Corvis's arrest warrant has an unsigned seal; it carries no legal weight until stamped by the district magistrate.",
              knows: "Auditor Corvis only",
              suspects: "None",
              surfacesWhen: "Someone physically examines the reverse side of the red wax ribbon on his portfolio.",
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
              name: "Counterfeit Bailiff's Key-Pinch",
              whatItDoes: "Mechanically forces Victorian-style lever locks in under thirty seconds without leaving exterior scratches.",
              costOrLimit: "The brass pick shears off irreversibly on its fifth usage; leaves a telltale green copper grease inside the keyhole.",
              unfiredGun: "The severed pick head matches a broken tool found in a dead inspector's chest three years ago.",
            },
            keys: ["KEY", "PICK", "CONTRABAND", "TOOLS"],
            permanence: "C",
            locked: false,
          },
          {
            id: `item-${now}-2`,
            fields: {
              name: "Tincture of Red Vitriol",
              whatItDoes: "Surges adrenaline and temporarily numbs severe musculoskeletal trauma for twelve minutes.",
              costOrLimit: "Causes acute internal hemorrhage and severe trembling once the dose expires.",
              unfiredGun: "Smells strongly of bitter almond, which the tracking hounds are trained to home in on across three miles.",
            },
            keys: ["TINCTURE", "VITRIOL", "STIMULANT", "MEDICINE"],
            permanence: "C",
            locked: false,
          },
        ],
        secrets: [
          {
            id: `sec-${now}-1`,
            fields: {
              truth: "The license issued to the final winner comes with an automatic, irreversible debt covenant to the Provincial Military.",
              whoKeepsIt: "Senior Clerk Vane and the Board of Examiners",
              howKept: "Written in tiny 4-point micro-script on the reverse of the gilt credential parchment.",
              discoveryTrigger: "Holding the license parchment up against strong daylight or lamp fire.",
              whatItChanges: "Turns the grand prize of the entire story into an active lifelong trap.",
            },
            keys: ["SECRET", "COVENANT", "LICENSE", "TRAP"],
            permanence: "C",
            locked: false,
            disabledUntilEarned: true,
          },
          {
            id: `sec-${now}-2`,
            fields: {
              truth: "The corpse discovered in the sluice pipe was not killed by applicants, but poisoned by Auditor Corvis to frame the board.",
              whoKeepsIt: "Auditor Corvis",
              howKept: "Recorded in an encrypted pocket diary lined with sheepskin.",
              discoveryTrigger: "Finding the empty glass phial in Corvis's wash-basin in the officer's annex.",
              whatItChanges: "Destroys Corvis's moral high ground and gives {{user}} total leverage over the ministry.",
            },
            keys: ["SECRET", "MURDER", "POISON", "CORVIS"],
            permanence: "C",
            locked: false,
            disabledUntilEarned: true,
          },
        ],
        conflict: {
          central: `The struggle to survive the lethal triage testing while navigating the corrupt struggle between the examiners and the ministerial auditors.`,
          opposition: `The institutional machine that treats human lives as disposable fuel for seasonal metrics.`,
          stakesBad: `Being sentenced to the subterranean silt cleanup detail or executed as a rogue applicant.`,
          stakesAcceptable: `Securing an unencumbered license or escaping the perimeter with an untraceable forged identity.`,
          clock: `Four days remaining until the final intake registers are sealed and filed with the high court.`,
          moralKnot: `To expose the corrupt examiners, {{user}} must betray Maren's trust; to protect Maren, the fraudulent system remains intact.`,
          theYield: `What {{user}} must give up: the illusion that qualification brings safety or honor.`,
          speedBumps: [
            `A midnight inspection sweep through Barracks Four`,
            `The physical collapse of the iron catwalk over the acid sluice`,
            `A mandatory coin toll that increases by twenty silver pieces each sunrise`,
          ],
          permanence: "P",
        },
        pressureProtocol: `When dialogue threatens to become comfortable, introduce an immediate sensory disruption: an inspection whistle, a leaking steam pipe, or the arrival of a stretcher carrying an applicant who failed the previous room.`,
      };
    }

    case 5: {
      return {
        history: [
          {
            id: `hist-${now}-1`,
            fields: {
              event: "The Accord of the Rusting Bell",
              era: "Twelve years prior",
              consequence: "Surrendered civilian judicial review to the examining board in exchange for ending the river blockades.",
            },
            keys: ["ACCORD", "HISTORY", "TREATY", "WAR"],
            permanence: "C",
            locked: false,
          },
          {
            id: `hist-${now}-2`,
            fields: {
              event: "The Great Intake Riot of Sector Nine",
              era: "Four years prior",
              consequence: "Resulted in the installation of the high brass spotlights and automated gate deadlocks.",
            },
            keys: ["RIOT", "REVOLT", "LOCKDOWN"],
            permanence: "C",
            locked: false,
          },
        ],
        aesthetic: {
          colors: ["Charcoal soot", "Oxidized brass green", "Damp limestone grey", "Dried oxblood ink"],
          sounds: ["Distant steam valve hisses", "Iron heel clicks on wet cobbles", "Rattling ledger chains", "Coughing in the drafty bunks"],
          smells: ["Wet wool", "Lamp kerosene", "Acid wash runoff", "Stale chicory tea"],
          weather: "Perpetual low autumn drizzle and stinging cold river mist.",
          visualMotifs: ["Iron tally bars", "Wax-sealed dockets", "Watermarks on ragged parchment", "Heavy brass padlocks"],
          fashion: "Oiled canvas overcoats, fingerless wool mittens, heavy hobnailed work boots, felt hats pinned with intake badges.",
          touchstones: ["Disco Elysium's bureaucratic grit", "Hunter x Hunter's unglamorous early exam arcs", "Victorian debt-prison records"],
          permanence: "C",
        },
        naming: {
          linguisticBase: "Anglo-Flemish municipal nomenclature with bureaucratic jargon suffixes.",
          commonNames: ["Kaelen", "Bram", "Vane", "Maren", "Orlo", "Tamsin", "Claes", "Greta"],
          eliteNames: ["Lord Adjutant Corvis", "Chief Registrar Vane", "Magistrate Van Houten"],
          placeNamePattern: "The [Adjective] [Municipal Utility], e.g., 'The Low Sluice', 'The Salt Weir', 'Gatehouse Seven'.",
          permanence: "C",
        },
        pressures: [
          {
            id: `press-${now}-1`,
            fields: {
              name: "The Approaching Autumn Frost",
              force: "Winter temperatures will freeze the sluice pipes, halting all transport and locking applicants indoors.",
              scope: "Environmental",
              clock: "72 hours until temperature drops below freezing.",
            },
            keys: ["FROST", "WINTER", "WEATHER", "CLOCK"],
            permanence: "C",
            locked: false,
          },
          {
            id: `press-${now}-2`,
            fields: {
              name: "The Ministerial Audit Sweep",
              force: "Auditor Corvis's armed retainers will seize all ledgers at the end of the week.",
              scope: "Institutional",
              clock: "5 days remaining before the garrison arrives.",
            },
            keys: ["AUDIT", "INSPECTION", "MINISTRY", "SWEEP"],
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
          firstLocation: "The Triage Weigh-Station, Queue Desk Four",
          firstNpc: "Senior Clerk Vane",
          firstChoice: "Surrender your mentor's ring as voucher collateral, or risk an immediate physical search by the bailiffs.",
          style: "Tactile, procedural second-person perspective; dialogue strictly in quotes; mid-motion entry.",
          firstMessage: `The iron intake scale clangs shut on the wooden bench, rattling the row of brass weights. Behind the mesh screen, Senior Clerk Vane dips his quill into a crust of dried black ink and does not look up.

"Dossier thirty-seven. Name on the baptismal register, trade of origin, and source of fee-coin," he drones, the nib scratching across porous parchment. "If you intend to tell me your cousin is an alderman, save the breath. We burned that stack yesterday."

Rain drips steadily from the brim of your coat onto the zinc counter. Through the open archway behind you, two bailiffs in oiled leathers are unhooking an iron chain from the barracks gate, their boots sloshing through six inches of yellow mud.

"Well?" Vane's pen hovers over the blank tally square. "Speak into the aperture or step back into the sluice queue."`,
          permanence: "T",
        },
        expansionNotes: {
          explicit: "No",
          violence: "Moderate (visceral physical trauma, exhausting mechanical resistance, no gratuitous gore)",
          horror: "Psychological dread of institutional helplessness and claustrophobic debt covenants",
          romance: "Subplot only (tentative battlefield trust forged under shared survival pressure)",
          humor: "Dry, bitter gallows humor of exhausted junior clerks and cynical survivors",
          pacing: "Measured and tense, punctuated by sudden procedural deadlines",
          playerDeath: "Only if earned through reckless defiance or broken physical covenants",
          contentFlags: ["Bureaucratic cruelty", "Physical exhaustion", "Extortion", "Claustrophobia"],
          allCharactersAdult: true,
          permanence: "P",
        },
        antiGravity: {
          temptations: [
            {
              temptation: "Allowing NPCs to speak like cheerful, helpful digital assistants or giving {{user}} free advice.",
              counter: "NPCs are overworked, suspicious, and protect their own ledgers first. Every answer requires payment, leverage, or mutual pressure.",
            },
            {
              temptation: "Granting {{user}} special protagonist status where guards and clerks immediately recognize their latent greatness.",
              counter: "{{user}} is merely docket number 37 among two hundred shivering applicants. Respect must be extracted through leverage.",
            },
            {
              temptation: "Resolving encounters with dramatic cinematic speeches rather than mundane logistics.",
              counter: "Survival depends on physical vouchers, copper coins, dry boots, and matching blood-stamps, not impassioned monologues.",
            },
          ],
          permanence: "P",
        },
        buildNotes: {
          permanenceRouting: "Core and User are Permanent (P); World Rules, Locations, Factions, NPCs, Aesthetic, Naming are Canonical (C); Opening is Transient (T).",
          orderBands: "Band 1: System and Status (0-100) | Band 2: Lorebook Triggers (100-300) | Band 3: Dynamic Turn Injection (300+)",
          disabledUntilEarnedList: ["Secret: The Indentured Covenant on the License", "Secret: The Corvis Poisoning Docket"],
          formatMatch: "Strict Tavern/SillyTavern Lorebook JSON spec with mutually exclusive weighted procedural dice rollers.",
          permanence: "P",
        },
      };
    }

    default:
      return {};
  }
}
