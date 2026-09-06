/**
 * Types for Lore Bible — scenario-authoring studio.
 */

export type Permanence = 'P' | 'C' | 'T';

export interface Entry {
  id: string;
  fields: Record<string, string>; // e.g. { name, role, wants, body, voice, notDefault, holds, connection }
  keys: string[];                 // lorebook trigger keywords
  permanence: Permanence;
  locked: boolean;                // locked entries survive regeneration
  disabledUntilEarned?: boolean;
  note?: string;                  // user's handwritten margin note
}

export interface SparkParse {
  franchise: string | null;
  nonNegotiables: string[];
  registerWords: string[];
  userRole: string | null;
  openNegotiables: string[];
}

export type CanonFidelity = 'Strict' | 'Adjacent' | 'Riff';

export interface CanonConfig {
  enabled: boolean;
  franchiseName: string | null;
  fidelity: CanonFidelity;
  explanation: string;
}

export type DivergenceAngle = 'Grounded' | 'Strange' | 'Inverted' | 'Rescaled' | string;

export interface DivergenceTake {
  id: string;
  title: string;
  pitch: string;
  genreTone: string;
  whatsStrange: string;
  angle: DivergenceAngle;
  retainedNonNegotiables: string[];
  versions?: DivergenceTake[];
  versionIndex?: number;
  steerNote?: string;
  isEdited?: boolean;
}

export interface PhysicsConfig {
  density: 'Quick' | 'Standard' | 'Rich';
  densityTokens?: number; // 1000 to 10000 tokens
  strangeness: number; // 1 to 5
  mundanity: number;   // 1 to 5
  genre?: string;      // Primary genre from wide variety
  subgenre?: string;   // Specialized flavor or sub-genre
  violence: 'None' | 'Implied' | 'Moderate' | 'Graphic';
  horror: string;      // Retained as horror dial / tone flavor
  romance: 'None' | 'Subplot' | 'Major' | 'Primary';
  humor: string;
  pacing: 'Slow burn' | 'Measured' | 'Dynamic' | 'Frantic';
  explicitContent: 'No' | 'Fade' | 'Yes';
  playerDeath: 'No' | 'Only if earned' | 'Yes';
  linguisticBase: string;
  mustInclude: string;
  mustAvoid: string;
}

export interface CoreSection {
  title: string;
  pitch: string;
  genreTone: string;
  eraScale: string;
  theRule: string;
  theCost: string;
  theSituation: string;
  thePressure: string;
  theQuestion: string;
  permanence: 'P';
}

export interface UserSection {
  rolePosition: string;
  startsWith: string;
  wants: string;
  fears: string;
  hookPull: string;
  hookPush: string;
  hookTrap: string;
  permanence: 'P';
}

export interface WorldPhysicsSection {
  rules: Entry[];
  authorityCheck: string;
  powerCeiling: string;
  faultLines: string[];
  permanence: 'C';
}

export interface StatusSection {
  content: string;
  settings: string;
  permanence: 'P';
}

export interface ConflictSection {
  central: string;
  opposition: string;
  stakesBad: string;
  stakesAcceptable: string;
  clock: string;
  moralKnot: string;
  theYield: string;
  speedBumps: string[];
  permanence: 'P';
}

export interface AestheticSection {
  colors: string[];
  sounds: string[];
  smells: string[];
  weather: string;
  visualMotifs: string[];
  fashion: string;
  touchstones: string[];
  permanence: 'C';
}

export interface NamingSection {
  linguisticBase: string;
  commonNames: string[];
  eliteNames: string[];
  placeNamePattern: string;
  permanence: 'C';
}

export interface ProceduralRollEntry {
  id: string;
  weight: number;
  outcome: string;
}

export interface ProceduralRollGroup {
  id: string;
  name: string;
  triggerKeys: string[];
  settings: string;
  entries: ProceduralRollEntry[];
}

export interface OpeningSection {
  firstLocation: string;
  firstNpc: string;
  firstChoice: string;
  style: string;
  firstMessage: string;
  permanence: 'T';
}

