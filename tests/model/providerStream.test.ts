import { expect, test } from "bun:test";
import { consumeOpenAICompatibleStream } from "../../server/model/providerStream";

function fragmentedStream(parts: string[]): ReadableStream<Uint8Array> {
  return new ReadableStream({
    start(controller) {
      for (const part of parts) controller.enqueue(new TextEncoder().encode(part));
      controller.close();
    },
  });
}

test("provider stream assembles fragmented content, reasoning, usage, and finish reason", async () => {
  const content: string[] = [];
  const reasoning: string[] = [];
  const usage: unknown[] = [];
  let activityCount = 0;
  const body = fragmentedStream([
    'data: {"model":"z-ai/glm-5.3:thinking","choices":[{"delta":{"reasoning_content":"checking "}}]}\n',
    '\ndata: {"choices":[{"delta":{"reasoning_content":"branches","content":"{\\"takes\\":"}}]}\n\n',
    'data: {"choices":[{"delta":{"content":"[]}"},"finish_reason":"stop"}]}\n\n',
    'data: {"choices":[],"usage":{"prompt_tokens":10,"completion_tokens":4,"reasoning_tokens":7}}\n\n',
    'data: [DONE]\n\n',
  ]);
  const response = new Response(body, { status: 200, headers: { "Content-Type": "text/event-stream" } });

  const result = await consumeOpenAICompatibleStream(response, {
    onContentDelta: (delta) => content.push(delta),
    onReasoningDelta: (delta) => reasoning.push(delta),
    onUsage: (value) => usage.push(value),
    onProviderActivity: () => { activityCount += 1; },
  }, new AbortController().signal);

  expect(result).toEqual({
    text: '{"takes":[]}',
    reasoning: "checking branches",
    usage: { prompt_tokens: 10, completion_tokens: 4, reasoning_tokens: 7 },
    model: "z-ai/glm-5.3:thinking",
    finishReason: "stop",
  });
  expect(content).toEqual(['{"takes":', "[]}"]);
  expect(reasoning).toEqual(["checking ", "branches"]);
  expect(usage).toHaveLength(1);
  expect(activityCount).toBeGreaterThan(0);
});

test("provider stream rejects an incomplete malformed data frame without echoing it", async () => {
  const response = new Response(fragmentedStream(['data: {"choices": [broken]}\n\n']), {
    status: 200,
    headers: { "Content-Type": "text/event-stream" },
  });
  await expect(consumeOpenAICompatibleStream(response, {}, new AbortController().signal))
    .rejects.toThrow("malformed streaming response");
});

test("provider stream separates thought content parts from the structured answer", async () => {
  const content: string[] = [];
  const reasoning: string[] = [];
  const body = fragmentedStream([
    'data: {"choices":[{"delta":{"content":[{"type":"thought","text":"checking the premise"},{"type":"text","text":"{\\"ok\\":true}"}]}}]}\n\n',
    'data: [DONE]\n\n',
  ]);
  const response = new Response(body, { status: 200, headers: { "Content-Type": "text/event-stream" } });

  const result = await consumeOpenAICompatibleStream(response, {
    onContentDelta: (delta) => content.push(delta),
    onReasoningDelta: (delta) => reasoning.push(delta),
  }, new AbortController().signal);

  expect(result.text).toBe('{"ok":true}');
  expect(result.reasoning).toBe("checking the premise");
  expect(content).toEqual(['{"ok":true}']);
  expect(reasoning).toEqual(["checking the premise"]);
});
