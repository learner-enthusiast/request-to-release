import { getPineconeIndex } from "../Pinecone/client.js";
import { CodeChunk } from "./model.js";

export function buildPrNamespace(repoFullName: string, prNumber: number) {
  return `${repoFullName.replace("/", "--")}--pr-${prNumber}`;
}

export function buildRepoNamespace(repoFullName: string) {
  return `${repoFullName.replace("/", "--")}--codebase`;
}

export async function saveChunksToPinecone(namespace: string, chunks: CodeChunk[]) {
  const index = getPineconeIndex();
  await index.namespace(namespace).upsertRecords({
    records: chunks.map((c) => ({ id: c.id, text: c.text, filePath: c.filePath })),
  });
}

export async function searchPrContext(namespace: string, query: string): Promise<string[]> {
  const index = getPineconeIndex();
  const response = await index.namespace(namespace).searchRecords({
    query: { topK: 10, inputs: { text: query } },
  });
  const snippets: string[] = [];
  for (const hit of response.result.hits) {
    const fields = hit.fields as { text?: string; filePath?: string };
    if (!fields.text) continue;
    snippets.push(`File: ${fields.filePath}\n${fields.text}`);
  }
  return snippets;
}
