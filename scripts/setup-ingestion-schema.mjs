import { Client, Databases } from "node-appwrite";

const endpoint = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT;
const projectId = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID;
const apiKey = process.env.APPWRITE_API_KEY;
const databaseId = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID || process.env.APPWRITE_DATABASE_ID;
const documentsCollectionId = process.env.APPWRITE_DOCUMENT_FILES_COLLECTION_ID || "document_files";
const locksCollectionId = process.env.APPWRITE_INGESTION_LOCKS_COLLECTION_ID || "ingestion_locks";

if (!endpoint || !projectId || !apiKey || !databaseId) {
  throw new Error("NEXT_PUBLIC_APPWRITE_ENDPOINT, NEXT_PUBLIC_APPWRITE_PROJECT_ID, APPWRITE_API_KEY, and database ID are required.");
}

const client = new Client().setEndpoint(endpoint).setProject(projectId).setKey(apiKey);
const databases = new Databases(client);

async function createStringAttribute(collectionId, key, size, required, defaultValue = undefined) {
  try {
    console.log(`Creating string attribute ${collectionId}.${key}...`);
    await databases.createStringAttribute(databaseId, collectionId, key, size, required, defaultValue);
  } catch (error) {
    if (error.code !== 409) {
      throw error;
    }
  }
}

async function createIntegerAttribute(collectionId, key, required, defaultValue = undefined) {
  try {
    console.log(`Creating integer attribute ${collectionId}.${key}...`);
    await databases.createIntegerAttribute(databaseId, collectionId, key, required, undefined, undefined, defaultValue);
  } catch (error) {
    if (error.code !== 409) {
      throw error;
    }
  }
}

async function createIndex(collectionId, key, type, attributes) {
  try {
    console.log(`Creating index ${collectionId}.${key}...`);
    await databases.createIndex(databaseId, collectionId, key, type, attributes);
  } catch (error) {
    if (error.code !== 409) {
      throw error;
    }
  }
}

async function ensureLocksCollection() {
  try {
    await databases.getCollection(databaseId, locksCollectionId);
    console.log(`Collection ${locksCollectionId} already exists.`);
  } catch (error) {
    if (error.code !== 404) {
      throw error;
    }

    console.log(`Creating collection ${locksCollectionId}...`);
    await databases.createCollection(databaseId, locksCollectionId, "Ingestion Locks", [], true, true);
  }
}

async function run() {
  await createIntegerAttribute(documentsCollectionId, "attempts", false, 0);
  await createStringAttribute(documentsCollectionId, "last_error", 1000, false, "");
  await createStringAttribute(documentsCollectionId, "updated", 50, false, "");

  await ensureLocksCollection();
  await createStringAttribute(locksCollectionId, "document_id", 160, true);
  await createStringAttribute(locksCollectionId, "tenant_id", 160, true);
  await createStringAttribute(locksCollectionId, "bot_id", 160, true);
  await createStringAttribute(locksCollectionId, "worker_id", 220, true);
  await createStringAttribute(locksCollectionId, "locked_at", 50, true);
  await createStringAttribute(locksCollectionId, "expires_at", 50, true);

  console.log("Waiting for Appwrite attributes to become available...");
  await new Promise((resolve) => setTimeout(resolve, 5000));

  await createIndex(locksCollectionId, "tenant_id_idx", "key", ["tenant_id"]);
  await createIndex(locksCollectionId, "bot_id_idx", "key", ["bot_id"]);
  await createIndex(locksCollectionId, "expires_at_idx", "key", ["expires_at"]);

  console.log("Ingestion schema is ready.");
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
