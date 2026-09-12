import { expect, test } from "bun:test";
import { createModelGateway, ModelGatewayError } from "../../server/model/gateway";
import { createProfileStore, type SecretProtector } from "../../server/secrets/profileStore";

const protector: SecretProtector = {
  async protect(value) { return `cipher:${value}`; },
  async unprotect(value) { return value.slice("cipher:".length); },
};

async function makeGateway(fetchImpl: (input: string, init?: RequestInit) => Promise<Response>) {
  const path = `${process.env.TEMP || process.cwd()}\\lore-bible-gateway-test-${crypto.randomUUID()}.json`;
  const store = createProfileStore(path, protector);
  const profile = await store.upsert({ name: "OpenRouter", provider: "openrouter", apiKey: "sk-secret" });
  return { gateway: createModelGateway(store, fetchImpl), profile };
}

test("gateway sends an exact curated model and returns parsed JSON", async () => {
  let requestUrl = "";
  let requestBody: any;
  const fetchImpl = async (input: string, init?: RequestInit) => {
    requestUrl = input;
    requestBody = JSON.parse(String(init?.body));
    return new Response(JSON.stringify({
      id: "chatcmpl-1",
      model: "z-ai/glm-5.3:thinking",
      choices: [{ message: { content: JSON.stringify({ takes: [{ id: "one" }] }) } }],
      usage: { prompt_tokens: 12, completion_tokens: 7 },
    }), { status: 200, headers: { "Content-Type": "application/json" } });
  };
  const { gateway, profile } = await makeGateway(fetchImpl);
  const response = await gateway.generate({
    profileId: profile.id,
    modelId: "z-ai/glm-5.3:thinking",
    systemInstruction: "system",
    userPrompt: "user",
    responseSchema: { type: "object", properties: { takes: { type: "array" } } },
    reasoningEffort: "medium",
    stageName: "Test",
    timeoutMs: 5000,
  });
  expect(requestUrl).toBe("https://openrouter.ai/api/v1/chat/completions");
  expect(requestBody.model).toBe("z-ai/glm-5.3:thinking");
  expect(requestBody.reasoning).toEqual({ effort: "medium", exclude: false });
  expect(requestBody.stream).toBe(true);
  expect(requestBody.messages).toHaveLength(2);
  expect(response.parsed).toEqual({ takes: [{ id: "one" }] });
  expect(response.provenance.provider).toBe("openrouter");
  expect(response.provenance.usage?.inputTokens).toBe(12);
});

test("gateway maps provider authentication failures", async () => {
  const { gateway, profile } = await makeGateway(async () => new Response("bad key", { status: 401 }));
  await expect(gateway.generate({
    profileId: profile.id,
    modelId: "z-ai/glm-5.3",
    systemInstruction: "system",
    userPrompt: "user",
    reasoningEffort: "low",
    stageName: "Test",
    timeoutMs: 5000,
  })).rejects.toMatchObject({ code: "AUTHENTICATION_FAILED", status: 401 });
});

test("gateway rejects model IDs that the provider does not report", async () => {
  const requests: string[] = [];
  const { gateway, profile } = await makeGateway(async (input) => { requests.push(input); return new Response(JSON.stringify({ data: [] }), { headers: { "Content-Type": "application/json" } }); });
  await expect(gateway.generate({
    profileId: profile.id,
    modelId: "provider/invented-model",
    systemInstruction: "system",
    userPrompt: "user",
    reasoningEffort: "low",
    stageName: "Test",
    timeoutMs: 5000,
  })).rejects.toBeInstanceOf(ModelGatewayError);
  expect(requests).toEqual(["https://openrouter.ai/api/v1/models"]);
});

