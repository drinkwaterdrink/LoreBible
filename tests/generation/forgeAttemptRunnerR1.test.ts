import { expect, test } from "bun:test";
import { ModelGatewayError, StructuredOutputTruncatedError } from "../../server/model/gateway";
import { runForgeAttempts, type ForgeAttemptEvent } from "../../server/generation/forgeAttemptRunner";

test("one correction then success", async () => {
  const corrections: Array<string | null> = [];
  const value = await runForgeAttempts({
    request: async ({ correction }) => {
      corrections.push(correction);
      return { value: corrections.length === 1 ? null : { history: [] } };
    },
    validate: value => {
      if (!value || typeof value !== "object" || Array.isArray(value)) throw new ModelGatewayError("Expected object; received null.", "INVALID_STRUCTURED_OUTPUT", 502);
      return value as Record<string, unknown>;
    },
  });
  expect(value).toEqual({ history: [] });
  expect(corrections).toHaveLength(2);
  expect(corrections[0]).toBeNull();
  expect(corrections[1]).toContain("object");
});

test("invalid twice makes exactly two generation calls", async () => {
  let calls = 0;
  await expect(runForgeAttempts({
    request: async () => { calls += 1; return { value: null }; },
    validate: value => { if (!value) throw new ModelGatewayError("Expected object.", "INVALID_STRUCTURED_OUTPUT", 502); return value; },
  })).rejects.toThrow();
  expect(calls).toBe(2);
});

test.each([
  ["authentication", "AUTHENTICATION_FAILED"],
  ["timeout", "REQUEST_TIMEOUT"],
  ["quota", "QUOTA_EXHAUSTED"],
])("%s makes only one generation call", async (_name, code) => {
  let calls = 0;
  const error = new ModelGatewayError("failure", code as never, 502);
  await expect(runForgeAttempts({
    request: async () => { calls += 1; throw error; },
    validate: value => value,
  })).rejects.toThrow(error);
  expect(calls).toBe(1);
});

test("success makes one generation call", async () => {
  let calls = 0;
  const value = await runForgeAttempts({
    request: async () => { calls += 1; return { value: { history: [] } }; },
    validate: value => value,
  });
  expect(value).toEqual({ history: [] });
  expect(calls).toBe(1);
});

test("malformed structured output from the provider receives one correction", async () => {
  const corrections: Array<string | null> = [];
  const value = await runForgeAttempts({
    request: async ({ correction }) => {
      corrections.push(correction);
      if (corrections.length === 1) throw new ModelGatewayError("Invalid JSON", "INVALID_STRUCTURED_OUTPUT", 502);
      return { value: { history: [] } };
    },
    validate: value => value,
  });
  expect(value).toEqual({ history: [] });
  expect(corrections).toHaveLength(2);
  expect(corrections[1]).toContain("OUTPUT_SCHEMA");
});

test("internal provider errors do not spend a creative correction", async () => {
  let calls = 0;
  await expect(runForgeAttempts({
    request: async () => { calls += 1; throw new ModelGatewayError("internal", "INTERNAL_ERROR", 500); },
    validate: value => value,
  })).rejects.toMatchObject({ code: "INTERNAL_ERROR" });
  expect(calls).toBe(1);
});

test("truncated output fails without repeating the oversized request", async () => {
  let calls = 0;
  await expect(runForgeAttempts({
    request: async () => { calls += 1; throw new StructuredOutputTruncatedError(); },
    validate: value => value,
  })).rejects.toBeInstanceOf(StructuredOutputTruncatedError);
  expect(calls).toBe(1);
});

test("a successful first attempt never reports a correction", async () => {
  const phases: string[] = [];
  await runForgeAttempts({
    request: async () => ({ value: {} }),
    validate: value => value,
    onEvent: event => phases.push(event.phase),
  });
  expect(phases).toEqual(["request", "validation"]);
});

test("validation reports safe shape, output mode, and issue count", async () => {
  const events: ForgeAttemptEvent[] = [];
  await expect(runForgeAttempts({
    request: async () => ({ value: [], outputMode: "json_only" as const }),
    validate: () => { throw new ModelGatewayError("Expected object", "INVALID_STRUCTURED_OUTPUT", 502); },
    onEvent: event => events.push(event),
  })).rejects.toThrow();
  expect(events.find(event => event.phase === "validation")).toMatchObject({ topLevelType: "array", outputMode: "json_only" });
  expect(events.at(-1)).toMatchObject({ phase: "failed", issueCount: 1 });
});
