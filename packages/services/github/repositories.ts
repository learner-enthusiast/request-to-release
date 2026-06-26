import { errors } from "@repo/errors";
import { getInstallationOctokit } from "../Octokit/index.js";
import GithubInstallationService from "./installation.js";
import type { GetInstallationReposInput, GetInstallationReposOutput, GithubRepo } from "./model.js";

const REPOS_PER_PAGE = 100;

function getRepoVisibility(isPrivate?: boolean): GithubRepo["visibility"] {
  return isPrivate ? "private" : "public";
}

function mapRepo(repo: {
  id: number;
  name: string;
  full_name: string;
  private?: boolean;
  default_branch?: string;
  updated_at?: string | null;
  language?: string | null;
  stargazers_count?: number | null;
}): GithubRepo {
  return {
    id: String(repo.id),
    name: repo.name,
    fullName: repo.full_name,
    visibility: getRepoVisibility(repo.private),
    defaultBranch: repo.default_branch ?? "main",
    updatedAt: repo.updated_at ?? new Date().toISOString(),
    language: repo.language ?? null,
    stars: repo.stargazers_count ?? 0,
  };
}

export default class GithubRepositoriesService {
  constructor(private readonly installations = new GithubInstallationService()) {}

  async getInstallationReposPage(
    input: GetInstallationReposInput,
  ): Promise<GetInstallationReposOutput> {
    const { userId, page } = input;

    const { installationId } = await this.installations.getUserInstallationId({ userId });

    if (!installationId) {
      return errors.forbidden("GitHub App not connected");
    }

    const octokit = await getInstallationOctokit(installationId);

    const { data } = await octokit.rest.apps.listReposAccessibleToInstallation({
      per_page: REPOS_PER_PAGE,
      page,
    });

    const totalCount = data.total_count ?? 0;
    const repos = (data.repositories ?? []).map(mapRepo);

    return {
      repos,
      totalCount,
      page,
      hasMore: page * REPOS_PER_PAGE < totalCount,
    };
  }
}
