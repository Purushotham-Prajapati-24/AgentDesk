import { Client, Databases } from "node-appwrite";

const endpoint = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT;
const projectId = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID;
const apiKey = process.env.APPWRITE_API_KEY;
const databaseId = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID || process.env.APPWRITE_DATABASE_ID;
const collectionId = process.env.NEXT_PUBLIC_APPWRITE_WEBCHAT_CONFIGS_COLLECTION_ID || "webchat_configs";

if (!endpoint || !projectId || !apiKey || !databaseId) {
  throw new Error("NEXT_PUBLIC_APPWRITE_ENDPOINT, NEXT_PUBLIC_APPWRITE_PROJECT_ID, APPWRITE_API_KEY, and database ID are required.");
}

const client = new Client().setEndpoint(endpoint).setProject(projectId).setKey(apiKey);
const databases = new Databases(client);

const stringAttributes = [
  ["tenant_id", 160, true],
  ["bot_id", 160, true],
  ["bot_name", 80, true],
  ["avatar_url", 500, false],
  ["description", 500, true],
  ["header_color", 20, true],
  ["background_color", 20, true],
  ["text_color", 20, true],
  ["user_bubble_color", 20, true],
  ["bot_bubble_color", 20, true],
  ["accent_color", 20, true],
  ["font_family", 40, true],
  ["custom_css", 5000, false],
  ["environment", 40, true],
  ["version_tag", 80, true],
  ["rollout_strategy", 40, true],
  ["agent_id", 160, false],
  ["theme_id", 160, false],
  ["created", 50, true],
  ["updated", 50, true],
  ["proactive_message_text", 500, false],
  ["proactive_message_trigger_type", 20, false],
  ["proactive_message_url_rules", 4000, false],
  ["proactive_message_frequency_cap", 20, false],
  ["proactive_message_ctas", 4000, false],
  ["proactive_message_variant_id", 60, false],
];

const booleanAttributes = [
  ["voice", false],
  ["transcript_export", true],
  ["file_uploads", false],
  ["human_handoff", true],
  ["source_citations", true],
  ["proactive_message", false],
  ["proactive_message_show_once", true],
  ["proactive_message_sound", false],
];

const integerAttributes = [
  ["proactive_message_delay", 5],
  ["proactive_message_autoclose", 0],
  ["proactive_message_idle_delay", 20],
];

async function ensureCollection() {
  try {
    await databases.getCollection(databaseId, collectionId);
    console.log(`Collection ${collectionId} already exists.`);
  } catch (error) {
    if (error.code !== 404) {
      throw error;
    }

    console.log(`Creating collection ${collectionId}...`);
    await databases.createCollection(databaseId, collectionId, "WebChat Configs", [], true, true);
  }
}

async function createStringAttribute([key, size, required]) {
  try {
    console.log(`Creating string attribute ${key}...`);
    await databases.createStringAttribute(databaseId, collectionId, key, size, required);
  } catch (error) {
    if (error.code !== 409) {
      throw error;
    }
  }
}

async function createBooleanAttribute([key, defaultValue]) {
  try {
    console.log(`Creating boolean attribute ${key}...`);
    await databases.createBooleanAttribute(databaseId, collectionId, key, false, defaultValue);
  } catch (error) {
    if (error.code !== 409) {
      throw error;
    }
  }
}

async function createIntegerAttribute([key, defaultValue]) {
  try {
    console.log(`Creating integer attribute ${key}...`);
    await databases.createIntegerAttribute(databaseId, collectionId, key, false, 0, 1000, defaultValue);
  } catch (error) {
    if (error.code !== 409) {
      throw error;
    }
  }
}

async function createIndex(key, type, attributes) {
  try {
    console.log(`Creating index ${key}...`);
    await databases.createIndex(databaseId, collectionId, key, type, attributes);
  } catch (error) {
    if (error.code !== 409) {
      throw error;
    }
  }
}

async function run() {
  await ensureCollection();

  for (const attribute of stringAttributes) {
    await createStringAttribute(attribute);
  }

  for (const attribute of booleanAttributes) {
    await createBooleanAttribute(attribute);
  }

  for (const attribute of integerAttributes) {
    await createIntegerAttribute(attribute);
  }

  console.log("Waiting for Appwrite attributes to become available...");
  await new Promise((resolve) => setTimeout(resolve, 5000));

  await createIndex("tenant_id_idx", "key", ["tenant_id"]);
  await createIndex("bot_id_idx", "key", ["bot_id"]);
  await createIndex("tenant_bot_unique", "unique", ["tenant_id", "bot_id"]);

  console.log("WebChat config schema is ready.");
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
