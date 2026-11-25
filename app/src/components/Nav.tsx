"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
export function Nav({ basket, loans, unread }: { basket: number; loans: number; unread: number }) {
  const p = usePathname();
  const item = (href: string, label: string, n = 0, cls = "") => (
    <Link href={href} className={`${p.startsWith(href) ? "on" : ""} ${cls}`}>{label}{n > 0 && <span className="count">{n}</span>}</Link>
  );
  return (
    <nav className="tabs">
      {item("/search", "Find tools")}
      {item("/basket", "Basket", basket)}
      {item("/loans", "Loans", loans)}
      {item("/garage", "My garage")}
      {item("/groups", "Groups")}
      {item("/notifications", "Alerts", unread, "right")}
      {item("/settings", "Account")}
    </nav>
  );
}
