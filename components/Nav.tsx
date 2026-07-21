"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarDays, LayoutDashboard, History, Settings } from "lucide-react";

const links = [
  { href: "/",         label: "Dashboard", icon: LayoutDashboard },
  { href: "/calendar", label: "Calendar",  icon: CalendarDays },
  { href: "/history",  label: "History",   icon: History },
  { href: "/settings", label: "Settings",  icon: Settings },
];

export default function Nav() {
  const path = usePathname();

  return (
    <nav className="fixed bottom-0 inset-x-0 z-50 bg-surface/95 backdrop-blur border-t border-border safe-bottom">
      <div className="max-w-lg mx-auto flex">
        {links.map(({ href, label, icon: Icon }) => {
          const active = path === href;
          return (
            <Link
              key={href}
              href={href}
              className={`flex-1 flex flex-col items-center gap-1 py-3 text-xs font-medium transition-colors
                ${active ? "text-accent" : "text-muted hover:text-soft"}`}
            >
              <Icon size={20} strokeWidth={active ? 2 : 1.5} />
              {label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
