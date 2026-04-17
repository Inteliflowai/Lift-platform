import React, { useState, useEffect } from "react";

/* ════════════════════════════════════════════════════════════
   LIFT Marketing Landing Page
   Standalone React component for ReactPress / WordPress
   ════════════════════════════════════════════════════════════ */

const ASSET_BASE = "/wp-content/reactpress/apps/lift-admissions";
const IMG = (file) => `${ASSET_BASE}/images/${encodeURIComponent(file)}`;

const PUB = (file) => process.env.PUBLIC_URL + "/" + file;

const IMAGES = {
  liftLogo: PUB("lift-logo.png"),
  inteliflowLogo: PUB("Inteliflow-Logo-Fixed -300dpi.jpg"),
  inteliflowFooterLogo: PUB("Inteliflow-Logo-Fixed -300dpi.jpg"),
  barbaraImg: PUB("Barbara-1.png"),
  marvinImg: PUB("Marvin.jpeg"),
  ferpaLogo: PUB("FERPA.webp"),
  coppaLogo: PUB("coppa.webp"),
  gdprLogo: PUB("gdpr.webp"),
  heroImage1: PUB("Hero-1.jpg"),
  heroImage2: PUB("Hero-2.jpg"),
};

const BRAND = {
  // LIFT brand — teal-forward, deep dark base (matches logo)
  bg: "#0a1419",
  bg2: "#0d1f24",
  bg3: "#122a30",
  white: "#ffffff",
  text: "#ecfdf5",
  muted: "#99f6e4",
  line: "rgba(255,255,255,0.12)",
  card: "rgba(255,255,255,0.06)",
  cardStrong: "rgba(255,255,255,0.12)",
  blue: "#2dd4bf",
  sky: "#5eead4",
  purple: "#14b8a6",
  magenta: "#0d9488",
  green: "#34d399",
  mint: "#6ee7b7",
  orange: "#f59e0b",
  shadow: "0 24px 80px rgba(4,12,14,0.5)",
  liftIndigo: "#14b8a6",
  liftEmerald: "#34d399",
  liftRose: "#f87171",
};

const HL_WEBHOOK_URL = "https://lift.inteliflowai.com/api/integrations/hl-inbound";
const HL_INBOUND_SECRET = process.env.REACT_APP_HL_INBOUND_SECRET || "LiftHL2026!Secret";

const NAV_ITEMS = [
  { label: "How It Works", href: "#how-it-works" },
  { label: "Features", href: "#features" },
  { label: "Pricing", href: "#pricing" },
  { label: "FAQ", href: "#faq" },
];

/* ─── HighLevel submission ─── */

function buildMailtoUrl(formData, formType) {
  const body = [
    `Name: ${formData.full_name}`,
    `School: ${formData.school_name}`,
    `Email: ${formData.email}`,
    formData.role ? `Role: ${formData.role}` : null,
    formData.school_type ? `School Type: ${formData.school_type}` : null,
    "",
    "Notes:",
    formData.message || "(none)",
  ].filter(Boolean).join("\n");
  return `mailto:lift@inteliflowai.com?subject=${encodeURIComponent(formType + ": " + formData.school_name)}&body=${encodeURIComponent(body)}`;
}

async function submitToHL(formData, formType) {
  if (!HL_WEBHOOK_URL || HL_WEBHOOK_URL.startsWith("REPLACE")) {
    window.open(buildMailtoUrl(formData, formType), "_blank");
    return true;
  }
  const payload = {
    ...formData,
    form_type: formType,
    source: "admissions.inteliflowai.com",
    submitted_at: new Date().toISOString(),
    tags: ["lift-lead", formType.toLowerCase().replace(/\s+/g, "-")],
  };
  const response = await fetch(HL_WEBHOOK_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-hl-secret": HL_INBOUND_SECRET,
    },
    body: JSON.stringify(payload),
  });
  if (!response.ok) throw new Error("HL submission failed");
  return true;
}

/* ─── Global CSS injection ─── */

function usePageStyles() {
  useEffect(() => {
    const app = document.querySelector(".lift-app");
    if (!app) return;
    const overridden = [];
    let el = app.parentElement;
    while (el && el !== document.documentElement) {
      const prev = el.getAttribute("style") || "";
      el.style.setProperty("width", "100%", "important");
      el.style.setProperty("max-width", "100%", "important");
      el.style.setProperty("padding-left", "0", "important");
      el.style.setProperty("padding-right", "0", "important");
      el.style.setProperty("margin-left", "0", "important");
      el.style.setProperty("margin-right", "0", "important");
      el.style.setProperty("overflow-x", "hidden", "important");
      el.style.setProperty("box-sizing", "border-box", "important");
      overridden.push({ el, prev });
      el = el.parentElement;
    }
    return () => {
      overridden.forEach(({ el: node, prev }) => {
        node.setAttribute("style", prev);
      });
    };
  }, []);

  useEffect(() => {
    const id = "lift-page-styles";
    if (document.getElementById(id)) return;
    const style = document.createElement("style");
    style.id = id;
    style.textContent = `
      @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=DM+Sans:wght@400;500;600;700&family=Geist+Mono:wght@400;500;600;700&display=swap');

      html, body {
        margin: 0 !important;
        padding: 0 !important;
        overflow-x: hidden !important;
        background: ${BRAND.bg} !important;
      }

      body:has(.lift-app) .site-header,
      body:has(.lift-app) .site-footer,
      body:has(.lift-app) .ast-above-header,
      body:has(.lift-app) .ast-below-header,
      body:has(.lift-app) #masthead,
      body:has(.lift-app) #colophon,
      body:has(.lift-app) .sidebar,
      body:has(.lift-app) #secondary,
      body:has(.lift-app) .wp-block-template-part {
        display: none !important;
      }

      .lift-app {
        width: 100% !important;
        max-width: 100% !important;
        padding: 0 !important;
        margin: 0 !important;
        font-family: 'DM Sans', -apple-system, BlinkMacSystemFont, sans-serif;
        color: ${BRAND.text};
        line-height: 1.6;
        -webkit-font-smoothing: antialiased;
        min-height: 100vh;
        position: relative;
        overflow-x: hidden;
      }
      .lift-app *, .lift-app *::before, .lift-app *::after {
        box-sizing: border-box;
      }
      .lift-app img { max-width: 100%; height: auto; }
      .lift-app a { color: inherit; text-decoration: none; }
      .lift-app h1, .lift-app h2, .lift-app h3 {
        font-family: 'Plus Jakarta Sans', sans-serif;
        line-height: 1.05;
        margin: 0;
      }
      .lift-app p { margin: 0; }
      .lift-app select option { color: #1a1a2e; background: #fff; }

      .lift-app > * { width: 100%; }
      .lift-app .lift-section {
        margin-left: auto !important;
        margin-right: auto !important;
      }

      @keyframes lift-floatY {
        0%, 100% { transform: translateY(0); }
        50% { transform: translateY(-14px); }
      }
      @keyframes lift-pulseGlow {
        0%, 100% { opacity: 0.55; transform: scale(1); }
        50% { opacity: 0.85; transform: scale(1.08); }
      }
      @keyframes lift-fadeUp {
        from { opacity: 0; transform: translateY(32px); }
        to { opacity: 1; transform: translateY(0); }
      }
      @keyframes lift-slideIn {
        from { transform: translateX(100%); }
        to { transform: translateX(0); }
      }
      @keyframes lift-slideOut {
        from { transform: translateX(0); }
        to { transform: translateX(100%); }
      }

      .lift-card-hover {
        transition: transform 0.25s ease, box-shadow 0.25s ease;
      }
      .lift-card-hover:hover {
        transform: translateY(-4px);
        box-shadow: 0 20px 60px rgba(18,8,43,0.35);
      }

      @media (max-width: 1024px) {
        .lift-hero-grid { grid-template-columns: 1fr !important; }
        .lift-hero-image-wrap { display: none !important; }
        .lift-desktop-nav { display: none !important; }
        .lift-mobile-btn { display: flex !important; }
        .lift-grid-3 { grid-template-columns: 1fr !important; }
        .lift-grid-2 { grid-template-columns: 1fr !important; }
        .lift-pricing-grid { grid-template-columns: 1fr !important; }
        .lift-transform-grid { grid-template-columns: 1fr !important; }
        .lift-founders-grid { grid-template-columns: 1fr !important; }
        .lift-forms-grid { grid-template-columns: 1fr !important; }
        .lift-stats-row { flex-direction: column !important; gap: 16px !important; }
        .lift-footer-inner { flex-direction: column !important; text-align: center !important; gap: 24px !important; }
        .lift-footer-right { align-items: center !important; }
        .lift-cta-buttons { flex-direction: column !important; align-items: center !important; }
      }
      @media (max-width: 720px) {
        .lift-app h1 { font-size: 42px !important; letter-spacing: -1.2px !important; }
        .lift-app h2 { font-size: 30px !important; }
        .lift-section { padding: 60px 20px !important; }
        .lift-hero-buttons { flex-direction: column !important; }
        .lift-hero-buttons a, .lift-hero-buttons button { width: 100% !important; text-align: center !important; }
        .lift-dimensions-grid { grid-template-columns: 1fr !important; }
      }
    `;
    document.head.appendChild(style);
    return () => { const el = document.getElementById(id); if (el) el.remove(); };
  }, []);
}

