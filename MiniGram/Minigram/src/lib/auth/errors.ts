import { isClerkAPIResponseError } from "@clerk/expo";

/** Return only a user-facing message; never log credentials or Clerk resources. */
export function authErrorMessage(error: unknown): string {
  if (isClerkAPIResponseError(error)) {
    return (
      error.errors[0]?.longMessage ||
      error.errors[0]?.message ||
      "Unable to authenticate. Please try again."
    );
  }
  if (
    error &&
    typeof error === "object" &&
    "message" in error &&
    typeof error.message === "string"
  ) {
    return error.message;
  }
  return "Unable to connect. Check your connection and try again.";
}

export function checkAuthResult(result: { error: unknown }): void {
  if (result.error) throw result.error;
}
