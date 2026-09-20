import { expect, test } from "bun:test";
import { FORGE_REQUIRED_FIELDS, sanitizeForgeSectionEntries } from "../../server/generation/forgeValidation";

test("Forge relationship schema and validation share the same required fields", () => {
  expect(FORGE_REQUIRED_FIELDS.relationshipWeb).toEqual(["source", "target", "bond", "pressure", "relation"]);
});

test("Forge relationship entries keep the required relation field and receive stable defaults", () => {
  const result = sanitizeForgeSectionEntries("relationshipWeb", [{
    fields: {
      source: "Mara",
      target: "Ivo",
      bond: "Professional respect",
      pressure: "A deadline tests their trust",
      relation: "Mara relies on Ivo's discretion",
    },
    keys: ["Mara", "Ivo"],
  }]);

  expect(result).toEqual([expect.objectContaining({ id: "relationshipWeb-1", locked: false })]);
});

test("Forge validation names the missing relationship field instead of hiding it behind a generic error", () => {
  expect(() => sanitizeForgeSectionEntries("relationshipWeb", [{
    fields: {
      source: "Mara",
      target: "Ivo",
      bond: "Professional respect",
      pressure: "A deadline tests their trust",
    },
    keys: ["Mara", "Ivo"],
  }])).toThrow("relationshipWeb entry 1 is missing required content: relation");
});

const completeNpcFields={name:"Mara",role:"Ferry keeper",wants:"Keep the crossing independent.",body:"Weathered coat and brass spectacles.",voice:"Brief, dry observations.",notDefault:"Repairs clocks when anxious.",holds:"The night ledger.",connection:"Knows the quay families.",castTier:"principal",independentActivity:"Audits crossings and repairs the west signal."};

test("new Forge NPC entries require explicit cast tier and independent activity",()=>{
  expect(FORGE_REQUIRED_FIELDS.npcs).toContain("independentActivity");
  const [npc]=sanitizeForgeSectionEntries("npcs",[{fields:completeNpcFields,keys:["Mara"]}]);
  expect(npc.fields).toMatchObject({castTier:"principal",independentActivity:"Audits crossings and repairs the west signal."});
});

test("Forge rejects an unsupported NPC cast tier",()=>{
  expect(()=>sanitizeForgeSectionEntries("npcs",[{fields:{...completeNpcFields,castTier:"hero"},keys:["Mara"]}])).toThrow("npcs entry 1 has unsupported castTier");
});

test("Forge rejects numbered placeholder semantic names",()=>{
  expect(()=>sanitizeForgeSectionEntries("history",[{id:"h",fields:{name:"History 1",event:"A treaty was signed.",era:"1877",consequence:"Borders closed."},keys:["treaty"],permanence:"C",locked:false}])).toThrow("semantic name");
});

test("Forge rejects empty activation keys with a safe correction path", () => {
  try {
    sanitizeForgeSectionEntries("history", [{ id: "h", fields: { name: "The Old Treaty", event: "A treaty was signed.", era: "1877", consequence: "Borders closed." }, keys: ["  "], permanence: "C", locked: false }]);
    throw new Error("expected invalid keys");
  } catch (error) {
    expect(error).toMatchObject({ issues: [{ path: "/history/0/keys", code: "schema" }] });
  }
});
