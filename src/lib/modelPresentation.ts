import type { AvailableModel } from "../services/connectionsService";

export type ModelSort = "alphabetical" | "newest" | "popular" | "subscription";

const compareText = (a: AvailableModel, b: AvailableModel) => (a.label || a.id).localeCompare(b.label || b.id, undefined, { sensitivity: "base" });

export function filterAndSortModels(models: AvailableModel[], options: { sort: ModelSort; favorites: string[]; subscriptionOnly: boolean }): AvailableModel[] {
  const favorites = new Set(options.favorites);
  const filtered = options.subscriptionOnly ? models.filter((model) => model.subscriptionIncluded === true) : [...models];
  return filtered.sort((a, b) => {
    const favoriteDifference = Number(favorites.has(b.id)) - Number(favorites.has(a.id));
    if (favoriteDifference) return favoriteDifference;
    if (options.sort === "newest") return (b.created ?? -1) - (a.created ?? -1) || compareText(a, b);
    if (options.sort === "popular") return (a.popularRank ?? Number.MAX_SAFE_INTEGER) - (b.popularRank ?? Number.MAX_SAFE_INTEGER) || compareText(a, b);
    if (options.sort === "subscription") return Number(b.subscriptionIncluded === true) - Number(a.subscriptionIncluded === true) || compareText(a, b);
    return compareText(a, b);
  });
}

export function readFavoriteModelIds(raw: string | null): string[] {
  try {
    const value: unknown = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(value)) return [];
    return [...new Set(value.filter((id): id is string => typeof id === "string" && id.length <= 200 && !/\p{Cc}/u.test(id)))];
  } catch { return []; }
}

export function toggleFavoriteModel(current: string[], id: string): string[] {
  return current.includes(id) ? current.filter((item) => item !== id) : [...current, id];
}
