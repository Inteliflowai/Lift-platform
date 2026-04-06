"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  Building2,
  Calendar,
  BarChart2,
  Settings,
  LayoutDashboard,
  Users,
  UserCheck,
  ClipboardList,
  FileText,
  Briefcase,
  ScrollText,
  LogOut,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

type NavItem = { label: string; href: string; icon: LucideIcon };

const NAV_BY_ROLE: Record<string, NavItem[]> = {
  platform_admin: [
    { label: "Tenants", href: "/admin/tenants", icon: Building2 },
    { label: "All Cycles", href: "/admin/cycles", icon: Calendar },
    { label: "System Reports", href: "/admin/reports", icon: BarChart2 },
    { label: "Settings", href: "/admin/settings", icon: Settings },
  ],
  school_admin: [
    { label: "Dashboard", href: "/school", icon: LayoutDashboard },
    { label: "Candidates", href: "/school/candidates", icon: Users },
    { label: "Cycles", href: "/school/cycles", icon: Calendar },
    { label: "Team", href: "/school/team", icon: UserCheck },
    { label: "Audit Log", href: "/school/audit", icon: ScrollText },
    { label: "Settings", href: "/school/settings", icon: Settings },
  ],
  evaluator: [
    { label: "My Queue", href: "/evaluator", icon: ClipboardList },
    { label: "All Candidates", href: "/evaluator/candidates", icon: Users },
    { label: "Reports", href: "/evaluator/reports", icon: FileText },
  ],
  interviewer: [
    { label: "My Cases", href: "/interviewer", icon: Briefcase },
  ],
};

export function Sidebar({
  role,
  userName,
}: {
  role: string;
  userName?: string | null;
}) {
  const pathname = usePathname();
  const items = NAV_BY_ROLE[role] ?? [];

  return (
    <aside className="sidebar-mesh fixed inset-y-0 left-0 z-30 flex w-60 flex-col border-r border-[#2a2a3a]">
      {/* Logo — centered, no text */}
      <div className="flex h-20 items-center justify-center">
        <Image
          src="/LIFT LOGO.jpeg"
          alt="LIFT"
          width={56}
          height={56}
          className="h-14 w-14 rounded-lg object-contain"
        />
      </div>

      {/* Nav */}
      <nav className="flex-1 space-y-0.5 px-3 py-3">
        {items.map((item) => {
          const active =
            item.href === "/school"
              ? pathname === "/school"
              : pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 rounded-lg px-3 py-2 text-[13px] font-medium transition-all ${
                active
                  ? "bg-[#6366f1]/15 text-[#6366f1]"
                  : "text-[#7878a0] hover:bg-[#2a2740] hover:text-white"
              }`}
            >
              <Icon size={18} strokeWidth={active ? 2.2 : 1.8} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="border-t border-[#2a2a3a] px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="min-w-0">
            <p className="truncate text-xs font-medium text-[#e8e8f0]">
              {userName || "User"}
            </p>
            <p className="mt-0.5 truncate text-[11px] text-[#7878a0] capitalize">
              {role.replace("_", " ")}
            </p>
          </div>
          <button
            onClick={() => {
              const supabase = createClient();
              supabase.auth.signOut().then(() => {
                window.location.href = "/login";
              });
            }}
            className="rounded-md p-1.5 text-[#7878a0] transition-colors hover:bg-[#2a2740] hover:text-[#f43f5e]"
            title="Sign out"
          >
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </aside>
  );
}
