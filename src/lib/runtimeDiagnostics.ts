export interface RuntimeCapabilities {
  connectionModelMetadata?: boolean;
  selectedModelGenerationTest?: boolean;
  diagnostics?: boolean;
}

export const RUNTIME_CAPABILITIES = {
  connectionModelMetadata: true,
  selectedModelGenerationTest: true,
  diagnostics: true,
} as const;

export interface RuntimeInfo {
  status?: string;
  version?: string;
  capabilities?: RuntimeCapabilities;
}

export interface ConnectionDiagnosticModel {
  id: string;
  available?: boolean;
  subscriptionIncluded?: boolean;
  created?: number;
  popularRank?: number;
}

export interface ConnectionDiagnosticsInput {
  appVersion: string;
  runtime: RuntimeInfo | null;
  browser: string;
  profile: { id: string; name: string; provider: string; baseUrl: string; hasSecret: boolean } | null;
  selectedModelId: string | null;
  catalog: ConnectionDiagnosticModel[];
  sort: string;
  subscriptionOnly: boolean;
  error: string | null;
}

export function runtimeCompatibilityMessage(info: RuntimeInfo | null | undefined, expectedVersion: string): string | null {
  if (!info || info.version !== expectedVersion || info.capabilities?.selectedModelGenerationTest !== true || info.capabilities.connectionModelMetadata !== true) {
    return "This browser is connected to an older server or launcher process. Restart LoreBible from the current test-branch shortcut, then reload this page.";
  }
  return null;
}

export function formatConnectionDiagnostics(input: ConnectionDiagnosticsInput): string {
  const models = input.catalog.map((model) => ({
    id: model.id,
    available: model.available ?? null,
    subscriptionIncluded: model.subscriptionIncluded ?? null,
    created: model.created ?? null,
    popularRank: model.popularRank ?? null,
  }));
  return [
    "LoreBible connection diagnostics",
    `appVersion=${input.appVersion}`,
    `serverVersion=${input.runtime?.version || "unknown"}`,
    `serverCapabilities=${JSON.stringify(input.runtime?.capabilities || {})}`,
    `browser=${input.browser}`,
    `profile=${input.profile ? JSON.stringify({ id: input.profile.id, name: input.profile.name, provider: input.profile.provider, baseUrl: input.profile.baseUrl, credentialStored: input.profile.hasSecret }) : "none"}`,
    `selectedModel=${input.selectedModelId || "none"}`,
    `sort=${input.sort}`,
    `subscriptionOnly=${input.subscriptionOnly}`,
    `catalogCount=${models.length}`,
    `catalog=${JSON.stringify(models)}`,
    `lastError=${input.error || "none"}`,
    "No API key or encrypted credential material is included.",
  ].join("\n");
}
