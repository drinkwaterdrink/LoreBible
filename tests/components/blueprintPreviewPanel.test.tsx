import React from "react";
import { expect, test } from "bun:test";
import { renderToString } from "react-dom/server";
import { BlueprintPreviewPanel } from "../../src/components/BlueprintPreviewPanel";
import { createBlueprintPlan } from "../../src/lib/blueprint/planner";
import { cozyBakery } from "../fixtures/blueprintPremises";

test("renders a mobile-safe, accessible, read-only Blueprint proposal with every artifact reason",()=>{const plan=createBlueprintPlan(cozyBakery(),{createdAt:"2026-09-10T12:00:00.000Z"});const html=renderToString(<BlueprintPreviewPanel plan={plan} onClose={()=>{}}/>);for(const text of ["Recommended build","Omitted with reason","Ordinary-life coverage","No runtime mechanic has been serialized","overflow-y-auto",plan.artifactTargets[0].reason,"role=\"dialog\"","aria-modal=\"true\""])expect(html).toContain(text);for(const forbidden of ["Save Blueprint","Apply Blueprint","Start Forge","type=\"checkbox\""])expect(html).not.toContain(forbidden);});
