const qdrantUrl = process.env.QDRANT_URL ?? process.env.ENPOINT_URL;
const qdrantApiKey = process.env.QDRANT_API_KEY ?? process.env.API_KEY;
const collection = process.env.QDRANT_COLLECTION_V2 ?? `${process.env.QDRANT_COLLECTION ?? "agent_knowledge_base"}_v2`;

if (!qdrantUrl || !qdrantApiKey) {
  console.error("QDRANT_URL/ENPOINT_URL and QDRANT_API_KEY/API_KEY are required.");
  process.exit(1);
}

const response = await fetch(`${qdrantUrl.replace(/\/$/, "")}/collections/${collection}`, {
  method: "PUT",
  headers: {
    "Content-Type": "application/json",
    "api-key": qdrantApiKey,
  },
  body: JSON.stringify({
    vectors: {
      dense: {
        size: 768,
        distance: "Cosine",
      },
    },
    sparse_vectors: {
      bm25: {
        modifier: "idf",
      },
    },
  }),
});

if (!response.ok && response.status !== 409) {
  console.error(await response.text().catch(() => "Qdrant collection setup failed."));
  process.exit(1);
}

for (const fieldName of ["tenant_id", "bot_id"]) {
  const indexResponse = await fetch(`${qdrantUrl.replace(/\/$/, "")}/collections/${collection}/index`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      "api-key": qdrantApiKey,
    },
    body: JSON.stringify({
      field_name: fieldName,
      field_schema: "keyword",
    }),
  });

  if (!indexResponse.ok && indexResponse.status !== 409) {
    console.error(await indexResponse.text().catch(() => `Qdrant payload index setup failed for ${fieldName}.`));
    process.exit(1);
  }
}

console.log(`Hybrid Qdrant collection ready: ${collection}`);
