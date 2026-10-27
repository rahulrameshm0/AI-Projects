type ProfileStatus = "incomplete" | "active" | "suspended" | "deleting";

/** Authentication alone does not grant admission to the beta. */
export function profileDestination(status: ProfileStatus | null | undefined) {
  switch (status) {
    case "active":
      return "/(tabs)" as const;
    case "incomplete":
      return "/onboarding" as const;
    case "suspended":
    case "deleting":
      return "/unavailable" as const;
    default:
      return null;
  }
}
