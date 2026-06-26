import type { CodeChunk } from "./model.js";
import { PrFile } from "./pr-files.js";

const MAX_CHUNK_LINES = 50;

function buildChunkId(prNumber: number, filePath: string, part: number) {
  return `pr-${prNumber}-${filePath.replace(/[^a-zA-Z0-9]/g, "-")}-${part}`;
}

export function chunkPrFiles(prNumber: number, files: PrFile[]): CodeChunk[] {
  const chunks: CodeChunk[] = [];

  for (const file of files) {
    const lines = file.patch.split("\n");
    for (let start = 0; start < lines.length; start += MAX_CHUNK_LINES) {
      const part = start / MAX_CHUNK_LINES;
      chunks.push({
        id: buildChunkId(prNumber, file.filePath, part),
        filePath: file.filePath,
        text: lines.slice(start, start + MAX_CHUNK_LINES).join("\n"),
      });
    }
  }

  return chunks;
}
