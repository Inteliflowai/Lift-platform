"use client";

import {
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { usePostHog } from "posthog-js/react";
import { createClient } from "@/lib/supabase/client";

/* ════════════════════════════════════════════════════════════
   /admissions — paid-traffic landing page
   Single-CTA conversion surface for LinkedIn campaigns.
   Visual continuity with /lift (teal-forward dark theme).
   ════════════════════════════════════════════════════════════ */

const BRAND = {
  bg: "#0a1419",
  bg2: "#0d1f24",
  bg3: "#122a30",
  text: "#ecfdf5",
  muted: "#99f6e4",
  white: "#ffffff",
  line: "rgba(255,255,255,0.12)",
  card: "rgba(255,255,255,0.06)",
  cardStrong: "rgba(255,255,255,0.10)",
  teal: "#14b8a6",
  tealLight: "#2dd4bf",
  tealSoft: "#5eead4",
  emerald: "#34d399",
  amber: "#f59e0b",
  rose: "#f87171",
};

const ROLES = [
  "Director of Admissions",
  "Dean of Admissions",
  "Director of Enrollment",
  "Head of School",
  "Admissions Officer",
  "Other",
];

const FAQS = [
  {
    q: "How long is the free trial?",
    a: "30 days from signup. Full access to every Enterprise feature. No credit card required.",
  },
  {
    q: "What happens after the trial ends?",
    a: "Your trial deactivates and your data is securely deleted. To continue, you can subscribe to a Professional or Enterprise plan, or apply for our Fall 2026 Founding Schools Cohort — a select group of 15 schools getting Founding Schools pricing for the first year.",
  },
  {
    q: "Do I need to evaluate many candidates, or can I just try one?",
    a: "Start with one. The fastest way to understand LIFT is to send a real candidate (or a current student) the assessment link and review their report. Many trial users only run 2–3 candidates during the 30 days — that's enough to see whether LIFT fits your process.",
  },
  {
    q: "Is LIFT a replacement for our current admissions system (Ravenna, Blackbaud, etc.)?",
    a: "No. LIFT sits alongside whatever admissions management system you use. It captures the cognitive and behavioral signals that traditional applications can't show — then your team uses those insights inside your existing decision process.",
  },
];

type UTMs = {
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_content?: string;
  utm_term?: string;
};

const UTM_KEYS = [
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_content",
  "utm_term",
] as const;

function readUtmsFromParams(
  searchParams: URLSearchParams | null,
): UTMs {
  if (!searchParams) return {};
  const out: UTMs = {};
  for (const k of UTM_KEYS) {
    const v = searchParams.get(k);
    if (v) (out as Record<string, string>)[k] = v;
  }
  return out;
}

function loadUtms(searchParams: URLSearchParams | null): UTMs {
  const fromUrl = readUtmsFromParams(searchParams);
  if (Object.keys(fromUrl).length > 0) {
    try {
      sessionStorage.setItem("utm_data", JSON.stringify(fromUrl));
    } catch {
      /* sessionStorage may be unavailable (incognito quotas, SSR) */
    }
    return fromUrl;
  }
  try {
    const stored = sessionStorage.getItem("utm_data");
    if (stored) return JSON.parse(stored) as UTMs;
  } catch {
    /* ignore */
  }
  return {};
}

/* ─── Inline page styles (matches /lift approach for visual continuity) ─── */

function usePageStyles() {
  useEffect(() => {
    const id = "admissions-page-styles";
    if (document.getElementById(id)) return;
    const style = document.createElement("style");
    style.id = id;
    style.textContent = `
      html, body {
        margin: 0;
        padding: 0;
        overflow-x: hidden;
        background: ${BRAND.bg};
      }
      .adm-app {
        font-family: 'DM Sans', -apple-system, BlinkMacSystemFont, sans-serif;
        color: ${BRAND.text};
        line-height: 1.6;
        min-height: 100vh;
        -webkit-font-smoothing: antialiased;
        position: relative;
        overflow-x: hidden;
      }
      .adm-app *, .adm-app *::before, .adm-app *::after { box-sizing: border-box; }
      .adm-app h1, .adm-app h2, .adm-app h3 {
        font-family: 'Plus Jakarta Sans', sans-serif;
        line-height: 1.08;
        margin: 0;
        letter-spacing: -0.5px;
      }
      .adm-app p { margin: 0; }
      .adm-app a { color: inherit; text-decoration: none; }
      .adm-app img { max-width: 100%; height: auto; }
      .adm-app select option { color: #1a1a2e; background: #fff; }

      @keyframes adm-pulse {
        0%, 100% { opacity: 0.5; transform: scale(1); }
        50% { opacity: 0.85; transform: scale(1.05); }
      }
      @keyframes adm-fadeUp {
        from { opacity: 0; transform: translateY(20px); }
        to { opacity: 1; transform: translateY(0); }
      }
      .adm-fade { animation: adm-fadeUp 0.6s ease both; }

      .adm-input {
        width: 100%;
        padding: 13px 14px;
        background: rgba(255,255,255,0.04);
        border: 1px solid ${BRAND.line};
        border-radius: 10px;
        color: ${BRAND.white};
        font-size: 15px;
        font-family: 'DM Sans', sans-serif;
        outline: none;
        transition: border-color 0.15s ease, box-shadow 0.15s ease, background 0.15s ease;
      }
      .adm-input::placeholder { color: rgba(236,253,245,0.35); }
      .adm-input:focus {
        border-color: ${BRAND.tealLight};
        background: rgba(255,255,255,0.06);
        box-shadow: 0 0 0 3px rgba(20,184,166,0.18);
      }
      .adm-label {
        display: block;
        font-size: 12px;
        font-weight: 600;
        letter-spacing: 0.4px;
        color: ${BRAND.muted};
        margin-bottom: 6px;
        text-transform: uppercase;
      }
      .adm-cta {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        padding: 16px 32px;
        background: linear-gradient(135deg, ${BRAND.teal}, ${BRAND.tealLight});
        color: ${BRAND.white};
        font-weight: 700;
        font-size: 16px;
        border: none;
        border-radius: 12px;
        cursor: pointer;
        font-family: 'DM Sans', sans-serif;
        letter-spacing: 0.2px;
        transition: transform 0.15s ease, box-shadow 0.15s ease, opacity 0.15s ease;
        box-shadow: 0 12px 32px rgba(20,184,166,0.30);
        width: 100%;
      }
      .adm-cta:hover { transform: translateY(-1px); box-shadow: 0 16px 40px rgba(20,184,166,0.42); }
      .adm-cta:disabled { opacity: 0.55; cursor: not-allowed; transform: none; }

      .adm-section { padding: 88px 24px; }
      .adm-container { max-width: 1180px; margin: 0 auto; }
      .adm-narrow { max-width: 760px; margin: 0 auto; }

      .adm-faq-item {
        border-bottom: 1px solid ${BRAND.line};
      }
      .adm-faq-q {
        padding: 22px 0;
        font-family: 'Plus Jakarta Sans', sans-serif;
        font-size: 18px;
        font-weight: 600;
        color: ${BRAND.white};
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 16px;
        background: none;
        border: none;
        width: 100%;
        text-align: left;
        font-family: inherit;
      }
      .adm-faq-a {
        padding: 0 0 22px 0;
        color: ${BRAND.text};
        opacity: 0.75;
        font-size: 15.5px;
        line-height: 1.65;
      }

      @media (max-width: 1024px) {
        .adm-hero-grid { grid-template-columns: 1fr !important; gap: 40px !important; }
        .adm-credibility-grid { grid-template-columns: 1fr !important; }
        .adm-bullets { grid-template-columns: 1fr !important; }
        .adm-hero-image { max-width: 380px !important; margin: 0 auto !important; }
      }
      @media (max-width: 720px) {
        .adm-section { padding: 56px 18px; }
        .adm-app h1 { font-size: 38px !important; }
        .adm-app h2 { font-size: 26px !important; }
        .adm-form-row-2 { grid-template-columns: 1fr !important; }
      }
      @media (max-width: 380px) {
        .adm-app h1 { font-size: 32px !important; }
      }
    `;
    document.head.appendChild(style);
    return () => {
      const el = document.getElementById(id);
      if (el) el.remove();
    };
  }, []);
}

/* ─── Page ─── */

function AdmissionsPageInner() {
  usePageStyles();
  const router = useRouter();
  const searchParams = useSearchParams();
  const posthog = usePostHog();

  const [utms, setUtms] = useState<UTMs>({});
  useEffect(() => {
    setUtms(loadUtms(searchParams));
  }, [searchParams]);

  /* Form state */
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    schoolName: "",
    role: "",
    password: "",
    confirmPassword: "",
  });
  const [agreed, setAgreed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const focusFiredRef = useRef(false);

  const formRef = useRef<HTMLDivElement | null>(null);

  /* PostHog: identify UTMs as person properties once */
  useEffect(() => {
    if (!posthog || Object.keys(utms).length === 0) return;
    try {
      posthog.register(utms as Record<string, string>);
    } catch {
      /* posthog may not be initialized on first render */
    }
  }, [posthog, utms]);

  const update = useCallback((field: keyof typeof form, value: string) => {
    setForm((f) => ({ ...f, [field]: value }));
  }, []);

  const handleFieldFocus = useCallback(() => {
    if (focusFiredRef.current) return;
    focusFiredRef.current = true;
    try {
      posthog?.capture("admissions_form_started", utms as Record<string, string>);
    } catch {
      /* ignore */
    }
  }, [posthog, utms]);

  const validate = useCallback((): string | null => {
    if (!form.firstName.trim()) return "First name is required.";
    if (!form.lastName.trim()) return "Last name is required.";
    if (!form.email.trim()) return "Work email is required.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
      return "Please enter a valid email address.";
    if (!form.schoolName.trim()) return "School name is required.";
    if (!form.role) return "Please select your role.";
    if (form.password.length < 8)
      return "Password must be at least 8 characters.";
    if (form.password !== form.confirmPassword)
      return "Passwords don't match.";
    if (!agreed) return "Please agree to the Terms and Privacy Policy.";
    return null;
  }, [form, agreed]);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setError(null);
      const v = validate();
      if (v) {
        setError(v);
        return;
      }
      setSubmitting(true);

      const fullName = `${form.firstName.trim()} ${form.lastName.trim()}`.trim();

      try {
        const res = await fetch("/api/auth/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            schoolName: form.schoolName.trim(),
            schoolType: "Other",
            fullName,
            title: form.role,
            email: form.email.trim(),
            password: form.password,
            confirmPassword: form.confirmPassword,
            estimatedApplicants: "",
            country: "United States",
            ...utms,
          }),
        });

        const data = await res.json().catch(() => ({}));

        if (!res.ok) {
          setError(
            data?.error ??
              "We couldn't create your trial. Please try again, or email lift@inteliflowai.com.",
          );
          setSubmitting(false);
          return;
        }

        try {
          posthog?.capture("admissions_form_submitted", {
            ...(utms as Record<string, string>),
            role: form.role,
          });
        } catch {
          /* ignore */
        }

        const supabase = createClient();
        const { error: signInErr } = await supabase.auth.signInWithPassword({
          email: form.email.trim(),
          password: form.password,
        });

        if (signInErr) {
          router.push(
            `/login?redirect=${encodeURIComponent("/school/welcome")}`,
          );
          return;
        }

        router.push("/school/welcome");
        router.refresh();
      } catch {
        setError(
          "Something went wrong. Please try again, or email lift@inteliflowai.com.",
        );
        setSubmitting(false);
      }
    },
    [form, utms, validate, posthog, router],
  );

  const scrollToForm = useCallback(() => {
    try {
      posthog?.capture(
        "admissions_final_cta_clicked",
        utms as Record<string, string>,
      );
    } catch {
      /* ignore */
    }
    formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [posthog, utms]);

  const toggleFaq = useCallback(
    (idx: number) => {
      setOpenFaq((cur) => {
        const next = cur === idx ? null : idx;
        if (next !== null) {
          try {
            posthog?.capture("admissions_faq_opened", {
              question_index: idx,
              ...(utms as Record<string, string>),
            });
          } catch {
            /* ignore */
          }
        }
        return next;
      });
    },
    [posthog, utms],
  );

  const heroBgStyle = useMemo<CSSProperties>(
    () => ({
      position: "absolute",
      inset: 0,
      background: `radial-gradient(ellipse at 70% 20%, rgba(20,184,166,0.18), transparent 55%), radial-gradient(ellipse at 10% 80%, rgba(45,212,191,0.10), transparent 60%)`,
      pointerEvents: "none",
      zIndex: 0,
    }),
    [],
  );

  return (
    <div className="adm-app" style={{ background: BRAND.bg }}>
      {/* Minimal header — logo only, no nav */}
      <header
        style={{
          padding: "20px 24px",
          borderBottom: `1px solid ${BRAND.line}`,
          background: "rgba(10,20,25,0.72)",
          backdropFilter: "blur(18px)",
          position: "sticky",
          top: 0,
          zIndex: 50,
        }}
      >
        <div
          className="adm-container"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <a
            href="/lift"
            aria-label="LIFT home"
            style={{ display: "inline-flex", alignItems: "center", gap: 10 }}
          >
            <Image
              src="/marketing/lift-logo.png"
              alt="LIFT"
              width={120}
              height={40}
              priority
              style={{ height: 38, width: "auto", objectFit: "contain" }}
            />
          </a>
          <a
            href="#trial-form"
            onClick={(e) => {
              e.preventDefault();
              scrollToForm();
            }}
            style={{
              fontSize: 13,
              fontWeight: 600,
              color: BRAND.tealSoft,
              letterSpacing: 0.3,
            }}
          >
            Start free trial →
          </a>
        </div>
      </header>

      {/* SECTION 1 — Hero */}
      <section
        className="adm-section"
        style={{
          background: BRAND.bg,
          position: "relative",
          paddingTop: 72,
          paddingBottom: 96,
          overflow: "hidden",
        }}
      >
        <div style={heroBgStyle} />
        <div
          className="adm-container adm-fade"
          style={{ position: "relative", zIndex: 1 }}
        >
          <div
            className="adm-hero-grid"
            style={{
              display: "grid",
              gridTemplateColumns: "1.15fr 1fr",
              gap: 64,
              alignItems: "center",
            }}
          >
            <div>
              <span
                style={{
                  display: "inline-block",
                  padding: "6px 14px",
                  fontSize: 12,
                  fontWeight: 700,
                  letterSpacing: 1.4,
                  textTransform: "uppercase",
                  color: BRAND.tealSoft,
                  background: "rgba(20,184,166,0.12)",
                  border: `1px solid rgba(20,184,166,0.30)`,
                  borderRadius: 999,
                  marginBottom: 22,
                }}
              >
                Admissions Intelligence Platform
              </span>
              <h1
                style={{
                  fontSize: "clamp(40px, 5vw, 64px)",
                  fontWeight: 800,
                  color: BRAND.white,
                  marginBottom: 22,
                }}
              >
                30 years in classrooms.
                <br />
                <span
                  style={{
                    background: `linear-gradient(135deg, ${BRAND.teal}, ${BRAND.tealLight})`,
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                    backgroundClip: "text",
                  }}
                >
                  Then we built LIFT.
                </span>
              </h1>
              <p
                style={{
                  fontSize: 19,
                  lineHeight: 1.55,
                  color: BRAND.text,
                  opacity: 0.82,
                  marginBottom: 32,
                  maxWidth: 540,
                }}
              >
                LIFT helps independent, boarding, and therapeutic schools see
                how candidates actually think — before the admit decision.
              </p>
              <div style={{ maxWidth: 380 }}>
                <button
                  type="button"
                  onClick={scrollToForm}
                  className="adm-cta"
                  aria-label="Scroll to free trial signup"
                >
                  Start Your Free 30-Day Trial
                </button>
                <p
                  style={{
                    marginTop: 14,
                    fontSize: 13.5,
                    color: BRAND.muted,
                    opacity: 0.85,
                  }}
                >
                  No credit card. Full Enterprise features. 30 days, all yours.
                </p>
              </div>
            </div>
            <div
              className="adm-hero-image"
              style={{ position: "relative", maxWidth: 480, marginLeft: "auto" }}
            >
              <div
                style={{
                  position: "absolute",
                  inset: -22,
                  background: `radial-gradient(circle at 50% 50%, rgba(20,184,166,0.25), transparent 65%)`,
                  filter: "blur(28px)",
                  zIndex: 0,
                  animation: "adm-pulse 6s ease-in-out infinite",
                }}
              />
              <div
                style={{
                  position: "relative",
                  zIndex: 1,
                  borderRadius: 22,
                  overflow: "hidden",
                  border: `1px solid ${BRAND.line}`,
                  boxShadow: "0 30px 80px rgba(0,0,0,0.45)",
                  aspectRatio: "4 / 5",
                  background: BRAND.bg2,
                }}
              >
                <Image
                  src="/Barb%20(4).png"
                  alt="Barbara Leventhal, co-founder of Inteliflow"
                  fill
                  priority
                  sizes="(max-width: 1024px) 380px, 480px"
                  style={{ objectFit: "cover", objectPosition: "center top" }}
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 2 — Pain point */}
      <section
        className="adm-section"
        style={{ background: BRAND.bg2, paddingTop: 72, paddingBottom: 72 }}
      >
        <div className="adm-narrow" style={{ textAlign: "center" }}>
          <h2
            style={{
              fontSize: "clamp(28px, 3.4vw, 38px)",
              color: BRAND.white,
              marginBottom: 18,
            }}
          >
            The application you read isn&rsquo;t always written by the student.
          </h2>
          <p
            style={{
              fontSize: 17.5,
              color: BRAND.text,
              opacity: 0.78,
              lineHeight: 1.65,
            }}
          >
            Polished essays. Coached interviews. Test scores measuring what
            students have done — not how they think. By the time you admit a
            candidate, you know how their parents write. LIFT shows you the
            rest.
          </p>
        </div>
      </section>

      {/* SECTION 3 — What LIFT reveals */}
      <section
        className="adm-section"
        style={{ background: BRAND.bg, paddingTop: 88 }}
      >
        <div className="adm-container">
          <h2
            style={{
              textAlign: "center",
              fontSize: "clamp(28px, 3.4vw, 38px)",
              color: BRAND.white,
              marginBottom: 56,
            }}
          >
            What LIFT reveals that applications can&rsquo;t
          </h2>
          <div
            className="adm-bullets"
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, 1fr)",
              gap: 28,
            }}
          >
            {[
              {
                badge: "01",
                title: "How a candidate actually thinks",
                body: "7 readiness dimensions across reasoning, expression, persistence, and metacognition.",
              },
              {
                badge: "02",
                title: "How they handle pressure",
                body: "40+ behavioral signals captured during a 45–75 minute candidate session.",
              },
              {
                badge: "03",
                title: "How to act on it",
                body: "Plain-language reports your team can use in admit decisions and onboarding.",
              },
            ].map((b) => (
              <div
                key={b.badge}
                style={{
                  background: BRAND.card,
                  border: `1px solid ${BRAND.line}`,
                  borderRadius: 16,
                  padding: 30,
                  backdropFilter: "blur(18px)",
                }}
              >
                <div
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 10,
                    background: `linear-gradient(135deg, ${BRAND.teal}, ${BRAND.tealLight})`,
                    color: BRAND.white,
                    fontWeight: 800,
                    fontSize: 15,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    marginBottom: 18,
                    fontFamily: "'Plus Jakarta Sans', sans-serif",
                  }}
                >
                  {b.badge}
                </div>
                <h3
                  style={{
                    fontSize: 19,
                    color: BRAND.white,
                    marginBottom: 10,
                    fontWeight: 700,
                  }}
                >
                  {b.title}
                </h3>
                <p
                  style={{
                    fontSize: 15,
                    color: BRAND.text,
                    opacity: 0.72,
                    lineHeight: 1.6,
                  }}
                >
                  {b.body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SECTION 4 — Trial form */}
      <section
        id="trial-form"
        ref={formRef}
        className="adm-section"
        style={{
          background: BRAND.bg2,
          paddingTop: 88,
          paddingBottom: 96,
          scrollMarginTop: 80,
        }}
      >
        <div className="adm-narrow">
          <div style={{ textAlign: "center", marginBottom: 38 }}>
            <h2
              style={{
                fontSize: "clamp(28px, 3.4vw, 40px)",
                color: BRAND.white,
                marginBottom: 14,
              }}
            >
              Start your 30-day free trial
            </h2>
            <p
              style={{
                fontSize: 17,
                color: BRAND.text,
                opacity: 0.78,
              }}
            >
              Full access. No credit card. Run one real candidate through LIFT
              this week.
            </p>
          </div>

          <form
            onSubmit={handleSubmit}
            style={{
              background: BRAND.card,
              border: `1px solid ${BRAND.line}`,
              borderRadius: 18,
              padding: 32,
              backdropFilter: "blur(20px)",
              boxShadow: "0 24px 60px rgba(0,0,0,0.35)",
            }}
            noValidate
          >
            <div
              className="adm-form-row-2"
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 14,
                marginBottom: 14,
              }}
            >
              <div>
                <label htmlFor="firstName" className="adm-label">
                  First name
                </label>
                <input
                  id="firstName"
                  className="adm-input"
                  type="text"
                  autoComplete="given-name"
                  value={form.firstName}
                  onFocus={handleFieldFocus}
                  onChange={(e) => update("firstName", e.target.value)}
                  required
                />
              </div>
              <div>
                <label htmlFor="lastName" className="adm-label">
                  Last name
                </label>
                <input
                  id="lastName"
                  className="adm-input"
                  type="text"
                  autoComplete="family-name"
                  value={form.lastName}
                  onFocus={handleFieldFocus}
                  onChange={(e) => update("lastName", e.target.value)}
                  required
                />
              </div>
            </div>

            <div style={{ marginBottom: 14 }}>
              <label htmlFor="email" className="adm-label">
                Work email
              </label>
              <input
                id="email"
                className="adm-input"
                type="email"
                autoComplete="email"
                value={form.email}
                onFocus={handleFieldFocus}
                onChange={(e) => update("email", e.target.value)}
                required
              />
            </div>

            <div style={{ marginBottom: 14 }}>
              <label htmlFor="schoolName" className="adm-label">
                School name
              </label>
              <input
                id="schoolName"
                className="adm-input"
                type="text"
                autoComplete="organization"
                value={form.schoolName}
                onFocus={handleFieldFocus}
                onChange={(e) => update("schoolName", e.target.value)}
                required
              />
            </div>

            <div style={{ marginBottom: 14 }}>
              <label htmlFor="role" className="adm-label">
                Your role
              </label>
              <select
                id="role"
                className="adm-input"
                value={form.role}
                onFocus={handleFieldFocus}
                onChange={(e) => update("role", e.target.value)}
                required
                style={{ appearance: "none" }}
              >
                <option value="" disabled>
                  Select your role…
                </option>
                {ROLES.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>

            <div
              className="adm-form-row-2"
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 14,
                marginBottom: 14,
              }}
            >
              <div>
                <label htmlFor="password" className="adm-label">
                  Set a password
                </label>
                <input
                  id="password"
                  className="adm-input"
                  type="password"
                  autoComplete="new-password"
                  minLength={8}
                  value={form.password}
                  onFocus={handleFieldFocus}
                  onChange={(e) => update("password", e.target.value)}
                  required
                />
              </div>
              <div>
                <label htmlFor="confirmPassword" className="adm-label">
                  Confirm password
                </label>
                <input
                  id="confirmPassword"
                  className="adm-input"
                  type="password"
                  autoComplete="new-password"
                  value={form.confirmPassword}
                  onFocus={handleFieldFocus}
                  onChange={(e) => update("confirmPassword", e.target.value)}
                  required
                />
              </div>
            </div>

            <label
              style={{
                display: "flex",
                gap: 10,
                alignItems: "flex-start",
                marginTop: 8,
                marginBottom: 18,
                cursor: "pointer",
                fontSize: 13,
                color: BRAND.text,
                opacity: 0.72,
                lineHeight: 1.55,
              }}
            >
              <input
                type="checkbox"
                checked={agreed}
                onChange={(e) => setAgreed(e.target.checked)}
                style={{ marginTop: 3, accentColor: BRAND.teal }}
              />
              <span>
                I agree to the LIFT{" "}
                <a
                  href="/legal/terms"
                  target="_blank"
                  rel="noreferrer"
                  style={{ color: BRAND.tealSoft, textDecoration: "underline" }}
                >
                  Terms of Service
                </a>{" "}
                and{" "}
                <a
                  href="/legal/privacy"
                  target="_blank"
                  rel="noreferrer"
                  style={{ color: BRAND.tealSoft, textDecoration: "underline" }}
                >
                  Privacy Policy
                </a>
                .
              </span>
            </label>

            {error && (
              <div
                role="alert"
                style={{
                  background: "rgba(248,113,113,0.10)",
                  border: `1px solid rgba(248,113,113,0.32)`,
                  color: BRAND.rose,
                  borderRadius: 10,
                  padding: "11px 14px",
                  fontSize: 14,
                  marginBottom: 14,
                }}
              >
                {error}
              </div>
            )}

            <button
              type="submit"
              className="adm-cta"
              disabled={submitting}
              aria-busy={submitting}
            >
              {submitting ? "Creating your trial…" : "Start Free Trial"}
            </button>

            <p
              style={{
                marginTop: 14,
                fontSize: 12.5,
                textAlign: "center",
                color: BRAND.muted,
                opacity: 0.7,
              }}
            >
              We won&rsquo;t share your information. Unsubscribe anytime.
            </p>
          </form>
        </div>
      </section>

      {/* SECTION 5 — Credibility */}
      <section
        className="adm-section"
        style={{ background: BRAND.bg, paddingTop: 88, paddingBottom: 88 }}
      >
        <div className="adm-container">
          <div
            className="adm-credibility-grid"
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1.4fr",
              gap: 56,
              alignItems: "center",
            }}
          >
            <div
              style={{
                position: "relative",
                borderRadius: 18,
                overflow: "hidden",
                border: `1px solid ${BRAND.line}`,
                aspectRatio: "1 / 1.15",
                maxWidth: 380,
                margin: "0 auto",
                background: BRAND.bg2,
              }}
            >
              <Image
                src="/Barb%20(4).png"
                alt="Barbara Leventhal, co-founder of Inteliflow"
                fill
                sizes="(max-width: 1024px) 320px, 380px"
                style={{ objectFit: "cover", objectPosition: "center top" }}
              />
            </div>
            <div>
              <h2
                style={{
                  fontSize: "clamp(28px, 3.4vw, 40px)",
                  color: BRAND.white,
                  marginBottom: 22,
                }}
              >
                Built by an educator. Not a software company.
              </h2>
              <p
                style={{
                  fontSize: 17,
                  color: BRAND.text,
                  opacity: 0.82,
                  lineHeight: 1.7,
                }}
              >
                Barbara Leventhal spent 30 years in classrooms across three
                countries before co-founding Inteliflow. She designed every
                readiness dimension, every behavioral signal, every scaffold in
                LIFT — based on what actually predicts student success in
                independent, boarding, and therapeutic environments. The
                technology is powered by AI. The pedagogy is powered by
                experience.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 6 — FAQ */}
      <section
        className="adm-section"
        style={{ background: BRAND.bg2, paddingTop: 88, paddingBottom: 96 }}
      >
        <div className="adm-narrow">
          <h2
            style={{
              textAlign: "center",
              fontSize: "clamp(28px, 3.4vw, 38px)",
              color: BRAND.white,
              marginBottom: 36,
            }}
          >
            Frequently asked
          </h2>
          <div>
            {FAQS.map((f, idx) => {
              const open = openFaq === idx;
              return (
                <div key={f.q} className="adm-faq-item">
                  <button
                    className="adm-faq-q"
                    onClick={() => toggleFaq(idx)}
                    aria-expanded={open}
                    aria-controls={`adm-faq-a-${idx}`}
                    type="button"
                  >
                    <span>{f.q}</span>
                    <span
                      aria-hidden
                      style={{
                        color: BRAND.tealSoft,
                        fontSize: 22,
                        transform: open ? "rotate(45deg)" : "rotate(0)",
                        transition: "transform 0.2s ease",
                        lineHeight: 1,
                      }}
                    >
                      +
                    </span>
                  </button>
                  {open && (
                    <div id={`adm-faq-a-${idx}`} className="adm-faq-a">
                      {f.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* SECTION 7 — Final CTA */}
      <section
        className="adm-section"
        style={{
          background: `linear-gradient(180deg, ${BRAND.bg2} 0%, ${BRAND.bg3} 100%)`,
          paddingTop: 88,
          paddingBottom: 96,
          textAlign: "center",
        }}
      >
        <div className="adm-narrow">
          <h2
            style={{
              fontSize: "clamp(30px, 3.6vw, 42px)",
              color: BRAND.white,
              marginBottom: 14,
            }}
          >
            See LIFT with one of your real candidates.
          </h2>
          <p
            style={{
              fontSize: 17,
              color: BRAND.text,
              opacity: 0.82,
              marginBottom: 32,
            }}
          >
            30 days, all features, no credit card.
          </p>
          <div style={{ maxWidth: 320, margin: "0 auto" }}>
            <button
              type="button"
              className="adm-cta"
              onClick={scrollToForm}
              aria-label="Jump to trial form"
            >
              Start Free Trial
            </button>
          </div>
        </div>
      </section>

      {/* Minimal footer */}
      <footer
        style={{
          padding: "28px 24px",
          background: BRAND.bg,
          borderTop: `1px solid ${BRAND.line}`,
          fontSize: 13,
          color: BRAND.text,
          opacity: 0.6,
        }}
      >
        <div
          className="adm-container"
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 18,
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <span>
            © {new Date().getFullYear()} Inteliflow AI. All rights reserved.
          </span>
          <span style={{ display: "flex", gap: 18, flexWrap: "wrap" }}>
            <a
              href="/legal/privacy"
              style={{ color: BRAND.tealSoft, textDecoration: "none" }}
            >
              Privacy
            </a>
            <a
              href="/legal/terms"
              style={{ color: BRAND.tealSoft, textDecoration: "none" }}
            >
              Terms
            </a>
            <a
              href="mailto:lift@inteliflowai.com"
              style={{ color: BRAND.tealSoft, textDecoration: "none" }}
            >
              lift@inteliflowai.com
            </a>
          </span>
        </div>
      </footer>
    </div>
  );
}

export default function AdmissionsPage() {
  return (
    <Suspense fallback={null}>
      <AdmissionsPageInner />
    </Suspense>
  );
}
