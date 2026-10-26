import { SignIn } from "@clerk/nextjs";
import { Suspense } from "react";
export default function Page() {
  return (
    <main className="signin">
      <Suspense fallback={<p>Loading sign-in…</p>}>
        <SignIn />
      </Suspense>
    </main>
  );
}
