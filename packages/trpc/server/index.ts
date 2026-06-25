import { router } from "./trpc";

import { healthRouter } from "./routes/health/route";
import { githubRouter } from "./routes/github/route";

export const serverRouter = router({
  health: healthRouter,
  github: githubRouter,
});

export { createContext } from "./context";
export type ServerRouter = typeof serverRouter;
