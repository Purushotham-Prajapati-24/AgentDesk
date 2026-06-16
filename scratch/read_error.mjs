import { Client, Databases, Query } from "node-appwrite";

async function main() {
  const client = new Client()
    .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT || "https://cloud.appwrite.io/v1")
    .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID || "")
    .setKey(process.env.APPWRITE_API_KEY || "");

  const databases = new Databases(client);
  const databaseId = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID || "6a12a818000f7855e098";
  const collectionId = "document_files";

  try {
    console.log("Listing failed documents...");
    const result = await databases.listDocuments(databaseId, collectionId, [
      Query.equal("status", "failed"),
      Query.orderDesc("updated"),
      Query.limit(5)
    ]);

    console.log(`Found ${result.total} failed documents.`);
    for (const doc of result.documents) {
      console.log(`----------------------------------------`);
      console.log(`ID: ${doc.$id}`);
      console.log(`Path/URL: ${doc.storage_path}`);
      console.log(`Updated: ${doc.updated || doc.$updatedAt}`);
      console.log(`Last Error: ${doc.last_error}`);
      console.log(`Attempts: ${doc.attempts}`);
    }
  } catch (err) {
    console.error("Failed to read database:", err);
  }
}

main();
