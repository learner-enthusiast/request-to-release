import type { App, Octokit } from "octokit";

import { env } from "../env.js";

let githubApp: App | null = null;
let githubAppPromise: Promise<App> | null = null;

function normalizePrivateKey(key: string) {
  return key.replace(/\\n/g, "\n");
}

export async function getGithubApp(): Promise<App> {
  if (githubApp) return githubApp;

  if (!githubAppPromise) {
    githubAppPromise = import("octokit").then(({ App }) => {
      githubApp = new App({
        appId: env.GITHUB_APP_ID,
        privateKey: normalizePrivateKey(env.GITHUB_APP_SECRET),
        webhooks: { secret: env.GITHUB_WEBHOOK_SECRET },
      });
      return githubApp;
    });
  }

  return githubAppPromise;
}

export async function getInstallationOctokit(installationId: number): Promise<Octokit> {
  const app = await getGithubApp();
  return app.getInstallationOctokit(installationId);
}

export function getGithubInstallUrl(userId: string) {
  const url = new URL(env.GITHUB_APP_INSTALL_URL);
  url.searchParams.set("state", userId);
  return url.toString();
}
