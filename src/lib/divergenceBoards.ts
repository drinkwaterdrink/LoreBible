import type { DivergenceBoardGeneration, DivergenceTake } from "../types";
import { initializeDivergenceBoard } from "./divergenceLineage";

interface BoardIdentity {
  id?: string;
  createdAt?: string;
}

function copyTake(take: DivergenceTake): DivergenceTake {
  return {
    ...take,
    retainedNonNegotiables: [...take.retainedNonNegotiables],
    versions: take.versions?.map((version) => ({ ...version, retainedNonNegotiables: [...version.retainedNonNegotiables] })),
  };
}

export function createDivergenceBoard(
  takes: DivergenceTake[],
  operation: DivergenceBoardGeneration["operation"],
  identity: BoardIdentity = {},
): DivergenceBoardGeneration {
  return {
    id: identity.id || `board-${crypto.randomUUID()}`,
    createdAt: identity.createdAt || new Date().toISOString(),
    operation,
    takes: initializeDivergenceBoard(takes.map(copyTake), operation),
  };
}

export function appendDivergenceBoard(
  boards: DivergenceBoardGeneration[],
  takes: DivergenceTake[],
  operation: DivergenceBoardGeneration["operation"],
  identity: BoardIdentity = {},
): { boards: DivergenceBoardGeneration[]; activeBoardId: string } {
  const next = createDivergenceBoard(takes, operation, identity);
  return { boards: [...boards, next], activeBoardId: next.id };
}

export function replaceActiveBoardTakes(
  boards: DivergenceBoardGeneration[],
  activeBoardId: string | null | undefined,
  takes: DivergenceTake[],
): DivergenceBoardGeneration[] {
  return boards.map((board) => board.id === activeBoardId
    ? { ...board, takes: takes.map(copyTake) }
    : board);
}

export function migrateLegacyDivergenceBoards(
  boards: DivergenceBoardGeneration[] | undefined,
  takes: DivergenceTake[],
  activeBoardId: string | null | undefined,
): { boards: DivergenceBoardGeneration[]; activeBoardId: string | null } {
  if (boards?.length) {
    const selected = boards.some((board) => board.id === activeBoardId) ? activeBoardId! : boards[boards.length - 1].id;
    return { boards: boards.map((board) => ({ ...board, takes: board.takes.map(copyTake) })), activeBoardId: selected };
  }
  if (!takes.length) return { boards: [], activeBoardId: null };
  const board: DivergenceBoardGeneration = {
    id: `legacy-board-${takes[0].id}`,
    createdAt: "1970-01-01T00:00:00.000Z",
    operation: "initial",
    takes: takes.map(copyTake),
  };
  return { boards: [board], activeBoardId: board.id };
}
