import { describe, expect, it } from "vitest";
import { profileDestination } from "./destination";

describe("post-authentication destination", () => {
  it("waits for the backend profile instead of routing to a public fallback", () => {
    expect(profileDestination(undefined)).toBeNull();
    expect(profileDestination(null)).toBeNull();
  });

  it("takes a newly authenticated member through admission before Home", () => {
    expect(profileDestination("incomplete")).toBe("/onboarding");
    expect(profileDestination("active")).toBe("/(tabs)");
  });

  it("keeps restricted accounts out of Home and onboarding", () => {
    expect(profileDestination("suspended")).toBe("/unavailable");
    expect(profileDestination("deleting")).toBe("/unavailable");
  });
});
