import { expect, test } from "bun:test";
import { createForgeCoveragePlan } from "../../server/generation/forgeCoveragePlan";
import { planBundleFiveJobs, validateBundleFiveJob, compileBundleFiveJobPrompt, splitBundleFiveJob } from "../../server/generation/forgeBundleFiveJobs";
import { blueprintSelectionFixture } from "../fixtures/blueprintSelection";

test("bundle five partitions supplemental coverage into bounded owned jobs", () => {
  const selection = structuredClone(blueprintSelectionFixture);
  selection.categories.push({ ...selection.categories[0], id: "daily_life", label: "Daily Life", purpose: "Routines", status: "required", targetRange: { min: 7, ideal: 7, max: 7 } });
  const plan = createForgeCoveragePlan(selection);
  const jobs = planBundleFiveJobs(plan, {});
  const supplemental = jobs.filter(job => job.key === "additionalLore" && job.categoryId === "daily_life");
  expect(supplemental.map(job => job.entryIds.length)).toEqual([3, 3, 1]);
  expect(new Set(supplemental.flatMap(job => job.entryIds)).size).toBe(7);
  expect(jobs.some(job => job.key === "aesthetic")).toBe(true);
  expect(jobs.some(job => job.key === "naming")).toBe(true);
});

test("bundle five rejects wrong entry IDs and unowned categories", () => {
  const selection = structuredClone(blueprintSelectionFixture);
  selection.categories.push({ ...selection.categories[0], id: "daily_life", label: "Daily Life", purpose: "Routines", status: "required", targetRange: { min: 1, ideal: 1, max: 1 } });
  const job = planBundleFiveJobs(createForgeCoveragePlan(selection), {}).find(item => item.categoryId === "daily_life")!;
  const entry = { id: "wrong", keys: ["Morning routine"], permanence: "evergreen", locked: false, fields: { categoryId: "daily_life", categoryLabel: "Daily Life", name: "Morning Routine", content: "A concrete routine." } };
  expect(() => validateBundleFiveJob(job, { additionalLore: [entry] })).toThrow();
  entry.id = job.entryIds[0];
  entry.fields.categoryId = "other";
  expect(() => validateBundleFiveJob(job, { additionalLore: [entry] })).toThrow();
});

test("specialist prompt owns one projected schema and explicit entry slots", () => {
  const selection = structuredClone(blueprintSelectionFixture);
  selection.categories.push({ ...selection.categories[0], id: "daily_life", label: "Daily Life", purpose: "Daily routines", status: "required", targetRange: { min: 1, ideal: 1, max: 1 } });
  const job = planBundleFiveJobs(createForgeCoveragePlan(selection), {}).find(item => item.categoryId === "daily_life")!;
  const prompt = compileBundleFiveJobPrompt(job, "Original source", null);
  expect(prompt.userPrompt).toContain(job.entryIds[0]);
  expect(prompt.userPrompt).toContain("Daily routines");
  expect(prompt.userPrompt).toContain('"additionalLore"');
  expect(prompt.userPrompt).not.toContain('"history"');
  expect(prompt.userPrompt).not.toContain("History, Aesthetic, Naming, and Pressures");
});

test("an accepted optional category with a zero minimum still receives its ideal slots when space permits", () => {
  const selection = structuredClone(blueprintSelectionFixture);
  selection.categories.push({ ...selection.categories[0], id: "custom_culture", label: "Custom Culture", purpose: "Local customs", status: "optional", targetRange: { min: 0, ideal: 2, max: 3 } });
  const jobs = planBundleFiveJobs(createForgeCoveragePlan(selection), {});
  expect(jobs.filter(job => job.categoryId === "custom_culture").flatMap(job => job.entryIds)).toHaveLength(2);
});

test("a truncated specialist may split twice without losing or duplicating assigned slots", () => {
  const selection = structuredClone(blueprintSelectionFixture);
  selection.categories.push({ ...selection.categories[0], id: "daily_life", label: "Daily Life", purpose: "Routines", status: "required", targetRange: { min: 7, ideal: 7, max: 7 } });
  const job = planBundleFiveJobs(createForgeCoveragePlan(selection), {}).find(item => item.categoryId === "daily_life")!;
  const children = splitBundleFiveJob(job)!;
  expect(children.flatMap(child => child.entryIds)).toEqual(job.entryIds);
  const grandchildren = splitBundleFiveJob(children[0])!;
  expect(grandchildren.flatMap(child => child.entryIds)).toEqual(children[0].entryIds);
  expect(grandchildren.every(child => splitBundleFiveJob(child) === null)).toBe(true);
  expect(splitBundleFiveJob(children[1])).toBeNull();
});
