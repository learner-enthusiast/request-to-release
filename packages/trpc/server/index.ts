import { router } from "./trpc";

import { healthRouter } from "./routes/health/route";
import { githubRouter } from "./routes/github/route";
import { featureRequestRouter } from "./routes/feature-requests/route";

export const serverRouter = router({
  health: healthRouter,
  github: githubRouter,
  featureRequest: featureRequestRouter,
});

export { createContext } from "./context";
export type ServerRouter = typeof serverRouter;
