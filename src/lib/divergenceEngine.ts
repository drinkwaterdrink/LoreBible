/**
 * Lore Bible Divergence Engine
 * Universal Possibility Space, Dynamic Dramatic Engines, and Distinctiveness Critic.
 * Replaces hardcoded genre lenses (Grounded/Strange/Inverted/Rescaled) with open dramatic dimensions.
 */

import { DivergenceMode, SemanticRerollType, SparkDNA } from '../types';

export const UNIVERSAL_DIMENSIONS = [
  'scale (intimate domestic -> communal -> institutional -> cosmic)',
  'social density (isolated pair -> tight ensemble -> sprawling community)',
  'conflict source (internal dilemma -> interpersonal friction -> structural pressure -> natural/environmental challenge)',
  'information visibility (open transparency -> asymmetric knowledge -> mutual secrecy)',
  'stability vs disruption (preserving a fragile peace -> navigating a sudden rupture -> slow steady shift)',
  'urgency (unhurried slow-burn -> steady milestone deadline -> relentless immediate crisis)',
  'stakes (personal dignity/reputation -> relational reconciliation -> material survival -> communal future)',
  'player opportunity (mediating between rivals -> uncovering leverage -> carving out sanctuary -> claiming ambition)',
  'orientation (proactive initiative -> reactive defense -> opportunistic navigation)',
  'change driver (character choices -> environmental shift -> institutional friction -> technological/magical consequence)',
];

export const DRAMATIC_ENGINES_CATALOG = [
  'social friction',
  'competition',
  'obligation',
  'opportunity',
  'discovery',
  'misaligned goals',
  'scarcity',
  'investigation',
  'journey',
  'status change',
  'responsibility',
  'temptation',
  'negotiation',
  'transformation',
  'outsider arrival',
  'reunion',
  'separation',
  'ritual/event',
  'misunderstanding',
  'cooperation',
  'environmental pressure',
  'ambition',
  'curiosity',
  'reconciliation',
  'protection',
  'reckoning',
];

export function buildDivergenceModeGuidance(mode: DivergenceMode = 'Exploratory'): string {
  switch (mode) {
    case 'Faithful':
      return `DIVERGENCE MODE: FAITHFUL (Tight Variations)
- Preserve most implied conventions and everyday assumptions of the premise.
- Focus on nuanced variations in personal dynamics, subtle tactical differences, and grounded emotional beats.
- Keep the world rules and social architecture close to the user's initial expectation.`;

    case 'Exploratory':
      return `DIVERGENCE MODE: EXPLORATORY (Balanced Possibility Space)
- Actively challenge 1-2 default assumptions of the setting to discover genuinely fresh angles.
- Vary the primary dramatic engine, scale, and interpersonal leverage across the four branches.
- Protect all explicit non-negotiables while exploring diverse ways the situation can unfold.`;

    case 'Radical':
      return `DIVERGENCE MODE: RADICAL (Substantial Architectural Exploration)
- Boldly rethink the contextual framing, social structures, and conflict sources around the premise.
- Shift the scale (e.g. from macro-politics down to an intense chamber piece, or vice versa).
- Protect explicit non-negotiables, but feel free to invert conventional genre expectations.`;

    case 'Unbound':
      return `DIVERGENCE MODE: UNBOUND (Maximum Frontier Discovery)
- Any variable not explicitly locked down as a Non-Negotiable or explicit user constraint is completely open to reimagination.
- Explore wild, surprising, or unconventional paradigms for how this core premise manifests.
- Maintain emotional coherence, player agency, and explicit tone, but push structural originality to its limit.`;

    default:
      return 'DIVERGENCE MODE: EXPLORATORY';
  }
}

export function buildSemanticRerollGuidance(type: SemanticRerollType, currentTake?: any): string {
  switch (type) {
    case 'reimagine':
      return `SEMANTIC REROLL: REIMAGINE
- Completely discard the current branch angle ("${currentTake?.angle || 'Previous Take'}").
- Explore a completely different region of the Universal Possibility Space.
- Pick a completely different dramatic engine and interpersonal structure.
- Retain all core non-negotiables, but bring a brand new creative concept.`;

    case 'mutate':
      return `SEMANTIC REROLL: MUTATE
- Keep the core appeal and emotional spark of this branch ("${currentTake?.title || 'Current Take'}").
- Shift 2-3 architectural variables (e.g., change the primary obstacle, invert the social relationship, or adjust the ticking clock).
- Deliver a recognizable evolution that solves friction or explores an alternate variation of this specific angle.`;

    case 'push_further':
      return `SEMANTIC REROLL: PUSH FURTHER (INTENSIFY)
- Double down on what makes this specific branch unique and compelling.
- Make the primary engine more pronounced, heighten the tactile details, and sharpen the contrast.
- Do NOT make it generic or darker; simply make its core thematic identity more vivid, crisp, and unforgettable.`;

    default:
      return 'SEMANTIC REROLL: Refine this branch with fresh inspiration.';
  }
}

/**
 * Prompt instruction for the Distinctiveness Critic pass.
 * Ensures the 4 selected branches are meaningfully distant across structure, engine, and player role.
 */
export const DISTINCTIVENESS_CRITIC_PROMPT = `=== DISTINCTIVENESS CRITIC INSTRUCTIONS ===
Evaluate candidate branches for true structural diversity.
Reject or replace any branch that is simply another branch wearing different nouns.
Ensure meaningful pairwise divergence across these 8 axes:
1. Primary Pressure: (What force is actively bearing down?)
2. Central Activity: (What are people actually doing day-to-day?)
3. Relationship Configuration: (How are the key participants aligned or divided?)
4. Player Opportunity: (What can {{user}} uniquely leverage, pursue, or protect?)
5. Source of Change: (Who or what is destabilizing the status quo?)
6. Information Structure: (Who knows what, and what is hidden?)
7. Scale & Setting: (Chamber intimacy vs communal crisis vs institutional navigation)
8. Conflict / Engagement Engine: (e.g. social friction vs discovery vs obligation vs competition)

Every card must present a genuinely different scenario to step into, not merely cosmetic variations on the same formula.
=== END DISTINCTIVENESS CRITIC ===`;
