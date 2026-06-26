import { Router, raw } from "express";
import { githubWebhookService } from "@repo/services/github/webhook.js";

export const webhookRouter = Router();

webhookRouter.post("/github", raw({ type: "application/json" }), async (req, res, next) => {
  try {
    const payload = req.body.toString("utf8");
    const signature = req.get("x-hub-signature-256") ?? null;
    const eventName = req.get("x-github-event") ?? null;

    const result = await githubWebhookService.handleWebhook({
      payload,
      signature,
      eventName,
    });

    return res.status(200).json(result);
  } catch (error) {
    next(error);
  }
});
