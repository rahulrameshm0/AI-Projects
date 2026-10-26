import { ClerkProvider } from "@clerk/nextjs";
import "./globals.css";
export const metadata = {
  title: "MiniGram — Community admin",
  description: "Invitations, reports, and community operations.",
};
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <ClerkProvider>{children}</ClerkProvider>
      </body>
    </html>
  );
}