test("gateway accepts a single fenced JSON document from a Gemini-style structured response", async () => {
  const { gateway, profile } = await makeGateway(async () => new Response(JSON.stringify({
    model: "gemini-3.8-flash",
    choices: [{ message: { content: "```json\n{\"candidates\":[\"one\"]}\n```" } }],
  }), { status: 200, headers: { "Content-Type": "application/json" } }));

  const response = await gateway.generate({
    profileId: profile.id,
    modelId: "z-ai/glm-5.3",
    systemInstruction: "system",
    userPrompt: "user",
    responseSchema: { type: "object", properties: { candidates: { type: "array" } } },
    reasoningEffort: "low",
    stageName: "Structured output test",
    timeoutMs: 5000,
  });

  expect(response.parsed).toEqual({ candidates: ["one"] });
  expect(response.provenance.repaired).toBe(true);
});

test("gateway keeps invalid structured output actionable and does not fabricate a fallback", async () => {
  const { gateway, profile } = await makeGateway(async () => new Response(JSON.stringify({
    model: "gemini-3.8-flash",
    choices: [{ message: { content: "I need to think about this before returning an answer." } }],
  }), { status: 200, headers: { "Content-Type": "application/json" } }));

  await expect(gateway.generate({
    profileId: profile.id,
    modelId: "z-ai/glm-5.3",
    systemInstruction: "system",
    userPrompt: "user",
    responseSchema: { type: "object", properties: { candidates: { type: "array" } } },
    reasoningEffort: "low",
    stageName: "Structured output test",
    timeoutMs: 5000,
  })).rejects.toMatchObject({
    code: "INVALID_STRUCTURED_OUTPUT",
    message: "The provider returned invalid structured output for openrouter/z-ai/glm-5.3 (json mode). Expected one JSON object or array.",
  });
});

test("gateway identifies reasoning-only provider responses without exposing their contents", async () => {
  const { gateway, profile } = await makeGateway(async () => new Response(JSON.stringify({
    model: "meta/muse-spark-1.3-contributor",
    choices: [{ message: { content: "", reasoning_content: "private provider reasoning" }, finish_reason: "stop" }],
  }), { status: 200, headers: { "Content-Type": "application/json" } }));

  try {
    await gateway.generate({
      profileId: profile.id,
      modelId: "meta/muse-spark-1.3-contributor",
      systemInstruction: "system",
      userPrompt: "user",
      reasoningEffort: "low",
      stageName: "Muse compatibility test",
      timeoutMs: 5000,
    });
    throw new Error("Expected a gateway failure.");
  } catch (error) {
    expect(error).toBeInstanceOf(ModelGatewayError);
    expect((error as Error).message).toContain("reasoning but no final answer");
    expect((error as Error).message).toContain("finish reason: stop");
    expect((error as Error).message).not.toContain("private provider reasoning");
  }
});

test("gateway accepts a custom model ID saved on the selected profile", async () => {
  const path = `${process.env.TEMP || process.cwd()}\\lore-bible-gateway-test-${crypto.randomUUID()}.json`;
  const store = createProfileStore(path, protector);
  const profile = await store.upsert({
    name: "OpenRouter",
    provider: "openrouter",
    apiKey: "sk-secret",
    customModelIds: ["vendor/private-preview"],
  });
  let requestedModel = "";
  const gateway = createModelGateway(store, async (_input, init) => {
    requestedModel = JSON.parse(String(init?.body)).model;
    return new Response(JSON.stringify({
      model: "vendor/private-preview",
      choices: [{ message: { content: "custom response" } }],
    }), { status: 200, headers: { "Content-Type": "application/json" } });
  });

  const response = await gateway.generate({
    profileId: profile.id,
    modelId: "vendor/private-preview",
    systemInstruction: "system",
    userPrompt: "user",
    reasoningEffort: "low",
    stageName: "Test",
    timeoutMs: 5000,
  });

  expect(requestedModel).toBe("vendor/private-preview");
  expect(response.provenance.modelRequested).toBe("vendor/private-preview");
});

