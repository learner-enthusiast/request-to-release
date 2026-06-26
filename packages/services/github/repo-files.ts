import { getInstallationOctokit } from "../Octokit/index.js";
import type { RepoFile } from "./model.js";

const MAX_FILE_SIZE_BYTES = 100_000;
const MAX_FILES = 200;

const CODE_EXTENSIONS = [
  ".ts",
  ".tsx",
  ".js",
  ".jsx",
  ".mjs",
  ".py",
  ".go",
  ".rb",
  ".rs",
  ".java",
  ".kt",
  ".swift",
  ".c",
  ".h",
  ".cpp",
  ".cs",
  ".php",
  ".sql",
  ".prisma",
  ".css",
  ".md",
  ".yml",
  ".yaml",
];

const SKIPPED_FOLDERS = ["node_modules/", "dist/", "build/", ".next/", "generated/", "vendor/"];

type TreeEntry = {
  path?: string;
  type?: string;
  sha?: string;
  size?: number;
};

function hasCodeExtension(path: string) {
  return CODE_EXTENSIONS.some((ext) => path.endsWith(ext));
}

function isSkippedPath(path: string) {
  return SKIPPED_FOLDERS.some((folder) => path.includes(folder));
}

function isIndexableFile(entry: TreeEntry) {
  if (entry.type !== "blob" || !entry.path || !entry.sha) return false;
  if (entry.size && entry.size > MAX_FILE_SIZE_BYTES) return false;
  if (isSkippedPath(entry.path)) return false;
  return hasCodeExtension(entry.path);
}

export async function getRepoFiles(
  installationId: number,
  repoFullName: string,
  branch: string,
): Promise<RepoFile[]> {
  const octokit = await getInstallationOctokit(installationId);
  const [owner, repo] = repoFullName.split("/");

  const { data: commit } = await octokit.rest.repos.getCommit({
    owner: owner!,
    repo: repo!,
    ref: branch,
  });

  const { data: tree } = await octokit.rest.git.getTree({
    owner: owner!,
    repo: repo!,
    tree_sha: commit.commit.tree.sha,
    recursive: "100",
  });

  const entries = (tree.tree ?? []).filter(isIndexableFile).slice(0, MAX_FILES);
  const files: RepoFile[] = [];

  for (const entry of entries) {
    const { data: blob } = await octokit.rest.git.getBlob({
      owner: owner!,
      repo: repo!,
      file_sha: entry.sha!,
    });

    const content = Buffer.from(blob.content, "base64").toString("utf-8");
    files.push({ filePath: entry.path!, content });
  }

  return files;
}
