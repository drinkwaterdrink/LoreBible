export interface NativeLumiverseWorldBookEntryV1 {
  uid: string;
  key: string[];
  keysecondary: string[];
  content: string;
  comment: string;
  position: number;
  depth: number;
  role: string | null;
  order_value: number;
  selective: boolean;
  constant: boolean;
  disabled: boolean;
  group_name: string;
  group_override: boolean;
  group_weight: number;
  probability: number;
  scan_depth: number | null;
  case_sensitive: boolean;
  match_whole_words: boolean;
  automation_id: string;
  extensions: Record<string, unknown>;
  use_regex: boolean;
  prevent_recursion: boolean;
  exclude_recursion: boolean;
  delay_until_recursion: boolean;
  priority: number;
  sticky: number;
  cooldown: number;
  delay: number;
  selective_logic: number;
  use_probability: boolean;
  vectorized: boolean;
  exclude_greeting: boolean;
  revision: number;
  outlet_name: string;
  wi_marker: boolean;
  wi_marker_side: number;
}

export interface NativeLumiverseWorldBookV1 {
  version: number;
  type: "lumiverse_world_book";
  name: string;
  description: string;
  metadata: Record<string, unknown>;
  entries: NativeLumiverseWorldBookEntryV1[];
  exported_at: number;
}

function fail(path: string, expected: string): never {
  throw new TypeError(`${path} must be ${expected}`);
}

function record(value: unknown, path: string): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) fail(path, "an object");
  return value as Record<string, unknown>;
}

function stringValue(value: unknown, path: string): string {
  if (typeof value !== "string") fail(path, "a string");
  return value;
}

function numberValue(value: unknown, path: string): number {
  if (typeof value !== "number" || !Number.isFinite(value)) fail(path, "a finite number");
  return value;
}

function booleanValue(value: unknown, path: string): boolean {
  if (typeof value !== "boolean") fail(path, "a boolean");
  return value;
}

function nullableNumber(value: unknown, path: string): number | null {
  return value === null ? null : numberValue(value, path);
}

function nullableString(value: unknown, path: string): string | null {
  return value === null ? null : stringValue(value, path);
}

function stringArray(value: unknown, path: string): string[] {
  if (!Array.isArray(value)) fail(path, "an array of strings");
  return value.map((item, index) => stringValue(item, `${path}[${index}]`));
}

function parseEntry(value: unknown, index: number): NativeLumiverseWorldBookEntryV1 {
  const path = `entries[${index}]`;
  const entry = record(value, path);
  return {
    uid: stringValue(entry.uid, `${path}.uid`),
    key: stringArray(entry.key, `${path}.key`),
    keysecondary: stringArray(entry.keysecondary, `${path}.keysecondary`),
    content: stringValue(entry.content, `${path}.content`),
    comment: stringValue(entry.comment, `${path}.comment`),
    position: numberValue(entry.position, `${path}.position`),
    depth: numberValue(entry.depth, `${path}.depth`),
    role: nullableString(entry.role, `${path}.role`),
    order_value: numberValue(entry.order_value, `${path}.order_value`),
    selective: booleanValue(entry.selective, `${path}.selective`),
    constant: booleanValue(entry.constant, `${path}.constant`),
    disabled: booleanValue(entry.disabled, `${path}.disabled`),
    group_name: stringValue(entry.group_name, `${path}.group_name`),
    group_override: booleanValue(entry.group_override, `${path}.group_override`),
    group_weight: numberValue(entry.group_weight, `${path}.group_weight`),
    probability: numberValue(entry.probability, `${path}.probability`),
    scan_depth: nullableNumber(entry.scan_depth, `${path}.scan_depth`),
    case_sensitive: booleanValue(entry.case_sensitive, `${path}.case_sensitive`),
    match_whole_words: booleanValue(entry.match_whole_words, `${path}.match_whole_words`),
    automation_id: stringValue(entry.automation_id, `${path}.automation_id`),
    extensions: record(entry.extensions, `${path}.extensions`),
    use_regex: booleanValue(entry.use_regex, `${path}.use_regex`),
    prevent_recursion: booleanValue(entry.prevent_recursion, `${path}.prevent_recursion`),
    exclude_recursion: booleanValue(entry.exclude_recursion, `${path}.exclude_recursion`),
    delay_until_recursion: booleanValue(entry.delay_until_recursion, `${path}.delay_until_recursion`),
    priority: numberValue(entry.priority, `${path}.priority`),
    sticky: numberValue(entry.sticky, `${path}.sticky`),
    cooldown: numberValue(entry.cooldown, `${path}.cooldown`),
    delay: numberValue(entry.delay, `${path}.delay`),
    selective_logic: numberValue(entry.selective_logic, `${path}.selective_logic`),
    use_probability: booleanValue(entry.use_probability, `${path}.use_probability`),
    vectorized: booleanValue(entry.vectorized, `${path}.vectorized`),
    exclude_greeting: booleanValue(entry.exclude_greeting, `${path}.exclude_greeting`),
    revision: numberValue(entry.revision, `${path}.revision`),
    outlet_name: stringValue(entry.outlet_name, `${path}.outlet_name`),
    wi_marker: booleanValue(entry.wi_marker, `${path}.wi_marker`),
    wi_marker_side: numberValue(entry.wi_marker_side, `${path}.wi_marker_side`),
  };
}

export function parseNativeLumiverseWorldBookV1(value: unknown): NativeLumiverseWorldBookV1 {
  const book = record(value, "worldBook");
  const type = stringValue(book.type, "type");
  if (type !== "lumiverse_world_book") fail("type", '"lumiverse_world_book"');
  if (!Array.isArray(book.entries)) fail("entries", "an array");
  return {
    version: numberValue(book.version, "version"),
    type,
    name: stringValue(book.name, "name"),
    description: stringValue(book.description, "description"),
    metadata: record(book.metadata, "metadata"),
    entries: book.entries.map(parseEntry),
    exported_at: numberValue(book.exported_at, "exported_at"),
  };
}