test("gateway times out when response headers arrive but the body stalls", async () => {
  const stalled = new ReadableStream({ start() {} });
  const { gateway, profile } = await makeGateway(async () => new Response(stalled, { status: 200 }));
  const startedAt = Date.now();
  await expect(gateway.generate({
    profileId: profile.id,
    modelId: "z-ai/glm-5.3",
    systemInstruction: "system",
    userPrompt: "user",
    reasoningEffort: "low",
    stageName: "Test",
    timeoutMs: 1000,
  })).rejects.toMatchObject({ code: "REQUEST_TIMEOUT" });
  expect(Date.now() - startedAt).toBeLessThan(2000);
});

test("gateway distinguishes caller cancellation from provider timeout", async () => {
  const stalled = new ReadableStream({ start() {} });
  const { gateway, profile } = await makeGateway(async () => new Response(stalled, { status: 200 }));
  const controller = new AbortController();
  const pending = gateway.generate({
    profileId: profile.id,
    modelId: "z-ai/glm-5.3",
    systemInstruction: "system",
    userPrompt: "user",
    reasoningEffort: "low",
    stageName: "Test",
    timeoutMs: 5000,
    signal: controller.signal,
  });
  controller.abort();
  await expect(pending).rejects.toMatchObject({ code: "CLIENT_DISCONNECTED" });
});

test("gateway returns provider reasoning without mixing it into answer text", async () => {
  const { gateway, profile } = await makeGateway(async () => new Response(JSON.stringify({
    model: "z-ai/glm-5.3:thinking",
    choices: [{ message: { content: "final answer", reasoning: "private diagnostic trace" } }],
    usage: { completion_tokens_details: { reasoning_tokens: 17 } },
  }), { status: 200, headers: { "Content-Type": "application/json" } }));
  const response = await gateway.generate({
    profileId: profile.id,
    modelId: "z-ai/glm-5.3:thinking",
    systemInstruction: "system",
    userPrompt: "user",
    reasoningEffort: "medium",
    stageName: "Test",
    timeoutMs: 5000,
  });
  expect(response.text).toBe("final answer");
  expect(response.provenance.reasoning).toBe("private diagnostic trace");
  expect(response.provenance.usage?.reasoningTokens).toBe(17);
});

test("gateway streams NanoGPT content and provider reasoning into activity callbacks", async () => {
  const path = `${process.env.TEMP || process.cwd()}\\lore-bible-gateway-test-${crypto.randomUUID()}.json`;
  const store = createProfileStore(path, protector);
  const profile = await store.upsert({ name: "NanoGPT", provider: "nanogpt", apiKey: "nano-secret" });
  const contentDeltas: string[] = [];
  const reasoningDeltas: string[] = [];
  let requestBody: any;
  const gateway = createModelGateway(store, async (_input, init) => {
    requestBody = JSON.parse(String(init?.body));
    return new Response([
      'data: {"model":"z-ai/glm-5.3:thinking","choices":[{"delta":{"reasoning_content":"checking"}}]}',
      'data: {"choices":[{"delta":{"content":"{\\"takes\\":[]}"},"finish_reason":"stop"}]}',
      'data: {"choices":[],"usage":{"prompt_tokens":9,"completion_tokens":5,"reasoning_tokens":6}}',
      'data: [DONE]',
      '',
    ].join("\n\n"), { status: 200, headers: { "Content-Type": "text/event-stream" } });
  });

  const response = await gateway.generate({
    profileId: profile.id,
    modelId: "z-ai/glm-5.3:thinking",
    systemInstruction: "system",
    userPrompt: "user",
    responseSchema: { type: "object", properties: { takes: { type: "array" } } },
    reasoningEffort: "high",
    stageName: "Divergence Writer",
    timeoutMs: 1000,
    inactivityTimeoutMs: 1000,
    overallTimeoutMs: 3000,
    onContentDelta: (delta) => contentDeltas.push(delta),
    onReasoningDelta: (delta) => reasoningDeltas.push(delta),
  });

  expect(requestBody).toMatchObject({
    stream: true,
    stream_options: { include_usage: true },
    max_tokens: 12000,
    reasoning_effort: "high",
    reasoning_content_compat: true,
    reasoning: { effort: "high", exclude: false, delta_field: "reasoning_content" },
  });
  expect(contentDeltas).toEqual(['{"takes":[]}']);
  expect(reasoningDeltas).toEqual(["checking"]);
  expect(response.parsed).toEqual({ takes: [] });
  expect(response.provenance.usage).toEqual({ inputTokens: 9, outputTokens: 5, reasoningTokens: 6 });
});

