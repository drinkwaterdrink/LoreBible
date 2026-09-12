import { expect, test } from "bun:test";
import type { DivergenceTake } from "../../src/types";
import { appendDivergenceBoard, createDivergenceBoard, migrateLegacyDivergenceBoards, replaceActiveBoardTakes } from "../../src/lib/divergenceBoards";

const take = (id: string): DivergenceTake => ({ id, title: `Title ${id}`, pitch: `Pitch ${id}`, genreTone: "Contemporary", angle: id, retainedNonNegotiables: ["agency"] });

test("reroll-all appends an immutable independent board", () => {
  const first = createDivergenceBoard([take("a"), take("b")], "initial", { id: "board-1", createdAt: "2026-01-01T00:00:00.000Z" });
  const result = appendDivergenceBoard([first], [take("c"), take("d")], "reroll_all", { id: "board-2", createdAt: "2026-01-02T00:00:00.000Z" });

  expect(result.boards.map((board) => board.takes.map((item) => item.id))).toEqual([["a", "b"], ["c", "d"]]);
  expect(result.activeBoardId).toBe("board-2");
  expect(result.boards[1].takes.every((item) => item.lineage?.parentNodeId === null)).toBe(true);
  expect(first.takes.map((item) => item.id)).toEqual(["a", "b"]);
});

test("legacy takes migrate into one stable board without losing take versions", () => {
  const legacy = take("root");
  legacy.versions = [take("older"), take("root")];
  legacy.versionIndex = 1;
  const result = migrateLegacyDivergenceBoards(undefined, [legacy], undefined);

  expect(result.boards).toHaveLength(1);
  expect(result.activeBoardId).toBe("legacy-board-root");
  expect(result.boards[0].takes[0].versions?.map((item) => item.id)).toEqual(["older", "root"]);
});

test("single-card edits replace only the active board snapshot", () => {
  const first = createDivergenceBoard([take("a")], "initial", { id: "board-1", createdAt: "2026-01-01T00:00:00.000Z" });
  const second = createDivergenceBoard([take("b")], "reroll_all", { id: "board-2", createdAt: "2026-01-02T00:00:00.000Z" });
  const result = replaceActiveBoardTakes([first, second], "board-2", [take("b-edited")]);

  expect(result[0].takes[0].id).toBe("a");
  expect(result[1].takes[0].id).toBe("b-edited");
});
