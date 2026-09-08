import { expect, test } from "bun:test";
import { GenerationRequestError, parseGenerationFailurePayload } from "../../src/contracts/generationFailure";
import { normalizeGenerationFailure } from "../../server/generation/failureResponse";

test("preserves a stable gateway failure code and chooses an actionable recovery", () => {
  const failure = normalizeGenerationFailure(
    { name: "ModelGatewayError", message: "That model is unavailable.", code: "MODEL_UNAVAILABLE", status: 404 },
    { operation: "divergence" },
  );
  expect(failure).toMatchObject({
    error: "generation_failed",
    code: "MODEL_UNAVAILABLE",
    action: "change_model",
    retryable: false,
    operation: "divergence",
    status: 404,
  });
});

test("redacts unknown internal errors instead of serializing raw details", () => {
  const failure = normalizeGenerationFailure(
    new Error("request included sk-secret-value and provider response body"),
    { operation: "forge" },
  );
  expect(failure.message).toBe("LoreBible could not complete this generation request.");
  expect(JSON.stringify(failure)).not.toContain("sk-secret-value");
});

test("parses safe failure payloads into a typed client error", () => {
  const payload = parseGenerationFailurePayload({
    error: "generation_failed",
    message: "Please choose another model.",
    code: "MODEL_UNAVAILABLE",
    action: "change_model",
    retryable: false,
    operation: "divergence",
  });
  const error = new GenerationRequestError(payload, 404);
  expect(error.code).toBe("MODEL_UNAVAILABLE");
  expect(error.action).toBe("change_model");
  expect(error.status).toBe(404);
});
