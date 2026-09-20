import type { JsonSchema } from "../../src/contracts/generation.js";

export interface SchemaIssue {
  path: string;
  code: "type" | "required" | "enum" | "additional_property" | "schema";
  expected: string;
  actual: string;
}

const TYPES = new Set(["string", "number", "integer", "boolean", "array", "object", "null"]);
const KEYS = new Set(["type", "description", "enum", "properties", "required", "items", "additionalProperties", "nullable"]);

export function normalizeForgeSchema(input: unknown): JsonSchema {
  if (!input || typeof input !== "object" || Array.isArray(input)) throw new TypeError("Forge schema node must be an object.");
  const source = input as Record<string, unknown>;
  for (const key of Object.keys(source)) if (!KEYS.has(key)) throw new TypeError(`Unsupported Forge schema keyword: ${key}.`);
  const type = typeof source.type === "string" ? source.type.toLowerCase() : undefined;
  if (type && !TYPES.has(type)) throw new TypeError(`Unsupported Forge schema type: ${type}.`);
  if (source.type !== undefined && !type) throw new TypeError("Forge schema type must be a string.");
  if (source.description !== undefined && typeof source.description !== "string") throw new TypeError("Forge schema description must be a string.");
  if (source.nullable !== undefined && typeof source.nullable !== "boolean") throw new TypeError("Forge schema nullable must be a boolean.");
  if (source.required !== undefined && (!Array.isArray(source.required) || !source.required.every((field) => typeof field === "string"))) throw new TypeError("Forge schema required must contain field names.");
  if (source.enum !== undefined && (!Array.isArray(source.enum) || !source.enum.every((value) => value === null || ["string", "number", "boolean"].includes(typeof value)))) throw new TypeError("Forge schema enum contains an unsupported value.");
  if (source.properties !== undefined && (!source.properties || typeof source.properties !== "object" || Array.isArray(source.properties))) throw new TypeError("Forge schema properties must be an object.");
  if (source.additionalProperties !== undefined && typeof source.additionalProperties !== "boolean" && (typeof source.additionalProperties !== "object" || source.additionalProperties === null)) throw new TypeError("Forge schema additionalProperties is invalid.");
  const schema: JsonSchema = {
    ...(type ? { type: type as JsonSchema["type"] } : {}),
    ...(typeof source.description === "string" ? { description: source.description } : {}),
    ...(Array.isArray(source.enum) ? { enum: source.enum as JsonSchema["enum"] } : {}),
    ...(Array.isArray(source.required) ? { required: source.required as string[] } : {}),
    ...(source.nullable === true ? { nullable: true } : {}),
    ...(source.properties ? { properties: Object.fromEntries(Object.entries(source.properties as Record<string, unknown>).map(([key, value]) => [key, normalizeForgeSchema(value)])) } : {}),
    ...(source.items ? { items: normalizeForgeSchema(source.items) } : {}),
    ...(typeof source.additionalProperties === "boolean" ? { additionalProperties: source.additionalProperties } : source.additionalProperties ? { additionalProperties: normalizeForgeSchema(source.additionalProperties) } : {}),
  };
  return schema;
}

function valueType(value: unknown): string {
  if (value === null) return "null";
  if (Array.isArray(value)) return "array";
  if (typeof value === "number" && !Number.isFinite(value)) return "nonfinite_number";
  return typeof value;
}

function pointer(path: string, key: string): string { return `${path}/${key.replace(/~/g, "~0").replace(/\//g, "~1")}`; }

export function validateSchemaValue(value: unknown, schema: JsonSchema): SchemaIssue[] {
  const issues: SchemaIssue[] = [];
  const add = (issue: SchemaIssue) => { if (issues.length < 20) issues.push(issue); };
  const visit = (node: unknown, rule: JsonSchema, path: string) => {
    if (issues.length >= 20) return;
    const actual = valueType(node);
    if (node === null && rule.nullable) return;
    if (rule.type) {
      const matches = rule.type === "integer" ? typeof node === "number" && Number.isSafeInteger(node)
        : rule.type === "number" ? typeof node === "number" && Number.isFinite(node)
        : actual === rule.type;
      if (!matches) { add({ path, code: "type", expected: rule.type, actual }); return; }
    }
    if (rule.enum && !rule.enum.some((allowed) => allowed === node)) { add({ path, code: "enum", expected: "declared enum", actual }); return; }
    if (actual === "object") {
      const record = node as Record<string, unknown>;
      for (const key of rule.required ?? []) if (!Object.hasOwn(record, key)) add({ path: pointer(path, key), code: "required", expected: "present", actual: "missing" });
      for (const [key, child] of Object.entries(record)) {
        if (rule.properties?.[key]) visit(child, rule.properties[key], pointer(path, key));
        else if (rule.additionalProperties === false) add({ path, code: "additional_property", expected: "schema property", actual: "extra property" });
        else if (typeof rule.additionalProperties === "object") visit(child, rule.additionalProperties, pointer(path, key));
      }
    }
    if (Array.isArray(node) && rule.items) node.forEach((child, index) => visit(child, rule.items!, pointer(path, String(index))));
  };
  visit(value, schema, "");
  return issues;
}

export function renderSchemaContract(schema: JsonSchema): string {
  return JSON.stringify(normalizeForgeSchema(schema));
}
