import React, { useEffect, useMemo, useState } from "react";
import { Check, Loader2, RotateCcw, Save } from "lucide-react";
import type { PromptProfileV1 } from "../contracts/prompts";
import type { PromptRegistryEntry } from "../lib/prompts/registry";
import { createPromptProfile, listPromptCatalog, updatePromptProfile } from "../services/promptsService";

interface ViewProps {
  features: readonly PromptRegistryEntry[]; profiles: readonly PromptProfileV1[]; selectedProfileId: string | null; selectedFeatureId: string;
  draftName: string; draftText: string; busy: boolean; error: string | null; status: string | null;
  onSelectProfile(id: string | null): void; onSelectFeature(id: string): void; onNameChange(value: string): void; onTextChange(value: string): void;
  onNew(): void; onSave(): void; onReset(): void;
}
export function buildPromptOverrides(features: readonly PromptRegistryEntry[], values: Readonly<Record<string, string>>, profile: PromptProfileV1 | null) {
  return features.flatMap((feature) => {
    const text = values[feature.id];
    if (text === undefined || text === feature.defaultText) return [];
    const existing = profile?.overrides.find((item) => item.featureId === feature.id);
    return [{ featureId: feature.id, baseVersion: feature.defaultVersion, text, revision: existing && existing.text === text ? existing.revision : (existing?.revision || 0) + 1 }];
  });
}
export function PromptStudioView(props: ViewProps) {
  const feature = props.features.find((item) => item.id === props.selectedFeatureId) || props.features[0];
  return <div data-prompt-studio-scroll-root="true" className="min-h-0 flex-1 overflow-y-auto p-4 md:p-5">
    <div className="mb-4"><h2 className="font-apparatus text-sm uppercase tracking-widest">Creative Prompts</h2><p className="mt-1 text-[11px] text-[var(--graphite)]">Application profiles customize editable creative direction while protected schemas and safety rules remain server-owned.</p></div>
    <div className="mb-4 border border-[var(--gold)]/40 bg-[var(--gold)]/10 p-3 text-[11px] text-[var(--graphite)]"><strong>Foundation stage:</strong> Saved profiles do not affect generation yet. Versioned build snapshots and project-level selection ship in the next Prompt Studio slice.</div>
    {props.error && <div className="mb-3 border border-red-800/40 p-2 text-xs text-red-700">{props.error}</div>}
    {props.status && <div className="mb-3 flex items-center gap-2 border border-emerald-800/30 p-2 text-xs text-emerald-800"><Check size={13}/>{props.status}</div>}
    <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
      <label className="text-[10px] uppercase tracking-wider text-[var(--graphite)]">Application profile<select value={props.selectedProfileId || ""} onChange={(event) => props.onSelectProfile(event.target.value || null)} className="mt-1 w-full input-paper"><option value="">New profile</option>{props.profiles.map((profile) => <option key={profile.id} value={profile.id}>{profile.name} · r{profile.revision}</option>)}</select></label>
      <button type="button" onClick={props.onNew} className="btn-secondary min-h-10 self-end px-4 text-[10px] uppercase tracking-wider">New</button>
    </div>
    <label className="mt-3 block text-[10px] uppercase tracking-wider text-[var(--graphite)]">Profile name<input value={props.draftName} onChange={(event) => props.onNameChange(event.target.value)} className="mt-1 w-full input-paper" /></label>
    <div className="mt-5 grid gap-4 md:grid-cols-[190px_1fr]">
      <div className="space-y-1">{props.features.map((item) => <button key={item.id} type="button" onClick={() => props.onSelectFeature(item.id)} className={`w-full min-h-10 border-l-2 px-3 py-2 text-left text-xs ${item.id === feature?.id ? "border-[var(--rubric)] bg-[var(--vellum-raised)]" : "border-transparent hover:bg-[var(--vellum-raised)]"}`}>{item.label}<span className="block text-[9px] text-[var(--graphite)]">v{item.defaultVersion} · {item.id}</span></button>)}</div>
      {feature && <div className="min-w-0"><h3 className="font-apparatus text-sm">{feature.label}</h3><p className="mt-1 text-[11px] text-[var(--graphite)]">{feature.purpose}</p><p className="mt-2 text-[10px] text-[var(--graphite)]">Allowed literal variables: {feature.allowedVariables.join(", ")}</p>
        <textarea aria-label={`${feature.label} creative prompt`} value={props.draftText} onChange={(event) => props.onTextChange(event.target.value)} maxLength={24_000} className="mt-3 min-h-56 w-full input-paper font-mono-ui text-xs leading-relaxed" />
        <div className="mt-3 border border-[var(--ink-soft)] p-3"><h4 className="text-[10px] font-apparatus uppercase tracking-widest">Protected requirements</h4><ul className="mt-2 list-disc space-y-1 pl-4 text-[11px] text-[var(--graphite)]">{feature.protectedRequirements.map((requirement) => <li key={requirement}>{requirement}</li>)}</ul></div>
        <div className="mt-4 flex flex-wrap gap-2"><button type="button" onClick={props.onSave} disabled={props.busy} className="btn-primary min-h-10 px-4 text-[10px] uppercase tracking-wider flex items-center gap-2">{props.busy ? <Loader2 size={13} className="animate-spin"/> : <Save size={13}/>}Save profile</button><button type="button" onClick={props.onReset} disabled={props.busy} className="btn-secondary min-h-10 px-4 text-[10px] uppercase tracking-wider flex items-center gap-2"><RotateCcw size={13}/>Use shipped default</button></div>
      </div>}
    </div>
  </div>;
}

