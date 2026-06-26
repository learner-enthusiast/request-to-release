import { serve } from "inngest/express";
import { inngest } from "@repo/services/inngest/client.js";
import { inngestFunctions } from "@repo/services/inngest/index.js";

export const inngestRouter = serve({
  client: inngest,
  functions: inngestFunctions,
  servePath: "/api/inngest",
});
