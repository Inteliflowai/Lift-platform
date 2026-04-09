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
  CreditCard,
  HelpCircle,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

type NavItem = { label: string; href: string; icon: LucideIcon; desc?: string };

const NAV_BY_ROLE: Record<string, NavItem[]> = {
  platform_admin: [
    { label: "Tenants", href: "/admin/tenants", icon: Building2 },
    { label: "Licenses", href: "/admin/licenses", icon: CreditCard },
    { label: "All Cycles", href: "/admin/cycles", icon: Calendar },
    { label: "System Reports", href: "/admin/reports", icon: BarChart2 },
    { label: "Settings", href: "/admin/settings", icon: Settings },
  ],
  school_admin: [
    { label: "Dashboard", href: "/school", icon: LayoutDashboard, desc: "Overview of candidates, sessions, and review queue" },
    { label: "Candidates", href: "/school/candidates", icon: Users, desc: "Import, invite, and manage candidate profiles" },
    { label: "Cycles", href: "/school/cycles", icon: Calendar, desc: "Create and manage admissions cycles with grade bands" },
    { label: "Team", href: "/school/team", icon: UserCheck, desc: "Invite evaluators, interviewers, and staff to your school" },
    { label: "Audit Log", href: "/school/audit", icon: ScrollText, desc: "Complete history of all actions taken on your account" },
    { label: "Settings", href: "/school/settings", icon: Settings, desc: "School preferences, voice settings, and subscription" },
  ],
  evaluator: [
    { label: "My Queue", href: "/evaluator", icon: ClipboardList, desc: "Candidates assigned to you for review" },
    { label: "All Candidates", href: "/evaluator/candidates", icon: Users, desc: "Browse all candidates across your school" },
    { label: "Reports", href: "/evaluator/reports", icon: FileText, desc: "Cohort analytics and benchmarking reports" },
  ],
  interviewer: [
    { label: "My Cases", href: "/interviewer", icon: Briefcase, desc: "Interview assignments and rubric submission" },
  ],
};

const ROLE_LABELS: Record<string, string> = {
  platform_admin: "Platform",
  school_admin: "School",
  evaluator: "Evaluator",
  interviewer: "Interviewer",
};

export function Sidebar({
  role,
  allRoles,
  userName,
}: {
  role: string;
  allRoles?: string[];
  userName?: string | null;
}) {
  const pathname = usePathname();

  // Build combined nav sections for users with multiple roles
  const rolesToShow = allRoles && allRoles.length > 1
    ? ["platform_admin", "school_admin", "evaluator", "interviewer"].filter((r) => allRoles.includes(r))
    : [role];

  const sections = rolesToShow.map((r) => ({
    label: ROLE_LABELS[r] ?? r,
    items: NAV_BY_ROLE[r] ?? [],
    role: r,
  })).filter((s) => s.items.length > 0);

  // Flatten for single-role users
  const isMultiRole = sections.length > 1;

  return (
    <aside className="sidebar-mesh fixed inset-y-0 left-0 z-30 flex w-60 flex-col border-r border-[#2a2a3a]">
      {/* Logo — centered, no text */}
      <div className="flex h-32 items-center justify-center">
        <Image
          src="/LIFT LOGO.jpeg"
          alt="LIFT"
          width={144}
          height={144}
          priority
          className="h-[120px] w-[120px] rounded-xl object-contain"
        />
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-3">
        {sections.map((section, sIdx) => (
          <div key={section.role} className={sIdx > 0 ? "mt-4" : ""}>
            {isMultiRole && (
              <p className="mb-1.5 px-3 text-[10px] font-semibold uppercase tracking-wider text-[#7878a0]/60">
                {section.label}
              </p>
            )}
            <div className="space-y-0.5">
              {section.items.map((item) => {
                const active =
                  item.href === "/school"
                    ? pathname === "/school"
                    : pathname.startsWith(item.href);
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    title={item.desc}
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
            </div>
          </div>
        ))}

        {/* Help link */}
        <div className="mt-4 px-0">
          <Link
            href={`/help/${role === "platform_admin" ? "admin" : role}`}
            title="User guide and help documentation"
            className={`flex items-center gap-3 rounded-lg px-3 py-2 text-[13px] font-medium transition-all ${
              pathname.startsWith("/help")
                ? "bg-[#6366f1]/15 text-[#6366f1]"
                : "text-[#7878a0] hover:bg-[#2a2740] hover:text-white"
            }`}
          >
            <HelpCircle size={18} strokeWidth={pathname.startsWith("/help") ? 2.2 : 1.8} />
            Help Guide
          </Link>
        </div>
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
        </div>
        <button
          onClick={() => {
            const supabase = createClient();
            supabase.auth.signOut().then(() => {
              window.location.href = "/login";
            });
          }}
          className="mt-2 flex w-full items-center gap-2 rounded-lg px-3 py-2 text-[13px] font-medium text-[#7878a0] transition-colors hover:bg-[#2a2740] hover:text-[#f43f5e]"
        >
          <LogOut size={16} />
          Sign Out
        </button>
      </div>
    </aside>
  );
}
