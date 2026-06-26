import type { CodeChunk } from "./model.js";
import type { RepoFile } from "./model.js";

const MAX_CHUNK_LINES = 80;

function buildChunkId(filePath: string, part: number) {
  return `repo--${filePath.replace(/[^a-zA-Z0-9]/g, "-")}--part-${part}`;
}

export function chunkRepoFiles(files: RepoFile[]): CodeChunk[] {
  const chunks: CodeChunk[] = [];

  for (const file of files) {
    const lines = file.content.split("\n");
    for (let start = 0; start < lines.length; start += MAX_CHUNK_LINES) {
      const part = start / MAX_CHUNK_LINES;
      chunks.push({
        id: buildChunkId(file.filePath, part),
        filePath: file.filePath,
        text: lines.slice(start, start + MAX_CHUNK_LINES).join("\n"),
      });
    }
  }

  return chunks;
}
