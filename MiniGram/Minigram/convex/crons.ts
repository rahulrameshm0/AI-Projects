import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";
const crons = cronJobs();
crons.interval(
  "Expire report evidence and clean orphaned uploads",
  { hours: 6 },
  internal.cleanup.sweep,
  {},
);
crons.interval(
  "Clean unclaimed storage files",
  { hours: 6 },
  internal.cleanup.sweepStorage,
  {},
);
export default crons;
