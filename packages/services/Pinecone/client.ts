import { Pinecone } from "@pinecone-database/pinecone";
import { env } from "../env.js";

let index: ReturnType<Pinecone["index"]> | null = null;

export function getPineconeIndex() {
  if (!index) {
    const pc = new Pinecone({ apiKey: env.PINECONE_API_KEY });
    index = pc.index({ name: env.PINECONE_INDEX });
  }
  return index;
}
