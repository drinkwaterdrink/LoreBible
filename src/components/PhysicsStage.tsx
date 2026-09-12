import React from "react";
import { PhysicsConfig } from "../types";
import { LINGUISTIC_BASES } from "../lib/wordBanks";
import { Sliders, ArrowRight, BookOpen, Skull, Flame } from "lucide-react";

export const STANDARD_GENRES = [
  "Drama & Psychological Realism",
  "Mystery & Detective",
  "Crime, Noir & Thriller",
  "Sci-Fi & Cyberpunk",
  "Space Opera & Planetary Sci-Fi",
  "Low & Dark Fantasy",
  "High & Epic Fantasy",
  "Urban & Modern Fantasy",
  "Horror & Supernatural",
  "Psychological Horror & Paranoia",
  "Gothic Romance & Dread",
  "Post-Apocalyptic & Survival",
  "Action, Adventure & Heist",
  "Espionage & Political Intrigue",
  "Historical & Period Drama",
  "Weird Fiction & Surrealism",
  "Western & Frontier",
  "Slice of Life & Contemporary",
  "Dark Comedy & Satire",
];

interface PhysicsStageProps {
  physics: PhysicsConfig;
  onChangePhysics: (updated: PhysicsConfig) => void;
  onProceed: () => void;
  isCanonActive: boolean;
  chosenTitle: string;
  forgeExecutionMode?: "continuous" | "step_by_step";
  onChangeForgeExecutionMode?: (mode: "continuous" | "step_by_step") => void;
}

