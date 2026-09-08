import { expect, test } from "bun:test";
import { parseSparkApi, streamForgeDocument } from "../../src/services/geminiService";

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