test("gateway generates with an exact model from a saved Gemini AI Studio profile", async () => {
  const path = `${process.env.TEMP || process.cwd()}\\lore-bible-gateway-test-${crypto.randomUUID()}.json`;
  const store = createProfileStore(path, protector);
  const profile = await store.upsert({ name: "AI Studio", provider: "gemini", apiKey: "gemini-secret" });
  let requestUrl = "";
  let requestAuthorization: string | null = null;
  let requestBody: any;
  const gateway = createModelGateway(store, async (input, init) => {
    requestUrl = input;
    requestAuthorization = new Headers(init?.headers).get("Authorization");
    requestBody = JSON.parse(String(init?.body));
    return new Response(JSON.stringify({
      id: "chatcmpl-gemini",
      model: "gemini-3.8-flash",
      choices: [{ message: { content: JSON.stringify({ candidates: ["one"] }) }, finish_reason: "stop" }],
      usage: { prompt_tokens: 8, completion_tokens: 4 },
    }), { status: 200, headers: { "Content-Type": "application/json" } });
  });

  const response = await gateway.generate({
    profileId: profile.id,
    modelId: "gemini-3.8-flash",
    systemInstruction: "system",
    userPrompt: "user",
    responseSchema: { type: "object", properties: { candidates: { type: "array" } } },
    reasoningEffort: "medium",
    stageName: "Gemini Test",
    timeoutMs: 5000,
  });

  expect(requestUrl).toBe("https://generativelanguage.googleapis.com/v1beta/openai/chat/completions");
  expect(requestAuthorization).toBe("Bearer gemini-secret");
  expect(requestBody.model).toBe("gemini-3.8-flash");
  expect(requestBody).toMatchObject({ stream: true, reasoning_effort: "medium" });
  expect(response.parsed).toEqual({ candidates: ["one"] });
  expect(response.provenance).toMatchObject({ provider: "gemini", modelRequested: "gemini-3.8-flash" });
  expect(JSON.stringify(response.provenance)).not.toContain("gemini-secret");
});

test("gateway accepts a provider-reported Gemini model without requiring a custom save", async () => {
  const path = `${process.env.TEMP || process.cwd()}\\lore-bible-gateway-test-${crypto.randomUUID()}.json`;
  const store = createProfileStore(path, protector);
  const profile = await store.upsert({ name: "AI Studio", provider: "gemini", apiKey: "gemini-secret" });
  const requests: string[] = [];
  const gateway = createModelGateway(store, async (input) => {
    requests.push(input);
    if (input.endsWith("/models")) return new Response(JSON.stringify({ data: [{ id: "models/gemini-flash-latest" }] }), { status: 200, headers: { "Content-Type": "application/json" } });
    return new Response(JSON.stringify({ model: "gemini-flash-latest", choices: [{ message: { content: "provider model response" } }] }), { status: 200, headers: { "Content-Type": "application/json" } });
  });

  const response = await gateway.generate({
    profileId: profile.id,
    modelId: "gemini-flash-latest",
    systemInstruction: "system",
    userPrompt: "user",
    reasoningEffort: "low",
    stageName: "Gemini Provider Model",
    timeoutMs: 5000,
  });

  expect(requests).toEqual([
    "https://generativelanguage.googleapis.com/v1beta/openai/models",
    "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions",
  ]);
  expect(response.text).toBe("provider model response");
});

