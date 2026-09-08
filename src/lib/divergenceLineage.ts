import type {
  DivergenceLineageOperation,
  DivergenceTake,
} from "../types";

function snapshot(take: DivergenceTake): DivergenceTake {
  const { versions: _versions, versionIndex: _versionIndex, ...plainTake } = take;
  return plainTake;
}

function withLineage(
  take: DivergenceTake,
  operation: DivergenceLineageOperation,
  parentNodeId: string | null,
  rootNodeId: string,
): DivergenceTake {
  return {
    ...snapshot(take),
    lineage: { nodeId: take.id, rootNodeId, parentNodeId, operation },
  };
}

export function initializeDivergenceBoard(
  takes: DivergenceTake[],
  operation: "initial" | "reroll_all" = "reroll_all",
): DivergenceTake[] {
  return takes.map((take) => {
    const root = withLineage(take, operation, null, take.id);
    return { ...root, versions: [root], versionIndex: 0 };
  });
}

export function initializePushedBoard(
  takes: DivergenceTake[],
  sourceTake: DivergenceTake,
): DivergenceTake[] {
  const rootNodeId = sourceTake.lineage?.rootNodeId || sourceTake.id;
  return takes.map((take) => {
    const child = withLineage(take, "push_further", sourceTake.id, rootNodeId);
    return { ...child, versions: [child], versionIndex: 0 };
  });
}

export function appendDivergenceVersion(
  currentTake: DivergenceTake,
  candidate: DivergenceTake,
  operation: "reroll" | "steer" | "manual_edit",
): DivergenceTake {
  const versions = currentTake.versions?.map(snapshot) || [snapshot(currentTake)];
  const rootNodeId = currentTake.lineage?.rootNodeId || versions[0]?.id || currentTake.id;
  const child = withLineage(candidate, operation, currentTake.id, rootNodeId);
  const nextVersions = [...versions, child];
  return { ...child, versions: nextVersions, versionIndex: nextVersions.length - 1 };
}