/* ─── Primitives ─── */

function Section({ id, children, style, outerStyle }) {
  return (
    <section id={id} className="lift-section" style={{ width: "100%", ...outerStyle }}>
      <div style={{ maxWidth: 1280, margin: "0 auto", padding: "100px 40px", ...style }}>
        {children}
      </div>
    </section>
  );
}

function Glass({ children, style, className = "" }) {
  return (
    <div
      className={`lift-card-hover ${className}`}
      style={{
        background: BRAND.card,
        border: `1px solid ${BRAND.line}`,
        borderRadius: 16,
        padding: 32,
        backdropFilter: "blur(24px)",
        WebkitBackdropFilter: "blur(24px)",
        ...style,
      }}
    >
      {children}
    </div>
  );
}

function Glow({ left, right, top, bottom, size = 400, from, to }) {
  return (
    <div
      style={{
        position: "absolute",
        left, right, top, bottom,
        width: size, height: size,
        borderRadius: "50%",
        background: `radial-gradient(circle, ${from} 0%, ${to} 60%, transparent 80%)`,
        opacity: 0.4,
        pointerEvents: "none",
        animation: "lift-pulseGlow 6s ease-in-out infinite",
        zIndex: 0,
      }}
    />
  );
}

function Label({ children, color }) {
  return (
    <span
      style={{
        display: "inline-block",
        color: color || BRAND.mint,
        fontSize: 13,
        fontWeight: 700,
        textTransform: "uppercase",
        letterSpacing: 2,
        marginBottom: 16,
        fontFamily: "'DM Sans', sans-serif",
      }}
    >
      {children}
    </span>
  );
}

function GradientButton({ children, href, onClick, style: extraStyle }) {
  const s = {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    padding: "14px 32px",
    background: `linear-gradient(135deg, ${BRAND.purple}, ${BRAND.blue})`,
    color: BRAND.white,
    fontWeight: 700,
    fontSize: 15,
    border: "none",
    borderRadius: 10,
    cursor: "pointer",
    fontFamily: "'DM Sans', sans-serif",
    transition: "transform 0.2s ease, box-shadow 0.2s ease",
    boxShadow: `0 4px 20px rgba(236,72,153,0.35)`,
    letterSpacing: 0.3,
    ...extraStyle,
  };
  if (href) return <a href={href} style={s} target={href.startsWith("http") ? "_blank" : undefined} rel="noopener noreferrer">{children}</a>;
  return <button onClick={onClick} style={s}>{children}</button>;
}

function GlassButton({ children, onClick, href, style: extraStyle }) {
  const s = {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    padding: "14px 32px",
    background: "rgba(255,255,255,0.08)",
    color: BRAND.white,
    fontWeight: 600,
    fontSize: 15,
    border: `1px solid rgba(255,255,255,0.2)`,
    borderRadius: 10,
    cursor: "pointer",
    backdropFilter: "blur(16px)",
    WebkitBackdropFilter: "blur(16px)",
    fontFamily: "'DM Sans', sans-serif",
    transition: "transform 0.2s ease, background 0.2s ease",
    ...extraStyle,
  };
  if (href) return <a href={href} style={s}>{children}</a>;
  return <button onClick={onClick} style={s}>{children}</button>;
}

/* ─── Header ─── */

function Header({ onOpen }) {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const h = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", h, { passive: true });
    return () => window.removeEventListener("scroll", h);
  }, []);

  return (
    <header
      style={{
        position: "relative",
        zIndex: 1000,
        background: BRAND.bg,
        borderBottom: `1px solid ${BRAND.line}`,
      }}
    >
      <div style={{
        width: "min(1280px, calc(100% - 48px))",
        margin: "0 auto",
        padding: "16px 0",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 16,
      }}>
      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
        <a href="https://inteliflowai.com" title="Back to Inteliflow" style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 36, height: 36, borderRadius: 999, border: `1px solid ${BRAND.line}`, background: BRAND.card, color: BRAND.muted, fontSize: 18, textDecoration: "none", flexShrink: 0 }}>&larr;</a>
        <a href="#top" style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <img src={IMAGES.liftLogo} alt="LIFT" style={{ height: 60, width: "auto", objectFit: "contain" }} />
        </a>
      </div>

      <nav className="lift-desktop-nav" style={{ display: "flex", gap: 32, alignItems: "center" }}>
        {NAV_ITEMS.map((item) => (
          <a
            key={item.label}
            href={item.href}
            target={item.external ? "_blank" : undefined}
            rel={item.external ? "noopener noreferrer" : undefined}
            style={{ color: BRAND.muted, fontSize: 14, fontWeight: 500, transition: "color 0.2s" }}
            onMouseEnter={(e) => (e.target.style.color = BRAND.white)}
            onMouseLeave={(e) => (e.target.style.color = BRAND.muted)}
          >
            {item.label}{item.external ? " \u2197" : ""}
          </a>
        ))}
      </nav>

      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <GradientButton href="https://lift.inteliflowai.com/register" style={{ padding: "10px 24px", fontSize: 14 }}>
          Start Free Trial
        </GradientButton>
        <button
          className="lift-mobile-btn"
          onClick={onOpen}
          style={{
            display: "none", alignItems: "center", justifyContent: "center",
            width: 44, height: 44, background: BRAND.card,
            border: `1px solid ${BRAND.line}`, borderRadius: 10,
            color: BRAND.white, fontSize: 22, cursor: "pointer",
          }}
          aria-label="Open menu"
        >
          &#9776;
        </button>
      </div>
      </div>
    </header>
  );
}

/* ─── Mobile Menu ─── */

function MobileMenu({ open, onClose }) {
  return (
    <>
      {open && (
        <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 1100, transition: "opacity 0.3s" }} />
      )}
      <div
        style={{
          position: "fixed", top: 0, right: 0, bottom: 0, width: 300,
          background: BRAND.bg, zIndex: 1200,
          transform: open ? "translateX(0)" : "translateX(100%)",
          transition: "transform 0.35s cubic-bezier(0.4,0,0.2,1)",
          display: "flex", flexDirection: "column", padding: 32,
          borderLeft: `1px solid ${BRAND.line}`,
        }}
      >
        <button onClick={onClose} style={{ alignSelf: "flex-end", background: "none", border: "none", color: BRAND.white, fontSize: 28, cursor: "pointer", marginBottom: 32 }} aria-label="Close menu">&times;</button>
        {NAV_ITEMS.map((item) => (
          <a key={item.label} href={item.href} onClick={onClose} target={item.external ? "_blank" : undefined} rel={item.external ? "noopener noreferrer" : undefined}
            style={{ color: BRAND.text, fontSize: 18, fontWeight: 500, padding: "14px 0", borderBottom: `1px solid ${BRAND.line}` }}>
            {item.label}{item.external ? " \u2197" : ""}
          </a>
        ))}
        <div style={{ marginTop: 32 }}>
          <GradientButton href="https://lift.inteliflowai.com/register" style={{ width: "100%", textAlign: "center" }}>Start Free Trial</GradientButton>
        </div>
      </div>
    </>
  );
}

/* ─── Animated Product Demo ─── */

