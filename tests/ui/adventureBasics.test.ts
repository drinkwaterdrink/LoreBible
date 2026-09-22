import { expect, test, describe, beforeEach } from "bun:test";
import { getStoredUiMode, setStoredUiMode, UI_MODE_STORAGE_KEY } from "../../src/ui/adventure/uiMode";
import { selectActiveGenerationTelemetry } from "../../src/ui/adventure/activityAdapter";
import { readFileSync } from "node:fs";
import { join } from "node:path";

describe("Adventure Journal Design Tokens", () => {
  test("tokens.css contains scoped .adventure-journal-theme tokens", () => {
    const css = readFileSync(join(process.cwd(), "src/ui/adventure/tokens.css"), "utf8");
    expect(css).toContain(".adventure-journal-theme {");
    expect(css).toContain("--surface-app:");
    expect(css).toContain("--surface-paper:");
    expect(css).toContain("--accent-gold:");
    expect(css).toContain("--border-gold:");
    expect(css).toContain("@media print {");
    expect(css).toContain(".adventure-rail,");
    expect(css).toContain(".adventure-nav,");
  });
});

describe("UI Mode Preference", () => {
  let mockStore: Record<string, string> = {};

  beforeEach(() => {
    mockStore = {};
    (globalThis as any).localStorage = {
      getItem: (key: string) => mockStore[key] ?? null,
      setItem: (key: string, value: string) => { mockStore[key] = value; },
      removeItem: (key: string) => { delete mockStore[key]; },
      clear: () => { mockStore = {}; },
    };
  });

  test("defaults to adventure_journal when no preference is stored", () => {
    expect(getStoredUiMode()).toBe("adventure_journal");
  });

  test("reads and stores classic and adventure_journal preferences", () => {
    setStoredUiMode("classic");
    expect(getStoredUiMode()).toBe("classic");

    setStoredUiMode("adventure_journal");
    expect(getStoredUiMode()).toBe("adventure_journal");
  });
});

describe("Activity Adapter Telemetry Selector", () => {
  test("returns isGenerating false when no activity is active", () => {
    const view = selectActiveGenerationTelemetry({
      forge: { status: "idle", progress: null, startedAt: null },
      divergence: { status: "complete", progress: null, startedAt: null },
    });
    expect(view.isGenerating).toBe(false);
    expect(view.modelName).toBeNull();
    expect(view.outputTokens).toBeNull();
  });

  test("selects forge activity when active and presents truthful values without fabrication", () => {
    const started = Date.now() - 5000;
    const onCancel = () => {};
    const view = selectActiveGenerationTelemetry(
      {
        forge: {
          status: "active",
          progress: {
            task: "forge",
            phase: "forge_bundle",
            label: "Generating Factions",
            specialistPhase: "Locations & Factions",
            specialistIndex: 2,
            specialistTotal: 5,
          },
          startedAt: started,
          usage: { outputTokens: 1842 },
          outputCharacters: 7200,
          modelName: "Gemini 2.5 Pro",
          onCancel,
        },
      },
      started + 5000,
    );

    expect(view.isGenerating).toBe(true);
    expect(view.taskLabel).toBe("Forge Synthesis");
    expect(view.phaseLabel).toBe("Generating Factions");
    expect(view.specialistPhase).toBe("Locations & Factions");
    expect(view.specialistIndex).toBe(2);
    expect(view.specialistTotal).toBe(5);
    expect(view.outputTokens).toBe(1842);
    expect(view.outputCharacters).toBe(7200);
    expect(view.modelName).toBe("Gemini 2.5 Pro");
    expect(view.elapsedMs).toBe(5000);
    expect(view.canCancel).toBe(true);
  });

  test("omits unknown elapsed or token metrics truthfully", () => {
    const view = selectActiveGenerationTelemetry({
      divergence: {
        status: "active",
        progress: { task: "divergence", phase: "requesting", label: "Four Angles" },
        startedAt: null,
      },
    });

    expect(view.isGenerating).toBe(true);
    expect(view.taskLabel).toBe("Divergence Angles");
    expect(view.elapsedMs).toBeNull();
    expect(view.outputTokens).toBeNull();
    expect(view.outputCharacters).toBeNull();
  });
});
