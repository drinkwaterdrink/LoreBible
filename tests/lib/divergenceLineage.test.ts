import { describe, expect, test } from "bun:test";
import type { DivergenceTake } from "../../src/types";
import {
  appendDivergenceVersion,
  initializeDivergenceBoard,
  initializePushedBoard,
} from "../../src/lib/divergenceLineage";

const take = (id: string, angle: string): DivergenceTake => ({
  id,
  title: `Title ${id}`,
  pitch: `Pitch ${id}`,
  genreTone: "Speculative",
  angle,
  retainedNonNegotiables: ["Keep the premise"],
});

describe("Divergence lineage", () => {
  test("reroll-all starts independent roots instead of mixing old histories by array index", () => {
    const oldBoard = initializeDivergenceBoard([take("old-a", "A"), take("old-b", "B")]);
    const freshBoard = initializeDivergenceBoard([take("new-b", "B"), take("new-a", "A")]);

    expect(oldBoard[0].versions?.map((version) => version.id)).toEqual(["old-a"]);
    expect(freshBoard[0].versions?.map((version) => version.id)).toEqual(["new-b"]);
    expect(freshBoard[0].lineage).toEqual({
      nodeId: "new-b",
      rootNodeId: "new-b",
      parentNodeId: null,
      operation: "reroll_all",
    });
  });

  test("single-card changes retain an immutable exact parent id", () => {
    const [original] = initializeDivergenceBoard([take("root", "A")]);
    const rerolled = appendDivergenceVersion(original, take("child", "A"), "reroll");
    const steered = appendDivergenceVersion(rerolled, take("grandchild", "A"), "steer");

    expect(rerolled.lineage?.parentNodeId).toBe("root");
    expect(steered.lineage).toEqual({
      nodeId: "grandchild",
      rootNodeId: "root",
      parentNodeId: "child",
      operation: "steer",
    });
    expect(steered.versions?.map((version) => version.id)).toEqual(["root", "child", "grandchild"]);
  });

  test("push-further branches all identify the selected card as their parent", () => {
    const [selected] = initializeDivergenceBoard([take("selected", "A")]);
    const branches = initializePushedBoard(
      [take("branch-1", "B"), take("branch-2", "C")],
      selected,
    );

    expect(branches.map((branch) => branch.lineage?.parentNodeId)).toEqual(["selected", "selected"]);
    expect(branches.map((branch) => branch.lineage?.rootNodeId)).toEqual(["selected", "selected"]);
    expect(branches.every((branch) => branch.versions?.length === 1)).toBe(true);
  });
});
