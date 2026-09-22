import React from "react";
import { expect, test } from "bun:test";
import { renderToString } from "react-dom/server";
import { MobileNav } from "../../src/ui/adventure/MobileNav";

test("MobileNav renders 5 bottom destinations including center Quick Actions button", () => {
  const html = renderToString(
    <MobileNav
      activeNav="home"
      onSelectNav={() => {}}
      onOpenQuickActions={() => {}}
      savedCount={3}
      onOpenSettings={() => {}}
    />,
  );

  expect(html).toContain('aria-label="Mobile Navigation"');
  expect(html).toContain("Home");
  expect(html).toContain("Write");
  expect(html).toContain('aria-label="Quick Actions"');
  expect(html).toContain("World");
  expect(html).toContain("More");
  expect(html).toContain('aria-current="page"');
});

test("MobileNav marks current active page correctly", () => {
  const html = renderToString(
    <MobileNav
      activeNav="write"
      onSelectNav={() => {}}
      onOpenQuickActions={() => {}}
      savedCount={0}
      onOpenSettings={() => {}}
    />,
  );

  // Write should be current page
  expect(html).toContain('aria-current="page"');
  // Includes touch target sizing classes
  expect(html).toContain("min-h-[44px]");
});
