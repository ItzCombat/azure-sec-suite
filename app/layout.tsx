import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Azure Sec Suite",
  description: "Security testing dashboard for Azure-hosted applications",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
