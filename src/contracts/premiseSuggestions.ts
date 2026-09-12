export interface PremiseSuggestion {
  id: string;
  title: string;
  premise: string;
  category: string;
  inspirationNote?: string;
}

export interface PremiseSuggestionSet {
  schemaVersion: 1;
  suggestions: [PremiseSuggestion, PremiseSuggestion, PremiseSuggestion, PremiseSuggestion];
}

function record(value: unknown, label: string): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new TypeError(`${label} must be an object.`);
  return value as Record<string, unknown>;
}

function text(value: unknown, label: string): string {
  if (typeof value !== "string" || !value.trim()) throw new TypeError(`${label} must be a non-empty string.`);
  return value.trim();
}

export function parsePremiseSuggestionSet(value: unknown): PremiseSuggestionSet {
  const input = record(value, "Premise suggestion set");
  if (input.schemaVersion !== 1) throw new TypeError("Premise suggestion schemaVersion must be 1.");
  if (!Array.isArray(input.suggestions) || input.suggestions.length !== 4) {
    throw new TypeError("Premise suggestion set must contain exactly four suggestions.");
  }
  const suggestions = input.suggestions.map((candidate, index): PremiseSuggestion => {
    const item = record(candidate, `Suggestion ${index + 1}`);
    const parsed: PremiseSuggestion = {
      id: text(item.id, `Suggestion ${index + 1} id`),
      title: text(item.title, `Suggestion ${index + 1} title`),
      premise: text(item.premise, `Suggestion ${index + 1} premise`),
      category: text(item.category, `Suggestion ${index + 1} category`),
    };
    if (item.inspirationNote !== undefined) parsed.inspirationNote = text(item.inspirationNote, `Suggestion ${index + 1} inspirationNote`);
    return parsed;
  });
  if (new Set(suggestions.map((item) => item.id)).size !== 4) throw new TypeError("Premise suggestions must have unique IDs.");
  const normalizedPremises = suggestions.map((item) => item.premise.toLowerCase().replace(/\s+/g, " "));
  if (new Set(normalizedPremises).size !== 4) throw new TypeError("Premise suggestions must have unique premises.");
  return { schemaVersion: 1, suggestions: suggestions as PremiseSuggestionSet["suggestions"] };
}
