"use server";

import { revalidatePath } from "next/cache";
import type { ActionResult } from "@/lib/errors";
import { subscriptionStatusSchema } from "@/lib/validation/subscription";
import {
  advanceStatus,
  closeSubscription,
  pauseSubscription,
  renewSubscription,
  resumeSubscription,
} from "@/server/services/subscriptions";

export async function subscriptionAction(
  id: string,
  _previous: ActionResult<unknown> | null,
  formData: FormData,
): Promise<ActionResult<unknown>> {
  const intent = String(formData.get("intent") ?? "");
  let result: ActionResult<unknown>;
  switch (intent) {
    case "advance": {
      const to = subscriptionStatusSchema.safeParse(formData.get("to"));
      result = to.success ? await advanceStatus(id, to.data) : { ok: false, message: "Unknown status" };
      break;
    }
    case "pause":
      result = await pauseSubscription(id);
      break;
    case "resume":
      result = await resumeSubscription(id);
      break;
    case "close":
      result = await closeSubscription(id);
      break;
    case "renew":
      result = await renewSubscription(id);
      break;
    default:
      result = { ok: false, message: "Unknown action" };
  }
  if (result.ok) {
    revalidatePath(`/subscriptions/${id}`);
    revalidatePath("/subscriptions");
  }
  return result;
}