export function PromptStudio() {
  const [features, setFeatures] = useState<PromptRegistryEntry[]>([]); const [profiles, setProfiles] = useState<PromptProfileV1[]>([]);
  const [profileId, setProfileId] = useState<string | null>(null); const [featureId, setFeatureId] = useState(""); const [name, setName] = useState("My creative profile");
  const [overrides, setOverrides] = useState<Record<string, string>>({}); const [busy, setBusy] = useState(false); const [error, setError] = useState<string | null>(null); const [status, setStatus] = useState<string | null>(null);
  const profile = profiles.find((item) => item.id === profileId) || null; const feature = features.find((item) => item.id === featureId) || features[0];
  const text = feature ? overrides[feature.id] ?? feature.defaultText : "";
  useEffect(() => { void listPromptCatalog().then((catalog) => { setFeatures(catalog.features); setProfiles(catalog.profiles); setFeatureId(catalog.features[0]?.id || ""); }).catch((cause) => setError(cause instanceof Error ? cause.message : "Unable to load Prompt Studio.")); }, []);
  const selectProfile = (id: string | null) => { const selected = profiles.find((item) => item.id === id); setProfileId(id); setName(selected?.name || "My creative profile"); setOverrides(Object.fromEntries(selected?.overrides.map((item) => [item.featureId, item.text]) || [])); setStatus(null); setError(null); };
  const draftOverrides = useMemo(() => buildPromptOverrides(features, overrides, profile), [features, overrides, profile]);
  const save = async () => { setBusy(true); setError(null); setStatus(null); try { const saved = profile ? await updatePromptProfile(profile.id, { name, overrides: draftOverrides }, profile.revision) : await createPromptProfile({ name, overrides: draftOverrides }); setProfiles((current) => current.some((item) => item.id === saved.id) ? current.map((item) => item.id === saved.id ? saved : item) : [...current, saved]); setProfileId(saved.id); setStatus("Profile saved. Generation remains unchanged until snapshot wiring is enabled."); } catch (cause) { setError(cause instanceof Error ? cause.message : "Unable to save prompt profile."); } finally { setBusy(false); } };
  if (!features.length && !error) return <div className="flex min-h-48 items-center justify-center text-xs text-[var(--graphite)]"><Loader2 size={14} className="mr-2 animate-spin"/>Loading creative prompts…</div>;
  return <PromptStudioView features={features} profiles={profiles} selectedProfileId={profileId} selectedFeatureId={feature?.id || ""} draftName={name} draftText={text} busy={busy} error={error} status={status} onSelectProfile={selectProfile} onSelectFeature={setFeatureId} onNameChange={setName} onTextChange={(value) => feature && setOverrides((current) => ({ ...current, [feature.id]: value }))} onNew={() => selectProfile(null)} onSave={() => void save()} onReset={() => feature && setOverrides((current) => { const next = { ...current }; delete next[feature.id]; return next; })} />;
}
