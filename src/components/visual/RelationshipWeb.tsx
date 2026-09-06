import React, { useState, useEffect, useRef, useMemo } from "react";
import { Entry, LoreBibleDocument } from "../../types";
import { Plus, Minus, Maximize2, RotateCcw } from "lucide-react";

interface RelationshipWebProps {
  document: LoreBibleDocument;
  onUpdateDocument: (updated: LoreBibleDocument) => void;
  onSelectNpcEntry: (npcId: string) => void;
}

interface SimNode {
  id: string;
  name: string;
  role: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  npcEntry: Entry;
}

interface SimEdge {
  id: string;
  sourceId: string;
  targetId: string;
  sourceNode: SimNode;
  targetNode: SimNode;
  label: string;
  kind: "debt" | "grudge" | "desire" | "lie" | "other";
  pressure?: string;
  rawEntry?: Entry;
}

export const RelationshipWeb: React.FC<RelationshipWebProps> = ({
  document,
  onUpdateDocument,
  onSelectNpcEntry,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });

  // Pan & Zoom state
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const panStartRef = useRef({ x: 0, y: 0, panX: 0, panY: 0 });
  const pinchDistRef = useRef<number | null>(null);
  const pinchStartZoomRef = useRef<number>(1);
  const initialFitDoneRef = useRef(false);

  // UI state
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const [showIsolated, setShowIsolated] = useState(true);
  const [draggedNodeId, setDraggedNodeId] = useState<string | null>(null);

  // New relationship creation modal
  const [isNewRelModalOpen, setIsNewRelModalOpen] = useState(false);
  const [relSourceId, setRelSourceId] = useState<string>("");
  const [relTargetId, setRelTargetId] = useState<string>("");
  const [relKind, setRelKind] = useState<"debt" | "grudge" | "desire" | "lie">("debt");
  const [relLabel, setRelLabel] = useState("");
  const [relPressure, setRelPressure] = useState("");

  // Connection dragging state
  const [connectingSourceId, setConnectingSourceId] = useState<string | null>(null);
  const [connectingMousePos, setConnectingMousePos] = useState<{ x: number; y: number } | null>(null);

  // Measure container size
  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        const { clientWidth, clientHeight } = containerRef.current;
        setDimensions({
          width: Math.max(clientWidth, 320),
          height: Math.max(clientHeight, 400),
        });
      }
    };
    updateSize();
    window.addEventListener("resize", updateSize);
    return () => window.removeEventListener("resize", updateSize);
  }, []);

  // Coordinate cache to preserve positions across updates and physics ticks
  const positionsRef = useRef<Map<string, { x: number; y: number; vx: number; vy: number }>>(new Map());

  // Canonical simulation virtual space
  const virtualW = 750;
  const virtualH = 550;
  const centerX = virtualW / 2;
  const centerY = virtualH / 2;
  const radius = Math.min(virtualW, virtualH) * 0.34;

  // Initialize nodes synchronously during render so edges and degrees are always up to date
  const npcs = document.npcs || [];
  const nodes: SimNode[] = useMemo(() => {
    const count = npcs.length;
    return npcs.map((npc, idx) => {
      const angle = (idx / Math.max(count, 1)) * 2 * Math.PI;
      const prev = positionsRef.current.get(npc.id);
      const node: SimNode = {
        id: npc.id,
        name: npc.fields.name || `NPC ${idx + 1}`,
        role: npc.fields.role || "",
        x: prev ? prev.x : centerX + Math.cos(angle) * radius + (Math.random() - 0.5) * 20,
        y: prev ? prev.y : centerY + Math.sin(angle) * radius + (Math.random() - 0.5) * 20,
        vx: prev ? prev.vx : 0,
        vy: prev ? prev.vy : 0,
        radius: 18,
        npcEntry: npc,
      };
      positionsRef.current.set(npc.id, { x: node.x, y: node.y, vx: node.vx, vy: node.vy });
      return node;
    });
  }, [document.npcs, centerX, centerY, radius]);

  // Keep nodesRef in sync for simulation loop mutation
  const nodesRef = useRef<SimNode[]>(nodes);
  useEffect(() => {
    nodesRef.current = nodes;
  }, [nodes]);

  // Derive edges from relationshipWeb with robust multi-tiered matching
  const edges: SimEdge[] = useMemo(() => {
    const rawRels = document.relationshipWeb || [];
    if (nodes.length === 0) return [];

    const nodeMap = new Map<string, SimNode>();
    nodes.forEach((n) => nodeMap.set(n.id, n));

    const nameToNodeMap = new Map<string, SimNode>();
    nodes.forEach((n) => {
      nameToNodeMap.set(n.name.toLowerCase().trim(), n);
      if (n.role) {
        nameToNodeMap.set(n.role.toLowerCase().trim(), n);
      }
    });

    const findBestNode = (query: string | undefined): SimNode | undefined => {
      if (!query || typeof query !== "string") return undefined;
      const q = query.toLowerCase().trim();
      if (!q) return undefined;

      // 1. Direct ID match
      if (nodeMap.has(query)) return nodeMap.get(query);
      // 2. Exact name or exact role
      if (nameToNodeMap.has(q)) return nameToNodeMap.get(q);

      // 3. Substring match on name or role
      for (const n of nodes) {
        const nName = n.name.toLowerCase().trim();
        const nRole = n.role.toLowerCase().trim();
        if (nName.includes(q) || q.includes(nName)) return n;
        if (nRole && (nRole.includes(q) || q.includes(nRole))) return n;
      }

      // 4. Word-token overlap (e.g. "Beverly" in "Aunt Beverly", "Ferreira" in "Ferreira Couple")
      const qWords = q.split(/[\s,()/-]+/).filter((w) => w.length >= 3);
      for (const n of nodes) {
        const nWords = `${n.name} ${n.role}`.toLowerCase().split(/[\s,()/-]+/).filter((w) => w.length >= 3);
        for (const qw of qWords) {
          if (nWords.includes(qw)) return n;
        }
      }

      return undefined;
    };

    const result: SimEdge[] = [];

    rawRels.forEach((rel, idx) => {
      let sourceNode = rel.fields.sourceId ? nodeMap.get(rel.fields.sourceId) : undefined;
      let targetNode = rel.fields.targetId ? nodeMap.get(rel.fields.targetId) : undefined;

      if (!sourceNode && rel.fields.source) {
        sourceNode = findBestNode(rel.fields.source);
      }
      if (!targetNode && rel.fields.target) {
        targetNode = findBestNode(rel.fields.target);
      }

      // Check arrow notation e.g. "Evelyn → Margit: expectation" or "Evelyn -> Margit"
      if (!sourceNode || !targetNode) {
        const text = rel.fields.relation || Object.values(rel.fields)[0] || "";
        const arrowMatch = text.match(/(.*?)(?:→|->|to|—|:)(.*?)(?::|$)/i);
        if (arrowMatch) {
          if (!sourceNode) sourceNode = findBestNode(arrowMatch[1]);
          if (!targetNode) targetNode = findBestNode(arrowMatch[2]);
        }
      }

      // If still not matched, pair adjacent nodes so the relationship entry is preserved visually
      if (!sourceNode || !targetNode) {
        if (nodes.length >= 2) {
          sourceNode = nodes[idx % nodes.length];
          targetNode = nodes[(idx + 1) % nodes.length];
        }
      }

      if (sourceNode && targetNode && sourceNode.id !== targetNode.id) {
        const rawText = `${rel.fields.relation || ""} ${rel.fields.bond || ""} ${rel.fields.kind || ""}`.toLowerCase();
        let kind: SimEdge["kind"] = "other";
        if (rawText.includes("debt") || rel.fields.kind === "debt") kind = "debt";
        else if (rawText.includes("grudge") || rawText.includes("resent") || rel.fields.kind === "grudge") kind = "grudge";
        else if (rawText.includes("desire") || rawText.includes("love") || rawText.includes("protect") || rel.fields.kind === "desire") kind = "desire";
        else if (rawText.includes("lie") || rawText.includes("secret") || rawText.includes("betray") || rel.fields.kind === "lie") kind = "lie";

        result.push({
          id: rel.id || `edge-${idx}`,
          sourceId: sourceNode.id,
          targetId: targetNode.id,
          sourceNode,
          targetNode,
          label: rel.fields.bond || rel.fields.relation || `${kind.toUpperCase()} bond`,
          kind,
          pressure: rel.fields.pressure,
          rawEntry: rel,
        });
      }
    });

    return result;
  }, [document.relationshipWeb, nodes]);

  // Degree calculation: count how many relationships each node participates in
  const degrees = useMemo(() => {
    const counts = new Map<string, number>();
    nodes.forEach((n) => counts.set(n.id, 0));
    edges.forEach((e) => {
      counts.set(e.sourceId, (counts.get(e.sourceId) || 0) + 1);
      counts.set(e.targetId, (counts.get(e.targetId) || 0) + 1);
    });
    return counts;
  }, [nodes, edges]);

  // Count strictly isolated nodes (0 connections)
  const isolatedCount = useMemo(() => {
    let count = 0;
    nodes.forEach((n) => {
      if ((degrees.get(n.id) || 0) === 0) count++;
    });
    return count;
  }, [nodes, degrees]);

  // Auto-weave dramatic bonds for any isolated characters or cast
  const handleAutoWeaveBonds = () => {
    if (nodes.length < 2) return;
    const existingWeb = [...(document.relationshipWeb || [])];
    const newEntries: Entry[] = [];

    const bondArchetypes = [
      { kind: "debt" as const, bond: "Unpaid financial or blood debt", pressure: "Urgent demand for restitution" },
      { kind: "grudge" as const, bond: "Unspoken bitter resentment", pressure: "Quiet sabotage beneath pleasantries" },
      { kind: "desire" as const, bond: "Desperate protective allegiance", pressure: "Willing to cross lines to shield them" },
      { kind: "lie" as const, bond: "Shared complicity in buried secret", pressure: "If one speaks, both face ruin" },
      { kind: "debt" as const, bond: "Filial guilt and crushing expectation", pressure: "Constant scrutiny of performance" },
      { kind: "grudge" as const, bond: "Past betrayal over inheritance or status", pressure: "Simmering hostility ready to boil" },
    ];

    // Connect any character with 0 connections to the most natural partner in the cast
    nodes.forEach((node, i) => {
      const deg = degrees.get(node.id) || 0;
      if (deg === 0 || existingWeb.length === 0) {
        const partner = nodes[(i + 1) % nodes.length];
        if (partner && partner.id !== node.id) {
          const tmpl = bondArchetypes[(i + newEntries.length) % bondArchetypes.length];
          newEntries.push({
            id: `rel-woven-${Date.now()}-${i}`,
            fields: {
              source: node.name,
              target: partner.name,
              sourceId: node.id,
              targetId: partner.id,
              kind: tmpl.kind,
              bond: tmpl.bond,
              relation: `${node.name} → ${partner.name}: [${tmpl.kind}] ${tmpl.bond}`,
              pressure: tmpl.pressure,
            },
            keys: [node.name, partner.name],
            permanence: "C",
            locked: false,
          });
        }
      }
    });

    if (newEntries.length > 0) {
      onUpdateDocument({
        ...document,
        relationshipWeb: [...existingWeb, ...newEntries],
      });
    }
  };

  // Self-contained force simulation loop
  const [, setTick] = useState(0);

  useEffect(() => {
    let animId: number;
    const centerX = dimensions.width / 2;
    const centerY = dimensions.height / 2;

    const simulate = () => {
      const nodes = nodesRef.current;
      const kRepulsion = 1600;
      const springLength = 160;
      const springK = 0.04;
      const damping = 0.85;

      // 1. Repulsion between all pairs
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const dx = nodes[j].x - nodes[i].x;
          const dy = nodes[j].y - nodes[i].y;
          const distSq = dx * dx + dy * dy + 100;
          const dist = Math.sqrt(distSq);
          const force = kRepulsion / distSq;
          const fx = (dx / dist) * force;
          const fy = (dy / dist) * force;

          if (nodes[i].id !== draggedNodeId) {
            nodes[i].vx -= fx;
            nodes[i].vy -= fy;
          }
          if (nodes[j].id !== draggedNodeId) {
            nodes[j].vx += fx;
            nodes[j].vy += fy;
          }
        }
      }

      // 2. Spring attraction along edges
      edges.forEach((edge) => {
        const s = edge.sourceNode;
        const t = edge.targetNode;
        const dx = t.x - s.x;
        const dy = t.y - s.y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        const force = (dist - springLength) * springK;
        const fx = (dx / dist) * force;
        const fy = (dy / dist) * force;

        if (s.id !== draggedNodeId) {
          s.vx += fx;
          s.vy += fy;
        }
        if (t.id !== draggedNodeId) {
          t.vx -= fx;
          t.vy -= fy;
        }
      });

      // 3. Center gravity & boundary bounds in virtual space
      const virtualW = 750;
      const virtualH = 550;
      const centerX = virtualW / 2;
      const centerY = virtualH / 2;

      nodes.forEach((node) => {
        if (node.id !== draggedNodeId) {
          node.vx += (centerX - node.x) * 0.005;
          node.vy += (centerY - node.y) * 0.005;

          node.vx *= damping;
          node.vy *= damping;

          node.x += node.vx;
          node.y += node.vy;

          // Clamping inside virtual canvas bounds
          node.x = Math.max(50, Math.min(virtualW - 50, node.x));
          node.y = Math.max(50, Math.min(virtualH - 50, node.y));
        }
      });

      setTick((prev) => prev + 1);
      animId = requestAnimationFrame(simulate);
    };

    animId = requestAnimationFrame(simulate);
    return () => cancelAnimationFrame(animId);
  }, [edges, draggedNodeId]);

  // Screen to Canvas coordinate translation considering pan and zoom
  const screenToCanvas = (clientX: number, clientY: number) => {
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return { x: clientX, y: clientY };
    const localX = clientX - rect.left;
    const localY = clientY - rect.top;
    return {
      x: (localX - pan.x) / zoom,
      y: (localY - pan.y) / zoom,
    };
  };

  // Fit all nodes into the current viewport
  const fitView = () => {
    if (!containerRef.current || nodesRef.current.length === 0) return;
    const rect = containerRef.current.getBoundingClientRect();
    const cw = rect.width || dimensions.width || 600;
    const ch = (rect.height ? rect.height - 110 : 0) || dimensions.height || 500;

    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;

    nodesRef.current.forEach((n) => {
      if (n.x < minX) minX = n.x;
      if (n.x > maxX) maxX = n.x;
      if (n.y < minY) minY = n.y;
      if (n.y > maxY) maxY = n.y;
    });

    if (minX === Infinity) return;

    const padding = 70;
    const contentW = Math.max(maxX - minX + padding * 2, 240);
    const contentH = Math.max(maxY - minY + padding * 2, 240);

    const scaleX = cw / contentW;
    const scaleY = ch / contentH;
    const nextZoom = Math.min(Math.max(Math.min(scaleX, scaleY), 0.35), 1.25);

    const nodeCenterX = (minX + maxX) / 2;
    const nodeCenterY = (minY + maxY) / 2;

    const nextPanX = cw / 2 - nodeCenterX * nextZoom;
    const nextPanY = ch / 2 - nodeCenterY * nextZoom + 10;

    setZoom(nextZoom);
    setPan({ x: nextPanX, y: nextPanY });
  };

  // Auto-fit on initial node population
  useEffect(() => {
    if (nodesRef.current.length > 0 && !initialFitDoneRef.current) {
      const timer = setTimeout(() => {
        fitView();
        initialFitDoneRef.current = true;
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [document.npcs, dimensions.width]);

  // Step zoom utility
  const handleZoomStep = (factor: number) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const cx = rect.width / 2;
    const cy = rect.height / 2;
    const nextZoom = Math.min(Math.max(zoom * factor, 0.25), 2.5);
    const nextPanX = cx - (cx - pan.x) * (nextZoom / zoom);
    const nextPanY = cy - (cy - pan.y) * (nextZoom / zoom);
    setZoom(nextZoom);
    setPan({ x: nextPanX, y: nextPanY });
  };

  const handleResetView = () => {
    fitView();
  };

  // Canvas Mouse & Wheel Handlers
  const handleCanvasMouseDown = (e: React.MouseEvent) => {
    if (e.button === 0 && !draggedNodeId) {
      setIsPanning(true);
      panStartRef.current = {
        x: e.clientX,
        y: e.clientY,
        panX: pan.x,
        panY: pan.y,
      };
    }
  };

  const handleMouseDownNode = (e: React.MouseEvent, nodeId: string) => {
    e.stopPropagation();
    if (e.shiftKey) {
      setConnectingSourceId(nodeId);
      const { x, y } = screenToCanvas(e.clientX, e.clientY);
      setConnectingMousePos({ x, y });
      return;
    }
    setDraggedNodeId(nodeId);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isPanning) {
      const dx = e.clientX - panStartRef.current.x;
      const dy = e.clientY - panStartRef.current.y;
      setPan({
        x: panStartRef.current.panX + dx,
        y: panStartRef.current.panY + dy,
      });
      return;
    }

    const { x: mouseX, y: mouseY } = screenToCanvas(e.clientX, e.clientY);

    if (draggedNodeId) {
      const node = nodesRef.current.find((n) => n.id === draggedNodeId);
      if (node) {
        node.x = mouseX;
        node.y = mouseY;
        node.vx = 0;
        node.vy = 0;
      }
    }

    if (connectingSourceId) {
      setConnectingMousePos({ x: mouseX, y: mouseY });
    }
  };

  const handleMouseUp = () => {
    setIsPanning(false);
    setDraggedNodeId(null);
    if (connectingSourceId) {
      setConnectingSourceId(null);
      setConnectingMousePos(null);
    }
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return;
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const zoomFactor = e.deltaY < 0 ? 1.12 : 0.88;
    const nextZoom = Math.min(Math.max(zoom * zoomFactor, 0.25), 2.5);

    const nextPanX = mouseX - (mouseX - pan.x) * (nextZoom / zoom);
    const nextPanY = mouseY - (mouseY - pan.y) * (nextZoom / zoom);

    setZoom(nextZoom);
    setPan({ x: nextPanX, y: nextPanY });
  };

  // Mobile Touch Gestures: single touch pan/drag, dual touch pinch-zoom
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      const t = e.touches[0];
      setIsPanning(true);
      panStartRef.current = {
        x: t.clientX,
        y: t.clientY,
        panX: pan.x,
        panY: pan.y,
      };
    } else if (e.touches.length === 2) {
      setIsPanning(false);
      const t1 = e.touches[0];
      const t2 = e.touches[1];
      pinchDistRef.current = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
      pinchStartZoomRef.current = zoom;
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      const t = e.touches[0];
      if (draggedNodeId) {
        const { x, y } = screenToCanvas(t.clientX, t.clientY);
        const node = nodesRef.current.find((n) => n.id === draggedNodeId);
        if (node) {
          node.x = x;
          node.y = y;
          node.vx = 0;
          node.vy = 0;
        }
      } else if (isPanning) {
        const dx = t.clientX - panStartRef.current.x;
        const dy = t.clientY - panStartRef.current.y;
        setPan({
          x: panStartRef.current.panX + dx,
          y: panStartRef.current.panY + dy,
        });
      }
    } else if (e.touches.length === 2 && pinchDistRef.current !== null) {
      const t1 = e.touches[0];
      const t2 = e.touches[1];
      const dist = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
      const scale = dist / pinchDistRef.current;
      const nextZoom = Math.min(Math.max(pinchStartZoomRef.current * scale, 0.25), 2.5);

      const midX = (t1.clientX + t2.clientX) / 2;
      const midY = (t1.clientY + t2.clientY) / 2;
      const rect = svgRef.current?.getBoundingClientRect();
      if (rect) {
        const localX = midX - rect.left;
        const localY = midY - rect.top;
        const nextPanX = localX - (localX - pan.x) * (nextZoom / zoom);
        const nextPanY = localY - (localY - pan.y) * (nextZoom / zoom);
        setZoom(nextZoom);
        setPan({ x: nextPanX, y: nextPanY });
      }
    }
  };

  const handleTouchEnd = () => {
    setIsPanning(false);
    setDraggedNodeId(null);
    pinchDistRef.current = null;
  };

  const handleNodeDropTarget = (targetId: string) => {
    if (connectingSourceId && connectingSourceId !== targetId) {
      setRelSourceId(connectingSourceId);
      setRelTargetId(targetId);
      setIsNewRelModalOpen(true);
      setConnectingSourceId(null);
      setConnectingMousePos(null);
    }
  };

  // Edge coloring mapping (desaturated to sit on paper)
  const kindColors: Record<SimEdge["kind"], { stroke: string; labelBg: string }> = {
    debt: { stroke: "#B08D49", labelBg: "#B08D49" }, // Ochre
    grudge: { stroke: "#8A2B20", labelBg: "#8A2B20" }, // Deep Red
    desire: { stroke: "#C46E7E", labelBg: "#C46E7E" }, // Rose
    lie: { stroke: "#6E5B87", labelBg: "#6E5B87" }, // Violet
    other: { stroke: "#5C5855", labelBg: "#5C5855" }, // Ink soft
  };

  // Connected node IDs for hoveredNodeId isolation
  const connectedNodeIds = useMemo(() => {
    if (!hoveredNodeId) return null;
    const ids = new Set<string>([hoveredNodeId]);
    edges.forEach((e) => {
      if (e.sourceId === hoveredNodeId) ids.add(e.targetId);
      if (e.targetId === hoveredNodeId) ids.add(e.sourceId);
    });
    return ids;
  }, [hoveredNodeId, edges]);

  // Create relationship submission
  const handleCreateRelationship = (e: React.FormEvent) => {
    e.preventDefault();
    if (!relSourceId || !relTargetId || relSourceId === relTargetId) return;

    const sourceNode = nodesRef.current.find((n) => n.id === relSourceId);
    const targetNode = nodesRef.current.find((n) => n.id === relTargetId);
    if (!sourceNode || !targetNode) return;

    const newEntry: Entry = {
      id: `rel-${Date.now()}`,
      fields: {
        source: sourceNode.name,
        target: targetNode.name,
        sourceId: relSourceId,
        targetId: relTargetId,
        kind: relKind,
        bond: relLabel.trim() || `${relKind.toUpperCase()} bond`,
        relation: `${sourceNode.name} → ${targetNode.name}: [${relKind}] ${relLabel.trim()}`,
        pressure: relPressure.trim() || "Unresolved",
      },
      keys: [sourceNode.name, targetNode.name],
      permanence: "C",
      locked: false,
    };

    const updatedWeb = [...(document.relationshipWeb || []), newEntry];
    onUpdateDocument({
      ...document,
      relationshipWeb: updatedWeb,
    });

    setIsNewRelModalOpen(false);
    setRelLabel("");
    setRelPressure("");
  };

  return (
    <div
      ref={containerRef}
      id="relationship-web-workspace"
      className="relative w-full h-[520px] sm:h-[640px] md:h-[680px] bg-[var(--vellum)] border border-[var(--ink-soft)] rounded-[2px] overflow-hidden select-none flex flex-col"
    >
      {/* Visual Tool Control Bar */}
      <div className="p-3 sm:p-4 border-b border-[var(--ink-soft)] bg-[var(--vellum-raised)]/95 flex flex-wrap items-center justify-between gap-2.5 sm:gap-4 z-10 shrink-0">
        <div className="min-w-0">
          <span className="font-apparatus uppercase text-[9px] tracking-widest text-[var(--graphite)] block font-semibold">
            Visual Diagram · Hand-Drawn Force Map
          </span>
          <div className="flex items-baseline gap-2">
            <h3 className="font-manuscript font-semibold text-base sm:text-lg text-[var(--ink)] leading-tight">
              The Relationship Web
            </h3>
            <span className="text-[10px] font-mono-ui text-[var(--graphite)]">
              ({nodesRef.current.length} cast members)
            </span>
          </div>
        </div>

        {/* Legend of Desaturated Kinds - Scrollable on mobile */}
        <div className="flex items-center gap-2.5 sm:gap-4 text-xs font-apparatus overflow-x-auto no-scrollbar touch-pan-x w-full sm:w-auto shrink-0 py-0.5">
          <div className="flex items-center gap-1 shrink-0">
            <span className="w-2 h-2 rounded-full bg-[#B08D49]" />
            <span className="text-[9px] uppercase tracking-wider text-[var(--graphite)]">Debt (Ochre)</span>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <span className="w-2 h-2 rounded-full bg-[#8A2B20]" />
            <span className="text-[9px] uppercase tracking-wider text-[var(--graphite)]">Grudge (Red)</span>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <span className="w-2 h-2 rounded-full bg-[#C46E7E]" />
            <span className="text-[9px] uppercase tracking-wider text-[var(--graphite)]">Desire (Rose)</span>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <span className="w-2 h-2 rounded-full bg-[#6E5B87]" />
            <span className="text-[9px] uppercase tracking-wider text-[var(--graphite)]">Lie (Violet)</span>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Isolated Flat Characters Toggle */}
          <button
            type="button"
            onClick={() => setShowIsolated(!showIsolated)}
            className={`px-2.5 sm:px-3 py-1 text-[11px] font-apparatus uppercase tracking-wider border rounded-[2px] transition-colors cursor-pointer shrink-0 whitespace-nowrap ${
              showIsolated
                ? "bg-[var(--gold)]/15 border-[var(--gold)] text-[var(--ink)] font-semibold"
                : "border-[var(--ink-soft)] text-[var(--graphite)] hover:text-[var(--ink)]"
            }`}
            title="Circle characters with 0 connections in loose ochre ellipses"
          >
            {showIsolated ? `● Isolated (${isolatedCount})` : `○ Isolated (${isolatedCount})`}
          </button>

          {/* Auto-Weave Bonds Button */}
          {nodes.length >= 2 && (
            <button
              type="button"
              onClick={handleAutoWeaveBonds}
              className="px-2.5 sm:px-3 py-1 text-[11px] font-apparatus uppercase tracking-wider border border-[var(--ink-soft)] hover:border-[var(--rubric)] text-[var(--graphite)] hover:text-[var(--rubric)] rounded-[2px] transition-colors cursor-pointer shrink-0 whitespace-nowrap bg-[var(--vellum)]"
              title="Automatically weave dramatic tensions, debts, and grudges between cast members"
            >
              Auto-Weave Bonds
            </button>
          )}

          {/* Define New Relationship Button */}
          <button
            type="button"
            onClick={() => {
              if (nodesRef.current.length >= 2) {
                setRelSourceId(nodesRef.current[0].id);
                setRelTargetId(nodesRef.current[1].id);
              }
              setIsNewRelModalOpen(true);
            }}
            className="px-3 sm:px-3.5 py-1 text-[11px] font-apparatus font-semibold uppercase tracking-wider text-[var(--vellum-raised)] bg-[var(--rubric)] hover:opacity-90 rounded-[2px] transition-all shadow-xs cursor-pointer shrink-0 whitespace-nowrap"
          >
            + Ink Relationship
          </button>
        </div>
      </div>

      {/* Interactive Hand-Drawn SVG Canvas */}
      <div className="relative flex-1 w-full h-full cursor-grab active:cursor-grabbing overflow-hidden">
        <svg
          ref={svgRef}
          width="100%"
          height="100%"
          onWheel={handleWheel}
          onMouseDown={handleCanvasMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          className="w-full h-full touch-none select-none"
        >
          {/* Subtle vellum background texture lines */}
          <defs>
            <filter id="hand-ink-wobble" x="-10%" y="-10%" width="120%" height="120%">
              <feTurbulence type="fractalNoise" baseFrequency="0.04" numOctaves="3" result="noise" />
              <feDisplacementMap in="SourceGraphic" in2="noise" scale="1.5" xChannelSelector="R" yChannelSelector="G" />
            </filter>
          </defs>

          {/* Pan & Zoom Root Transform */}
          <g transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}>
            {/* EDGES: Thin curves with slight wobble reading as authentic pen strokes */}
            <g className="edges-layer">
              {edges.map((edge) => {
                const { sourceNode: s, targetNode: t, kind, label, id } = edge;
                const isFaded =
                  connectedNodeIds !== null &&
                  !connectedNodeIds.has(s.id) &&
                  !connectedNodeIds.has(t.id);

                // Calculate organic curved midpoint
                const dx = t.x - s.x;
                const dy = t.y - s.y;
                const mx = (s.x + t.x) / 2;
                const my = (s.y + t.y) / 2;
                const dist = Math.sqrt(dx * dx + dy * dy) || 1;
                const nx = -dy / dist;
                const ny = dx / dist;
                const idStr = String(id || "");
                const curvature = 24 * (parseInt(idStr.slice(-1), 16) % 2 === 0 ? 1 : -1);
                const cx = mx + nx * curvature;
                const cy = my + ny * curvature;

                const pathData = `M ${s.x} ${s.y} Q ${cx} ${cy} ${t.x} ${t.y}`;
                const strokeColor = kindColors[kind]?.stroke || "#5C5855";

                return (
                  <g
                    key={id}
                    className={`transition-opacity duration-200 ${isFaded ? "opacity-15" : "opacity-90"}`}
                  >
                    {/* The Pen Stroke Curve */}
                    <path
                      d={pathData}
                      fill="none"
                      stroke={strokeColor}
                      strokeWidth={1.75}
                      strokeLinecap="round"
                      filter="url(#hand-ink-wobble)"
                    />

                    {/* Relationship Label in Small Caps along curve */}
                    <g transform={`translate(${cx}, ${cy})`}>
                      <rect
                        x={-42}
                        y={-9}
                        width={84}
                        height={18}
                        rx={2}
                        fill="var(--vellum)"
                        stroke={strokeColor}
                        strokeWidth={0.8}
                        className="opacity-95"
                      />
                      <text
                        textAnchor="middle"
                        dominantBaseline="middle"
                        className="font-apparatus uppercase tracking-widest text-[8.5px] font-semibold fill-[var(--ink)] pointer-events-none select-none"
                      >
                        {String(label || "").slice(0, 18)}
                      </text>
                    </g>
                  </g>
                );
              })}
            </g>

            {/* DRAGGING CONNECTION LINE */}
            {connectingSourceId && connectingMousePos && (
              <g>
                {(() => {
                  const s = nodesRef.current.find((n) => n.id === connectingSourceId);
                  if (!s) return null;
                  return (
                    <line
                      x1={s.x}
                      y1={s.y}
                      x2={connectingMousePos.x}
                      y2={connectingMousePos.y}
                      stroke="var(--gold)"
                      strokeWidth={2}
                      strokeDasharray="4 3"
                    />
                  );
                })()}
              </g>
            )}

            {/* NODES: Small ink circles with names in Caveat font beneath */}
            <g className="nodes-layer">
              {nodesRef.current.map((node) => {
                const isHovered = hoveredNodeId === node.id;
                const isFaded = connectedNodeIds !== null && !connectedNodeIds.has(node.id);
                const deg = degrees.get(node.id) || 0;
                const isIsolated = deg === 0;

                return (
                  <g
                    key={node.id}
                    transform={`translate(${node.x}, ${node.y})`}
                    onMouseDown={(e) => handleMouseDownNode(e, node.id)}
                    onTouchStart={(e) => {
                      e.stopPropagation();
                      setDraggedNodeId(node.id);
                    }}
                    onMouseEnter={() => setHoveredNodeId(node.id)}
                    onMouseLeave={() => setHoveredNodeId(null)}
                    onMouseUp={() => handleNodeDropTarget(node.id)}
                    onClick={() => onSelectNpcEntry(node.id)}
                    className={`cursor-pointer transition-opacity duration-200 ${
                      isFaded ? "opacity-15" : "opacity-100"
                    }`}
                  >
                    {/* ISOLATED HIGHLIGHT: Loose hand-drawn ochre ellipse for flat characters */}
                    {showIsolated && isIsolated && (
                      <g className="animate-pulse">
                        <ellipse
                          rx={32}
                          ry={26}
                          fill="none"
                          stroke="#B08D49"
                          strokeWidth={1.8}
                          strokeDasharray="6 3"
                          filter="url(#hand-ink-wobble)"
                          transform="rotate(-5)"
                        />
                        <text
                          y={-32}
                          textAnchor="middle"
                          className="font-hand text-sm fill-[var(--gold)] font-bold pointer-events-none"
                        >
                          [isolated]
                        </text>
                      </g>
                    )}

                    {/* Outer ring on hover / selected */}
                    {isHovered && (
                      <circle
                        r={node.radius + 5}
                        fill="none"
                        stroke="var(--gold)"
                        strokeWidth={1.5}
                        strokeDasharray="3 2"
                      />
                    )}

                    {/* Ink Circle Node */}
                    <circle
                      r={node.radius}
                      fill="var(--vellum-raised)"
                      stroke="var(--ink)"
                      strokeWidth={2.2}
                      filter="url(#hand-ink-wobble)"
                    />
                    <circle
                      r={5}
                      fill={isIsolated ? "#B08D49" : "var(--ink)"}
                    />

                    {/* Name in Caveat beneath the circle */}
                    <text
                      y={node.radius + 17}
                      textAnchor="middle"
                      className="font-hand text-xl font-bold fill-[var(--ink)] select-none pointer-events-none drop-shadow-xs"
                    >
                      {node.name}
                    </text>

                    {/* Small role caption */}
                    <text
                      y={node.radius + 30}
                      textAnchor="middle"
                      className="font-apparatus uppercase tracking-wider text-[8px] fill-[var(--graphite)] select-none pointer-events-none"
                    >
                      {String(node.role || "").slice(0, 20)}
                    </text>
                  </g>
                );
              })}
            </g>
          </g>
        </svg>

        {/* Floating Zoom & Navigation HUD */}
        <div className="absolute bottom-3 right-3 z-20 flex items-center gap-1 bg-[var(--vellum-raised)]/95 border border-[var(--ink-soft)] rounded-[3px] p-1 shadow-md font-apparatus text-xs backdrop-blur-xs">
          <button
            type="button"
            onClick={() => handleZoomStep(1.2)}
            className="p-1.5 hover:bg-[var(--vellum)] text-[var(--ink)] rounded-[2px] transition-colors cursor-pointer"
            title="Zoom In (+)"
          >
            <Plus size={13} />
          </button>
          <span className="text-[10px] font-mono-ui font-semibold text-[var(--graphite)] px-1 min-w-[34px] text-center select-none">
            {Math.round(zoom * 100)}%
          </span>
          <button
            type="button"
            onClick={() => handleZoomStep(0.8)}
            className="p-1.5 hover:bg-[var(--vellum)] text-[var(--ink)] rounded-[2px] transition-colors cursor-pointer"
            title="Zoom Out (-)"
          >
            <Minus size={13} />
          </button>
          <div className="w-[1px] h-3.5 bg-[var(--ink-soft)] mx-0.5" />
          <button
            type="button"
            onClick={fitView}
            className="px-2 py-1 text-[10px] uppercase font-semibold hover:bg-[var(--vellum)] text-[var(--ink)] rounded-[2px] transition-colors cursor-pointer flex items-center gap-1"
            title="Fit All Cast Members"
          >
            <Maximize2 size={11} />
            <span>Fit</span>
          </button>
          <button
            type="button"
            onClick={handleResetView}
            className="p-1.5 hover:bg-[var(--vellum)] text-[var(--graphite)] hover:text-[var(--ink)] rounded-[2px] transition-colors cursor-pointer"
            title="Reset View"
          >
            <RotateCcw size={11} />
          </button>
        </div>

        {/* Diagram Instructions Overlay in Hand Font */}
        <div className="absolute bottom-3 left-3 text-[11px] font-hand text-[var(--ink-blue)] opacity-80 pointer-events-none hidden sm:block">
          ✦ Drag to pan · Pinch or scroll to zoom · Click node to inspect
        </div>
      </div>

      {/* NEW RELATIONSHIP MODAL */}
      {isNewRelModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setIsNewRelModalOpen(false)}
        >
          <div
            className="w-full max-w-md bg-[var(--vellum)] border border-[var(--ink-soft)] rounded-[2px] p-6 shadow-2xl space-y-4 font-manuscript animate-ink-bleed"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="border-b border-[var(--ink-soft)] pb-2 flex justify-between items-baseline">
              <h3 className="font-manuscript font-semibold text-lg text-[var(--ink)]">
                Ink New Relationship
              </h3>
              <button
                type="button"
                onClick={() => setIsNewRelModalOpen(false)}
                className="text-[10px] font-apparatus uppercase text-[var(--graphite)] hover:text-[var(--ink)]"
              >
                ✕ Cancel
              </button>
            </div>

            <form onSubmit={handleCreateRelationship} className="space-y-4 text-xs">
              {/* Source and Target select */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-apparatus uppercase text-[8.5px] text-[var(--graphite)] block mb-1">
                    Source Cast Member
                  </label>
                  <select
                    value={relSourceId}
                    onChange={(e) => setRelSourceId(e.target.value)}
                    className="w-full p-1.5 bg-[var(--vellum-raised)] border border-[var(--ink-soft)] rounded-[1px] text-xs font-manuscript text-[var(--ink)]"
                  >
                    {nodesRef.current.map((n) => (
                      <option key={n.id} value={n.id}>
                        {n.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="font-apparatus uppercase text-[8.5px] text-[var(--graphite)] block mb-1">
                    Target Cast Member
                  </label>
                  <select
                    value={relTargetId}
                    onChange={(e) => setRelTargetId(e.target.value)}
                    className="w-full p-1.5 bg-[var(--vellum-raised)] border border-[var(--ink-soft)] rounded-[1px] text-xs font-manuscript text-[var(--ink)]"
                  >
                    {nodesRef.current.map((n) => (
                      <option key={n.id} value={n.id}>
                        {n.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Relationship Kind */}
              <div>
                <label className="font-apparatus uppercase text-[8.5px] text-[var(--graphite)] block mb-1">
                  Kind of Bond
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {(
                    [
                      { id: "debt", label: "Debt", color: "#B08D49" },
                      { id: "grudge", label: "Grudge", color: "#8A2B20" },
                      { id: "desire", label: "Desire", color: "#C46E7E" },
                      { id: "lie", label: "Lie", color: "#6E5B87" },
                    ] as const
                  ).map((k) => (
                    <button
                      key={k.id}
                      type="button"
                      onClick={() => setRelKind(k.id)}
                      className={`p-2 rounded-[2px] border text-center font-apparatus uppercase text-[9px] font-semibold transition-all cursor-pointer ${
                        relKind === k.id
                          ? "bg-[var(--vellum-raised)] border-[var(--ink)] text-[var(--ink)] shadow-xs"
                          : "border-[var(--ink-soft)] text-[var(--graphite)] opacity-70"
                      }`}
                      style={{ borderLeftColor: k.color, borderLeftWidth: 3 }}
                    >
                      {k.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Relation Description */}
              <div>
                <label className="font-apparatus uppercase text-[8.5px] text-[var(--graphite)] block mb-1">
                  Relation Statement
                </label>
                <input
                  type="text"
                  value={relLabel}
                  onChange={(e) => setRelLabel(e.target.value)}
                  placeholder="e.g. Owes life after the shipyard raid..."
                  className="w-full p-2 bg-[var(--vellum-raised)] border border-[var(--ink-soft)] rounded-[1px] font-hand text-lg text-[var(--ink-blue)] focus:outline-none"
                  required
                />
              </div>

              {/* Unresolved Pressure */}
              <div>
                <label className="font-apparatus uppercase text-[8.5px] text-[var(--graphite)] block mb-1">
                  Pressure or Leverage
                </label>
                <input
                  type="text"
                  value={relPressure}
                  onChange={(e) => setRelPressure(e.target.value)}
                  placeholder="e.g. Threatens to expose contraband; demands 40 silver..."
                  className="w-full p-1.5 bg-[var(--vellum-raised)] border border-[var(--ink-soft)] rounded-[1px] text-xs font-manuscript text-[var(--ink)]"
                />
              </div>

              {/* Submit */}
              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsNewRelModalOpen(false)}
                  className="px-3 py-1 text-xs font-apparatus uppercase text-[var(--graphite)] hover:text-[var(--ink)]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-apparatus font-semibold uppercase tracking-wider text-[var(--vellum-raised)] bg-[var(--rubric)] hover:opacity-90 rounded-[2px] transition-all shadow-xs cursor-pointer"
                >
                  Commit Relation
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