test("gateway accepts a provider-reported NanoGPT model without requiring a custom save", async () => {
  const path = `${process.env.TEMP || process.cwd()}\\lore-bible-gateway-test-${crypto.randomUUID()}.json`;
  const store = createProfileStore(path, protector);
  const profile = await store.upsert({ name: "NanoGPT", provider: "nanogpt", apiKey: "nano-secret" });
  const requests: string[] = [];
  const gateway = createModelGateway(store, async (input) => {
    requests.push(input);
    if (input.endsWith("/models")) return new Response(JSON.stringify({ data: [{ id: "google/gemini-flash-lite-latest" }] }), { status: 200, headers: { "Content-Type": "application/json" } });
    return new Response(JSON.stringify({ model: "google/gemini-flash-lite-latest", choices: [{ message: { content: "provider model response" } }] }), { status: 200, headers: { "Content-Type": "application/json" } });
  });

  const response = await gateway.generate({
    profileId: profile.id,
    modelId: "google/gemini-flash-lite-latest",
    systemInstruction: "system",
    userPrompt: "user",
    reasoningEffort: "low",
    stageName: "NanoGPT Provider Model",
    timeoutMs: 5000,
  });

  expect(requests).toEqual([
    "https://nano-gpt.com/api/v1/models",
    "https://nano-gpt.com/api/v1/chat/completions",
  ]);
  expect(response.text).toBe("provider model response");
});

test("gateway falls back to non-stream mode only after an explicit stream rejection", async () => {
  const bodies: any[] = [];
  const { gateway, profile } = await makeGateway(async (_input, init) => {
    bodies.push(JSON.parse(String(init?.body)));
    if (bodies.length === 1) return new Response(JSON.stringify({ error: { message: "stream is not supported for this model" } }), { status: 400, headers: { "Content-Type": "application/json" } });
    return new Response(JSON.stringify({ model: "z-ai/glm-5.3", choices: [{ message: { content: "compatible answer" } }] }), { status: 200, headers: { "Content-Type": "application/json" } });
  });
  const response = await gateway.generate({
    profileId: profile.id,
    modelId: "z-ai/glm-5.3",
    systemInstruction: "system",
    userPrompt: "user",
    reasoningEffort: "low",
    stageName: "Test",
    timeoutMs: 1000,
  });
  expect(bodies).toHaveLength(2);
  expect(bodies[0].stream).toBe(true);
  expect(bodies[1].stream).toBe(false);
  expect(bodies[1].stream_options).toBeUndefined();
  expect(response.text).toBe("compatible answer");
});

test("gateway falls back to JSON object mode only after an explicit schema rejection", async () => {
  const bodies: any[] = [];
  const { gateway, profile } = await makeGateway(async (_input, init) => {
    bodies.push(JSON.parse(String(init?.body)));
    if (bodies.length === 1) return new Response(JSON.stringify({ error: { message: "json_schema response_format is not supported for this model" } }), { status: 400, headers: { "Content-Type": "application/json" } });
    return new Response(JSON.stringify({ model: "z-ai/glm-5.3", choices: [{ message: { content: '{"takes":[]}' } }] }), { status: 200, headers: { "Content-Type": "application/json" } });
  });
  const response = await gateway.generate({
    profileId: profile.id,
    modelId: "z-ai/glm-5.3",
    systemInstruction: "system",
    userPrompt: "user",
    responseSchema: { type: "object", properties: { takes: { type: "array" } } },
    reasoningEffort: "low",
    stageName: "Test",
    timeoutMs: 1000,
  });
  expect(bodies).toHaveLength(2);
  expect(bodies[0].response_format.type).toBe("json_schema");
  expect(bodies[1].response_format).toEqual({ type: "json_object" });
  expect(response.parsed).toEqual({ takes: [] });
});
