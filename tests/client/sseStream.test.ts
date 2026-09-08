import { expect, test } from "bun:test";
import { consumeGenerationSse } from "../../src/services/sseStream";

function chunkedResponse(chunks: string[]): Response {
  const encoder = new TextEncoder();
  return new Response(new ReadableStream({
    start(controller) {
      for (const chunk of chunks) controller.enqueue(encoder.encode(chunk));
      controller.close();
    },
  }), { status: 200, headers: { "Content-Type": "text/event-stream" } });
}

test("SSE client parses fragmented progress and a terminal result", async () => {
  const events: unknown[] = [];
  const response = chunkedResponse([
    "event: progress\ndata: {\"type\":\"progress\",\"task\":\"diver",
    "gence\",\"phase\":\"architect\",\"label\":\"Architect\"}\n\n",
    "event: provider_activity\ndata: {\"type\":\"provider_activity\",\"task\":\"divergence\",\"at\":1234}\n\n",
    "event: output_delta\ndata: {\"type\":\"output_delta\",\"task\":\"divergence\",\"characters\":19}\n\n",
    "event: done\r\ndata: {\"type\":\"done\",\"task\":\"divergence\",\"result\":{\"takes\":[]}}\r\n\r\n",
  ]);
  const terminal = await consumeGenerationSse(response, { onEvent: (event) => events.push(event) });
  expect(events).toHaveLength(4);
  expect(events[0]).toMatchObject({ type: "progress", phase: "architect" });
  expect(events[1]).toMatchObject({ type: "provider_activity", at: 1234 });
  expect(events[2]).toMatchObject({ type: "output_delta", characters: 19 });
  expect(terminal).toMatchObject({ type: "done", task: "divergence" });
});

test("SSE client reports premature EOF", async () => {
  await expect(consumeGenerationSse(chunkedResponse([
    "event: heartbeat\ndata: {\"type\":\"heartbeat\",\"task\":\"forge\"}\n\n",
  ]), { onEvent: () => undefined })).rejects.toThrow("terminal");
});

test("SSE client honors caller cancellation", async () => {
  const controller = new AbortController();
  const response = new Response(new ReadableStream({ start() {} }), { status: 200 });
  const pending = consumeGenerationSse(response, { signal: controller.signal, onEvent: () => undefined });
  controller.abort();
  await expect(pending).rejects.toMatchObject({ name: "AbortError" });
});
