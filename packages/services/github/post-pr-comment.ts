import { getInstallationOctokit } from "../Octokit/index.js";

export async function postPrComment(
  installationId: number,
  repoFullName: string,
  prNumber: number,
  body: string,
) {
  const octokit = await getInstallationOctokit(installationId);
  const [owner, repo] = repoFullName.split("/");

  await octokit.rest.issues.createComment({
    owner: owner!,
    repo: repo!,
    issue_number: prNumber,
    body,
  });
}