export const PhysicsStage: React.FC<PhysicsStageProps> = ({
  physics,
  onChangePhysics,
  onProceed,
  isCanonActive,
  chosenTitle,
  forgeExecutionMode = "continuous",
  onChangeForgeExecutionMode,
}) => {
  const update = <K extends keyof PhysicsConfig>(field: K, val: PhysicsConfig[K]) => {
    onChangePhysics({
      ...physics,
      [field]: val,
    });
  };

  return (
    <div id="physics-stage-container" className="py-6 max-w-[72ch] mx-auto space-y-8">
      {/* Header */}
      <div className="border-b border-[var(--ink-soft)] pb-4">
        <span className="text-[11px] font-apparatus font-semibold uppercase tracking-widest text-[var(--graphite)]">
          Stage 03 · Physics & Density
        </span>
        <h2 className="text-2xl font-manuscript font-normal text-[var(--ink)] mt-1">
          Calibrate the world&apos;s forces.
        </h2>
        <p className="text-xs text-[var(--graphite)] font-manuscript mt-1 leading-relaxed">
          Sensible defaults are established. Adjust density, mundanity, and expansion notes for{" "}
          <span className="italic text-[var(--ink)]">{chosenTitle}</span>, or proceed immediately.
        </p>
      </div>

      {/* CORE WRITING SLIDERS */}
      <div className="manuscript-sheet p-6 space-y-7">
        <div className="scribe-header">
          <span>Trio Sliders · Writing Dynamics & Scope</span>
          <span className="text-[10px] font-mono-ui">Density Table §4</span>
        </div>

        {/* 1. DENSITY SCALING SLIDER (1,000 to 10,000 Tokens) */}
        <div className="space-y-2.5">
          <div className="flex justify-between items-baseline flex-wrap gap-2">
            <div>
              <label className="text-xs font-apparatus font-semibold uppercase tracking-wider text-[var(--ink)] block">
                Manuscript Density Scaling
              </label>
              <span className="text-[10px] font-apparatus text-[var(--graphite)]">
                Target volume for entire generated scenario bible
              </span>
            </div>
            <div className="text-right">
              <span className="text-sm font-mono-ui font-bold text-[var(--rubric)]">
                {(physics.densityTokens || (physics.density === "Quick" ? 1500 : physics.density === "Rich" ? 6000 : 3000)).toLocaleString()} Tokens
              </span>
              <span className="text-[10px] font-manuscript text-[var(--graphite)] ml-1.5 italic">
                (~{Math.round((physics.densityTokens || (physics.density === "Quick" ? 1500 : physics.density === "Rich" ? 6000 : 3000)) * 0.75).toLocaleString()} words)
              </span>
            </div>
          </div>

          {/* Continuous Range Slider 1,000 - 10,000 tokens */}
          <input
            id="density-tokens-slider"
            type="range"
            min={1000}
            max={10000}
            step={250}
            value={physics.densityTokens || (physics.density === "Quick" ? 1500 : physics.density === "Rich" ? 6000 : 3000)}
            onChange={(e) => {
              const tokens = Number(e.target.value);
              const tier = tokens <= 2250 ? "Quick" : tokens <= 5000 ? "Standard" : "Rich";
              onChangePhysics({
                ...physics,
                densityTokens: tokens,
                density: tier,
              });
            }}
            className="w-full accent-[var(--rubric)] cursor-pointer h-2 bg-[var(--vellum-raised)] border border-[var(--ink-soft)] rounded-[2px]"
          />

          {/* Slider Scale Endpoints */}
          <div className="flex justify-between text-[10px] text-[var(--graphite)] font-apparatus uppercase tracking-wider">
            <span>1,000 Tokens (Lean)</span>
            <span>3,000 (Standard)</span>
            <span>6,000 (Rich)</span>
            <span>10,000 Tokens (Magnum Opus)</span>
          </div>

          {/* Dynamic Manuscript Scope Description Card */}
          {(() => {
            const tokens = physics.densityTokens || (physics.density === "Quick" ? 1500 : physics.density === "Rich" ? 6000 : 3000);
            let tierName = "Standard Manuscript";
            let tierDesc = "Complete scenario seed document with full cast, world physics, secrets, relationship web, and kickoff.";
            let color = "text-[var(--ink)]";

            if (tokens <= 2250) {
              tierName = "Lean & Focused Scope";
              tierDesc = "Tight core cast, primary location, urgent central pressure, and rapid kickoff. Ideal for immediate roleplay or lightweight bots.";
              color = "text-[var(--ink-soft)]";
            } else if (tokens <= 5000) {
              tierName = "Standard Scenario Bible";
              tierDesc = "Exhaustively drafted core document: complete 6-character cast, full world physics rules, multi-character secrets, location network, and opening prompt.";
              color = "text-[var(--ink)]";
            } else if (tokens <= 7500) {
              tierName = "Comprehensive Lorebook";
              tierDesc = "Deep sensory texture, layered faction networks, historical lore entries, multi-tiered relationships, and environmental sound/weather rules.";
              color = "text-[var(--rubric)]";
            } else {
              tierName = "Magnum Opus Encyclopedia";
              tierDesc = "Maximum generation volume: exhaustive world bible, multi-branched procedural roll tables, sprawling relationship tensions, unfired guns, and extensive character dossiers.";
              color = "text-[var(--rubric)] font-bold";
            }

            return (
              <div className="p-3 bg-[var(--vellum-raised)]/90 border border-[var(--ink-soft)] rounded-[2px] text-xs font-manuscript flex items-start gap-2.5">
                <span className="text-[var(--rubric)] text-sm font-bold">✦</span>
                <div className="space-y-0.5">
                  <span className={`font-semibold font-apparatus uppercase tracking-wider text-[11px] ${color} block`}>
                    {tierName}
                  </span>
                  <p className="text-[var(--graphite)] text-[11px] leading-relaxed">
                    {tierDesc}
                  </p>
                </div>
              </div>
            );
          })()}

          {/* Preset Buttons for Quick Selection */}
          <div className="flex items-center gap-1.5 pt-1">
            <span className="text-[9px] font-apparatus uppercase tracking-wider text-[var(--graphite)] mr-1">
              Presets:
            </span>
            {[
              { label: "1,500 Lean", val: 1500, tier: "Quick" as const },
              { label: "3,000 Standard", val: 3000, tier: "Standard" as const },
              { label: "6,000 Deep Lore", val: 6000, tier: "Rich" as const },
              { label: "10,000 Magnum Opus", val: 10000, tier: "Rich" as const },
            ].map((preset) => {
              const currentVal = physics.densityTokens || (physics.density === "Quick" ? 1500 : physics.density === "Rich" ? 6000 : 3000);
              const isActive = currentVal === preset.val;
              return (
                <button
                  key={preset.val}
                  type="button"
                  onClick={() => {
                    onChangePhysics({
                      ...physics,
                      densityTokens: preset.val,
                      density: preset.tier,
                    });
                  }}
                  className={`px-2 py-0.5 text-[10px] font-apparatus uppercase tracking-wider rounded-[2px] border transition-colors cursor-pointer ${
                    isActive
                      ? "border-[var(--rubric)] text-[var(--rubric)] bg-[var(--vellum)] font-semibold"
                      : "border-[var(--ink-soft)] text-[var(--graphite)] hover:text-[var(--ink)] bg-[var(--vellum-raised)]/50"
                  }`}
                >
                  {preset.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="h-[1px] bg-[var(--ink-soft)]" />

        {/* 2. STRANGENESS SLIDER WITH CLARIFYING GUIDE */}
        <div className="space-y-2.5">
          <div className="flex justify-between items-baseline">
            <div>
              <label className="text-xs font-apparatus font-semibold uppercase tracking-wider text-[var(--ink)] block">
                Strangeness · The Law-Breaking & Uncanny Dial
              </label>
              <span className="text-[10px] font-apparatus text-[var(--graphite)]">
                How far reality deviates from rational physics into the surreal or supernatural
              </span>
            </div>
            <span className="text-xs font-mono-ui font-bold text-[var(--rubric)]">
              Level {physics.strangeness} / 5
            </span>
          </div>

          <input
            id="strangeness-slider"
            type="range"
            min={1}
            max={5}
            step={1}
            value={physics.strangeness}
            onChange={(e) => update("strangeness", Number(e.target.value))}
            className="w-full accent-[var(--rubric)] cursor-pointer h-2 bg-[var(--vellum-raised)] border border-[var(--ink-soft)] rounded-[2px]"
          />

          <div className="flex justify-between text-[10px] text-[var(--graphite)] font-manuscript">
            <span>1 · Strictly Grounded</span>
            <span>3 · One Uncanny Anchor Rule</span>
            <span>5 · Deeply Alien Logic</span>
          </div>

          {/* Dynamic Explanation of Strangeness Level */}
          {(() => {
            const s = physics.strangeness;
            const levels = [
              {
                title: "Level 1 · Strictly Grounded Reality",
                desc: "Everyday laws of physics, biology, and chemistry hold true. No impossible anomalies or supernatural phenomena exist. Everything has a rational explanation.",
                example: "e.g. Broken telephone lines, cold weather, human greed, psychological stress.",
              },
              {
                title: "Level 2 · Subtle Atmospheric Unease",
                desc: "Familiar world, but with eerie coincidences, unsettling local folklore, or psychological disorientation that leaves characters questioning their senses.",
                example: "e.g. Unexplained static on radios, dogs barking at empty corners, pervasive deja vu.",
              },
              {
                title: "Level 3 · One Uncanny Anchor Rule",
                desc: "Recognizable reality punctured by exactly ONE impossible rule or supernatural law that everyone in the setting must navigate.",
                example: "e.g. The deceased can still receive telephone calls; mirrors reflect what happened five minutes ago; names cannot be written down.",
              },
              {
                title: "Level 4 · Pervasive Metaphysical Distortion",
                desc: "Multiple laws of nature or society are fractured. Space may bend, dream logic leaks into daylight, and biological forms exhibit subtle mutations.",
                example: "e.g. Rooms that expand when unattended, shadows separating from their owners, seasonal changes occurring overnight.",
              },
              {
                title: "Level 5 · Deeply Alien Metaphysics & Cosmic Dread",
                desc: "Radical unreality. Non-Euclidean geometry, causality loops, incomprehensible higher-dimensional forces where normal human reason collapses.",
                example: "e.g. Memory erasure upon crossing thresholds, sound manifesting as taste, entities that exist across multiple timelines simultaneously.",
              },
            ];
            const current = levels[s - 1] || levels[2];

            return (
              <div className="p-3 bg-[var(--vellum-raised)]/90 border border-[var(--ink-soft)] rounded-[2px] text-xs font-manuscript space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-apparatus font-semibold uppercase tracking-wider text-[11px] text-[var(--ink)]">
                    {current.title}
                  </span>
                  <span className="text-[9px] font-apparatus text-[var(--graphite)]">
                    Affects: World Physics rules & NPC secrets
                  </span>
                </div>
                <p className="text-[var(--graphite)] text-[11px] leading-relaxed">
                  {current.desc}
                </p>
                <p className="text-[var(--rubric)] text-[10px] font-manuscript italic pt-0.5">
                  {current.example}
                </p>
              </div>
            );
          })()}
        </div>

        <div className="h-[1px] bg-[var(--ink-soft)]" />

        {/* 3. MUNDANITY SLIDER WITH CLARIFYING GUIDE */}
        <div className="space-y-2.5">
          <div className="flex justify-between items-baseline">
            <div>
              <label className="text-xs font-apparatus font-semibold uppercase tracking-wider text-[var(--ink)] block">
                Mundanity · The Material Friction & Logistics Dial
              </label>
              <span className="text-[10px] font-apparatus text-[var(--graphite)]">
                How much bodily drudgery, bureaucratic drag, and physical wear characters must endure
              </span>
            </div>
            <span className="text-xs font-mono-ui font-bold text-[var(--rubric)]">
              Level {physics.mundanity} / 5
            </span>
          </div>

          <input
            id="mundanity-slider"
            type="range"
            min={1}
            max={5}
            step={1}
            value={physics.mundanity}
            onChange={(e) => update("mundanity", Number(e.target.value))}
            className="w-full accent-[var(--rubric)] cursor-pointer h-2 bg-[var(--vellum-raised)] border border-[var(--ink-soft)] rounded-[2px]"
          />

          <div className="flex justify-between text-[10px] text-[var(--graphite)] font-manuscript">
            <span>1 · Mythic / Cinematic Elevation</span>
            <span>3 · Measured Logistics</span>
            <span>5 · Wet Wool, Stamps & Back Tolls</span>
          </div>

          {/* Dynamic Explanation of Mundanity Level */}
          {(() => {
            const m = physics.mundanity;
            const levels = [
              {
                title: "Level 1 · Mythic / Cinematic Elevation",
                desc: "Heroic shorthand. Characters never worry about coins, bus fare, vehicle repairs, or paperwork. Wounds heal without infection; travel happens in instant cuts.",
                example: "e.g. Endless ammo, instant travel, zero administrative interference, idealized noble drama.",
              },
              {
                title: "Level 2 · Light Practicality",
                desc: "Basic resources are loosely tracked, but the narrative focus remains on high drama, romantic tension, and moral conflicts rather than mundane maintenance.",
                example: "e.g. Running low on funds is a brief plot point, but characters don't waste time waiting in government queues.",
              },
              {
                title: "Level 3 · Measured Logistics & Physical Toll",
                desc: "Practical constraints actively shape choices. Travel takes real hours, tools degrade and require upkeep, wounds hurt, and favors demand financial payment.",
                example: "e.g. Counting remaining cartridges, paying innkeepers, treating sprained ankles, bartering supplies.",
              },
              {
                title: "Level 4 · Heavy Friction & Tactile Grime",
                desc: "The world is unromanticized and heavy. Characters battle wet wool coats, broken bootlaces, greasy spoons, stale coffee, bad weather, and bureaucratic stamps.",
                example: "e.g. Permits rejected for missing signatures, damp firewood that refuses to light, back taxes due at town hall.",
              },
              {
                title: "Level 5 · Grinding Institutional Drudgery & Misery",
                desc: "Crushing bureaucratic obstacles and physical exhaustion dominate every scene. Characters are perpetually tired, cold, broke, and stalled by red tape.",
                example: "e.g. Waiting three hours for notary seals, shivering in moldy garments, paying toll gates with counterfeit silver.",
              },
            ];
            const current = levels[m - 1] || levels[3];

            return (
              <div className="p-3 bg-[var(--vellum-raised)]/90 border border-[var(--ink-soft)] rounded-[2px] text-xs font-manuscript space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-apparatus font-semibold uppercase tracking-wider text-[11px] text-[var(--ink)]">
                    {current.title}
                  </span>
                  <span className="text-[9px] font-apparatus text-[var(--graphite)]">
                    Affects: NPC wants, entry costs & survival obstacles
                  </span>
                </div>
                <p className="text-[var(--graphite)] text-[11px] leading-relaxed">
                  {current.desc}
                </p>
                <p className="text-[var(--rubric)] text-[10px] font-manuscript italic pt-0.5">
                  {current.example}
                </p>
              </div>
            );
          })()}
        </div>
      </div>

      {/* EXPANSION NOTES DIALS WITH WIDE VARIETY OF GENRES */}
      <div className="manuscript-sheet p-6 space-y-5">
        <div className="scribe-header">
          <span>Expansion Notes & Genre Architecture</span>
          <span className="text-[10px] font-mono-ui">[P] Permanent</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* PRIMARY GENRE SELECTION WITH CUSTOM OPTION */}
          <div className="sm:col-span-2 space-y-2">
            <div className="flex justify-between items-baseline">
              <label className="text-[10px] font-apparatus uppercase tracking-wider text-[var(--graphite)] block">
                Primary Scenario Genre & Framework
              </label>
              {(!physics.genre || !STANDARD_GENRES.includes(physics.genre)) && (
                <span className="text-[9px] font-apparatus uppercase tracking-wider text-[var(--rubric)] font-semibold">
                  Custom Mode Active
                </span>
              )}
            </div>

            <select
              value={
                !physics.genre
                  ? "Drama & Psychological Realism"
                  : STANDARD_GENRES.includes(physics.genre)
                  ? physics.genre
                  : "__custom__"
              }
              onChange={(e) => {
                const val = e.target.value;
                if (val === "__custom__") {
                  // If switching to custom, retain current or provide empty starter
                  update("genre", STANDARD_GENRES.includes(physics.genre || "") ? "" : physics.genre);
                } else {
                  update("genre", val);
                }
              }}
              className="w-full text-xs input-underline py-1.5 font-apparatus bg-transparent text-[var(--ink)] font-semibold cursor-pointer"
            >
              <optgroup label="Broad & Versatile Genres">
                <option value="Drama & Psychological Realism">Drama & Psychological Realism</option>
                <option value="Mystery & Detective">Mystery & Detective</option>
                <option value="Crime, Noir & Thriller">Crime, Noir & Thriller</option>
                <option value="Sci-Fi & Cyberpunk">Sci-Fi & Cyberpunk</option>
                <option value="Space Opera & Planetary Sci-Fi">Space Opera & Planetary Sci-Fi</option>
                <option value="Low & Dark Fantasy">Low & Dark Fantasy</option>
                <option value="High & Epic Fantasy">High & Epic Fantasy</option>
                <option value="Urban & Modern Fantasy">Urban & Modern Fantasy</option>
                <option value="Horror & Supernatural">Horror & Supernatural</option>
                <option value="Psychological Horror & Paranoia">Psychological Horror & Paranoia</option>
                <option value="Gothic Romance & Dread">Gothic Romance & Dread</option>
                <option value="Post-Apocalyptic & Survival">Post-Apocalyptic & Survival</option>
                <option value="Action, Adventure & Heist">Action, Adventure & Heist</option>
                <option value="Espionage & Political Intrigue">Espionage & Political Intrigue</option>
                <option value="Historical & Period Drama">Historical & Period Drama</option>
                <option value="Weird Fiction & Surrealism">Weird Fiction & Surrealism</option>
                <option value="Western & Frontier">Western & Frontier</option>
                <option value="Slice of Life & Contemporary">Slice of Life & Contemporary</option>
                <option value="Dark Comedy & Satire">Dark Comedy & Satire</option>
              </optgroup>
              <optgroup label="Custom Genre Specification">
                <option value="__custom__">✦ Custom Genre (Type your own...)</option>
              </optgroup>
            </select>

            {/* Custom Genre Text Input Field when Custom is chosen or active */}
            {(!physics.genre || !STANDARD_GENRES.includes(physics.genre)) && (
              <div className="p-2.5 bg-[var(--vellum-raised)] border border-[var(--rubric)]/50 rounded-[2px] space-y-1 mt-1.5">
                <label className="text-[9px] font-apparatus uppercase tracking-wider text-[var(--rubric)] font-semibold block">
                  Custom Scenario Genre Name
                </label>
                <input
                  type="text"
                  value={physics.genre || ""}
                  onChange={(e) => update("genre", e.target.value)}
                  placeholder="e.g. Solarpunk Diplomatic Thriller, Nautical Horror, Folk Fantasy..."
                  className="w-full text-xs input-underline py-1 font-manuscript bg-transparent text-[var(--ink)] font-semibold placeholder:text-[var(--graphite)]/40"
                  autoFocus
                />
                <p className="text-[10px] text-[var(--graphite)] font-manuscript italic">
                  Type any genre or aesthetic combination. It will govern world physics, secrets, and tone.
                </p>
              </div>
            )}
          </div>

          {/* SUB-GENRE / FLAVOR SPECIFIER */}
          <div className="sm:col-span-2">
            <label className="text-[10px] font-apparatus uppercase tracking-wider text-[var(--graphite)] block mb-1">
              Subgenre & Tonal Flavor (Optional Custom Tag)
            </label>
            <input
              type="text"
              value={physics.subgenre || ""}
              onChange={(e) => update("subgenre", e.target.value)}
              placeholder="e.g. Dinner Party Melodrama, Southern Gothic, Workplace Satire, Bleak Isolation"
              className="w-full text-xs input-underline py-1 font-manuscript bg-transparent placeholder:text-[var(--graphite)]/40"
            />
          </div>

          {/* Violence */}
          <div>
            <label className="text-[10px] font-apparatus uppercase tracking-wider text-[var(--graphite)] block mb-1">
              Violence
            </label>
            <select
              value={physics.violence}
              onChange={(e) => update("violence", e.target.value as any)}
              className="w-full text-xs input-underline py-1 font-apparatus bg-transparent"
            >
              <option value="None">None</option>
              <option value="Implied">Implied</option>
              <option value="Moderate">Moderate</option>
              <option value="Graphic">Graphic</option>
            </select>
          </div>

          {/* Horror & Dread Element */}
          <div>
            <label className="text-[10px] font-apparatus uppercase tracking-wider text-[var(--graphite)] block mb-1">
              Horror & Dread Element
            </label>
            <select
              value={physics.horror}
              onChange={(e) => update("horror", e.target.value)}
              className="w-full text-xs input-underline py-1 font-apparatus bg-transparent"
            >
              <option value="None">None (Grounded Drama / Mystery)</option>
              <option value="Psych">Psychological Dread & Paranoia</option>
              <option value="Gothic">Gothic Atmosphere & Decay</option>
              <option value="Cosmic">Cosmic Strangeness & Void</option>
              <option value="Supernatural">Supernatural / Spectral</option>
              <option value="Body">Body / Visceral Tension</option>
            </select>
          </div>

          {/* Romance */}
          <div>
            <label className="text-[10px] font-apparatus uppercase tracking-wider text-[var(--graphite)] block mb-1">
              Romance Weight
            </label>
            <select
              value={physics.romance}
              onChange={(e) => update("romance", e.target.value as any)}
              className="w-full text-xs input-underline py-1 font-apparatus bg-transparent"
            >
              <option value="None">None</option>
              <option value="Subplot">Subplot</option>
              <option value="Major">Major</option>
              <option value="Primary">Primary Focus</option>
            </select>
          </div>

          {/* Pacing */}
          <div>
            <label className="text-[10px] font-apparatus uppercase tracking-wider text-[var(--graphite)] block mb-1">
              Pacing
            </label>
            <select
              value={physics.pacing}
              onChange={(e) => update("pacing", e.target.value as any)}
              className="w-full text-xs input-underline py-1 font-apparatus bg-transparent"
            >
              <option value="Slow burn">Slow burn</option>
              <option value="Measured">Measured</option>
              <option value="Dynamic">Dynamic</option>
              <option value="Frantic">Frantic</option>
            </select>
          </div>

          {/* Explicit Content */}
          <div>
            <label className="text-[10px] font-apparatus uppercase tracking-wider text-[var(--graphite)] block mb-1">
              Explicit Content
            </label>
            <select
              value={physics.explicitContent}
              onChange={(e) => update("explicitContent", e.target.value as any)}
              className="w-full text-xs input-underline py-1 font-apparatus bg-transparent"
            >
              <option value="No">No</option>
              <option value="Fade">Fade to black</option>
              <option value="Yes">Yes</option>
            </select>
          </div>

          {/* Player Death */}
          <div>
            <label className="text-[10px] font-apparatus uppercase tracking-wider text-[var(--graphite)] block mb-1">
              Player Death
            </label>
            <select
              value={physics.playerDeath}
              onChange={(e) => update("playerDeath", e.target.value as any)}
              className="w-full text-xs input-underline py-1 font-apparatus bg-transparent"
            >
              <option value="No">No</option>
              <option value="Only if earned">Only if earned</option>
              <option value="Yes">Yes</option>
            </select>
          </div>
        </div>

        {/* Naming Linguistic Base (Hidden in Canon Mode) */}
        {!isCanonActive ? (
          <div className="pt-3 border-t border-[var(--ink-soft)]">
            <label className="text-[10px] font-apparatus uppercase tracking-wider text-[var(--graphite)] block mb-1">
              Linguistic Base for Historical Names
            </label>
            <select
              value={physics.linguisticBase}
              onChange={(e) => update("linguisticBase", e.target.value)}
              className="w-full text-xs input-underline py-1 font-apparatus bg-transparent"
            >
              <option value="">Auto-detect from spark (Default)</option>
              {LINGUISTIC_BASES.map((base) => (
                <option key={base} value={base}>
                  {base}
                </option>
              ))}
            </select>
            <p className="text-[10px] text-[var(--graphite)] font-manuscript mt-1 italic">
              Bans invented fantasy clichés; draws mundane names from one coherent culture.
            </p>
          </div>
        ) : (
          <div className="pt-2 text-[10px] italic text-[var(--graphite)] font-manuscript border-t border-[var(--ink-soft)]">
            * Linguistic-base picker suspended: Canon Mode matches franchise conventions.
          </div>
        )}
      </div>

      {/* HANDWRITTEN MUST INCLUDE / MUST AVOID */}
      <div className="manuscript-sheet p-6 space-y-4">
        <div className="scribe-header">
          <span>Author&apos;s Margin Instructions</span>
          <span className="text-[10px] font-mono-ui">Handwritten Voice</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-[10px] font-apparatus uppercase tracking-wider text-[var(--graphite)] block mb-1">
              Must Include (Specific motif, relic, dilemma)
            </label>
            <textarea
              value={physics.mustInclude}
              onChange={(e) => update("mustInclude", e.target.value)}
              placeholder="e.g. an unsent letter, heavy rain, a missing ledger page"
              rows={2}
              className="w-full bg-transparent resize-none input-underline font-hand text-lg text-[var(--ink-blue)] leading-snug placeholder:text-[var(--graphite)]/40 placeholder:font-hand"
            />
          </div>

          <div>
            <label className="text-[10px] font-apparatus uppercase tracking-wider text-[var(--graphite)] block mb-1">
              Must Avoid (Tropes or tones to banish)
            </label>
            <textarea
              value={physics.mustAvoid}
              onChange={(e) => update("mustAvoid", e.target.value)}
              placeholder="e.g. chosen one tropes, cheerful resolutions, clean magic"
              rows={2}
              className="w-full bg-transparent resize-none input-underline font-hand text-lg text-[var(--ink-blue)] leading-snug placeholder:text-[var(--graphite)]/40 placeholder:font-hand"
            />
          </div>
        </div>
      </div>

      <div className="manuscript-sheet p-6 space-y-4">
        <div className="scribe-header">
          <span>Forge execution</span>
          <span className="text-[10px] font-mono-ui">Rate-limit control</span>
        </div>
        <p className="text-xs text-[var(--graphite)] font-manuscript leading-relaxed">
          Choose whether Forge runs every remaining bundle automatically or pauses after each validated bundle. Completed bundles are kept if a later request fails.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {([
            ["continuous", "Continuous", "Run all remaining bundles automatically."],
            ["step_by_step", "One bundle at a time", "Pause after each bundle so you decide when the next API call begins."],
          ] as const).map(([value, label, description]) => (
            <label key={value} className="flex items-start gap-3 border border-[var(--ink-soft)] p-3 cursor-pointer bg-[var(--vellum-raised)]">
              <input type="radio" name="forge-execution-mode" value={value} checked={forgeExecutionMode === value} onChange={() => onChangeForgeExecutionMode?.(value)} className="mt-0.5" />
              <span>
                <span className="block text-xs font-apparatus font-semibold text-[var(--ink)]">{label}</span>
                <span className="block mt-1 text-[11px] font-manuscript text-[var(--graphite)] leading-relaxed">{description}</span>
              </span>
            </label>
          ))}
        </div>
      </div>

      {/* Action Footer */}
      <div className="flex items-center justify-between pt-4 border-t border-[var(--ink-soft)]">
        <span className="text-xs text-[var(--graphite)] font-manuscript">
          Next: Stream the manuscript section by section.
        </span>
        <button
          id="proceed-to-forge-btn"
          type="button"
          onClick={onProceed}
          className="btn-primary flex items-center gap-2"
        >
          <span>Begin The Forge</span>
          <ArrowRight size={13} />
        </button>
      </div>
    </div>
  );
};