export interface ExpansionNotesSection {
  genre?: string;
  subgenre?: string;
  explicit: string;
  violence: string;
  horror: string;
  romance: string;
  humor: string;
  pacing: string;
  playerDeath: string;
  contentFlags: string[];
  allCharactersAdult: boolean;
  permanence: 'P';
}

export interface AntiGravityItem {
  temptation: string;
  counter: string;
}

export interface AntiGravitySection {
  temptations: AntiGravityItem[];
  permanence: 'P';
}

export interface BuildNotesSection {
  permanenceRouting: string;
  orderBands: string;
  disabledUntilEarnedList: string[];
  formatMatch: string;
  permanence: 'P';
}

export type FindingType =
  | 'contradiction'
  | 'banned_name'
  | 'negation'
  | 'trope'
  | 'weak_key'
  | 'prescribed_arc'
  | 'user_centric_npc'
  | 'unanswered_check';

export interface ConsistencyFinding {
  id: string;
  type: FindingType;
  sectionKey: string;
  entryId?: string;
  fieldKey?: string;
  offendingText: string;
  explanation: string;
  suggestedFix: string;
  applied?: boolean;
  dismissed?: boolean;
}

export interface VariantSlip {
  id: string;
  label: string;
  angle: string;
  preview: string;
  entry: Entry;
}

export interface RippleReference {
  sectionKey: string;
  sectionTitle: string;
  entryId: string;
  entryName: string;
}

export interface RippleNotice {
  sourceName: string;
  sourceEntryId: string;
  references: RippleReference[];
}

export interface LoreBibleDocument {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  sparkText: string;
  parse: SparkParse;
  canon: CanonConfig;
  physics: PhysicsConfig;
  chosenTake?: DivergenceTake;
  takes?: DivergenceTake[];

  // Sections
  core: CoreSection;
  user: UserSection;
  worldPhysics: WorldPhysicsSection;
  status: StatusSection;
  locations: Entry[];
  factions: Entry[];
  npcs: Entry[];
  relationshipWeb: Entry[];
  knowledgeMap: Entry[];
  items: Entry[];
  secrets: Entry[];
  conflict: ConflictSection;
  pressureProtocol: string;
  history: Entry[];
  aesthetic: AestheticSection;
  naming: NamingSection;
  pressures: Entry[];
  proceduralRolls: ProceduralRollGroup[];
  opening: OpeningSection;
  expansionNotes: ExpansionNotesSection;
  antiGravity: AntiGravitySection;
  buildNotes: BuildNotesSection;
  omittedSections?: string[];
}

export interface BuildLogItem {
  id: string;
  stage: string;
  label: string;
  status: 'pending' | 'active' | 'done';
  timestamp?: string;
}

export interface SavedScenarioMeta {
  id: string;
  title: string;
  pitch: string;
  genre: string;
  updatedAt: string;
  sparkSnippet: string;
}

export interface GravityScores {
  modelVoice: number;         // 0 - 100%
  protagonistGravity: number; // 0 - 100%
  narrativeGravity: number;   // 0 - 100%
  convenienceGravity: number; // 0 - 100%
  denialGravity: number;       // 0 - 100%
  diagnosticNotes: string;
}

export interface TestBenchMessage {
  id: string;
  role: 'user' | 'npc';
  content: string;
  timestamp: string;
  gravity?: GravityScores;
  voiceFlagged?: boolean;
  voiceNote?: string;
}

export interface VoiceCheckItem {
  id: string;
  text: string;
  isGenericAssistant: boolean;
  reason: string;
  proofreaderNote: string;
}

export interface VoiceCheckResult {
  lines: VoiceCheckItem[];
  overallScore: number; // 0 - 100%
  summary: string;
}

export interface OpeningSin {
  id: 'narrating_user' | 'hardcoded_names' | 'static_scene' | 'asking_feelings';
  name: string;
  flagged: boolean;
  severity: 'violation' | 'clean';
  quote?: string;
  explanation: string;
  remedy: string;
}

export interface OpeningAuditResult {
  sins: OpeningSin[];
  passed: boolean;
  wordCount: number;
  overallCritique: string;
}
