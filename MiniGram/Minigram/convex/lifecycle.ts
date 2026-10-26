"use node";
import { internalAction } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
export const deleteClerkUser = internalAction({
  args: { job: v.id("jobs") },
  handler: async (ctx, { job }) => {
    const record = await ctx.runMutation(internal.cleanup.job, { id: job });
    if (!record) return;
    let done = false;
    try {
      const key = process.env.CLERK_SECRET_KEY;
      if (key) {
        const response = await fetch(
          `https://api.clerk.com/v1/users/${encodeURIComponent(record.target)}`,
          { method: "DELETE", headers: { Authorization: `Bearer ${key}` } },
        );
        done = response.ok || response.status === 404;
      }
    } catch {
      /* retry without logging account details */
    }
    await ctx.runMutation(internal.cleanup.retryJob, { id: job, done });
  },
});
