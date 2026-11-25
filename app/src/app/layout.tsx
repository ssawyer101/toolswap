import "./globals.css";
import Link from "next/link";
import type { Metadata, Viewport } from "next";
import { currentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { Nav } from "@/components/Nav";

export const metadata: Metadata = {
  title: { default: "ToolSwap", template: "%s · ToolSwap" },
  description: "Lend and borrow tools with people you trust.",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, title: "ToolSwap", statusBarStyle: "black-translucent" },
  icons: { icon: "/icon-192.png", apple: "/apple-touch-icon.png" },
};
export const viewport: Viewport = { themeColor: "#1E2420", viewportFit: "cover", width: "device-width", initialScale: 1 };

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const u = await currentUser();
  let counts = { basket: 0, loans: 0, unread: 0 };
  if (u) {
    const [basket, toApprove, toConfirm, extend, unread] = await Promise.all([
      db.basketItem.count({ where: { userId: u.id } }),
      db.loan.count({ where: { lenderId: u.id, status: "REQUESTED" } }),
      db.loan.count({ where: { lenderId: u.id, status: "RETURNED" } }),
      db.loan.count({ where: { lenderId: u.id, extendTo: { not: null }, status: { in: ["OUT", "APPROVED"] } } }),
      db.notification.count({ where: { userId: u.id, readAt: null } }),
    ]);
    counts = { basket, loans: toApprove + toConfirm + extend, unread };
  }
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@600;700&family=Barlow:wght@400;500;600&family=IBM+Plex+Mono:wght@500&display=swap" />
      </head>
      <body>
        <header className="bar"><div className="wrap">
          <Link href={u ? "/search" : "/login"} className="brand">Tool<span>Swap</span></Link>
          {u && <Nav {...counts} />}
        </div></header>
        <main className="wrap">{children}</main>
      </body>
    </html>
  );
}
