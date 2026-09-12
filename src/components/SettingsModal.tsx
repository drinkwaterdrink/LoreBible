import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Check, Clipboard, KeyRound, Loader2, Plus, Save, Star, Trash2, X, Zap } from "lucide-react";
import { APP_VERSION } from "../version";
import type { ModelSelection, ProviderId } from "../contracts/generation";
import {
  deleteConnection,
  createCatalogRequestTracker,
  isCompleteModelSelection,
  listConnectionModels,
  listConnections,
  saveConnection,
  testConnection,
  testModelGeneration,
  getRuntimeInfo,
  type AvailableModel,
  type ConnectionProfile,
} from "../services/connectionsService";
import { filterAndSortModels, readFavoriteModelIds, toggleFavoriteModel, type ModelSort } from "../lib/modelPresentation";
import { formatConnectionDiagnostics, runtimeCompatibilityMessage, type RuntimeInfo } from "../lib/runtimeDiagnostics";

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  selection: ModelSelection | null;
  onSelectionChange: (selection: ModelSelection | null) => void;
}

const EMPTY_DRAFT = { id: undefined as string | undefined, name: "", provider: "openrouter" as ProviderId, apiKey: "", customModelIds: [] as string[] };
const FAVORITES_KEY = "lore-bible-model-favorites-v1";

interface CustomModelChange {
  modelIds: string[];
  error: string | null;
}

export function addCustomModelId(current: string[], raw: string): CustomModelChange {
  const id = raw.trim();
  if (!id) return { modelIds: current, error: "Enter a custom model ID first." };
  if (id.length > 200) return { modelIds: current, error: "Custom model IDs must be 200 characters or fewer." };
  if (/\p{Cc}/u.test(id)) return { modelIds: current, error: "Custom model IDs cannot contain control characters." };
  if (current.includes(id)) return { modelIds: current, error: "That custom model ID is already saved." };
  return { modelIds: [...current, id], error: null };
}

export function removeCustomModelId(current: string[], id: string, selectedModelId: string | null): CustomModelChange {
  if (selectedModelId === id) return { modelIds: current, error: "Choose another model before removing the selected custom model." };
  return { modelIds: current.filter((modelId) => modelId !== id), error: null };
}

export function connectionTestSuccessMessage(modelCount: number): string {
  return `Key accepted · ${modelCount} provider models reported. This checks authentication and model listing, not generation speed or structured output.`;
}

