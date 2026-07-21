import type { Metadata, Viewport } from "next";
import "./globals.css";
import Nav from "@/components/Nav";

export const metadata: Metadata = {
  title: "OJT Tracker",
  description: "Track your on-the-job training hours",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-bg text-text">
        <div className="max-w-lg mx-auto px-4 pt-6 pb-28">
          {children}
        </div>
        <Nav />
      </body>
    </html>
  );
}
