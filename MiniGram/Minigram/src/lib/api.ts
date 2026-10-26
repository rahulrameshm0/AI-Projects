export { api } from "../../convex/_generated/api";
export type { Id, Doc } from "../../convex/_generated/dataModel";
export function messageOf(error: unknown) {
  if (
    error &&
    typeof error === "object" &&
    "data" in error &&
    typeof error.data === "string"
  )
    return error.data;
  if (error instanceof Error) return error.message;
  return "Something went wrong. Please try again.";
}
