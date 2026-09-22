import React from "react";
import { expect, test } from "bun:test";
import { renderToString } from "react-dom/server";
import { ForgeStage } from "../../src/components/ForgeStage";

test("a paused checkpoint overrides an older document and offers the next bundle", () => {
  const html = renderToString(
    <ForgeStage
      buildLogs={[]}
      streamedSections={{ core: { title: "Saved" } }}
      isForging={false}
      document={{ id: "old" } as any}
      onProceedToRefine={() => {}}
      workingTitle="Saved"
      hasCheckpoint
      onContinueForge={() => {}}
    />
  );
  expect(html).toContain("Continue with next bundle");
  expect(html).not.toContain("Review Finished Manuscript");
});

test("ForgeStage renders active specialist phase in plain language with completed and remaining job counts", () => {
  const html = renderToString(
    <ForgeStage
      buildLogs={[]}
      streamedSections={{ core: { title: "The Mist Sound" } }}
      isForging={true}
      document={null}
      onProceedToRefine={() => {}}
      workingTitle="The Mist Sound"
      boundedSpecialists={true}
      specialistProgress={{
        phaseName: "Playable Opening Scene",
        currentJob: 2,
        totalJobs: 5,
        isPreserved: false,
      }}
    />
  );
  expect(html).toContain("Specialist Phase:");
  expect(html).toContain("Playable Opening Scene");
  expect(html).toContain("Job 2 of 5");
  expect(html).toContain("1 completed");
  expect(html).toContain("3 remaining");
  expect(html).toContain("Pending Work");
  expect(html).not.toContain("Preserved Work");
});

test("ForgeStage clearly distinguishes preserved work when specialist is loaded from checkpoint", () => {
  const html = renderToString(
    <ForgeStage
      buildLogs={[]}
      streamedSections={{ core: { title: "The Mist Sound" }, user: { rolePosition: "Harbor Pilot" } }}
      isForging={false}
      document={null}
      onProceedToRefine={() => {}}
      workingTitle="The Mist Sound"
      boundedSpecialists={true}
      specialistProgress={{
        phaseName: "Player Role & Boundaries",
        currentJob: 2,
        totalJobs: 4,
        isPreserved: true,
      }}
    />
  );
  expect(html).toContain("Specialist Phase:");
  expect(html).toContain("Player Role &amp; Boundaries");
  expect(html).toContain("Preserved Work");
  expect(html).not.toContain("Pending Work");
});

test("ForgeStage enforces minimum 44px touch targets on interactive controls and mobile safe layout", () => {
  const errorHtml = renderToString(
    <ForgeStage
      buildLogs={[]}
      streamedSections={{ core: { title: "The Mist Sound" } }}
      isForging={false}
      document={{ id: "doc-1" } as any}
      onProceedToRefine={() => {}}
      workingTitle="The Mist Sound"
      hasCheckpoint={true}
      forgeError="Network connection reset"
      onRetryForge={() => {}}
    />
  );
  // Buttons have minimum 44px height for mobile touch targets
  expect(errorHtml).toContain("min-h-[44px]");
  // Safe-area bottom padding is present
  expect(errorHtml).toContain("safe-area-inset-bottom");
  // Retry button is rendered with minimum touch target
  expect(errorHtml).toContain("Retry Forge");

  const checkpointHtml = renderToString(
    <ForgeStage
      buildLogs={[]}
      streamedSections={{ core: { title: "The Mist Sound" } }}
      isForging={false}
      document={{ id: "doc-1" } as any}
      onProceedToRefine={() => {}}
      workingTitle="The Mist Sound"
      hasCheckpoint={true}
      onContinueForge={() => {}}
    />
  );
  expect(checkpointHtml).toContain("min-h-[44px]");
  expect(checkpointHtml).toContain("Continue with next bundle");
});
