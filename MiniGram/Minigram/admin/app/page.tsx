"use client";
import { useAuth, UserButton } from "@clerk/nextjs";
import { ConvexProviderWithClerk } from "convex/react-clerk";
import { ConvexReactClient, useQuery } from "convex/react";
import { api } from "../convex-api";
import { Dashboard } from "../components/dashboard";
import { Component, type ReactNode } from "react";
const url = process.env.NEXT_PUBLIC_CONVEX_URL;
const client = url ? new ConvexReactClient(url) : null;
class Boundary extends Component<{ children: ReactNode }, { error: boolean }> {
  state = { error: false };
  static getDerivedStateFromError() {
    return { error: true };
  }
  render() {
    return this.state.error ? (
      <main className="notice">
        <h1>Unable to load this page</h1>
        <p>Your permissions may have changed, or the server is unavailable.</p>
        <button onClick={() => location.reload()}>Try again</button>
      </main>
    ) : (
      this.props.children
    );
  }
}
function Gate() {
  const me = useQuery(api.users.me, {});
  return (
    <>
      <header className="top">
        <a href="/" className="brand">
          MiniGram <span>Community admin</span>
        </a>
        <UserButton />
      </header>
      {me === undefined ? (
        <main className="notice">
          <p>Connecting to MiniGram…</p>
        </main>
      ) : me?.admin && me.status === "active" ? (
        <Boundary>
          <Dashboard />
        </Boundary>
      ) : (
        <main className="notice">
          <h1>Administrator access required</h1>
          <p>
            Sign in with the verified owner account and finish invitation and
            profile setup in the mobile app first.
          </p>
        </main>
      )}
    </>
  );
}
export default function Page() {
  if (!client)
    return (
      <main className="notice">
        <h1>Connect your server</h1>
        <p>Add NEXT_PUBLIC_CONVEX_URL to the admin environment.</p>
      </main>
    );
  return (
    <ConvexProviderWithClerk client={client} useAuth={useAuth}>
      <Gate />
    </ConvexProviderWithClerk>
  );
}
