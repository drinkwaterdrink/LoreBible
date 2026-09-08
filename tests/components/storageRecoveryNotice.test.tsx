import React from "react";
import { expect, test } from "bun:test";
import { renderToString } from "react-dom/server";
import { StorageRecoveryNotice } from "../../src/components/StorageRecoveryNotice";

test("storage notice explains recovery and preserves in-memory work", () => {
  const html = renderToString(<StorageRecoveryNotice
    message="Saved project data was damaged. A recovery copy was preserved."
    onDismiss={() => undefined}
  />);
  expect(html).toContain("Saved project data was damaged");
  expect(html).toContain("Your current in-memory work remains available.");
  expect(html).toContain("Dismiss");
  expect(html).toContain('role="alert"');
});
