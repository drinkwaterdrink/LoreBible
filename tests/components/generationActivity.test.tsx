import React from "react";
import { expect, test } from "bun:test";
import { renderToString } from "react-dom/server";
import { GenerationActivity } from "../../src/components/GenerationActivity";

test("generation activity renders truthful stage, attempts, usage, and cancellation", () => {
  const html = renderToString(<GenerationActivity
    task="divergence"
    progress={{ task: "divergence", phase: "architect", label: "Architect", completedSteps: 0, totalSteps: 4, attempt: 2, maxAttempts: 3 }}
    startedAt={Date.now() - 2000}
    usage={{ inputTokens: 12 }}
    reasoning=""
    reasoningTruncated={false}
    status="active"
    lastEventAt={Date.now()}
    lastProviderActivityAt={Date.now()}
    outputCharacters={420}
    onCancel={() => undefined}
    onClearReasoning={() => undefined}
  />);
  expect(html).toContain("Architect");
  expect(html).toContain("attempt 2 of 3");
  expect(html).toContain("12 input");
  expect(html).toContain("Cancel Generation");
  expect(html).toContain("Waiting for provider reasoning");
  expect(html).toContain("105");
  expect(html).toContain("output tokens estimated");
  expect(html).toContain("Provider active");
});

test("generation activity reports unavailable reasoning only after completion", () => {
  const html = renderToString(<GenerationActivity
    task="divergence"
    progress={{ task: "divergence", phase: "complete", label: "Complete" }}
    startedAt={Date.now() - 2000}
    usage={{}}
    reasoning=""
    reasoningTruncated={false}
    status="complete"
    outputCharacters={0}
    lastProviderActivityAt={null}
    onCancel={() => undefined}
    onClearReasoning={() => undefined}
  />);
  expect(html).toContain("Reasoning unavailable");
  expect(html).not.toContain("Waiting for provider reasoning");
});

test("generation activity keeps provider reasoning collapsed and escaped", () => {
  const html = renderToString(<GenerationActivity
    task="forge"
    progress={{ task: "forge", phase: "forge_bundle", label: "Forging bundle 2 of 6", completedSteps: 1, totalSteps: 6 }}
    startedAt={Date.now()}
    usage={{ reasoningTokens: 33 }}
    reasoning={'<script>alert("x")</script>'}
    reasoningTruncated={true}
    status="active"
    onCancel={() => undefined}
    onClearReasoning={() => undefined}
  />);
  expect(html).toContain("View reasoning");
  expect(html).not.toContain("<script>");
  expect(html).toContain("33 reasoning");
  expect(html).toContain("Reasoning truncated for display");
});

test("generation cancellation is displayed as a neutral stopped state", () => {
  const html = renderToString(<GenerationActivity
    task="anchors"
    progress={{ task: "anchors", phase: "cancelled", label: "Scribing stopped" }}
    startedAt={null}
    usage={{}}
    reasoning=""
    reasoningTruncated={false}
    status="cancelled"
    onCancel={() => undefined}
    onClearReasoning={() => undefined}
  />);
  expect(html).toContain("Stopped");
  expect(html).not.toContain("Cancel Generation");
});

test("generation errors explain preservation and expose Connections", () => {
  const html = renderToString(<GenerationActivity
    task="anchors"
    progress={{ task: "anchors", phase: "error", label: "Choose a connection and model before generating." }}
    startedAt={Date.now()}
    usage={{}}
    reasoning=""
    reasoningTruncated={false}
    status="error"
    onCancel={() => undefined}
    onClearReasoning={() => undefined}
    onOpenConnections={() => undefined}
  />);
  expect(html).toContain("Your existing work was preserved.");
  expect(html).toContain("Connections");
});
