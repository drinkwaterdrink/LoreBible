import type {
  CanonConfig,
  DivergenceTake,
  LoreBibleDocument,
  PhysicsConfig,
  SparkParse,
} from "../types";

export const DEFAULT_PHYSICS: PhysicsConfig = {
  density: "Standard",
  strangeness: 3,
  mundanity: 3,
  violence: "None",
  horror: "",
  romance: "None",
  humor: "",
  pacing: "Measured",
  explicitContent: "No",
  playerDeath: "No",
  linguisticBase: "",
  mustInclude: "",
  mustAvoid: "",
};

export const DEFAULT_CANON: CanonConfig = {
  enabled: false,
  franchiseName: null,
  fidelity: "Adjacent",
  explanation: "",
};

export interface CreateDraftScenarioParams {
  sparkText: string;
  parse: SparkParse | null;
  canon: CanonConfig;
  physics: PhysicsConfig;
  chosenTake?: DivergenceTake;
  takes?: DivergenceTake[];
  title?: string;
}

export function createDraftScenarioDocument(params: CreateDraftScenarioParams): LoreBibleDocument {
  const { sparkText, parse, canon, physics, chosenTake, takes, title } = params;
  const safeTitle = title || chosenTake?.title || (sparkText ? sparkText.slice(0, 36) : "Untitled Scenario");
  const defaultParse: SparkParse = parse || {
    franchise: canon.franchiseName || null,
    nonNegotiables: [],
    registerWords: [],
    userRole: null,
    openNegotiables: [],
  };

  return {
    id: "draft-" + Date.now(),
    title: safeTitle,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    sparkText,
    parse: defaultParse,
    canon,
    physics,
    chosenTake,
    takes,
    core: {
      title: safeTitle,
      pitch: chosenTake?.pitch || sparkText,
      genreTone: chosenTake?.genreTone || "",
      eraScale: "",
      theRule: "",
      theCost: "",
      theSituation: sparkText,
      thePressure: "",
      theQuestion: "",
      permanence: "P",
    },
    user: {
      rolePosition: defaultParse.userRole || "{{user}}",
      startsWith: "",
      wants: "",
      fears: "",
      hookPull: "",
      hookPush: "",
      hookTrap: "",
      permanence: "P",
    },
    worldPhysics: {
      rules: [],
      authorityCheck: "",
      powerCeiling: "",
      faultLines: [],
      permanence: "C",
    },
    status: { content: "", settings: "", permanence: "P" },
    locations: [],
    factions: [],
    npcs: [],
    relationshipWeb: [],
    knowledgeMap: [],
    items: [],
    secrets: [],
    conflict: {
      central: "",
      opposition: "",
      stakesBad: "",
      stakesAcceptable: "",
      clock: "",
      moralKnot: "",
      theYield: "",
      speedBumps: [],
      permanence: "P",
    },
    pressureProtocol: "",
    history: [],
    aesthetic: {
      colors: [],
      sounds: [],
      smells: [],
      weather: "",
      visualMotifs: [],
      fashion: "",
      touchstones: [],
      permanence: "C",
    },
    naming: {
      linguisticBase: physics.linguisticBase,
      commonNames: [],
      eliteNames: [],
      placeNamePattern: "",
      permanence: "C",
    },
    pressures: [],
    proceduralRolls: [],
    opening: {
      firstLocation: "",
      firstNpc: "",
      firstChoice: "",
      style: "",
      firstMessage: "",
      permanence: "T",
    },
    expansionNotes: {
      explicit: physics.explicitContent,
      violence: physics.violence,
      horror: physics.horror,
      romance: physics.romance,
      humor: physics.humor,
      pacing: physics.pacing,
      playerDeath: physics.playerDeath,
      contentFlags: [],
      allCharactersAdult: true,
      permanence: "P",
    },
    antiGravity: { temptations: [], permanence: "P" },
    buildNotes: {
      permanenceRouting: "",
      orderBands: "",
      disabledUntilEarnedList: [],
      formatMatch: "",
      permanence: "P",
    },
  };
}
