import GithubInstallationService from "@repo/services/github/installation";
import GithubSyncRepoCodebaseService from "@repo/services/github/syncRepoCodeBase";
import GithubRepositoriesService from "@repo/services/github/repositories";
export const githubInstallationService = new GithubInstallationService();
export const githubSyncRepoCodebaseService = new GithubSyncRepoCodebaseService();
export const githubRepositoriesService = new GithubRepositoriesService();
