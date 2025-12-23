import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Buffalo Timeline Glitch Generator",
  description:
    "Explore alternate-history Buffalo landmarks through a glitching timeline generator.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased">
        {/* App shell */}
        <div className="relative min-h-screen">
          {children}
        </div>
      </body>
    </html>
  );
}