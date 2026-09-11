import type { BlueprintPlanningContextV1 } from "../../src/contracts/blueprint";
import { PROJECT_GRAPH_SCHEMA, USER_AGENCY_RESERVATIONS, type ProjectGraphV1 } from "../../src/contracts/projectGraph";

export function emptyBlueprintGraph(): ProjectGraphV1 {
  return {
    schema: PROJECT_GRAPH_SCHEMA,
    project: { id: "project:blueprint", revision: 3, name: null, version: "1", status: "planning", targetPlatform: "lumiverse", mode: "graph_native" },
    authority: { sourceOrder: ["user", "approved_project", "generated"] },
    agency: { protectedSubject: "{{user}}", reserved: [...USER_AGENCY_RESERVATIONS] },
    canon: [], entities: [], relationships: [], knowledge: [], temporalSnapshots: [], ownership: [], sources: [], dependencies: [], artifacts: [], builds: [],
    validation: { status: "not_run", findings: [], lastRun: null }, decisions: [], unresolved: [], extensions: {},
  };
}

export function premiseInput(premise: string, overrides: Partial<BlueprintPlanningContextV1> = {}) {
  return {
    graph: emptyBlueprintGraph(),
    context: {
      projectId: "project:blueprint", projectRevision: 3,
      sparkDna: { premisePromise: premise, nonNegotiables: [], toneEnvelope: { primary: "", descriptors: [] }, genreSignals: [], playerAgencyBoundaries: "The player controls their own decisions and feelings.", openVariables: [], existingPressures: [], assumptions: [], opportunitySpace: [], userRole: null, franchise: null },
      ...overrides,
    } satisfies BlueprintPlanningContextV1,
  };
}

export const cozyBakery = () => premiseInput("A cozy bakery in a small town, with daily routines and friendly customers.");
export const familyVisit = () => premiseInput("A family visit brings siblings and neighbors together for a household reunion.");
export const focusedRomance = () => premiseInput("A focused romance between two people over a single weekend.");
export const warTornKingdom = () => premiseInput("A war-torn kingdom with rival factions, armies, and a civil war.");
export const scienceFictionCity = () => premiseInput("A science fiction city with robots, space travel, and advanced technology.");
export const blankPremise = () => premiseInput("");
export const mustAvoidMagic = () => premiseInput("A magic academy with wizards and spellcasting.", { physicsConstraints: { mustAvoid: "magic" } });
