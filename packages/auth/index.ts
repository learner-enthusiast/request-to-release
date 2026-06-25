// packages/auth/index.ts
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "@repo/database";
import { account, session, user, verification } from "@repo/database/schema";
import { env } from "@repo/services/env";

const isSecureOrigin = env.BETTER_AUTH_URL.startsWith("https://");

export const auth = betterAuth({
  secret: env.BETTER_AUTH_SECRET,
  baseURL: env.BETTER_AUTH_URL,
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: { user, session, account, verification },
  }),
  emailAndPassword: { enabled: true },
  socialProviders: {
    google: {
      clientId: env.GOOGLE_OAUTH_CLIENT_ID!,
      clientSecret: env.GOOGLE_OAUTH_CLIENT_SECRET!,
    },
    github: {
      clientId: env.GITHUB_CLIENT_ID as string,
      clientSecret: env.GITHUB_CLIENT_SECRET as string,
      mapProfileToUser: async (profile) => {
        return {
          ...profile,
          name: profile.name ?? profile.login,
          email: profile.email ?? `${profile.id}@users.noreply.github.com`,
        };
      },
    },
  },
  trustedOrigins: ["http://localhost:3000", env.BETTER_AUTH_URL],
  advanced: isSecureOrigin
    ? {
        defaultCookieAttributes: {
          sameSite: "none",
          secure: true,
        },
      }
    : undefined,
});