function AnimatedDemo() {
  const [screen, setScreen] = useState(0);
  const [animating, setAnimating] = useState(false);
  const [triValue, setTriValue] = useState(0);
  const [barValues, setBarValues] = useState([0,0,0,0,0,0]);

  const SCREENS = 4;
  const SCREEN_DURATION = 10000;
  const FADE_DURATION = 400;

  useEffect(() => {
    const interval = setInterval(() => {
      setAnimating(true);
      setTimeout(() => {
        setScreen(s => (s + 1) % SCREENS);
        setAnimating(false);
      }, FADE_DURATION);
    }, SCREEN_DURATION);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (screen !== 0) { setTriValue(0); return; }
    let start = 0;
    const target = 74;
    const step = target / (1500 / 16);
    const timer = setInterval(() => {
      start = Math.min(start + step, target);
      setTriValue(Math.round(start));
      if (start >= target) clearInterval(timer);
    }, 16);
    return () => clearInterval(timer);
  }, [screen]);

  const BAR_TARGETS = [81, 68, 74, 72, 62, 78, 71];
  useEffect(() => {
    if (screen !== 1) { setBarValues([0,0,0,0,0,0]); return; }
    BAR_TARGETS.forEach((target, i) => {
      setTimeout(() => {
        let val = 0;
        const timer = setInterval(() => {
          val = Math.min(val + 2, target);
          setBarValues(prev => { const next = [...prev]; next[i] = val; return next; });
          if (val >= target) clearInterval(timer);
        }, 16);
      }, i * 100);
    });
  }, [screen]);

  const triArc = (() => {
    const r = 52, cx = 70, cy = 70;
    const startAngle = -210, endAngle = 30;
    const totalDeg = endAngle - startAngle;
    const pct = triValue / 100;
    const angle = startAngle + totalDeg * pct;
    const toRad = (d) => (d * Math.PI) / 180;
    const x1 = cx + r * Math.cos(toRad(startAngle));
    const y1 = cy + r * Math.sin(toRad(startAngle));
    const x2 = cx + r * Math.cos(toRad(angle));
    const y2 = cy + r * Math.sin(toRad(angle));
    const large = totalDeg * pct > 180 ? 1 : 0;
    return `M ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2}`;
  })();

  const getBarColor = (v) => v >= 75 ? '#10b981' : v >= 60 ? '#14b8a6' : '#f59e0b';
  const DIMS = ['Reading Interpretation', 'Written Expression', 'Reasoning & Problems', 'Mathematical Reasoning', 'Reflection & Metacog.', 'Task Persistence', 'Self-Advocacy'];
  const mono = { fontFamily: "'Geist Mono', monospace" };

  const cardStyle = {
    background: 'rgba(15,15,25,0.85)', border: '1px solid rgba(99,102,241,0.25)',
    borderRadius: 16, padding: '22px 24px', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
    opacity: animating ? 0 : 1, transition: `opacity ${FADE_DURATION}ms ease`, minHeight: 320, width: '100%',
  };

  const dots = Array.from({ length: SCREENS }, (_, i) => (
    <div key={i} style={{ width: i === screen ? 20 : 6, height: 6, borderRadius: 3, background: i === screen ? '#14b8a6' : 'rgba(255,255,255,0.2)', transition: 'all 0.4s ease' }} />
  ));

  return (
    <div style={{ width: '100%', maxWidth: 420, position: 'relative' }}>
      <div style={{ display: 'flex', gap: 6, justifyContent: 'center', marginBottom: 14 }}>{dots}</div>
      <div style={{ textAlign: 'center', marginBottom: 10 }}>
        <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 2, color: '#14b8a6', fontFamily: "'DM Sans', sans-serif" }}>
          {['Candidate Profile', 'Readiness Dimensions', 'Evaluator Intelligence', 'Reports Ready'][screen]}
        </span>
      </div>

      {screen === 0 && (
        <div style={cardStyle}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 24 }}>
            <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'linear-gradient(135deg, #0f0c1d, #14b8a6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 18, fontWeight: 700, color: '#fff', flexShrink: 0 }}>JR</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 18, fontWeight: 700, color: '#e2e8f0', marginBottom: 3 }}>Jamie Rivera</div>
              <div style={{ fontSize: 12, color: '#94a3b8', fontFamily: "'DM Sans', sans-serif" }}>Grade 8 · Boarding School</div>
            </div>
            <span style={{ background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.4)', color: '#10b981', fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20, fontFamily: "'DM Sans', sans-serif" }}>✓ Complete</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 24 }}>
            <div style={{ position: 'relative', width: 140, height: 140 }}>
              <svg width="140" height="140" viewBox="0 0 140 140">
                <path d="M 18 100 A 52 52 0 1 1 122 100" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="8" strokeLinecap="round" />
                <path d={triArc} fill="none" stroke="url(#triGrad)" strokeWidth="8" strokeLinecap="round" />
                <defs><linearGradient id="triGrad" x1="0%" y1="0%" x2="100%" y2="0%"><stop offset="0%" stopColor="#14b8a6" /><stop offset="100%" stopColor="#ec4899" /></linearGradient></defs>
              </svg>
              <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', paddingTop: 8 }}>
                <span style={{ ...mono, fontSize: 34, fontWeight: 700, color: '#e2e8f0', lineHeight: 1 }}>{triValue}</span>
                <span style={{ fontSize: 11, color: '#64748b', fontFamily: "'DM Sans', sans-serif" }}>/ 100</span>
              </div>
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#a5b4fc', fontFamily: "'DM Sans', sans-serif", marginBottom: 4 }}>Transition</div>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#a5b4fc', fontFamily: "'DM Sans', sans-serif", marginBottom: 4 }}>Readiness</div>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#a5b4fc', fontFamily: "'DM Sans', sans-serif", marginBottom: 12 }}>Index</div>
              <div style={{ background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.25)', borderRadius: 8, padding: '6px 12px', fontSize: 12, color: '#94a3b8', fontFamily: "'DM Sans', sans-serif" }}>Solid readiness<br/>signals overall</div>
            </div>
          </div>
        </div>
      )}

      {screen === 1 && (
        <div style={cardStyle}>
          <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 16, fontWeight: 700, color: '#e2e8f0', marginBottom: 18 }}>7 Readiness Dimensions</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
            {DIMS.map((dim, i) => { const val = barValues[i]; const color = getBarColor(BAR_TARGETS[i]); return (
              <div key={dim}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                    <div style={{ width: 6, height: 6, borderRadius: '50%', background: color, flexShrink: 0 }} />
                    <span style={{ fontSize: 12, color: '#94a3b8', fontFamily: "'DM Sans', sans-serif" }}>{dim}</span>
                  </div>
                  <span style={{ ...mono, fontSize: 13, fontWeight: 700, color: '#e2e8f0' }}>{val}</span>
                </div>
                <div style={{ height: 5, background: 'rgba(255,255,255,0.07)', borderRadius: 3, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${val}%`, background: color, borderRadius: 3, transition: 'width 0.05s linear', boxShadow: `0 0 8px ${color}60` }} />
                </div>
              </div>
            ); })}
          </div>
        </div>
      )}

      {screen === 2 && (
        <div style={cardStyle}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <span style={{ color: '#f59e0b', fontSize: 14 }}>✦</span>
            <span style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 16, fontWeight: 700, color: '#e2e8f0' }}>Pre-Interview Briefing</span>
          </div>
          <div style={{ fontSize: 11, color: '#14b8a6', marginBottom: 14, fontFamily: "'DM Sans', sans-serif", fontWeight: 600 }}>Generated for Jamie Rivera</div>
          {['Strong evidence use — revisited key reading passages before answering on 4 of 5 tasks.', 'Reasoning–expression gap: reasoning 74, writing output 68 — ideas present, expression developing.', 'Low hint usage on hard tasks despite errors — may not seek support proactively.'].map((obs, i) => (
            <div key={i} style={{ display: 'flex', gap: 10, marginBottom: 10, animation: `lift-fadeUp 0.4s ease ${i * 150}ms both` }}>
              <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#14b8a6', flexShrink: 0, marginTop: 6 }} />
              <p style={{ fontSize: 12, color: '#94a3b8', lineHeight: 1.6, margin: 0, fontFamily: "'DM Sans', sans-serif" }}>{obs}</p>
            </div>
          ))}
          <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', margin: '12px 0', paddingTop: 12 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: 1, fontFamily: "'DM Sans', sans-serif", marginBottom: 8 }}>Suggested Questions</div>
            {['"Walk me through how you approached the hardest task."', '"What would you do differently if you could redo one task?"'].map((q, i) => (
              <div key={i} style={{ background: 'rgba(99,102,241,0.08)', borderRadius: 6, padding: '7px 10px', marginBottom: 6, fontSize: 12, color: '#a5b4fc', lineHeight: 1.5, fontFamily: "'DM Sans', sans-serif", fontStyle: 'italic', animation: `lift-fadeUp 0.4s ease ${300 + i * 150}ms both` }}>{q}</div>
            ))}
          </div>
        </div>
      )}

      {screen === 3 && (
        <div style={cardStyle}>
          <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 16, fontWeight: 700, color: '#e2e8f0', marginBottom: 16 }}>Reports Ready</div>
          <div style={{ display: 'flex', gap: 8, marginBottom: 18 }}>
            {[{ label: '📋 Internal', color: '#14b8a6', fill: false }, { label: '👨‍👩‍👧 Family', color: '#10b981', fill: true }, { label: '📍 Placement', color: '#8b5cf6', fill: false }].map(b => (
              <div key={b.label} style={{ flex: 1, padding: '8px 4px', textAlign: 'center', background: b.fill ? b.color : 'transparent', border: `1px solid ${b.color}${b.fill ? '' : '60'}`, borderRadius: 8, fontSize: 11, fontWeight: 700, color: b.fill ? '#fff' : b.color, fontFamily: "'DM Sans', sans-serif", cursor: 'default' }}>{b.label}</div>
            ))}
          </div>
          <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, padding: '12px 14px', marginBottom: 14, position: 'relative', overflow: 'hidden' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <div style={{ width: 24, height: 24, borderRadius: 4, background: 'linear-gradient(135deg, #0f0c1d, #14b8a6)', flexShrink: 0 }} />
              <span style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', fontFamily: "'DM Sans', sans-serif" }}>Hillside Academy · Family Report</span>
            </div>
            <p style={{ fontSize: 12, color: '#64748b', lineHeight: 1.65, margin: 0, fontFamily: "'DM Sans', sans-serif" }}>"Dear Rivera family, Jamie approached today's experience with genuine curiosity and showed real strength in how they..."</p>
            <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 32, background: 'linear-gradient(transparent, rgba(15,15,25,0.85))' }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 12 }}>
            {['School-branded', 'AI-written', 'Print-ready'].map(t => (
              <span key={t} style={{ fontSize: 11, color: '#64748b', fontFamily: "'DM Sans', sans-serif" }}>✓ {t}</span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Hero ─── */

function Hero() {
  return (
    <section style={{ position: "relative", overflow: "hidden", paddingTop: 0, width: "100%" }}>
      <Glow left={-120} top={-80} size={600} from={BRAND.blue} to={BRAND.purple} />
      <Glow right={-100} top={-60} size={500} from={BRAND.green} to={BRAND.blue} />
      <div className="lift-hero-grid" style={{ maxWidth: 1280, marginLeft: "auto", marginRight: "auto", padding: "56px 40px 64px", display: "grid", gridTemplateColumns: "1.02fr 0.98fr", gap: 64, alignItems: "center", position: "relative", zIndex: 1 }}>
        <div>
          <Label>For Independent, Boarding & Therapeutic Schools</Label>
          <h1 style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 76, lineHeight: 0.95, letterSpacing: -2.8, color: BRAND.white, marginBottom: 16, marginTop: 12 }}>
            Learning Intelligence for Admissions.
          </h1>
          <p style={{ fontSize: 24, color: BRAND.blue, marginBottom: 20, lineHeight: 1.4, fontWeight: 600, letterSpacing: -0.5, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
            Built on pedagogy. Powered by AI.
          </p>
          <p style={{ fontSize: 18, color: BRAND.muted, marginBottom: 36, lineHeight: 1.7 }}>
            Independently evaluates students across seven readiness dimensions. Sits alongside Ravenna and Blackbaud — doesn&apos;t replace them, doesn&apos;t rely on parent-reported data. From invitation to insight in under 75 minutes.
          </p>
          <div className="lift-hero-buttons" style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 24 }}>
            <GradientButton href="https://lift.inteliflowai.com/demo/new">Try Live Demo</GradientButton>
            <GlassButton href="https://lift.inteliflowai.com/register">Start Free Trial</GlassButton>
          </div>
          <p style={{ fontSize: 13, color: BRAND.muted, lineHeight: 1.7 }}>
            30-day free trial &middot; No credit card required &middot; Non-diagnostic &middot; FERPA aligned &middot; COPPA aware
          </p>
        </div>
        <div className="lift-hero-image-wrap" style={{ display: "flex", justifyContent: "center", alignItems: "flex-start" }}>
          <AnimatedDemo />
        </div>
      </div>
    </section>
  );
}

/* ─── Stats Bar ─── */

function StatsBar() {
  const stats = [
    { value: "7", label: "Readiness Dimensions" },
    { value: "3", label: "Grade Experiences" },
    { value: "40+", label: "Learning Signals Captured" },
    { value: "45–75", label: "Minutes Per Session" },
  ];
  return (
    <div style={{ background: "rgba(255,255,255,0.08)", borderTop: `1px solid ${BRAND.line}`, borderBottom: `1px solid ${BRAND.line}`, width: "100%" }}>
      <div className="lift-stats-row" style={{ maxWidth: 1280, marginLeft: "auto", marginRight: "auto", padding: "28px 40px", display: "flex", justifyContent: "center", gap: 64, alignItems: "center" }}>
        {stats.map((s, i) => (
          <div key={i} style={{ textAlign: "center" }}>
            <span style={{ fontFamily: "'Geist Mono', monospace", fontSize: 32, fontWeight: 700, color: BRAND.white }}>{s.value}</span>
            <span style={{ display: "block", fontSize: 14, color: BRAND.muted, marginTop: 4 }}>{s.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── Problem Section ─── */

function ProblemSection() {
  const cards = [
    "Traditional admissions measures what students have done — grades, tests, and recommendations. They rarely reveal how a student thinks, adapts, or persists under challenge.",
    "Without a structured framework, evaluators rely on intuition and 30-minute interviews to make decisions that shape a student's next several years.",
    "The result: some students who would thrive with the right support are passed over, and others are admitted without a preparation plan.",
  ];
  return (
    <Section id="problem">
      <Label>The Problem</Label>
      <h2 style={{ fontSize: 48, color: BRAND.white, maxWidth: 900, marginBottom: 48 }}>
        Admissions teams make high-stakes decisions with limited insight into how students actually learn.
      </h2>
      <div className="lift-grid-3" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 24 }}>
        {cards.map((text, i) => (
          <Glass key={i}><p style={{ fontSize: 16, color: BRAND.muted, lineHeight: 1.7 }}>{text}</p></Glass>
        ))}
      </div>
    </Section>
  );
}

/* ─── How It Works ─── */

function HowItWorks() {
  const steps = [
    { num: "1", title: "Invite", desc: "Send candidates a secure link. They complete LIFT's adaptive experience on any device — no download needed. Sessions take 45-75 minutes." },
    { num: "2", title: "Experience", desc: "LIFT serves age-appropriate reading, writing, math, reasoning, and reflection tasks. It captures not just answers — but how students approach them." },
    { num: "3", title: "Insight", desc: "AI generates a Transition Readiness Index (TRI), scores across 7 readiness dimensions, and plain-language reports for your admissions team." },
    { num: "4", title: "Decide", desc: "Your team reviews with confidence. Pre-interview briefings, structured rubrics, and cohort comparisons make every decision more informed." },
  ];
  return (
    <div style={{ background: "rgba(99,102,241,0.08)", width: "100%" }}>
      <Section id="how-it-works">
        <Label>How it works</Label>
        <h2 style={{ fontSize: 38, color: BRAND.white, marginBottom: 48 }}>From invitation to insight in four steps.</h2>
        <div className="lift-grid-2" style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 24 }}>
          {steps.map((step) => (
            <Glass key={step.num}>
              <div style={{ display: "flex", gap: 20, alignItems: "flex-start" }}>
                <div style={{ width: 48, height: 48, borderRadius: "50%", flexShrink: 0, background: `linear-gradient(135deg, ${BRAND.purple}, ${BRAND.blue})`, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Geist Mono', monospace", fontWeight: 700, fontSize: 20, color: BRAND.white }}>{step.num}</div>
                <div>
                  <h3 style={{ fontSize: 22, fontWeight: 700, color: BRAND.white, marginBottom: 8, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{step.title}</h3>
                  <p style={{ fontSize: 15, color: BRAND.muted, lineHeight: 1.7 }}>{step.desc}</p>
                </div>
              </div>
            </Glass>
          ))}
        </div>
      </Section>
    </div>
  );
}

/* ─── Dimensions ─── */

function DimensionsSection() {
  const dims = [
    { name: "Reading Interpretation", color: BRAND.liftIndigo, desc: "How a student engages with text — comprehension strategies, evidence use, and the ability to extract meaning from grade-level passages." },
    { name: "Written Expression", color: BRAND.liftEmerald, desc: "Clarity, structure, and voice in written output. LIFT captures revision behavior and how ideas develop across drafts." },
    { name: "Reasoning & Problem Structuring", color: BRAND.orange, desc: "How a student approaches unfamiliar problems — whether they identify patterns, organize information, and build logical solutions." },
    { name: "Mathematical Reasoning", color: BRAND.liftRose, desc: "Accuracy, problem setup, pattern recognition, and the ability to explain mathematical thinking. Scored at grade level — not absolute difficulty." },
    { name: "Reflection & Metacognition", color: BRAND.sky, desc: "Awareness of one's own learning process. LIFT measures how students evaluate their own work, name challenges, and plan next steps." },
    { name: "Task Persistence", color: BRAND.magenta, desc: "Sustained engagement under challenge. Measured through revision depth, time on task, and willingness to return to difficult items." },
    { name: "Academic Self-Advocacy", color: BRAND.mint, desc: "How students seek support — whether they use hints, ask for clarification, or leverage available tools when stuck." },
  ];
  return (
    <Section id="features">
      <Label>What LIFT measures</Label>
      <h2 style={{ fontSize: 38, color: BRAND.white, marginBottom: 16 }}>Seven dimensions of learning readiness.</h2>
      <p style={{ fontSize: 17, color: BRAND.muted, maxWidth: 720, marginBottom: 48, lineHeight: 1.7 }}>
        LIFT does not diagnose. It reveals how a student approaches academic tasks — the signals that predict who will thrive with the right support.
      </p>
      <div className="lift-dimensions-grid" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 24, marginBottom: 36 }}>
        {dims.map((d) => (
          <Glass key={d.name} style={{ borderLeft: `4px solid ${d.color}` }}>
            <h3 style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 20, fontWeight: 700, color: BRAND.white, marginBottom: 8 }}>{d.name}</h3>
            <p style={{ fontSize: 15, color: BRAND.muted, lineHeight: 1.7 }}>{d.desc}</p>
          </Glass>
        ))}
      </div>
      <Glass style={{ borderLeft: `4px solid ${BRAND.liftIndigo}`, background: "rgba(99,102,241,0.10)" }}>
        <p style={{ fontSize: 15, color: BRAND.muted, lineHeight: 1.7 }}>
          <strong style={{ color: BRAND.white }}>LIFT is not a diagnostic tool.</strong> It does not assess learning disabilities, clinical conditions, or protected traits. Results support admissions review and must be interpreted by qualified school staff.
        </p>
      </Glass>
    </Section>
  );
}

/* ─── Enriched Signals Highlight ─── */

function SignalsSection() {
  const signals = [
    { name: "Extended Reading Time", category: "Reading", desc: "Detects when a student spends significantly more time than expected on reading passages — may benefit from additional processing time." },
    { name: "Reasoning–Expression Gap", category: "Writing", desc: "Strong reasoning performance alongside limited written output — the barrier may be expression, not understanding." },
    { name: "Variable Task Pacing", category: "Attention", desc: "Highly variable time allocation across tasks — rushing some and spending disproportionate time on others." },
    { name: "Low Support-Seeking", category: "Self-Regulation", desc: "Rarely used available hints when struggling — may benefit from explicit support-seeking strategies." },
    { name: "Task Completion Difficulty", category: "Attention", desc: "Left multiple tasks incomplete — may reflect difficulty sustaining effort across longer academic experiences." },
    { name: "Limited Metacognitive Expression", category: "Self-Regulation", desc: "Brief reflection responses that rarely reference the student's own thinking process." },
  ];

  return (
    <div style={{ background: "rgba(139,92,246,0.08)", width: "100%" }}>
      <Section>
        <Label>Beyond scores</Label>
        <h2 style={{ fontSize: 38, color: BRAND.white, marginBottom: 16 }}>
          9 enriched behavioral signals. Not diagnoses — observations.
        </h2>
        <p style={{ fontSize: 17, color: BRAND.muted, maxWidth: 780, marginBottom: 48, lineHeight: 1.7 }}>
          LIFT captures 40+ learning signals during each session and distills them into actionable behavioral observations across reading, writing, math, attention, and self-regulation. Every signal describes what was observed — never what&apos;s &quot;wrong.&quot; Each includes plain-language evidence and a specific recommendation for your team.
        </p>
        <div className="lift-grid-3" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 20 }}>
          {signals.map((s) => (
            <Glass key={s.name} style={{ padding: 24 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                <span style={{ display: "inline-block", padding: "3px 10px", borderRadius: 12, fontSize: 11, fontWeight: 600, background: "rgba(255,255,255,0.12)", color: BRAND.sky }}>{s.category}</span>
              </div>
              <h3 style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 18, fontWeight: 700, color: BRAND.white, marginBottom: 8 }}>{s.name}</h3>
              <p style={{ fontSize: 14, color: BRAND.muted, lineHeight: 1.6 }}>{s.desc}</p>
            </Glass>
          ))}
        </div>
        <Glass style={{ marginTop: 32, borderLeft: `4px solid ${BRAND.sky}`, background: "rgba(192,132,252,0.08)" }}>
          <p style={{ fontSize: 15, color: BRAND.muted, lineHeight: 1.7 }}>
            <strong style={{ color: BRAND.white }}>Every signal includes:</strong> a severity level (advisory or notable), the evidence from the session, and a specific recommendation — like whether to explore extended time, pre-writing scaffolds, or support-seeking strategies with the family. Included in Professional.
          </p>
        </Glass>
      </Section>
    </div>
  );
}

/* ─── Enterprise Features ─── */

function EnterpriseSection() {
  const features = [
    { title: "White Label & Custom Branding", desc: "Run LIFT on your own domain with your school's logo, colors, and branding throughout. Candidates see your institution's identity — not ours. Emails, reports, and the candidate experience all reflect your brand.", color: BRAND.liftIndigo },
    { title: "SIS Integrations", desc: "Connect LIFT directly to Veracross, Blackbaud, PowerSchool, or Ravenna. Candidate data flows automatically — no manual exports, no duplicate entry. Your admissions data lives where your team already works.", color: BRAND.orange },
    { title: "Institutional Memory Dashboard", desc: "Multi-year admissions intelligence that gets smarter with every cycle. Track prediction accuracy over time, compare cohort composition year-over-year, and see which evaluators have the strongest predictive track record — the data your board can't get anywhere else.", color: BRAND.liftEmerald },
    { title: "Evaluator Calibration & Board Reporting", desc: "Know which evaluators predict best. LIFT tracks how each evaluator's recommendations correlate with actual student outcomes, producing board-ready accuracy reports that prove your admissions process works.", color: BRAND.sky },
    { title: "Custom Session Configuration", desc: "Add school-specific prompts, tasks, or reflection questions to the candidate experience. Enterprise schools can shape the session to surface signals that matter most to their specific admissions philosophy.", color: BRAND.magenta },
    { title: "API Access & Dedicated Success Manager", desc: "Full API access for schools with their own tech teams. Plus a dedicated Inteliflow success manager who knows your school, your cycle, and your goals — with guaranteed SLA response times and priority support throughout the year.", color: BRAND.mint },
  ];
  return (
    <Section>
      <Label>Enterprise</Label>
      <h2 style={{ fontSize: 38, color: BRAND.white, marginBottom: 16 }}>The complete admissions intelligence platform.</h2>
      <p style={{ fontSize: 17, color: BRAND.muted, maxWidth: 720, marginBottom: 48, lineHeight: 1.7 }}>
        Enterprise is for institutions that want LIFT to feel like their own — and to go deeper than any other admissions tool on the market.
      </p>
      <div className="lift-grid-2" style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 24 }}>
        {features.map((f) => (
          <Glass key={f.title} style={{ borderLeft: `4px solid ${f.color}` }}>
            <h3 style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 20, fontWeight: 700, color: BRAND.white, marginBottom: 8 }}>{f.title}</h3>
            <p style={{ fontSize: 15, color: BRAND.muted, lineHeight: 1.7 }}>{f.desc}</p>
          </Glass>
        ))}
      </div>
    </Section>
  );
}

/* ─── Year-Round ─── */

function YearRoundSection() {
  const seasons = [
    { period: "Oct–Mar", title: "Admissions Season", desc: "Run your full cycle: candidate sessions, evaluator review, waitlist intelligence." },
    { period: "Apr–Jun", title: "Post-Admissions", desc: "Prepare for incoming students: CORE integration, support plans, outcome tracking." },
    { period: "Jul–Aug", title: "Onboarding Season", desc: "Set new students up: grade dean dashboard, 90-day checkpoints, placement guidance." },
    { period: "Sep", title: "Cycle Prep", desc: "Be ready: cycle configuration, team onboarding, open house demo mode." },
  ];
  return (
    <Section>
      <Label>More than admissions season</Label>
      <h2 style={{ fontSize: 38, color: BRAND.white, marginBottom: 48 }}>A platform your team uses all year.</h2>
      <div className="lift-grid-2" style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 24 }}>
        {seasons.map((s) => (
          <Glass key={s.title}>
            <span style={{ display: "inline-block", padding: "4px 14px", borderRadius: 20, background: `linear-gradient(135deg, ${BRAND.purple}, ${BRAND.blue})`, color: BRAND.white, fontSize: 12, fontWeight: 700, marginBottom: 14, letterSpacing: 0.5 }}>{s.period}</span>
            <h3 style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 22, color: BRAND.white, marginBottom: 8 }}>{s.title}</h3>
            <p style={{ fontSize: 15, color: BRAND.muted, lineHeight: 1.7 }}>{s.desc}</p>
          </Glass>
        ))}
      </div>
    </Section>
  );
}

/* ─── Audience ─── */

function AudienceSection() {
  const audiences = [
    { title: "Independent Day Schools", desc: "Gain structured insight into every applicant. Replace guesswork with dimension-level readiness data that informs placement and support from day one." },
    { title: "Boarding Schools", desc: "Understand how candidates learn before they arrive on campus. Identify students who need transition support and prepare your residential team accordingly." },
    { title: "Therapeutic Schools", desc: "See learning behaviors — not just clinical histories. LIFT surfaces persistence, reflection, and self-advocacy signals that matter most for therapeutic settings." },
    { title: "School Groups & Networks", desc: "Standardize admissions insight across campuses. Cohort benchmarks and shared rubrics ensure consistent, defensible decisions at scale." },
  ];
  return (
    <Section>
      <Label>Who this is for</Label>
      <h2 style={{ fontSize: 40, color: BRAND.white, marginBottom: 48 }}>Built for schools that want to understand their candidates, not just rank them.</h2>
      <div className="lift-grid-2" style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 24 }}>
        {audiences.map((a) => (
          <Glass key={a.title}>
            <h3 style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 22, color: BRAND.white, marginBottom: 10 }}>{a.title}</h3>
            <p style={{ fontSize: 15, color: BRAND.muted, lineHeight: 1.7 }}>{a.desc}</p>
          </Glass>
        ))}
      </div>
    </Section>
  );
}

/* ─── Transformation ─── */

function TransformationSection() {
  const rows = [
    ["Static records and test scores", "Dynamic learning readiness profiles"],
    ["30-minute impression interviews", "Pre-interview briefings and structured rubrics"],
    ["Gut-feel placement decisions", "AI-assisted TRI scoring and dimension analysis"],
    ["No visibility after admissions", "Year-round support plan tracking"],
    ["One evaluator, one perspective", "Cohort benchmarks and team alignment"],
  ];
  return (
    <Section>
      <div className="lift-transform-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1.2fr", gap: 56, alignItems: "center" }}>
        <div>
          <Label>The shift</Label>
          <h2 style={{ fontSize: 38, color: BRAND.white, marginBottom: 16 }}>From guesswork &rarr; confidence</h2>
          <p style={{ fontSize: 16, color: BRAND.muted, lineHeight: 1.7 }}>
            LIFT replaces fragmented admissions data with a structured, AI-assisted insight layer that follows each candidate from application through onboarding.
          </p>
        </div>
        <Glass style={{ padding: 0, overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <tbody>
              {rows.map(([from, to], i) => (
                <tr key={i} style={{ borderBottom: i < rows.length - 1 ? `1px solid ${BRAND.line}` : "none" }}>
                  <td style={{ padding: "16px 20px", fontSize: 14, color: BRAND.muted, width: "42%" }}>{from}</td>
                  <td style={{ padding: "16px 8px", color: BRAND.mint, fontSize: 16, width: "16%", textAlign: "center" }}>&rarr;</td>
                  <td style={{ padding: "16px 20px", fontSize: 14, color: BRAND.white, fontWeight: 600 }}>{to}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Glass>
      </div>
    </Section>
  );
}

/* ─── Founders ─── */

function FoundersSection() {
  return (
    <Section id="founders">
      <div style={{ textAlign: "center", marginBottom: 48 }}>
        <Label>The team behind LIFT</Label>
        <h2 style={{ fontSize: 38, color: BRAND.white }}>Founded by educators and engineers.</h2>
      </div>
      <div className="lift-founders-grid" style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 32 }}>
        <Glass style={{ textAlign: "center" }}>
          <img src={IMAGES.barbaraImg} alt="Barbara Leventhal" style={{ width: 130, height: 130, borderRadius: "50%", objectFit: "cover", marginBottom: 20, border: `3px solid ${BRAND.line}` }} />
          <h3 style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 24, color: BRAND.white, marginBottom: 4 }}>Barbara Leventhal</h3>
          <p style={{ color: BRAND.sky, fontSize: 14, fontWeight: 600, marginBottom: 16 }}>Co-Founder &amp; Chief Learning Officer</p>
          <p style={{ fontSize: 15, color: BRAND.muted, lineHeight: 1.7 }}>
            With over 25 years in education across three countries, Barbara brings deep expertise in curriculum design, student assessment, and learning support. Barbara leads LIFT's pedagogical framework ensuring every dimension is grounded in decades of real classroom insight.
          </p>
        </Glass>
        <Glass style={{ textAlign: "center" }}>
          <img src={IMAGES.marvinImg} alt="Marvin Leventhal" style={{ width: 130, height: 130, borderRadius: "50%", objectFit: "cover", marginBottom: 20, border: `3px solid ${BRAND.line}` }} />
          <h3 style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 24, color: BRAND.white, marginBottom: 4 }}>Marvin Leventhal</h3>
          <p style={{ color: BRAND.sky, fontSize: 14, fontWeight: 600, marginBottom: 16 }}>Co-Founder &amp; CEO</p>
          <p style={{ fontSize: 15, color: BRAND.muted, lineHeight: 1.7 }}>
            A technologist and entrepreneur with two decades of experience building platforms that bridge complex systems. Marvin leads product strategy and engineering, ensuring LIFT delivers real insight — not just data — to every school it serves.
          </p>
        </Glass>
      </div>
    </Section>
  );
}

/* ─── Pricing ─── */

function PricingSection() {
  const tiers = [
    {
      name: "Professional",
      price: "$12,000",
      monthly: 1000,
      features: [
        "Up to 500 candidate sessions/year",
        "5 evaluator seats",
        "Full session engine — all grades 6–11",
        "Voice response + Passage reader TTS",
        "Transition Readiness Index (TRI)",
        "7 readiness dimensions including Math + 9 behavioral signals",
        "Learning Support Signals with recommendations",
        "Evaluator Intelligence — briefings, rubric & observation notes",
        "AI-generated reports (internal, family, committee brief)",
        "Cohort View — side-by-side candidate comparison",
        "Class Builder — model your incoming class composition",
        "Application Data panel — GPA, test scores, recommendations",
        "Automated invitation triggers + bulk send",
        "90-day Support Plan Generator",
        "Outcome Tracking — predictions vs actual performance",
        "Longitudinal Trends — year-over-year cohort & accuracy data",
        "CORE integration bridge",
        "PDF + CSV export & FERPA-compliant data handling",
        "Email support",
      ],
      cta: "Start Free Trial",
      href: "https://lift.inteliflowai.com/register",
      popular: true,
      enterprise: false,
    },
    {
      name: "Enterprise",
      price: "$18,000",
      monthly: 1500,
      features: [
        "Everything in Professional, plus:",
        "Unlimited candidate sessions",
        "Unlimited evaluator seats",
        "White label — custom domain & full branding",
        "SIS integrations (Veracross, Blackbaud, PowerSchool, Ravenna)",
        "CORE Bridge — push admitted students with predicted mastery bands",
        "Institutional Memory Dashboard — multi-year admissions intelligence",
        "Evaluator Calibration — track which evaluators predict best",
        "Board-ready executive reporting with historical accuracy data",
        "Custom session configuration",
        "API access",
        "Dedicated Success Manager",
        "SLA — guaranteed response times",
        "Priority onboarding & training",
        "Cross-school benchmarking network",
        "Re-application & waitlist intelligence",
      ],
      cta: "Contact Us",
      href: "mailto:lift@inteliflowai.com?subject=LIFT%20Enterprise%20Inquiry",
      popular: false,
      enterprise: true,
    },
  ];

  return (
    <Section id="pricing">
      <div style={{ textAlign: "center", marginBottom: 48 }}>
        <Label>Pricing</Label>
        <h2 style={{ fontSize: 38, color: BRAND.white, marginBottom: 12 }}>Simple annual pricing. No per-candidate fees.</h2>
        <p style={{ fontSize: 17, color: BRAND.muted }}>Start with a 30-day free trial with all Enterprise features. No credit card required.</p>
      </div>
      <div className="lift-pricing-grid" style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 32, alignItems: "start", maxWidth: 900, margin: "0 auto" }}>
        {tiers.map((tier) => (
          <Glass key={tier.name} style={{
            transform: tier.popular ? "scale(1.02)" : "none",
            border: tier.popular ? `1px solid ${BRAND.liftIndigo}` : `1px solid ${BRAND.line}`,
            background: tier.popular ? BRAND.cardStrong : BRAND.card,
            boxShadow: tier.popular ? `0 0 40px rgba(99,102,241,0.2)` : "none",
            position: "relative",
          }}>
            {tier.popular && (
              <span style={{ position: "absolute", top: -12, right: 24, background: BRAND.mint, color: BRAND.bg, fontSize: 12, fontWeight: 700, padding: "4px 14px", borderRadius: 20 }}>Most Popular</span>
            )}
            {tier.enterprise && (
              <span style={{ position: "absolute", top: -12, right: 24, background: `linear-gradient(135deg, ${BRAND.purple}, ${BRAND.blue})`, color: BRAND.white, fontSize: 12, fontWeight: 700, padding: "4px 14px", borderRadius: 20 }}>Full Platform</span>
            )}
            <h3 style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 26, color: BRAND.white, marginBottom: 8 }}>{tier.name}</h3>
            <div style={{ marginBottom: 24 }}>
              <span style={{ fontFamily: "'Geist Mono', monospace", fontSize: 40, fontWeight: 700, color: BRAND.white }}>${tier.monthly?.toLocaleString()}</span>
              <span style={{ fontSize: 16, color: BRAND.muted }}>/month</span>
              <div style={{ marginTop: 6, fontSize: 14, color: BRAND.muted }}>{tier.price}/year &middot; Billed annually</div>
            </div>
            <ul style={{ listStyle: "none", padding: 0, margin: "0 0 28px 0" }}>
              {tier.features.map((f) => {
                const isHeader = f.endsWith(":");
                return (
                  <li key={f} style={{ fontSize: 14, color: isHeader ? BRAND.white : BRAND.muted, padding: "6px 0", display: "flex", gap: 8, alignItems: "flex-start", fontWeight: isHeader ? 600 : 400, marginTop: isHeader ? 4 : 0 }}>
                    {!isHeader && <span style={{ color: BRAND.liftEmerald, fontWeight: 700, fontSize: 16, lineHeight: 1.2 }}>&#10003;</span>}
                    <span>{f}</span>
                  </li>
                );
              })}
            </ul>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {tier.popular ? (
                <GradientButton href={tier.href} style={{ width: "100%", textAlign: "center" }}>{tier.cta}</GradientButton>
              ) : (
                <GlassButton href={tier.href} style={{ width: "100%", textAlign: "center" }}>{tier.cta}</GlassButton>
              )}
              {tier.popular && (
                <a href="https://lift.inteliflowai.com/buy?tier=professional" style={{ textAlign: "center", fontSize: 13, color: BRAND.sky, fontWeight: 500, fontFamily: "'DM Sans', sans-serif" }}>
                  or Buy Now &rarr;
                </a>
              )}
            </div>
          </Glass>
        ))}
      </div>
      <Glass style={{ marginTop: 32, textAlign: "center", padding: "20px 32px", background: "rgba(99,102,241,0.10)", borderLeft: `4px solid ${BRAND.liftIndigo}`, maxWidth: 900, margin: "32px auto 0" }}>
        <p style={{ fontSize: 15, color: BRAND.muted, lineHeight: 1.7 }}>
          <strong style={{ color: BRAND.white }}>Your 30-day trial includes all Enterprise features</strong> — unlimited sessions, 7-dimension scoring with math, evaluator intelligence, cohort view, class builder, committee briefs, SIS integrations, and more. No credit card required.
        </p>
      </Glass>
      <p style={{ textAlign: "center", fontSize: 14, color: BRAND.muted, marginTop: 24 }}>
        30-day free trial &middot; Annual contracts &middot; September billing alignment available
      </p>
    </Section>
  );
}

/* ─── Compliance ─── */

function ComplianceSection() {
  const badges = [
    { src: IMAGES.coppaLogo, alt: "COPPA", label: "COPPA Aware" },
    { src: IMAGES.ferpaLogo, alt: "FERPA", label: "FERPA Aligned" },
    { src: IMAGES.gdprLogo, alt: "GDPR", label: "GDPR Ready" },
  ];
  return (
    <Section id="compliance">
      <Glass style={{ position: "relative", overflow: "hidden", textAlign: "center", padding: "56px 40px" }}>
        <Glow left={-100} top={-100} size={350} from={BRAND.liftIndigo} to="transparent" />
        <Glow right={-100} bottom={-100} size={350} from={BRAND.sky} to="transparent" />
        <div style={{ position: "relative", zIndex: 1 }}>
          <Label>Trust &amp; Compliance</Label>
          <h2 style={{ fontSize: 36, color: BRAND.white, marginBottom: 12 }}>Built with student privacy at the center.</h2>
          <p style={{ fontSize: 16, color: BRAND.muted, maxWidth: 600, margin: "0 auto 40px", lineHeight: 1.7 }}>
            LIFT follows best practices for student data protection. All data is encrypted in transit and at rest, with role-based access controls and per-tenant isolation.
          </p>
          <div style={{ display: "flex", justifyContent: "center", gap: 40, flexWrap: "wrap" }}>
            {badges.map((b) => (
              <div key={b.alt} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
                <div style={{ width: 100, height: 100, borderRadius: 16, background: BRAND.white, display: "flex", alignItems: "center", justifyContent: "center", padding: 12 }}>
                  <img src={b.src} alt={b.alt} style={{ maxWidth: 72, maxHeight: 72, objectFit: "contain" }} />
                </div>
                <span style={{ fontSize: 14, fontWeight: 600, color: BRAND.text }}>{b.label}</span>
              </div>
            ))}
          </div>
        </div>
      </Glass>
    </Section>
  );
}

/* ─── FAQ ─── */

function FAQSection() {
  const [openIndex, setOpenIndex] = useState(null);
  const faqs = [
    { q: "Is LIFT a diagnostic assessment?", a: "No. LIFT is explicitly non-diagnostic. It does not assess learning disabilities, clinical conditions, or protected characteristics. It reveals learning behaviors and readiness patterns to inform admissions review — not to diagnose or label students." },
    { q: "How long does a LIFT session take?", a: "Most candidates complete the experience in 45-75 minutes. Sessions are self-paced and can be paused and resumed. The platform adapts task complexity by grade (6-7, 8, 9-11)." },
    { q: "Which grade levels does LIFT support?", a: "LIFT currently supports Grades 6-11 across three grade experiences. Each grade uses age-appropriate tasks, language, and UX adapted to the developmental stage of the student." },
    { q: "Can candidates complete LIFT on a mobile device?", a: "Yes. LIFT is a progressive web app (PWA) that works on any device with a modern browser. It supports offline mode for areas with unreliable connectivity — responses sync automatically when the connection is restored." },
    { q: "How does LIFT handle student data privacy?", a: "LIFT follows FERPA, COPPA, and GDPR best practices. All data is encrypted in transit and at rest. Each school's data is isolated via per-tenant database policies. Audio recordings from voice responses are deleted after transcription by default." },
    { q: "Does LIFT integrate with our existing systems?", a: "LIFT includes a CORE integration bridge for post-admissions handoff. Enterprise plans include SIS integrations with Veracross, Blackbaud, PowerSchool, and Ravenna, plus API access for custom integrations. All plans include CSV and PDF export." },
    { q: "Is white-labeling available?", a: "Yes, on the Enterprise plan. Schools can deploy LIFT on their own domain with full custom branding — logo, colors, and institutional identity throughout the candidate experience, reports, and emails." },
    { q: "What is the difference between Professional and Enterprise?", a: "Professional gives your team everything needed to run a complete admissions cycle — full session engine, TRI scoring, evaluator intelligence, reports, and support planning. Enterprise adds white label, SIS integrations, API access, a dedicated success manager, board-ready reporting, and custom session configuration. Most schools start with Professional." },
  ];

  return (
    <Section id="faq">
      <div style={{ textAlign: "center", marginBottom: 48 }}>
        <Label>Questions</Label>
        <h2 style={{ fontSize: 38, color: BRAND.white }}>Frequently asked.</h2>
      </div>
      <div style={{ maxWidth: 800, margin: "0 auto", display: "flex", flexDirection: "column", gap: 12 }}>
        {faqs.map((faq, i) => (
          <Glass key={i} className="" style={{ cursor: "pointer", padding: "20px 24px" }} onClick={() => setOpenIndex(openIndex === i ? null : i)}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h3 style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 17, fontWeight: 600, color: BRAND.white, margin: 0 }}>{faq.q}</h3>
              <span style={{ fontSize: 22, color: BRAND.muted, transform: openIndex === i ? "rotate(45deg)" : "none", transition: "transform 0.25s ease", flexShrink: 0, marginLeft: 16 }}>+</span>
            </div>
            {openIndex === i && <p style={{ fontSize: 15, color: BRAND.muted, lineHeight: 1.7, marginTop: 14 }}>{faq.a}</p>}
          </Glass>
        ))}
      </div>
    </Section>
  );
}

/* ─── Inquiry Form ─── */

function InquiryForm({ formType }) {
  const [form, setForm] = useState({ full_name: "", school_name: "", email: "", role: "", school_type: "", message: "" });
  const [status, setStatus] = useState("idle");
  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });
  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus("loading");
    try {
      await submitToHL(form, formType);
      setStatus("success");
      setForm({ full_name: "", school_name: "", email: "", role: "", school_type: "", message: "" });
    } catch { setStatus("error"); }
  };
  const inputStyle = { width: "100%", padding: "12px 16px", background: "rgba(255,255,255,0.06)", border: `1px solid ${BRAND.line}`, borderRadius: 10, color: BRAND.white, fontSize: 15, fontFamily: "'DM Sans', sans-serif", outline: "none", transition: "border-color 0.2s" };
  const labelStyle = { fontSize: 13, color: BRAND.muted, fontWeight: 600, marginBottom: 6, display: "block" };

  if (status === "success") {
    return (
      <Glass style={{ textAlign: "center", padding: 40 }}>
        <div style={{ fontSize: 40, marginBottom: 12 }}>&#10003;</div>
        <h3 style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 22, color: BRAND.white, marginBottom: 8 }}>Thank you!</h3>
        <p style={{ color: BRAND.muted, fontSize: 15 }}>We'll be in touch within 1 business day.</p>
        <button onClick={() => setStatus("idle")} style={{ marginTop: 20, background: "none", border: "none", color: BRAND.sky, cursor: "pointer", fontSize: 14, fontFamily: "'DM Sans', sans-serif" }}>Submit another inquiry</button>
      </Glass>
    );
  }

  return (
    <Glass>
      <h3 style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 22, color: BRAND.white, marginBottom: 20 }}>{formType}</h3>
      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div><label style={labelStyle}>Full Name *</label><input name="full_name" value={form.full_name} onChange={handleChange} required style={inputStyle} /></div>
        <div><label style={labelStyle}>School Name *</label><input name="school_name" value={form.school_name} onChange={handleChange} required style={inputStyle} /></div>
        <div><label style={labelStyle}>Work Email *</label><input name="email" type="email" value={form.email} onChange={handleChange} required style={inputStyle} /></div>
        <div>
          <label style={labelStyle}>Role</label>
          <select name="role" value={form.role} onChange={handleChange} style={{ ...inputStyle, cursor: "pointer" }}>
            <option value="">Select role...</option>
            <option value="Head of School">Head of School</option>
            <option value="Director of Admissions">Director of Admissions</option>
            <option value="Admissions Officer">Admissions Officer</option>
            <option value="Dean / Division Head">Dean / Division Head</option>
            <option value="Learning Support">Learning Support</option>
            <option value="IT / Technology">IT / Technology</option>
            <option value="Other">Other</option>
          </select>
        </div>
        <div>
          <label style={labelStyle}>School Type</label>
          <select name="school_type" value={form.school_type} onChange={handleChange} style={{ ...inputStyle, cursor: "pointer" }}>
            <option value="">Select type...</option>
            <option value="Independent Day">Independent Day</option>
            <option value="Boarding">Boarding</option>
            <option value="Therapeutic">Therapeutic</option>
            <option value="School Group / Network">School Group / Network</option>
            <option value="Other">Other</option>
          </select>
        </div>
        <div><label style={labelStyle}>Message</label><textarea name="message" value={form.message} onChange={handleChange} rows={3} style={{ ...inputStyle, resize: "vertical" }} /></div>
        {status === "error" && (
          <p style={{ fontSize: 14, color: BRAND.liftRose }}>
            Something went wrong. Please{" "}
            <a href={`mailto:lift@inteliflowai.com?subject=${encodeURIComponent(formType)}&body=${encodeURIComponent(`Name: ${form.full_name}\nSchool: ${form.school_name}\nEmail: ${form.email}\nRole: ${form.role}\nType: ${form.school_type}\nMessage: ${form.message}`)}`} style={{ color: BRAND.sky, textDecoration: "underline" }}>email us directly</a>{" "}instead.
          </p>
        )}
        <GradientButton onClick={undefined} style={{ width: "100%", textAlign: "center", opacity: status === "loading" ? 0.7 : 1, pointerEvents: status === "loading" ? "none" : "auto" }}>
          <button type="submit" disabled={status === "loading"} style={{ background: "none", border: "none", color: "inherit", font: "inherit", fontWeight: 700, cursor: "pointer", width: "100%" }}>
            {status === "loading" ? "Sending..." : "Send Inquiry"}
          </button>
        </GradientButton>
      </form>
    </Glass>
  );
}

/* ─── Forms Section ─── */

function FormsSection() {
  return (
    <Section id="contact">
      <Label>Get in Touch</Label>
      <h2 style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 42, color: BRAND.white, textAlign: "center", marginBottom: 40 }}>Ready to see LIFT in action?</h2>
      <div className="lift-forms-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 32, maxWidth: 900, margin: "0 auto" }}>
        <InquiryForm formType="Request a Demo" />
        <InquiryForm formType="Talk With Our Team" />
      </div>
    </Section>
  );
}

/* ─── CTA ─── */

function CTASection() {
  return (
    <Section>
      <Glass style={{ position: "relative", overflow: "hidden", textAlign: "center", padding: "64px 40px" }}>
        <Glow left={-80} top={-80} size={400} from={BRAND.magenta} to="transparent" />
        <Glow right={-80} bottom={-80} size={400} from={BRAND.sky} to="transparent" />
        <div style={{ position: "relative", zIndex: 1 }}>
          <h2 style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 42, color: BRAND.white, marginBottom: 20 }}>See your next class more clearly.</h2>
          <div className="lift-cta-buttons" style={{ display: "flex", justifyContent: "center", gap: 16, flexWrap: "wrap" }}>
            <GradientButton href="https://lift.inteliflowai.com/demo/new">Try Live Demo</GradientButton>
            <GlassButton href="https://lift.inteliflowai.com/register">Start Free Trial</GlassButton>
            <GlassButton href="#contact">Talk With Our Team</GlassButton>
          </div>
        </div>
      </Glass>
    </Section>
  );
}

/* ─── Footer ─── */

function Footer() {
  return (
    <footer style={{ borderTop: `1px solid ${BRAND.line}`, padding: "40px 40px 32px", background: "rgba(0,0,0,0.15)", width: "100%" }}>
      <div className="lift-footer-inner" style={{ maxWidth: 1280, marginLeft: "auto", marginRight: "auto", display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <img src={IMAGES.liftLogo} alt="LIFT" style={{ height: 40, marginBottom: 12, filter: "brightness(2.5)" }} />
          <p style={{ fontSize: 14, color: BRAND.muted, maxWidth: 300, lineHeight: 1.6 }}>Learning intelligence for admissions. Built on pedagogy. Powered by AI.</p>
        </div>
        <div className="lift-footer-right" style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 13, color: BRAND.muted }}>Part of the Inteliflow family</span>
            <img src={IMAGES.inteliflowLogo} alt="Inteliflow" style={{ height: 24 }} />
          </div>
          <div style={{ display: "flex", gap: 20, fontSize: 13 }}>
            <a href="https://inteliflowai.com/privacy-policy" style={{ color: BRAND.muted }} target="_blank" rel="noopener noreferrer">Privacy Policy</a>
            <a href="https://inteliflowai.com/terms-of-service" style={{ color: BRAND.muted }} target="_blank" rel="noopener noreferrer">Terms of Service</a>
            <a href="mailto:lift@inteliflowai.com" style={{ color: BRAND.muted }}>lift@inteliflowai.com</a>
          </div>
          <p style={{ fontSize: 12, color: "rgba(255,255,255,0.35)" }}>&copy; 2026 Inteliflow AI &middot; LIFT is a non-diagnostic learning intelligence platform</p>
        </div>
      </div>
    </footer>
  );
}

/* ─── Main App ─── */

export default function LiftLandingPage() {
  usePageStyles();
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    document.title = "LIFT — Learning Intelligence for Admissions | Inteliflow";
  }, []);

  return (
    <div className="lift-app" style={{ background: `radial-gradient(ellipse at 20% 0%, ${BRAND.bg3} 0%, ${BRAND.bg2} 30%, ${BRAND.bg} 70%)`, minHeight: "100vh", width: "100%", position: "relative" }}>
      <Header onOpen={() => setMobileOpen(true)} />
      <MobileMenu open={mobileOpen} onClose={() => setMobileOpen(false)} />
      <Hero />
      <StatsBar />
      <ProblemSection />
      <HowItWorks />
      <DimensionsSection />
      <SignalsSection />
      <YearRoundSection />
      <EnterpriseSection />
      <AudienceSection />
      <TransformationSection />
      <FoundersSection />
      <PricingSection />
      <ComplianceSection />
      <FAQSection />
      <FormsSection />
      <CTASection />
      <Footer />
    </div>
  );
}
