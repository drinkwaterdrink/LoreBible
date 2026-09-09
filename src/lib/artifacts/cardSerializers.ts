import type { CharacterArtifactIR } from "../../contracts/artifacts";
import type { PortableCharacterBookResult } from "./loreSerializers";

function embeddedBook(portable: PortableCharacterBookResult) {
  return {
    name: portable.name,
    description: portable.description,
    extensions: {},
    scan_depth: 4,
    token_budget: 2048,
    recursive_scanning: false,
    entries: portable.entries.map((entry, index) => ({
      id: index + 1,
      keys: entry.keys,
      secondary_keys: [],
      comment: entry.comment,
      content: entry.content,
      constant: entry.constant,
      selective: false,
      insertion_order: entry.insertionOrder,
      enabled: entry.enabled,
      position: "before_char",
      use_regex: false,
      extensions: {},
    })),
  };
}

function sharedData(artifact: CharacterArtifactIR, portable: PortableCharacterBookResult) {
  return {
    name: artifact.fields.name,
    description: artifact.fields.description,
    personality: artifact.fields.personality,
    scenario: artifact.fields.scenario,
    first_mes: artifact.fields.firstMessage,
    mes_example: artifact.fields.exampleMessages,
    creator_notes: artifact.fields.creatorNotes,
    system_prompt: artifact.fields.systemPrompt,
    post_history_instructions: artifact.fields.postHistoryInstructions,
    alternate_greetings: artifact.alternateGreetings,
    tags: artifact.tags,
    creator: "LoreBible Studio",
    character_version: "1.0",
    character_book: embeddedBook(portable),
  };
}

export function serializeCharacterCardV2(artifact: CharacterArtifactIR, portable: PortableCharacterBookResult) {
  return {
    spec: "chara_card_v2",
    spec_version: "2.0",
    data: sharedData(artifact, portable),
  };
}

export function serializeCharacterCardV3(artifact: CharacterArtifactIR, portable: PortableCharacterBookResult) {
  return {
    spec: "chara_card_v3",
    spec_version: "3.0",
    data: {
      ...sharedData(artifact, portable),
      extensions: {},
      group_only_greetings: [],
      assets: [],
    },
  };
}
