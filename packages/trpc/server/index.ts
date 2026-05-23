import { router } from "./trpc";

import { healthRouter } from "./routes/health/route";
import { authRouter } from "./routes/auth/route";
import { formRouter } from "./routes/form/route";
import { formResponseRouter } from "./routes/form-response/route";

export const serverRouter = router({
  health: healthRouter,
  auth: authRouter,
  form: formRouter,
  formResponse: formResponseRouter,
});

export { createContext } from "./context";
export type ServerRouter = typeof serverRouter;
