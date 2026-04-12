"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { useLicense } from "@/lib/licensing/context";
import { FEATURES } from "@/lib/licensing/features";
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
  ListOrdered,
  RotateCcw,
  Target,
  HelpCircle,
  HeartHandshake,
  Activity,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

type NavItem = { label: string; href: string; icon: LucideIcon; desc?: string; feature?: string };

const NAV_BY_ROLE: Record<string, NavItem[]> = {
  platform_admin: [
    { label: "Tenants", href: "/admin/tenants", icon: Building2 },
    { label: "Licenses", href: "/admin/licenses", icon: CreditCard },
    { label: "All Cycles", href: "/admin/cycles", icon: Calendar },
    { label: "Trial Health", href: "/admin/trials", icon: Activity },
    { label: "System Reports", href: "/admin/reports", icon: BarChart2 },
    { label: "Settings", href: "/admin/settings", icon: Settings },
  ],
  school_admin: [
    { label: "Dashboard", href: "/school", icon: LayoutDashboard, desc: "Overview of candidates, sessions, and review queue" },
    { label: "Candidates", href: "/school/candidates", icon: Users, desc: "Import, invite, and manage candidate profiles" },
    { label: "Cycles", href: "/school/cycles", icon: Calendar, desc: "Create and manage admissions cycles with grade bands" },
    { label: "Team", href: "/school/team", icon: UserCheck, desc: "Invite evaluators, interviewers, and staff to your school" },
    { label: "Analytics", href: "/school/analytics", icon: BarChart2, desc: "Session stats, TRI distribution, and cycle analytics" },
    { label: "Waitlist", href: "/school/waitlist", icon: ListOrdered, desc: "Waitlisted candidates ranked by TRI score", feature: FEATURES.WAITLIST_INTELLIGENCE },
    { label: "Re-Applications", href: "/school/reapplication", icon: RotateCcw, desc: "Returning applicants with prior-to-current comparison", feature: FEATURES.REAPPLICATION_INTELLIGENCE },
    { label: "Prediction Accuracy", href: "/school/reports/accuracy", icon: Target, desc: "Compare TRI predictions against real student outcomes", feature: FEATURES.OUTCOME_TRACKING },
    { label: "Support Plans", href: "/support", icon: HeartHandshake, desc: "90-day onboarding plans for admitted candidates", feature: FEATURES.PLACEMENT_SUPPORT_PLAN },
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
  grade_dean: [
    { label: "Support Plans", href: "/support", icon: HeartHandshake, desc: "90-day onboarding plans for admitted candidates" },
  ],
  learning_specialist: [
    { label: "Support Plans", href: "/support", icon: HeartHandshake, desc: "90-day onboarding plans for admitted candidates" },
  ],
};

const ROLE_LABELS: Record<string, string> = {
  platform_admin: "Platform",
  school_admin: "School",
  evaluator: "Evaluator",
  interviewer: "Interviewer",
  grade_dean: "Grade Dean",
  learning_specialist: "Learning Specialist",
};

export function Sidebar({
  role,
  allRoles,
  userName,
  branding,
}: {
  role: string;
  allRoles?: string[];
  userName?: string | null;
  branding?: {
    logoUrl: string | null;
    logoDarkUrl: string | null;
    hideLiftBranding: boolean;
    poweredByVisible: boolean;
    schoolName: string;
  };
}) {
  const pathname = usePathname();
  const { t, brandName } = useLocale();
  const { hasFeature } = useLicense();

  // Translation map for nav labels
  const navT: Record<string, string> = {
    "Dashboard": t("nav.dashboard"),
    "Candidates": t("nav.candidates"),
    "Cycles": t("nav.cycles"),
    "Team": t("nav.team"),
    "Analytics": t("nav.analytics"),
    "Audit Log": t("nav.audit_log"),
    "Settings": t("nav.settings"),
    "My Queue": t("nav.my_queue"),
    "All Candidates": t("nav.all_candidates"),
    "Reports": t("nav.reports"),
    "My Cases": t("nav.my_cases"),
    "Trial Health": t("nav.trial_health") || "Trial Health",
    "Tenants": t("nav.tenants"),
    "Licenses": t("nav.licenses"),
    "All Cycles": t("nav.all_cycles"),
    "System Reports": t("nav.system_reports"),
    "Help Guide": t("nav.help"),
    "Waitlist": t("nav.waitlist") || "Waitlist",
    "Re-Applications": t("nav.reapplications") || "Re-Applications",
    "Prediction Accuracy": t("nav.accuracy") || "Prediction Accuracy",
    "Support Plans": t("nav.support_plans") || "Support Plans",
  };

  // Build combined nav sections for users with multiple roles
  const rolesToShow = allRoles && allRoles.length > 1
    ? ["platform_admin", "school_admin", "evaluator", "interviewer", "grade_dean", "learning_specialist"].filter((r) => allRoles.includes(r))
    : [role];

  const sections = rolesToShow.map((r) => ({
    label: ROLE_LABELS[r] ?? r,
    items: (NAV_BY_ROLE[r] ?? []).filter((item) => !item.feature || hasFeature(item.feature)),
    role: r,
  })).filter((s) => s.items.length > 0);

  // Flatten for single-role users
  const isMultiRole = sections.length > 1;

  return (
    <aside className="sidebar-mesh fixed inset-y-0 left-0 z-30 flex w-60 flex-col border-r border-[#2a2a3a]">
      {/* Logo */}
      <div className="flex flex-col items-center justify-center pt-6 pb-3">
        {branding?.logoDarkUrl || branding?.logoUrl ? (
          <Image
            src={branding.logoDarkUrl ?? branding.logoUrl!}
            alt={branding.schoolName || "School"}
            width={140}
            height={44}
            priority
            className="max-h-[44px] w-auto object-contain"
          />
        ) : (
          <Image
            src="/LIFT LOGO.jpeg"
            alt="LIFT"
            width={144}
            height={144}
            priority
            className="h-[120px] w-[120px] rounded-xl object-contain"
          />
        )}
        {(!branding?.hideLiftBranding && branding?.poweredByVisible !== false) && (
          <p className="mt-1.5 text-[10px] text-[#a0a0c0]/40">
            Powered by {brandName}
          </p>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-3">
        {sections.map((section, sIdx) => (
          <div key={section.role} className={sIdx > 0 ? "mt-4" : ""}>
            {isMultiRole && (
              <p className="mb-1.5 px-3 text-[10px] font-semibold uppercase tracking-wider text-[#a0a0c0]/60">
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
                        : "text-[#a0a0c0] hover:bg-[#2a2740] hover:text-white"
                    }`}
                  >
                    <Icon size={18} strokeWidth={active ? 2.2 : 1.8} />
                    {navT[item.label] ?? item.label}
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
                : "text-[#a0a0c0] hover:bg-[#2a2740] hover:text-white"
            }`}
          >
            <HelpCircle size={18} strokeWidth={pathname.startsWith("/help") ? 2.2 : 1.8} />
            {t("nav.help")}
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
            <p className="mt-0.5 truncate text-[11px] text-[#a0a0c0] capitalize">
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
          className="mt-2 flex w-full items-center gap-2 rounded-lg px-3 py-2 text-[13px] font-medium text-[#a0a0c0] transition-colors hover:bg-[#2a2740] hover:text-[#f43f5e]"
        >
          <LogOut size={16} />
          {t("nav.sign_out")}
        </button>
      </div>
    </aside>
  );
}
