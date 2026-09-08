import { expect, test } from "bun:test";
import type { CanonConfig, DivergenceTake, PhysicsConfig, SparkParse } from "../../src/types";
import {
  createDraftScenarioDocument,
  DEFAULT_CANON,
  DEFAULT_PHYSICS,
} from "../../src/lib/scenarioDraft";

const legacyDefaultPhrases = [
  "institutional inertia",
  "governing authority",
  "complete liquidation",
  "ticking timeline",
  "bureaucratic enforcement",
  "intake lobby",
  "intake proctor",
  "wax seals",
  "anglo-continental",
  "human biological limits",
  "survive and achieve independence",
];

function buildDraft(sparkText: string) {
  return createDraftScenarioDocument({
    sparkText,
    parse: null,
    canon: structuredClone(DEFAULT_CANON),
    physics: structuredClone(DEFAULT_PHYSICS),
  });
}

test("new-project physics defaults do not preselect genre or content pressure", () => {
  expect(DEFAULT_PHYSICS).toEqual({
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
  });
  expect(DEFAULT_CANON.explanation).toBe("");
});

test("draft structure leaves unsupported creative fields empty", () => {
  const draft = buildDraft("Two neighbors share a community garden.");

  expect(draft.parse.registerWords).toEqual([]);
  expect(draft.core).toMatchObject({
    pitch: "Two neighbors share a community garden.",
    genreTone: "",
    eraScale: "",
    theSituation: "Two neighbors share a community garden.",
    thePressure: "",
  });
  expect(draft.user).toMatchObject({
    rolePosition: "{{user}}",
    startsWith: "",
    wants: "",
    fears: "",
    hookPull: "",
    hookPush: "",
    hookTrap: "",
  });
  expect(draft.worldPhysics).toMatchObject({ authorityCheck: "", powerCeiling: "" });
  expect(draft.status).toMatchObject({ content: "", settings: "" });
  expect(draft.conflict).toMatchObject({
    central: "",
    opposition: "",
    stakesBad: "",
    stakesAcceptable: "",
    clock: "",
    moralKnot: "",
    theYield: "",
  });
  expect(draft.pressureProtocol).toBe("");
  expect(draft.aesthetic.colors).toEqual([]);
  expect(draft.aesthetic.touchstones).toEqual([]);
  expect(draft.naming).toMatchObject({ linguisticBase: "", placeNamePattern: "" });
  expect(draft.opening).toMatchObject({
    firstLocation: "",
    firstNpc: "",
    firstChoice: "",
    style: "",
    firstMessage: "",
  });
  expect(draft.antiGravity.temptations).toEqual([]);
  expect(draft.buildNotes).toMatchObject({
    permanenceRouting: "",
    orderBands: "",
    formatMatch: "",
  });
});

test("unrelated premises receive no legacy scenario template phrases", () => {
  const fixtures = [
    "A cozy bakery prepares for its neighborhood pie contest.",
    "A realistic family spends a summer weekend at a lake house.",
    "Two university friends navigate an awkward reunion.",
    "A survey crew maps a quiet ocean beneath a distant moon.",
  ];

  for (const sparkText of fixtures) {
    const serialized = JSON.stringify(buildDraft(sparkText)).toLowerCase();
    for (const phrase of legacyDefaultPhrases) {
      expect(serialized).not.toContain(phrase);
    }
  }
});

test("draft preserves explicit parse, physics, canon, and selected take", () => {
  const parse: SparkParse = {
    franchise: "Example Canon",
    nonNegotiables: ["A seaside town"],
    registerWords: ["sunlit"],
    userRole: "A visiting baker",
    openNegotiables: ["Season"],
  };
  const canon: CanonConfig = {
    enabled: true,
    franchiseName: "Example Canon",
    fidelity: "Strict",
    explanation: "Use the supplied snapshot.",
  };
  const physics: PhysicsConfig = {
    ...DEFAULT_PHYSICS,
    violence: "Implied",
    romance: "Major",
    humor: "Warm",
    pacing: "Dynamic",
    linguisticBase: "Coastal dialect",
    mustInclude: "A regatta",
  };
  const chosenTake = {
    id: "take-1",
    title: "The Regatta Reunion",
    pitch: "Old friends meet while preparing a regatta.",
    genreTone: "Warm social drama",
    angle: "Relationship-centered",
    retainedNonNegotiables: ["A seaside town"],
  } satisfies DivergenceTake;

  const draft = createDraftScenarioDocument({
    sparkText: "A reunion by the sea.",
    parse,
    canon,
    physics,
    chosenTake,
    takes: [chosenTake],
  });

  expect(draft.parse).toEqual(parse);
  expect(draft.canon).toEqual(canon);
  expect(draft.physics).toEqual(physics);
  expect(draft.chosenTake).toEqual(chosenTake);
  expect(draft.takes).toEqual([chosenTake]);
  expect(draft.core).toMatchObject({
    title: "The Regatta Reunion",
    pitch: "Old friends meet while preparing a regatta.",
    genreTone: "Warm social drama",
  });
  expect(draft.user.rolePosition).toBe("A visiting baker");
  expect(draft.naming.linguisticBase).toBe("Coastal dialect");
  expect(draft.expansionNotes).toMatchObject({
    violence: "Implied",
    horror: "",
    romance: "Major",
    humor: "Warm",
    pacing: "Dynamic",
    playerDeath: "No",
  });
});
