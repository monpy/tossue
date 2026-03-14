import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Tossue Demo Site (Next.js)",
  description: "Demo site for testing Tossue extension with React/Next.js",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
