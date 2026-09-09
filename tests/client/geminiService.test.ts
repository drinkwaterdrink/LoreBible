import { expect, test } from "bun:test";
import { fetchDivergenceTakes, fetchVariantsApi, parseSparkApi, pushEntryApi, regenerateSectionApi, rerollEntryApi, streamForgeDocument } from "../../src/services/geminiService";
import { GenerationRequestError } from "../../src/contracts/generationFailure";

test("parseSparkApi forwards the caller abort signal", async () => {
  const originalFetch = globalThis.fetch;
  const controller = new AbortController();
  let receivedSignal: AbortSignal | null | undefined;
  globalThis.fetch = (async (_input: RequestInfo | URL, init?: RequestInit) => {
    receivedSignal = init?.signal;
    return new Response(JSON.stringify({ corePromise: "x", nonNegotiables: [], registerWords: [], userRole: "user" }), { status: 200 });
  }) as typeof fetch;
  try {
    await parseSparkApi("spark", undefined, controller.signal);
    expect(receivedSignal).toBe(controller.signal);
  } finally { globalThis.fetch = originalFetch; }
});

test("parseSparkApi preserves structured recovery details", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async () => new Response(JSON.stringify({
    error: "generation_failed",
    message: "Choose a model in Connections.",
    code: "CREDENTIAL_MISSING",
    action: "open_connections",
    retryable: false,
    operation: "parse-spark",
  }), { status: 401, headers: { "Content-Type": "application/json" } })) as unknown as typeof fetch;
  try {
    const error = await parseSparkApi("spark").catch((caught) => caught);
    expect(error).toBeInstanceOf(GenerationRequestError);
    expect(error).toMatchObject({ code: "CREDENTIAL_MISSING", action: "open_connections", status: 401 });
  } finally { globalThis.fetch = originalFetch; }
});

test("Forge client dispatches structured progress and cancellation", async () => {
  const originalFetch = globalThis.fetch;
  const encoder = new TextEncoder();
  globalThis.fetch = (async () => new Response(new ReadableStream({ start(stream) {
    stream.enqueue(encoder.encode('event: progress\ndata: {"type":"progress","task":"forge","phase":"forge_bundle","label":"Bundle 1","completedSteps":0,"totalSteps":6}\n\n'));
    stream.enqueue(encoder.encode('event: cancelled\ndata: {"type":"cancelled","task":"forge","message":"Forge stopped."}\n\n'));
    stream.close();
  } }), { status: 200 })) as unknown as typeof fetch;
  const seen: string[] = [];
  try {
    await streamForgeDocument({ sparkText: "x", parse: {} as any, canon: {} as any, physics: {} as any, chosenTake: {} as any }, {
      onLog: () => undefined,
      onSection: () => undefined,
      onComplete: () => undefined,
      onError: () => undefined,
      onProgress: (event) => seen.push(event.label),
      onCancelled: (message) => seen.push(message),
    });
    expect(seen).toEqual(["Bundle 1", "Forge stopped."]);
  } finally { globalThis.fetch = originalFetch; }
});

test("push-further sends the exact selected take and operation to the server", async () => {
  const originalFetch = globalThis.fetch;
  let requestBody: Record<string, unknown> | undefined;
  const sourceTake = {
    id: "take-selected",
    title: "Selected branch",
    pitch: "The exact selected pitch",
    genreTone: "Noir",
    angle: "Social fracture",
    retainedNonNegotiables: ["Keep this"],
    versions: [{
      id: "older-version",
      title: "Older branch",
      pitch: "Do not send this alternative",
      genreTone: "Noir",
      angle: "Social fracture",
      retainedNonNegotiables: ["Keep this"],
    }],
    versionIndex: 0,
  };
  globalThis.fetch = (async (_input: RequestInfo | URL, init?: RequestInit) => {
    requestBody = JSON.parse(String(init?.body));
    return new Response(JSON.stringify({ takes: [{ ...sourceTake, id: "child" }] }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }) as typeof fetch;
  try {
    await fetchDivergenceTakes(
      "spark",
      { franchise: null, nonNegotiables: [], registerWords: [], userRole: null, openNegotiables: [] },
      { enabled: false, franchiseName: null, fidelity: "Riff", explanation: "" },
      "make it stranger",
      undefined,
      { sourceTake, operation: "push_further" },
    );
    expect(requestBody?.sourceTake).toEqual({
      id: "take-selected",
      title: "Selected branch",
      pitch: "The exact selected pitch",
      genreTone: "Noir",
      angle: "Social fracture",
      retainedNonNegotiables: ["Keep this"],
    });
    expect(requestBody?.operation).toBe("push_further");
  } finally { globalThis.fetch = originalFetch; }
});

test("every model-backed Refine request forwards the selected connection route", async () => {
  const originalFetch = globalThis.fetch;
  const bodies: Array<Record<string, any>> = [];
  const settings = {
    quality: "Balanced",
    divergenceMode: "Exploratory",
    authorFlavor: { mode: "Off", strength: "Sprinkle", autoBehavior: "Compatible" },
    modelSelection: { profileId: "profile-refine", modelId: "vendor/refine-model" },
  } as const;
  const document = { id: "doc" } as any;
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    bodies.push(JSON.parse(String(init?.body)));
    const url = String(input);
    const payload = url.endsWith("variants") ? { variants: [] }
      : url.endsWith("section-regen") ? { entries: [] }
      : { updatedEntry: { id: "entry", fields: {}, keys: [], permanence: "C", locked: false } };
    return new Response(JSON.stringify(payload), { status: 200, headers: { "Content-Type": "application/json" } });
  }) as typeof fetch;
  try {
    await rerollEntryApi(document, "npcs", "entry", undefined, settings as any);
    await fetchVariantsApi(document, "npcs", "entry", settings as any);
    await pushEntryApi(document, "npcs", "entry", "change it", settings as any);
    await regenerateSectionApi(document, "npcs", 2, settings as any);
    expect(bodies.map((body) => body.settings.modelSelection)).toEqual([
      settings.modelSelection,
      settings.modelSelection,
      settings.modelSelection,
      settings.modelSelection,
    ]);
  } finally { globalThis.fetch = originalFetch; }
});