export function createModelListResetKey(profileId: string | undefined, sort: ModelSort, search: string, subscriptionOnly: boolean, modelIds: string[]): string {
  return [profileId || "", sort, search.trim().toLowerCase(), subscriptionOnly ? "subscription" : "all", ...modelIds].join("\u001f");
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose, selection, onSelectionChange }) => {
  const [profiles, setProfiles] = useState<ConnectionProfile[]>([]);
  const [models, setModels] = useState<AvailableModel[]>([]);
  const [draft, setDraft] = useState(EMPTY_DRAFT);
  const [busy, setBusy] = useState(false);
  const [isLoadingModels, setIsLoadingModels] = useState(false);
  const [customModelInput, setCustomModelInput] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [modelSort, setModelSort] = useState<ModelSort>("alphabetical");
  const [modelSearch, setModelSearch] = useState("");
  const [showAdvancedModels, setShowAdvancedModels] = useState(false);
  const [subscriptionOnly, setSubscriptionOnly] = useState(false);
  const [favoriteModelIds, setFavoriteModelIds] = useState<string[]>(() => typeof localStorage === "undefined" ? [] : readFavoriteModelIds(localStorage.getItem(FAVORITES_KEY)));
  const [runtimeInfo, setRuntimeInfo] = useState<RuntimeInfo | null>(null);
  const [runtimeInfoLoaded, setRuntimeInfoLoaded] = useState(false);
  const catalogRequests = useRef(createCatalogRequestTracker());
  const modelListRef = useRef<HTMLDivElement | null>(null);

  const selectedProfile = useMemo(() => profiles.find((profile) => profile.id === draft.id) || null, [profiles, draft.id]);
  const displayedModels = useMemo(() => {
    const catalog = filterAndSortModels(models, { sort: modelSort, favorites: favoriteModelIds, subscriptionOnly: draft.provider === "nanogpt" && subscriptionOnly });
    const query = modelSearch.trim().toLowerCase();
    return query ? catalog.filter((model) => `${model.label} ${model.id}`.toLowerCase().includes(query)) : catalog;
  }, [models, modelSort, favoriteModelIds, subscriptionOnly, draft.provider, modelSearch]);
  const hasPopularity = models.some((model) => model.popularRank !== undefined);
  const hasSubscriptionMetadata = models.some((model) => model.subscriptionIncluded !== undefined);
  const runtimeWarning = runtimeInfoLoaded ? runtimeCompatibilityMessage(runtimeInfo, APP_VERSION) : null;
  const modelListResetKey = createModelListResetKey(draft.id, modelSort, modelSearch, subscriptionOnly, displayedModels.map((model) => model.id));

  useLayoutEffect(() => {
    modelListRef.current?.scrollTo({ top: 0, behavior: "auto" });
  }, [modelListResetKey]);

  const toggleFavorite = (id: string) => {
    const next = toggleFavoriteModel(favoriteModelIds, id);
    setFavoriteModelIds(next);
    try { localStorage.setItem(FAVORITES_KEY, JSON.stringify(next)); } catch { /* Preference persistence is best-effort. */ }
  };

  const refresh = async () => {
    setError(null);
    setRuntimeInfoLoaded(false);
    void getRuntimeInfo().then(setRuntimeInfo).catch(() => setRuntimeInfo(null)).finally(() => setRuntimeInfoLoaded(true));
    try {
      const next = await listConnections();
      setProfiles(next);
      const current = next.find((profile) => profile.id === selection?.profileId) || next[0];
      if (current && !draft.id) setDraft({ id: current.id, name: current.name, provider: current.provider, apiKey: "", customModelIds: current.customModelIds || [] });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to load connection profiles.");
    }
  };

  useEffect(() => {
    if (!isOpen) return;
    void refresh();
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) return;
    setDraft((current) => ({ ...current, apiKey: "" }));
    setCustomModelInput("");
    setStatus(null);
    setError(null);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || !draft.id || draft.id === "environment-gemini") {
      catalogRequests.current.invalidate();
      setModels([]);
      setIsLoadingModels(false);
      return;
    }
    const requestToken = catalogRequests.current.begin();
    const controller = new AbortController();
    setModels([]);
    setIsLoadingModels(true);
    void listConnectionModels(draft.id, controller.signal)
      .then((nextModels) => {
        if (catalogRequests.current.isCurrent(requestToken)) setModels(nextModels);
      })
      .catch((cause) => {
        if (controller.signal.aborted || !catalogRequests.current.isCurrent(requestToken)) return;
        setError(cause instanceof Error ? cause.message : "Unable to load models.");
      })
      .finally(() => {
        if (catalogRequests.current.isCurrent(requestToken)) setIsLoadingModels(false);
      });
    return () => controller.abort();
  }, [isOpen, draft.id]);

  useEffect(() => {
    setModelSearch("");
    setShowAdvancedModels(false);
  }, [draft.id]);

  if (!isOpen) return null;

  const chooseProfile = (profile: ConnectionProfile) => {
    setDraft({ id: profile.id, name: profile.name, provider: profile.provider, apiKey: "", customModelIds: profile.customModelIds || [] });
    setCustomModelInput("");
    setStatus(null);
  };

  const handleSave = async () => {
    if (!draft.name.trim()) { setError("Give this connection a name first."); return; }
    setBusy(true); setError(null); setStatus(null);
    try {
      const saved = await saveConnection({ ...draft, apiKey: draft.apiKey || undefined });
      setProfiles((current) => current.some((item) => item.id === saved.id) ? current.map((item) => item.id === saved.id ? saved : item) : [saved, ...current]);
      setDraft((current) => ({ ...current, id: saved.id, apiKey: "" }));
      setModels(await listConnectionModels(saved.id));
      setStatus("Saved. The key is encrypted by the desktop server; it is not kept in browser storage.");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Unable to save connection."); }
    finally { setBusy(false); }
  };

  const handleTest = async () => {
    if (!draft.id || draft.id === "environment-gemini") { setError("Save a profile before testing it."); return; }
    setBusy(true); setError(null); setStatus(null);
    try {
      const result = await testConnection(draft.id);
      setStatus(connectionTestSuccessMessage(result.modelCount));
      await refresh();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Connection test failed."); }
    finally { setBusy(false); }
  };

  const handleGenerationTest = async () => {
    if (!draft.id || !selectedModelId) { setError("Choose a model before testing generation."); return; }
    setBusy(true); setError(null); setStatus(null);
    try {
      await testModelGeneration(draft.id, selectedModelId);
      setStatus("Generation passed · this model completed a small structured-output request through the saved profile.");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Selected-model generation test failed."); }
    finally { setBusy(false); }
  };

  const handleCopyDiagnostics = async () => {
    const text = formatConnectionDiagnostics({
      appVersion: APP_VERSION,
      runtime: runtimeInfo,
      browser: typeof navigator === "undefined" ? "unknown" : navigator.userAgent,
      profile: selectedProfile ? { id: selectedProfile.id, name: selectedProfile.name, provider: selectedProfile.provider, baseUrl: selectedProfile.baseUrl, hasSecret: selectedProfile.hasSecret } : null,
      selectedModelId,
      catalog: models,
      sort: modelSort,
      subscriptionOnly,
      error,
    });
    try {
      if (!navigator.clipboard?.writeText) throw new Error("Clipboard unavailable");
      await navigator.clipboard.writeText(text);
      setStatus("Diagnostics copied. They contain no API key or encrypted credential material.");
    } catch {
      setError("Could not copy diagnostics. Allow clipboard access, or send a screenshot of this panel instead.");
    }
  };

  const handleDelete = async () => {
    if (!draft.id || draft.id === "environment-gemini") return;
    setBusy(true); setError(null);
    try {
      await deleteConnection(draft.id);
      setProfiles((current) => current.filter((profile) => profile.id !== draft.id));
      onSelectionChange(null);
      setDraft(EMPTY_DRAFT);
      setModels([]);
      setStatus("Connection removed.");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Unable to remove connection."); }
    finally { setBusy(false); }
  };

  const selectedModelId = selection && selection.profileId === draft.id ? selection.modelId : null;

  const handleAddCustomModel = () => {
    setError(null);
    const change = addCustomModelId(draft.customModelIds, customModelInput);
    if (change.error) { setError(change.error); return; }
    setDraft((current) => ({ ...current, customModelIds: change.modelIds }));
    setCustomModelInput("");
  };

  const handleRemoveCustomModel = (id: string) => {
    setError(null);
    const change = removeCustomModelId(draft.customModelIds, id, selectedModelId);
    if (change.error) { setError(change.error); return; }
    setDraft((current) => ({ ...current, customModelIds: change.modelIds }));
    setModels((current) => current.filter((model) => model.id !== id || !model.custom));
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/55 p-2 sm:p-4 backdrop-blur-sm" onClick={onClose}>
      <section className="w-full max-w-3xl h-[92dvh] md:h-auto md:max-h-[92dvh] flex flex-col overflow-hidden bg-[var(--vellum-deep)] border border-[var(--ink-soft)] shadow-2xl" onClick={(event) => event.stopPropagation()}>
        <header className="shrink-0 flex items-center justify-between px-5 py-4 border-b border-[var(--ink-soft)]">
          <div className="flex items-center gap-2"><KeyRound size={16} className="text-[var(--rubric)]" /><div><h2 className="font-apparatus text-sm tracking-widest uppercase">Connections & Models</h2><p className="text-[11px] text-[var(--graphite)] mt-0.5">Provider keys stay encrypted on this Windows desktop.</p></div></div>
          <button type="button" onClick={onClose} className="p-1 text-[var(--graphite)] hover:text-[var(--ink)]"><X size={16} /></button>
        </header>
        <div data-connections-scroll-root="true" className="flex flex-1 min-h-0 flex-col overflow-hidden md:grid md:grid-cols-[220px_1fr]">
          <aside className="shrink-0 max-h-[24dvh] overflow-y-auto border-b md:max-h-none md:border-b-0 md:border-r border-[var(--ink-soft)] p-3 md:min-h-0">
            <button type="button" onClick={() => { setDraft(EMPTY_DRAFT); setModels([]); setStatus(null); }} className="w-full btn-secondary text-[11px] py-2 mb-3 flex items-center justify-center gap-1"><Plus size={13} /> New connection</button>
            <div className="space-y-1">
              {profiles.map((profile) => <button key={profile.id} type="button" onClick={() => chooseProfile(profile)} className={`w-full text-left px-3 py-2 border-l-2 ${profile.id === draft.id ? "border-[var(--rubric)] bg-[var(--vellum-raised)]" : "border-transparent hover:bg-[var(--vellum-raised)]"}`}><span className="block text-xs font-apparatus truncate">{profile.name}</span><span className="block text-[10px] text-[var(--graphite)] uppercase tracking-wider">{profile.provider} · {profile.hasSecret ? "key set" : "no key"}</span></button>)}
              {profiles.length === 0 && <p className="text-[11px] text-[var(--graphite)] px-2 py-3">No saved providers yet.</p>}
            </div>
          </aside>
          <div className="min-h-0 flex flex-col">
            <div className="min-h-0 flex-1 overflow-y-auto p-4 md:p-5">
              {runtimeWarning && <div className="mb-4 border border-[var(--gold)]/50 bg-[var(--gold)]/10 px-3 py-2 text-xs text-[var(--graphite)]">{runtimeWarning}</div>}
              {error && <div className="mb-4 border border-red-800/40 bg-red-950/10 px-3 py-2 text-xs text-red-700">{error}</div>}
              {status && <div className="mb-4 border border-emerald-800/30 bg-emerald-950/10 px-3 py-2 text-xs text-emerald-800 flex items-center gap-2"><Check size={13} />{status}</div>}
              <div className="grid sm:grid-cols-2 gap-3">
                <label className="text-[11px] uppercase tracking-wider text-[var(--graphite)]">Profile name<input value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} className="mt-1 w-full input-paper" placeholder="Personal OpenRouter" /></label>
                <label className="text-[11px] uppercase tracking-wider text-[var(--graphite)]">Provider<select disabled={draft.id === "environment-gemini"} value={draft.provider} onChange={(event) => { const provider = event.target.value as ProviderId; setDraft({ ...draft, provider }); onSelectionChange(null); }} className="mt-1 w-full input-paper"><option value="openrouter">OpenRouter</option><option value="nanogpt">NanoGPT</option><option value="gemini">Gemini AI Studio</option></select></label>
              </div>
              <label className="block mt-4 text-[11px] uppercase tracking-wider text-[var(--graphite)]">API key {selectedProfile?.hasSecret && <span className="normal-case tracking-normal">(leave blank to keep the saved key)</span>}<input disabled={draft.id === "environment-gemini"} type="password" autoComplete="off" value={draft.apiKey} onChange={(event) => setDraft({ ...draft, apiKey: event.target.value })} className="mt-1 w-full input-paper font-mono-ui" placeholder={draft.id === "environment-gemini" ? "Configured outside the app" : selectedProfile?.hasSecret ? "Saved securely · enter only to replace" : "Paste provider key"} /></label>
              <p className="mt-2 text-[11px] text-[var(--graphite)] flex items-start gap-1.5"><Zap size={12} className="mt-0.5 text-[var(--gold)] shrink-0" />Only a short key hint is returned to the UI. The full key is encrypted with Windows DPAPI and never written to localStorage.</p>
              <div data-connections-model-picker="true" className="mt-6 border-t border-[var(--ink-soft)] pt-4">
                <div className="flex items-center justify-between mb-2"><div><h3 className="text-xs font-apparatus uppercase tracking-widest">Model for generation</h3><p className="mt-1 text-[10px] text-[var(--graphite)]">{models.length ? `${displayedModels.length} shown · ${models.length} available to this profile` : "Choose a profile to load models"}</p></div>{(busy || isLoadingModels) && <Loader2 size={14} className="animate-spin text-[var(--rubric)]" />}</div>
                {isCompleteModelSelection(selection) && <div className="mb-3 border border-[var(--rubric)]/40 bg-[var(--vellum-raised)] px-3 py-2 text-[10px] font-mono-ui break-all"><span className="font-apparatus uppercase tracking-wider text-[var(--graphite)]">Selected model</span><br />{selection.modelId}</div>}
                <label className="block text-[10px] uppercase tracking-wider text-[var(--graphite)]">Search models<input aria-label="Search models" value={modelSearch} onChange={(event) => setModelSearch(event.target.value)} className="mt-1 w-full input-paper" placeholder="Search by name or model ID" /></label>
                <div className="mt-2 grid gap-2 sm:grid-cols-2">
                  <label className="text-[10px] uppercase tracking-wider text-[var(--graphite)]">Sort models<select aria-label="Sort models" value={modelSort} onChange={(event) => setModelSort(event.target.value as ModelSort)} className="mt-1 w-full input-paper"><option value="alphabetical">Alphabetical</option><option value="newest">Newest</option><option value="popular" disabled={draft.provider !== "nanogpt" || !hasPopularity}>NanoGPT Popular</option><option value="subscription" disabled={draft.provider !== "nanogpt"}>NanoGPT subscription first</option></select></label>
                  {draft.provider === "nanogpt" && <label className="self-end flex min-h-10 items-center gap-2 border border-[var(--ink-soft)] px-3 text-[11px]"><input type="checkbox" checked={subscriptionOnly} onChange={(event) => setSubscriptionOnly(event.target.checked)} />Subscription only</label>}
                </div>
                <p className="mt-2 mb-2 text-[10px] text-[var(--graphite)]">Favorites stay at the top of every sort. Search narrows the list without changing the saved catalog.</p>
                {draft.provider === "nanogpt" && !hasPopularity && models.length > 0 && <p className="mb-2 text-[10px] text-[var(--gold)]">NanoGPT popularity ranking is temporarily unavailable; no ranking is being guessed.</p>}
                {draft.provider === "nanogpt" && subscriptionOnly && models.length > 0 && !hasSubscriptionMetadata && <p className="mb-2 text-[10px] text-[var(--gold)]">NanoGPT subscription metadata is unavailable for this catalog. Restart the current server or turn off Subscription only.</p>}
                {draft.id === "environment-gemini" ? <p className="text-xs text-[var(--graphite)]">Gemini environment credentials are available to the server but do not use the curated OpenRouter/NanoGPT catalog.</p> : draft.id ? <div ref={modelListRef} data-connections-model-list="true" className="mt-3 max-h-[34dvh] min-h-[6rem] overflow-y-auto overscroll-contain snap-y snap-proximity scroll-pt-2 border border-[var(--ink-soft)] p-2 space-y-1">{displayedModels.map((model) => <div key={model.id} className={`snap-start scroll-mt-2 flex items-start gap-2 px-2 py-2 border ${model.available === false ? "opacity-45" : "border-transparent hover:border-[var(--ink-soft)]"}`}><label className="flex min-w-0 flex-1 items-start gap-2"><input type="radio" name="model" disabled={model.available === false} checked={selectedModelId === model.id} onChange={() => onSelectionChange({ profileId: draft.id!, modelId: model.id })} className="mt-1" /><span className="min-w-0"><span className="block text-xs font-mono-ui break-all">{model.label || model.id}</span>{model.label !== model.id && <span className="block text-[9px] font-mono-ui break-all text-[var(--graphite)]">{model.id}</span>}<span className="block text-[10px] text-[var(--graphite)]">{model.custom ? "Custom model" : model.providerReported ? "Provider model" : model.reasoning === "required" ? "Reasoning model" : "Standard model"}{model.subscriptionIncluded ? " · subscription included" : ""}{model.created ? ` · added ${new Date(model.created * 1000).toLocaleDateString()}` : ""}{model.available === false ? " · not reported by provider" : ""}</span></span></label><button type="button" aria-label={`${favoriteModelIds.includes(model.id) ? "Unfavorite" : "Favorite"} ${model.id}`} aria-pressed={favoriteModelIds.includes(model.id)} onClick={() => toggleFavorite(model.id)} className={`shrink-0 min-h-10 min-w-10 p-2 ${favoriteModelIds.includes(model.id) ? "text-[var(--gold)]" : "text-[var(--graphite)] hover:text-[var(--gold)]"}`}><Star size={14} fill={favoriteModelIds.includes(model.id) ? "currentColor" : "none"} /></button></div>)}{displayedModels.length === 0 && <p className="p-2 text-xs text-[var(--graphite)]">{models.length ? "No models match this filter." : "Save a profile to load its model catalog."}</p>}<button type="button" onClick={() => onSelectionChange(null)} className="mt-2 px-2 py-2 text-left text-[10px] uppercase tracking-wider text-[var(--graphite)] hover:text-[var(--ink)]">Use default Gemini/offline path</button></div> : <p className="text-xs text-[var(--graphite)]">Create or select a provider profile to choose a curated or provider-reported model.</p>}
              </div>
              {draft.id !== "environment-gemini" && <div className="mt-6 border-t border-[var(--ink-soft)] pt-4"><button type="button" aria-expanded={showAdvancedModels} onClick={() => setShowAdvancedModels((current) => !current)} className="flex w-full items-center justify-between text-left"><span><span className="block text-xs font-apparatus uppercase tracking-widest">Advanced model settings</span><span className="mt-1 block text-[11px] text-[var(--graphite)]">Custom model IDs and provider-specific entries</span></span><span className="text-xs text-[var(--graphite)]">{showAdvancedModels ? "Hide" : "Show"}</span></button>{showAdvancedModels && <div className="mt-3"><div className="flex gap-2"><input id="custom-model-id" value={customModelInput} onChange={(event) => setCustomModelInput(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); handleAddCustomModel(); } }} className="input-paper min-w-0 flex-1 font-mono-ui text-xs" placeholder="provider/model-id:thinking" /><button type="button" onClick={handleAddCustomModel} className="btn-secondary shrink-0 px-3 py-2 text-[10px] uppercase tracking-wider">Add model</button></div>{draft.customModelIds.length > 0 && <div className="mt-3 space-y-1">{draft.customModelIds.map((id) => <div key={id} className="flex items-center gap-2 border border-[var(--ink-soft)] px-2 py-1.5"><span className="min-w-0 flex-1 break-all font-mono-ui text-[11px]">{id}</span><span className="text-[9px] uppercase tracking-wider text-[var(--gold)]">Custom</span><button type="button" onClick={() => handleRemoveCustomModel(id)} aria-label={`Remove custom model ${id}`} className="p-1 text-[var(--graphite)] hover:text-red-700"><X size={12} /></button></div>)}</div>}<p className="mt-2 text-[10px] text-[var(--graphite)]">Save the connection after changing this list.</p></div>}</div>}
              {draft.id && draft.id !== "environment-gemini" && <p className="mt-4 text-[10px] text-[var(--graphite)]">Testing the selected model sends a small real generation request and may use provider quota or balance.</p>}
            </div>
            <div data-connections-actions="true" className="shrink-0 border-t border-[var(--ink-soft)] bg-[var(--vellum-deep)] p-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
              <div className="flex flex-wrap items-center gap-2">{draft.id !== "environment-gemini" && <button type="button" onClick={handleSave} disabled={busy} className="btn-primary min-h-10 flex-1 py-2 px-3 text-[11px] uppercase tracking-wider flex items-center justify-center gap-1.5"><Save size={13} /> Save</button>}{draft.id && draft.id !== "environment-gemini" && <button type="button" onClick={handleTest} disabled={busy} className="btn-secondary min-h-10 flex-1 py-2 px-3 text-[11px] uppercase tracking-wider">Test connection</button>}{draft.id && draft.id !== "environment-gemini" && <button type="button" onClick={handleGenerationTest} disabled={busy || !selectedModelId} className="btn-secondary min-h-10 flex-1 py-2 px-3 text-[11px] uppercase tracking-wider">Test selected</button>}<button type="button" onClick={handleCopyDiagnostics} disabled={busy} className="btn-secondary min-h-10 px-3 py-2 text-[11px] uppercase tracking-wider flex items-center justify-center gap-1.5"><Clipboard size={13} /><span className="hidden sm:inline">Copy diagnostics</span><span className="sm:hidden">Debug</span></button>{draft.id && draft.id !== "environment-gemini" && <button type="button" onClick={handleDelete} disabled={busy} className="min-h-10 min-w-10 text-[var(--graphite)] hover:text-red-700 p-2" title="Delete connection"><Trash2 size={15} /></button>}</div>
              {isCompleteModelSelection(selection) && <p className="mt-2 text-[10px] font-mono-ui text-[var(--graphite)] truncate">Selected: {selection.modelId}</p>}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
