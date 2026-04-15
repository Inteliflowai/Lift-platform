"use client";

import Image from "next/image";
import { Check, Crown, Building2, ArrowRight } from "lucide-react";

const TIERS = [
  {
    key: "professional",
    label: "Professional",
    icon: Crown,
    color: "text-[#f59e0b]",
    gradient: "from-[#f59e0b]/10 to-[#f59e0b]/5",
    border: "border-[#f59e0b] shadow-md",
    btnClass: "bg-[#f59e0b] hover:bg-[#d97706] text-white",
    badge: "Most Popular",
    tagline: "Full platform with AI-powered insights",
    price: 12000,
    features: [
      "500 candidate sessions per year",
      "5 evaluator seats",
      "Full session engine — all grades",
      "Voice response & passage reader",
      "TRI Score & Learning Support Signals",
      "Evaluator Intelligence briefings & rubric",
      "AI-generated insight reports",
      "Support Plan Generator",
      "Outcome Tracking",
      "CSV & PDF data export",
      "CORE integration bridge",
      "FERPA-compliant data handling",
      "Email support",
    ],
  },
  {
    key: "enterprise",
    label: "Enterprise",
    icon: Building2,
    color: "text-[#10b981]",
    gradient: "from-[#10b981]/10 to-[#10b981]/5",
    border: "border-lift-border",
    btnClass: "bg-[#10b981] hover:bg-[#059669] text-white",
    tagline: "For large schools and networks",
    price: 18000,
    features: [
      "Everything in Professional, plus:",
      "Unlimited sessions & seats",
      "White label & custom branding",
      "SIS integrations",
      "Cohort Intelligence Dashboard",
      "Board-ready reporting",
      "Custom session configuration",
      "API access",
      "Cross-school benchmarking network",
      "Re-application & waitlist intelligence",
      "Dedicated Success Manager & SLA",
    ],
  },
];

export default function PricingPage() {
  return (
    <div className="relative z-10 w-full max-w-5xl px-4 py-12">
      {/* Logo */}
      <div className="mb-4 flex flex-col items-center">
        <Image
          src="/LIFT LOGO.jpeg"
          alt="LIFT"
          width={160}
          height={160}
          priority
          className="h-40 w-40 rounded-2xl object-contain"
        />
        <p className="mt-2 text-[11px] font-medium tracking-wider text-white/30 uppercase">
          by Inteliflow
        </p>
      </div>

      <h1 className="text-center font-[family-name:var(--font-display)] text-3xl font-bold text-white">
        Choose Your Plan
      </h1>
      <p className="mt-2 text-center text-sm text-white/50">
        Annual contracts. No setup fees. Cancel anytime.
      </p>

      {/* Plan Cards */}
      <div className="mt-10 grid grid-cols-1 gap-6 md:grid-cols-2 max-w-3xl mx-auto">
        {TIERS.map((t) => {
          const Icon = t.icon;
          return (
            <div
              key={t.key}
              className={`relative flex flex-col rounded-2xl border-2 bg-white p-6 transition-shadow hover:shadow-xl ${t.border}`}
            >
              {/* Badge */}
              {t.badge && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="rounded-full bg-[#f59e0b] px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-white shadow-sm">
                    {t.badge}
                  </span>
                </div>
              )}

              {/* Header */}
              <div className={`mb-3 flex items-center gap-2 ${t.color}`}>
                <div
                  className={`flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br ${t.gradient}`}
                >
                  <Icon size={18} />
                </div>
                <h2 className="text-lg font-bold text-[#1a1a2e]">
                  {t.label}
                </h2>
              </div>

              <p className="text-xs text-[#6b7280]">{t.tagline}</p>

              {/* Price */}
              <div className="mt-4 mb-5">
                {t.key === "enterprise" ? (
                  <>
                    <span className="text-2xl font-extrabold text-[#1a1a2e]">
                      Contact Us
                    </span>
                    <p className="mt-0.5 text-[10px] text-[#6b7280]">
                      Custom pricing for your school
                    </p>
                  </>
                ) : (
                  <>
                    <span className="text-3xl font-extrabold text-[#1a1a2e]">
                      $
                      {(t.price / 12).toLocaleString(undefined, {
                        maximumFractionDigits: 0,
                      })}
                    </span>
                    <span className="text-sm text-[#6b7280]">/mo</span>
                    <p className="mt-0.5 text-[10px] text-[#6b7280]">
                      ${t.price.toLocaleString()}/yr billed annually
                    </p>
                  </>
                )}
              </div>

              {/* Buy Now / Contact Us */}
              {t.key === "enterprise" ? (
                <a
                  href="mailto:lift@inteliflowai.com?subject=LIFT%20Enterprise%20Inquiry"
                  className={`mb-5 flex w-full items-center justify-center gap-1.5 rounded-lg py-2.5 text-sm font-semibold shadow-sm transition-all ${t.btnClass}`}
                >
                  Contact Us
                  <ArrowRight size={14} />
                </a>
              ) : (
                <a
                  href={`/register?plan=${t.key}`}
                  className={`mb-5 flex w-full items-center justify-center gap-1.5 rounded-lg py-2.5 text-sm font-semibold shadow-sm transition-all ${t.btnClass}`}
                >
                  Buy {t.label}
                  <ArrowRight size={14} />
                </a>
              )}

              {/* Features */}
              <ul className="flex-1 space-y-2">
                {t.features.map((f) => {
                  const isHeader = f.endsWith(":");
                  return (
                    <li
                      key={f}
                      className={`flex items-start gap-2 text-xs ${
                        isHeader
                          ? "mt-2 font-semibold text-[#6b7280]"
                          : "text-[#1a1a2e]"
                      }`}
                    >
                      {!isHeader && (
                        <Check
                          size={13}
                          className={`mt-0.5 shrink-0 ${t.color}`}
                        />
                      )}
                      {f}
                    </li>
                  );
                })}
              </ul>

              {/* Bottom CTA */}
              {t.key === "enterprise" ? (
                <a
                  href="mailto:lift@inteliflowai.com?subject=LIFT%20Enterprise%20Inquiry"
                  className={`mt-5 flex w-full items-center justify-center gap-1.5 rounded-lg py-2.5 text-sm font-semibold shadow-sm transition-all ${t.btnClass}`}
                >
                  Contact Us
                  <ArrowRight size={14} />
                </a>
              ) : (
                <a
                  href={`/register?plan=${t.key}`}
                  className={`mt-5 flex w-full items-center justify-center gap-1.5 rounded-lg py-2.5 text-sm font-semibold shadow-sm transition-all ${t.btnClass}`}
                >
                  Buy {t.label}
                  <ArrowRight size={14} />
                </a>
              )}
            </div>
          );
        })}
      </div>

      {/* Trial CTA */}
      <div className="mt-10 text-center">
        <p className="text-sm text-white/60">
          Not ready to commit?{" "}
          <a
            href="/register"
            className="font-semibold text-[#6366f1] hover:underline"
          >
            Start a free 30-day trial
          </a>{" "}
          with all features included.
        </p>
      </div>

      {/* Contact */}
      <div className="mt-6 text-center">
        <p className="text-xs text-white/30">
          Questions?{" "}
          <a
            href="mailto:lift@inteliflowai.com"
            className="text-white/50 hover:underline"
          >
            lift@inteliflowai.com
          </a>
        </p>
      </div>

      <p className="mt-8 text-center text-[10px] text-white/25">
        Powered by Inteliflow
      </p>
    </div>
  );
}
