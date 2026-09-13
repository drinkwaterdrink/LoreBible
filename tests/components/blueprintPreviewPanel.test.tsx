import React from "react";
import { expect, test } from "bun:test";
import { renderToString } from "react-dom/server";
import { BlueprintStudio } from "../../src/components/BlueprintStudio";
import { createBlueprintPlan } from "../../src/lib/blueprint/planner";
import { createBlueprintSelection } from "../../src/lib/blueprint/selection";
import { cozyBakery, warTornKingdom } from "../fixtures/blueprintPremises";

test("renders an accessible mobile Blueprint editor with reachable actions",()=>{
  const plan=createBlueprintPlan(cozyBakery(),{createdAt:"2026-09-12T12:00:00.000Z"});
  const html=renderToString(<BlueprintStudio plan={plan} initialSelection={createBlueprintSelection(plan)} onSave={()=>{}} onCancel={()=>{}}/>);
  for(const text of ["Smart Auto","Guided","Expert","Save Blueprint","Cancel","Ordinary-life coverage","Forge execution","Recommended build",plan.artifactTargets[0].reason])expect(html).toContain(text);
  for(const behavior of ["role=\"dialog\"","aria-modal=\"true\"","overflow-y-auto","sticky bottom-0","safe-area-bottom"])expect(html).toContain(behavior);
  expect(html).not.toContain("Start Forge");
});

test("keeps omitted categories visible and explains that mechanics are planned",()=>{
  const plan=createBlueprintPlan(warTornKingdom(),{createdAt:"2026-09-12T12:00:00.000Z"});
  const selection={...createBlueprintSelection(plan),interfaceMode:"guided" as const};
  const html=renderToString(<BlueprintStudio plan={plan} initialSelection={selection} onSave={()=>{}} onCancel={()=>{}}/>);
  for(const text of ["Lore categories","Omitted categories","Add custom category","Mechanic packs","Planned, not active","Graceful fallback"])expect(html).toContain(text);
  expect(html).toContain("disabled=\"\"");
});

test("expert mode exposes exact ranges and runtime architecture without horizontal scrolling",()=>{
  const plan=createBlueprintPlan(cozyBakery(),{createdAt:"2026-09-12T12:00:00.000Z"});
  const selection={...createBlueprintSelection(plan),interfaceMode:"expert" as const};
  const html=renderToString(<BlueprintStudio plan={plan} initialSelection={selection} onSave={()=>{}} onCancel={()=>{}}/>);
  for(const text of ["Exact lorebook range","Principal cast range","Roster cast range","Runtime role","Minimum","Ideal","Maximum"])expect(html).toContain(text);
  expect(html).not.toContain("overflow-x-auto");
});
