import type { ArtifactFinding } from "../../contracts/artifacts";

export const MAX_LORE_SEMANTIC_NAME_LENGTH = 48;
const printable = (value: string) => value.replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim();
const safeLabel = (value: string) => printable(value).replace(/^\[+|\]+$/g, "").replace(/[\[\]]/g, "").slice(0, 32).trim().toUpperCase() || "LORE";

export function formatLoreEntryTitle(input: { categoryId: string; categoryLabel: string; candidateName: unknown; content: string; ordinal: number }): { title: string; semanticName: string; finding?: ArtifactFinding } {
  const label = safeLabel(input.categoryLabel || input.categoryId);
  let semanticName = printable(typeof input.candidateName === "string" ? input.candidateName : "").replace(/^\[[^\]]{1,32}\]\s*/i, "").trim();
  const invalid = !semanticName || semanticName.length > MAX_LORE_SEMANTIC_NAME_LENGTH || semanticName === printable(input.content) || /[.!?]\s+\S/.test(semanticName) || /^(?:(?:world\s+)?rule|history|secret|entry)\s+\d+$/i.test(semanticName);
  if (!invalid) return { title: `[${label}] ${semanticName}`, semanticName };
  let hash=2166136261;for(const character of printable(input.content)){hash^=character.charCodeAt(0);hash=Math.imul(hash,16777619);}semanticName=`Unresolved ${label.toLowerCase().replace(/\b\w/g,(letter)=>letter.toUpperCase())} · ${(hash>>>0).toString(36).slice(0,6)}`;
  return { title: `[${label}] ${semanticName}`, semanticName, finding: { code: "lore.title_fallback", severity: "major", message: `A concise semantic title was unavailable for ${input.categoryId}; a deterministic fallback was used.` } };
}
