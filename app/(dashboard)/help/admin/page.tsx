"use client";

import {
  Building2,
  CreditCard,
  BarChart2,
  Shield,
  Trash2,
  TrendingUp,
} from "lucide-react";
import {
  HelpSection,
  Steps,
  WhereToFind,
  Tip,
  Warning,
  StatExplainer,
  TableOfContents,
} from "../components/HelpUI";
import { useLocale } from "@/lib/i18n/LocaleProvider";

export default function AdminHelp() {
  const { t } = useLocale();
  const toc = [
    { id: "overview", label: "Admin Dashboard" },
    { id: "tenants", label: "Managing Tenants" },
    { id: "licenses", label: "License Management" },
    { id: "health", label: "License Health Dashboard" },
    { id: "revenue", label: "Revenue Report" },
    { id: "data-reset", label: "Data Reset & Deletion" },
    { id: "upgrade-requests", label: "Handling Upgrade Requests" },
  ];

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t("help.admin.title")}</h1>
        <p className="mt-1 text-sm text-muted">
          {t("help.admin.subtitle")}
        </p>
      </div>

      <TableOfContents items={toc} />

      {/* Overview */}
      <HelpSection id="overview" title="Admin Dashboard" icon={BarChart2} defaultOpen>
        <WhereToFind path={["Sidebar", "Platform (section)"]} />
        <p className="text-sm text-muted">
          The admin dashboard shows a business overview with key metrics:
        </p>

        <div className="space-y-2">
          <StatExplainer label="Active Schools" example="12" description="Tenants with status = 'active' (paying customers). Does not include trials." />
          <StatExplainer label="In Trial" example="8" description="Tenants currently on their 30-day trial. These are your conversion pipeline." />
          <StatExplainer label="MRR" example="$6,400" description="Monthly Recurring Revenue. Calculated as total ARR / 12 from active subscriptions." />
          <StatExplainer label="ARR" example="$76,800" description="Annual Recurring Revenue. Sum of annual fees for all active tenants by tier." />
          <StatExplainer label="Trials Expiring This Week" example="3" description="Trials ending within 7 days. These need attention — a follow-up email or call can convert them." />
          <StatExplainer label="Pending Upgrades" example="2" description="Schools that clicked 'Request Upgrade' but haven't been activated yet. Process these quickly." />
          <StatExplainer label="Past Due" example="1" description="Active subscriptions with failed payments. Stripe retries automatically, but follow up if it persists." />
        </div>

        <Tip>
          All stat cards are clickable — they link to filtered views where you can take action.
        </Tip>
      </HelpSection>

      {/* Tenants */}
      <HelpSection id="tenants" title="Managing Tenants" icon={Building2}>
        <WhereToFind path={["Sidebar", "Tenants"]} />
        <p className="text-sm text-muted">
          The Tenants page lists every school on the platform. Click a school name to see details.
        </p>

        <h3 className="text-sm font-semibold">Tenant Detail Page</h3>
        <p className="text-sm text-muted">Each tenant page shows:</p>
        <div className="space-y-1.5 text-xs text-muted">
          <p><span className="font-medium text-lift-text">Settings</span> — Language, COPPA mode, session pause, data retention, voice/accessibility toggles.</p>
          <p><span className="font-medium text-lift-text">Users</span> — All team members with roles and when they were added.</p>
          <p><span className="font-medium text-lift-text">Cycles</span> — Their admissions cycles with status and academic year.</p>
        </div>

        <h3 className="mt-4 text-sm font-semibold">Quick Actions (from tenant detail)</h3>
        <div className="space-y-1.5 text-xs text-muted">
          <p><span className="font-medium text-lift-text">Data Management</span> — Reset candidate data, manage license, or delete the tenant entirely.</p>
          <p><span className="font-medium text-lift-text">License</span> — View and edit the tenant&apos;s license, tier, billing period, and feature overrides.</p>
          <p><span className="font-medium text-lift-text">Impersonate</span> — Log in as this school&apos;s admin to troubleshoot issues.</p>
        </div>
      </HelpSection>

      {/* Licenses */}
      <HelpSection id="licenses" title="License Management" icon={CreditCard}>
        <WhereToFind path={["Sidebar", "Licenses"]} />

        <p className="text-sm text-muted">
          The Licenses page shows all tenants with their license status, tier, and usage.
        </p>

        <h3 className="text-sm font-semibold">License Detail (click any tenant)</h3>
        <p className="text-sm text-muted">The license detail page lets you:</p>
        <Steps steps={[
          "Change tier and status directly (dropdown selectors)",
          "Edit trial end date, period dates, and billing cycle",
          "Set session or seat limit overrides (blank = use tier default)",
          "Add feature overrides — grant individual features beyond the tenant's tier",
          "Write internal notes (visible only to platform admins)",
          "View and process pending upgrade requests",
          "See the complete license event history",
        ]} />

        <Tip>
          <strong>Feature overrides</strong> are powerful — you can grant a single enterprise feature to a professional tenant without changing their whole tier. Useful for demos and special deals.
        </Tip>
      </HelpSection>

      {/* Health */}
      <HelpSection id="health" title="License Health Dashboard" icon={TrendingUp}>
        <WhereToFind path={["Admin Dashboard", "License Health (link)"]} />

        <p className="text-sm text-muted">
          The health dashboard gives you a visual pipeline and an attention-required list.
        </p>

        <h3 className="text-sm font-semibold">Pipeline Funnel</h3>
        <p className="text-sm text-muted">
          Shows tenant counts at each stage: Trialing → Active → Converted → Suspended → Cancelled. The conversion rate tells you what percentage of trials become paying customers.
        </p>

        <h3 className="mt-4 text-sm font-semibold">Monthly Trend</h3>
        <p className="text-sm text-muted">
          Bar chart showing new trials (indigo) and conversions (green) per month over the last 6 months. Helps you spot trends in your pipeline.
        </p>

        <h3 className="mt-4 text-sm font-semibold">Attention Required</h3>
        <p className="text-sm text-muted">
          Sorted by urgency. Color-coded:
        </p>
        <div className="space-y-1 text-xs text-muted">
          <p><span className="inline-block w-3 h-3 rounded bg-review/20 mr-1" /> <strong>Red</strong> — Trials expiring in 7 days or less, past due accounts</p>
          <p><span className="inline-block w-3 h-3 rounded bg-warning/20 mr-1" /> <strong>Amber</strong> — Trials expiring in 8-14 days, session limit &gt;80%</p>
          <p><span className="inline-block w-3 h-3 rounded bg-primary/20 mr-1" /> <strong>Indigo</strong> — Pending upgrade requests</p>
        </div>
      </HelpSection>

      {/* Revenue */}
      <HelpSection id="revenue" title="Revenue Report" icon={BarChart2}>
        <WhereToFind path={["Admin Dashboard", "Revenue Report (link)"]} />

        <div className="space-y-2">
          <StatExplainer label="Total ARR" example="$76,800" description="Sum of annual fees for all active subscriptions." />
          <StatExplainer label="MRR" example="$6,400" description="ARR divided by 12. The monthly equivalent of your recurring revenue." />
          <StatExplainer label="ARR by Tier" example="Table" description="Breakdown showing: how many schools per tier × annual fee = tier ARR. Totals at bottom." />
          <StatExplainer label="Trial Pipeline" example="$38,400 estimated" description="Estimated value if all current trial schools convert at their expected tier (based on their estimated applicant count from registration)." />
        </div>
      </HelpSection>

      {/* Data Reset */}
      <HelpSection id="data-reset" title="Data Reset & Deletion" icon={Trash2}>
        <WhereToFind path={["Tenants", "[School Name]", "Data Management"]} />

        <Warning>
          All data reset and deletion actions are <strong>irreversible</strong>. They require typing the school name to confirm.
        </Warning>

        <h3 className="text-sm font-semibold">Available Actions</h3>

        <div className="space-y-3">
          <div className="rounded-lg border border-lift-border p-3">
            <p className="text-sm font-medium">Reset to Trial</p>
            <p className="text-xs text-muted">Resets the license back to a 30-day trial. Data is NOT deleted. Good for giving a school a fresh start.</p>
          </div>
          <div className="rounded-lg border border-lift-border p-3">
            <p className="text-sm font-medium">Extend Trial</p>
            <p className="text-xs text-muted">Adds more days to an existing trial. Use when a school needs more time to evaluate.</p>
          </div>
          <div className="rounded-lg border border-lift-border p-3">
            <p className="text-sm font-medium">Activate Subscription</p>
            <p className="text-xs text-muted">Manually activate a school on any tier for 1 year. Use for schools paying by invoice instead of Stripe.</p>
          </div>
          <div className="rounded-lg border border-lift-border p-3">
            <p className="text-sm font-medium">Suspend Account</p>
            <p className="text-xs text-muted">Immediately blocks access. Data is retained. The school sees the suspension page when they log in.</p>
          </div>
          <div className="rounded-lg border border-warning/30 p-3">
            <p className="text-sm font-medium text-warning">Reset All Candidate Data</p>
            <p className="text-xs text-muted">Deletes ALL candidates, sessions, reports, reviews, cycles, and AI data. Preserves the tenant account, users, and license. Useful for cleaning up test data.</p>
          </div>
          <div className="rounded-lg border border-review/30 p-3">
            <p className="text-sm font-medium text-review">Delete School Entirely</p>
            <p className="text-xs text-muted">Cascading delete of everything: tenant, users, data, license. Cannot be undone. Cannot delete your own tenant.</p>
          </div>
        </div>
      </HelpSection>

      {/* Upgrade Requests */}
      <HelpSection id="upgrade-requests" title="Handling Upgrade Requests" icon={Shield}>
        <p className="text-sm text-muted">
          When a school clicks &quot;Request Upgrade&quot; on their subscription page, it creates a request that appears in two places:
        </p>

        <Steps steps={[
          "You receive an email notification at lift@inteliflowai.com with all request details.",
          "The request appears on the tenant's License Detail page under \"Pending Upgrade Requests\".",
          "Review the request — check the school's current usage, tier, and billing preference.",
          "Click \"Activate Upgrade\" to immediately change their tier and set up the annual period.",
          "The school receives an activation email and their dashboard updates instantly.",
          "For Stripe-based upgrades: schools click \"Get [Tier]\" and pay via Stripe Checkout — this activates automatically via webhook.",
        ]} />

        <Tip>
          Schools that pay via Stripe are activated automatically — no manual action needed. Manual activation is only required for invoice-based or custom-priced deals.
        </Tip>
      </HelpSection>
    </div>
  );
}
