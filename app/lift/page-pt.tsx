/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/ban-ts-comment, @typescript-eslint/no-unused-vars, react/no-unescaped-entities */
// @ts-nocheck
'use client';

import { useState, useEffect } from "react";
import { AnalyticsHealthCard } from "@/components/analytics/AnalyticsHealthCard";

/* ════════════════════════════════════════════════════════════
   EduInsights Marketing Landing — Portuguese (BR)
   Mirror of app/lift/page.tsx with content translated, pricing
   removed (LIFT_HIDE_PRICING=true on the PT deployment), and
   audience copy adapted to Brazilian private/bilingual schools.
   ════════════════════════════════════════════════════════════ */

const IMAGES = {
  liftLogo: "/marketing/lift-logo.png",
  inteliflowLogo: "/marketing/inteliflow-logo.jpg",
  inteliflowFooterLogo: "/marketing/inteliflow-logo.jpg",
  barbaraImg: "/marketing/Barbara-1.png",
  marvinImg: "/marketing/Marvin.jpeg",
  ferpaLogo: "/marketing/FERPA.webp",
  coppaLogo: "/marketing/coppa.webp",
  gdprLogo: "/marketing/gdpr.webp",
  heroImage1: "/marketing/Hero-1.jpg",
  heroImage2: "/marketing/Hero-2.jpg",
};

const BRAND = {
  bg: "#0a1419",
  bg2: "#0d1f24",
  bg3: "#122a30",
  card: "rgba(20,184,166,0.06)",
  cardStrong: "rgba(20,184,166,0.12)",
  line: "rgba(45,212,191,0.18)",
  liftIndigo: "#14b8a6",
  liftEmerald: "#2dd4bf",
  liftRose: "#f43f5e",
  white: "#ffffff",
  text: "#e2e8f0",
  muted: "#94a3b8",
  mint: "#5eead4",
  sky: "#7dd3fc",
  purple: "#0d9488",
  blue: "#14b8a6",
  green: "#10b981",
  orange: "#f59e0b",
  magenta: "#ec4899",
};

const LEAD_ENDPOINT = "/api/lift/lead";

const NAV_ITEMS = [
  { label: "Como Funciona", href: "#how-it-works" },
  { label: "Recursos", href: "#features" },
  { label: "Perguntas Frequentes", href: "#faq" },
];

/* ─── HighLevel submission ─── */

function buildMailtoUrl(formData, formType) {
  const body = [
    `Nome: ${formData.full_name}`,
    `Escola: ${formData.school_name}`,
    `E-mail: ${formData.email}`,
    formData.role ? `Cargo: ${formData.role}` : null,
    formData.school_type ? `Tipo de Escola: ${formData.school_type}` : null,
    "",
    "Observações:",
    formData.message || "(nenhuma)",
  ].filter(Boolean).join("\n");
  return `mailto:lift@inteliflowai.com?subject=${encodeURIComponent(formType + ": " + formData.school_name)}&body=${encodeURIComponent(body)}`;
}

async function submitToHL(formData, formType) {
  const parts = (formData.full_name || "").trim().split(/\s+/);
  const first_name = parts[0] || "";
  const last_name = parts.slice(1).join(" ");
  const payload = {
    ...formData,
    first_name,
    last_name,
    form_type: formType,
    source: "eduinsights.datanex.ai",
    submitted_at: new Date().toISOString(),
    tags: ["eduinsights-lead", formType.toLowerCase().replace(/\s+/g, "-")],
  };
  try {
    const response = await fetch(LEAD_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!response.ok) throw new Error("Lead submission failed");
    return true;
  } catch {
    window.open(buildMailtoUrl(formData, formType), "_blank");
    throw new Error("Lead submission failed");
  }
}

/* ─── Global CSS injection ─── */

function usePageStyles() {
  useEffect(() => {
    const id = "lift-page-styles";
    if (document.getElementById(id)) return;
    const style = document.createElement("style");
    style.id = id;
    style.textContent = `
      @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=DM+Sans:wght@400;500;600;700&family=Geist+Mono:wght@400;500;600;700&display=swap');

      html, body {
        margin: 0;
        padding: 0;
        overflow-x: hidden;
        background: ${BRAND.bg};
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
      .lift-app *, .lift-app *::before, .lift-app *::after { box-sizing: border-box; }
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

      @keyframes lift-floatY { 0%,100%{transform:translateY(0);} 50%{transform:translateY(-14px);} }
      @keyframes lift-pulseGlow { 0%,100%{opacity:0.55;transform:scale(1);} 50%{opacity:0.85;transform:scale(1.08);} }
      @keyframes lift-fadeUp { from{opacity:0;transform:translateY(32px);} to{opacity:1;transform:translateY(0);} }
      @keyframes lift-slideIn { from{transform:translateX(100%);} to{transform:translateX(0);} }
      @keyframes lift-slideOut { from{transform:translateX(0);} to{transform:translateX(100%);} }

      .lift-card-hover { transition: transform 0.25s ease, box-shadow 0.25s ease; }
      .lift-card-hover:hover { transform: translateY(-4px); box-shadow: 0 20px 60px rgba(18,8,43,0.35); }

      @media (max-width: 1024px) {
        .lift-hero-grid { grid-template-columns: 1fr !important; }
        .lift-hero-image-wrap { justify-content: center !important; }
        .lift-desktop-nav { display: none !important; }
        .lift-mobile-btn { display: flex !important; }
        .lift-header-cta { display: none !important; }
        .lift-grid-3 { grid-template-columns: 1fr !important; }
        .lift-grid-2 { grid-template-columns: 1fr !important; }
        .lift-transform-grid { grid-template-columns: 1fr !important; }
        .lift-founders-grid { grid-template-columns: 1fr !important; }
        .lift-founders-grid img { margin-left: auto !important; margin-right: auto !important; display: block !important; }
        .lift-forms-grid { grid-template-columns: 1fr !important; }
        .lift-stats-row { flex-direction: column !important; gap: 16px !important; }
        .lift-cta-buttons { flex-direction: column !important; align-items: center !important; }
        .lift-app h1 { font-size: 48px !important; letter-spacing: -1.5px !important; }
      }
      @media (max-width: 720px) {
        .lift-app h1 { font-size: 36px !important; letter-spacing: -1px !important; }
        .lift-app h2 { font-size: 26px !important; }
        .lift-section { padding: 48px 16px !important; }
        .lift-hero-buttons { flex-direction: column !important; }
        .lift-hero-buttons a, .lift-hero-buttons button { width: 100% !important; text-align: center !important; }
        .lift-dimensions-grid { grid-template-columns: 1fr !important; }
        .lift-header-logo { height: 44px !important; }
        .lift-stats-row { gap: 12px !important; padding: 20px 16px !important; }
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

function Glass({ children, style, className = "", onClick }) {
  return (
    <div
      className={`lift-card-hover ${className}`}
      onClick={onClick}
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
    <span style={{ display: "inline-block", color: color || BRAND.mint, fontSize: 13, fontWeight: 700, textTransform: "uppercase", letterSpacing: 2, marginBottom: 16, fontFamily: "'DM Sans', sans-serif" }}>
      {children}
    </span>
  );
}

function GradientButton({ children, href, onClick, style: extraStyle }) {
  const s = {
    display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8,
    padding: "14px 32px", background: `linear-gradient(135deg, ${BRAND.purple}, ${BRAND.blue})`,
    color: BRAND.white, fontWeight: 700, fontSize: 15, border: "none", borderRadius: 10, cursor: "pointer",
    fontFamily: "'DM Sans', sans-serif", transition: "transform 0.2s ease, box-shadow 0.2s ease",
    boxShadow: `0 4px 20px rgba(20,184,166,0.35)`, letterSpacing: 0.3, ...extraStyle,
  };
  if (href) return <a href={href} style={s} target={href.startsWith("http") ? "_blank" : undefined} rel="noopener noreferrer">{children}</a>;
  return <button onClick={onClick} style={s}>{children}</button>;
}

function GlassButton({ children, onClick, href, style: extraStyle }) {
  const s = {
    display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8,
    padding: "14px 32px", background: "rgba(255,255,255,0.08)", color: BRAND.white,
    fontWeight: 600, fontSize: 15, border: `1px solid rgba(255,255,255,0.2)`, borderRadius: 10, cursor: "pointer",
    backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)",
    fontFamily: "'DM Sans', sans-serif", transition: "transform 0.2s ease, background 0.2s ease", ...extraStyle,
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
    <header style={{ position: "relative", zIndex: 1000, background: BRAND.bg, borderBottom: `1px solid ${BRAND.line}` }}>
      <div style={{ maxWidth: 1280, margin: "0 auto", padding: "16px 24px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <a href="https://inteliflowai.com" title="Voltar para Inteliflow" style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 36, height: 36, borderRadius: 999, border: `1px solid ${BRAND.line}`, background: BRAND.card, color: BRAND.muted, fontSize: 18, textDecoration: "none", flexShrink: 0 }}>&larr;</a>
          <a href="#top" style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <img src={IMAGES.liftLogo} alt="EduInsights" className="lift-header-logo" style={{ height: 60, width: "auto", objectFit: "contain" }} />
          </a>
        </div>

        <nav className="lift-desktop-nav" style={{ display: "flex", gap: 32, alignItems: "center" }}>
          {NAV_ITEMS.map((item) => (
            <a
              key={item.label}
              href={item.href}
              style={{ color: BRAND.muted, fontSize: 14, fontWeight: 500, transition: "color 0.2s" }}
              onMouseEnter={(e) => (e.target.style.color = BRAND.white)}
              onMouseLeave={(e) => (e.target.style.color = BRAND.muted)}
            >
              {item.label}
            </a>
          ))}
        </nav>

        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span className="lift-header-cta">
            <GradientButton href="#contact" style={{ padding: "10px 24px", fontSize: 14 }}>
              Agendar Demonstração
            </GradientButton>
          </span>
          <button
            className="lift-mobile-btn"
            onClick={onOpen}
            style={{ display: "none", alignItems: "center", justifyContent: "center", width: 44, height: 44, background: BRAND.card, border: `1px solid ${BRAND.line}`, borderRadius: 10, color: BRAND.white, fontSize: 22, cursor: "pointer" }}
            aria-label="Abrir menu"
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
      {open && <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 1100, transition: "opacity 0.3s" }} />}
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
        <button onClick={onClose} style={{ alignSelf: "flex-end", background: "none", border: "none", color: BRAND.white, fontSize: 28, cursor: "pointer", marginBottom: 32 }} aria-label="Fechar menu">&times;</button>
        {NAV_ITEMS.map((item) => (
          <a key={item.label} href={item.href} onClick={onClose}
            style={{ color: BRAND.text, fontSize: 18, fontWeight: 500, padding: "14px 0", borderBottom: `1px solid ${BRAND.line}` }}>
            {item.label}
          </a>
        ))}
        <div style={{ marginTop: 32, display: "flex", flexDirection: "column", gap: 12 }}>
          <GradientButton href="#contact" onClick={onClose} style={{ width: "100%", textAlign: "center" }}>Agendar Demonstração</GradientButton>
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
  const [barValues, setBarValues] = useState([0,0,0,0,0,0,0]);

  const SCREENS = 4;
  const SCREEN_DURATION = 7000;
  const FADE_DURATION = 400;

  useEffect(() => {
    const interval = setInterval(() => {
      setAnimating(true);
      setTimeout(() => { setScreen(s => (s + 1) % SCREENS); setAnimating(false); }, FADE_DURATION);
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
    if (screen !== 1) { setBarValues([0,0,0,0,0,0,0]); return; }
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
  const DIMS = ['Interpretação de Leitura', 'Expressão Escrita', 'Raciocínio & Problemas', 'Raciocínio Matemático', 'Reflexão & Metacog.', 'Persistência', 'Auto-Advocacia'];
  const mono = { fontFamily: "'Geist Mono', monospace" };

  const cardStyle = {
    background: 'rgba(15,15,25,0.85)', border: '1px solid rgba(20,184,166,0.25)',
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
          {['Perfil do Candidato', 'Dimensões de Prontidão', 'Inteligência do Avaliador', 'Relatórios Prontos'][screen]}
        </span>
      </div>

      {screen === 0 && (
        <div style={cardStyle}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 24 }}>
            <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'linear-gradient(135deg, #0f0c1d, #14b8a6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 18, fontWeight: 700, color: '#fff', flexShrink: 0 }}>PO</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 18, fontWeight: 700, color: '#e2e8f0', marginBottom: 3 }}>Pedro Oliveira</div>
              <div style={{ fontSize: 12, color: '#94a3b8', fontFamily: "'DM Sans', sans-serif" }}>8º ano · Colégio Vale Verde</div>
            </div>
            <span style={{ background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.4)', color: '#10b981', fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20, fontFamily: "'DM Sans', sans-serif" }}>✓ Concluído</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 24 }}>
            <div style={{ position: 'relative', width: 140, height: 140 }}>
              <svg width="140" height="140" viewBox="0 0 140 140">
                <path d="M 18 100 A 52 52 0 1 1 122 100" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="8" strokeLinecap="round" />
                <path d={triArc} fill="none" stroke="url(#triGradPt)" strokeWidth="8" strokeLinecap="round" />
                <defs><linearGradient id="triGradPt" x1="0%" y1="0%" x2="100%" y2="0%"><stop offset="0%" stopColor="#14b8a6" /><stop offset="100%" stopColor="#ec4899" /></linearGradient></defs>
              </svg>
              <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', paddingTop: 8 }}>
                <span style={{ ...mono, fontSize: 34, fontWeight: 700, color: '#e2e8f0', lineHeight: 1 }}>{triValue}</span>
                <span style={{ fontSize: 11, color: '#64748b', fontFamily: "'DM Sans', sans-serif" }}>/ 100</span>
              </div>
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#5eead4', fontFamily: "'DM Sans', sans-serif", marginBottom: 4 }}>Índice de</div>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#5eead4', fontFamily: "'DM Sans', sans-serif", marginBottom: 4 }}>Prontidão de</div>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#5eead4', fontFamily: "'DM Sans', sans-serif", marginBottom: 12 }}>Transição</div>
              <div style={{ background: 'rgba(20,184,166,0.12)', border: '1px solid rgba(20,184,166,0.25)', borderRadius: 8, padding: '6px 12px', fontSize: 12, color: '#94a3b8', fontFamily: "'DM Sans', sans-serif" }}>Sinais sólidos<br/>de prontidão</div>
            </div>
          </div>
        </div>
      )}

      {screen === 1 && (
        <div style={cardStyle}>
          <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 16, fontWeight: 700, color: '#e2e8f0', marginBottom: 18 }}>7 Dimensões de Prontidão</div>
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
            <span style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 16, fontWeight: 700, color: '#e2e8f0' }}>Briefing Pré-Entrevista</span>
          </div>
          <div style={{ fontSize: 11, color: '#14b8a6', marginBottom: 14, fontFamily: "'DM Sans', sans-serif", fontWeight: 600 }}>Gerado para Pedro Oliveira</div>
          {['Forte uso de evidências — releu trechos-chave antes de responder em 4 das 5 tarefas.', 'Distância raciocínio–expressão: raciocínio 74, escrita 68 — ideias presentes, expressão em desenvolvimento.', 'Pouco uso de dicas em tarefas difíceis apesar dos erros — pode não buscar apoio proativamente.'].map((obs, i) => (
            <div key={i} style={{ display: 'flex', gap: 10, marginBottom: 10, animation: `lift-fadeUp 0.4s ease ${i * 150}ms both` }}>
              <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#14b8a6', flexShrink: 0, marginTop: 6 }} />
              <p style={{ fontSize: 12, color: '#94a3b8', lineHeight: 1.6, margin: 0, fontFamily: "'DM Sans', sans-serif" }}>{obs}</p>
            </div>
          ))}
          <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', margin: '12px 0', paddingTop: 12 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: 1, fontFamily: "'DM Sans', sans-serif", marginBottom: 8 }}>Perguntas Sugeridas</div>
            {['"Conte como você abordou a tarefa mais difícil."', '"O que você faria diferente se pudesse refazer uma das tarefas?"'].map((q, i) => (
              <div key={i} style={{ background: 'rgba(20,184,166,0.08)', borderRadius: 6, padding: '7px 10px', marginBottom: 6, fontSize: 12, color: '#5eead4', lineHeight: 1.5, fontFamily: "'DM Sans', sans-serif", fontStyle: 'italic', animation: `lift-fadeUp 0.4s ease ${300 + i * 150}ms both` }}>{q}</div>
            ))}
          </div>
        </div>
      )}

      {screen === 3 && (
        <div style={cardStyle}>
          <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 16, fontWeight: 700, color: '#e2e8f0', marginBottom: 16 }}>Relatórios Prontos</div>
          <div style={{ display: 'flex', gap: 8, marginBottom: 18 }}>
            {[{ label: '📋 Interno', color: '#14b8a6', fill: false }, { label: '👨‍👩‍👧 Família', color: '#10b981', fill: true }, { label: '📍 Comitê', color: '#8b5cf6', fill: false }].map(b => (
              <div key={b.label} style={{ flex: 1, padding: '8px 4px', textAlign: 'center', background: b.fill ? b.color : 'transparent', border: `1px solid ${b.color}${b.fill ? '' : '60'}`, borderRadius: 8, fontSize: 11, fontWeight: 700, color: b.fill ? '#fff' : b.color, fontFamily: "'DM Sans', sans-serif", cursor: 'default' }}>{b.label}</div>
            ))}
          </div>
          <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, padding: '12px 14px', marginBottom: 14, position: 'relative', overflow: 'hidden' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <div style={{ width: 24, height: 24, borderRadius: 4, background: 'linear-gradient(135deg, #0f0c1d, #14b8a6)', flexShrink: 0 }} />
              <span style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', fontFamily: "'DM Sans', sans-serif" }}>Colégio Vale Verde · Relatório à Família</span>
            </div>
            <p style={{ fontSize: 12, color: '#64748b', lineHeight: 1.65, margin: 0, fontFamily: "'DM Sans', sans-serif" }}>"Prezada família Oliveira, Pedro abordou a experiência de hoje com curiosidade genuína e demonstrou força real em como ele..."</p>
            <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 32, background: 'linear-gradient(transparent, rgba(15,15,25,0.85))' }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 12 }}>
            {['Identidade da escola', 'Escrita por IA', 'Pronto para impressão'].map(t => (
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
      <div className="lift-hero-grid" style={{ maxWidth: 1280, marginLeft: "auto", marginRight: "auto", padding: "56px 24px 64px", display: "grid", gridTemplateColumns: "1.02fr 0.98fr", gap: 64, alignItems: "center", position: "relative", zIndex: 1 }}>
        <div>
          <Label>Para Escolas Particulares e Bilíngues</Label>
          <h1 style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 76, lineHeight: 0.95, letterSpacing: -2.8, color: BRAND.white, marginBottom: 16, marginTop: 12 }}>
            Inteligência de Aprendizagem para Admissões.
          </h1>
          <p style={{ fontSize: 24, color: BRAND.blue, marginBottom: 20, lineHeight: 1.4, fontWeight: 600, letterSpacing: -0.5, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
            Construído sobre pedagogia. Potencializado por IA.
          </p>
          <p style={{ fontSize: 18, color: BRAND.muted, marginBottom: 36, lineHeight: 1.7 }}>
            Avalia candidatos de forma independente em sete dimensões de prontidão. Complementa o seu sistema de gestão escolar — não substitui, e não depende de dados auto-relatados pela família. Do convite ao insight em menos de 75 minutos.
          </p>
          <div className="lift-hero-buttons" style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 24 }}>
            <GradientButton href="#contact">Agendar Demonstração</GradientButton>
            <GlassButton href="#how-it-works">Ver Como Funciona</GlassButton>
          </div>
          <p style={{ fontSize: 13, color: BRAND.muted, lineHeight: 1.7 }}>
            Não-diagnóstico &middot; Conforme LGPD &middot; Alinhado à FERPA/COPPA &middot; Suporte em português
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
    { value: "7", label: "Dimensões de Prontidão" },
    { value: "3", label: "Experiências por Faixa Etária" },
    { value: "40+", label: "Sinais de Aprendizagem" },
    { value: "45–75", label: "Minutos por Sessão" },
  ];
  return (
    <div style={{ background: "rgba(255,255,255,0.08)", borderTop: `1px solid ${BRAND.line}`, borderBottom: `1px solid ${BRAND.line}`, width: "100%" }}>
      <div className="lift-stats-row" style={{ maxWidth: 1280, marginLeft: "auto", marginRight: "auto", padding: "28px 24px", display: "flex", justifyContent: "center", gap: 64, alignItems: "center" }}>
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
    "A admissão tradicional mede o que os alunos já fizeram — notas, provas e cartas de recomendação. Raramente revela como o aluno pensa, se adapta ou persiste diante de desafios.",
    "Sem um framework estruturado, avaliadores recorrem à intuição e a entrevistas de 30 minutos para tomar decisões que moldam os próximos anos do aluno.",
    "O resultado: alguns alunos que prosperariam com o suporte certo são deixados de lado, e outros são admitidos sem um plano de preparação.",
  ];
  return (
    <Section id="problem">
      <Label>O Problema</Label>
      <h2 style={{ fontSize: 48, color: BRAND.white, maxWidth: 900, marginBottom: 48 }}>
        Equipes de admissão tomam decisões de alto impacto com pouca visibilidade de como os alunos realmente aprendem.
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
    { num: "1", title: "Convide", desc: "Envie aos candidatos um link seguro. Eles realizam a experiência adaptativa do EduInsights em qualquer dispositivo — sem instalação. As sessões duram de 45 a 75 minutos." },
    { num: "2", title: "Experiência", desc: "O EduInsights apresenta tarefas adequadas à faixa etária de leitura, escrita, matemática, raciocínio e reflexão. Captura não apenas as respostas — mas como os alunos as abordam." },
    { num: "3", title: "Insight", desc: "A IA gera o Índice de Prontidão de Transição (IPT), pontuações em 7 dimensões e relatórios em linguagem clara para sua equipe de admissão." },
    { num: "4", title: "Decida", desc: "Sua equipe analisa com confiança. Briefings pré-entrevista, rubricas estruturadas e comparações de coorte tornam cada decisão mais bem informada." },
  ];
  return (
    <div style={{ background: "rgba(20,184,166,0.08)", width: "100%" }}>
      <Section id="how-it-works">
        <Label>Como Funciona</Label>
        <h2 style={{ fontSize: 38, color: BRAND.white, marginBottom: 48 }}>Do convite ao insight em quatro etapas.</h2>
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
    { name: "Interpretação de Leitura", color: BRAND.liftIndigo, desc: "Como o aluno se relaciona com o texto — estratégias de compreensão, uso de evidências e a capacidade de extrair sentido de trechos no nível da série." },
    { name: "Expressão Escrita", color: BRAND.liftEmerald, desc: "Clareza, estrutura e voz na produção escrita. O EduInsights captura comportamento de revisão e como as ideias se desenvolvem entre os rascunhos." },
    { name: "Raciocínio & Estruturação de Problemas", color: BRAND.orange, desc: "Como o aluno aborda problemas desconhecidos — se identifica padrões, organiza informações e constrói soluções lógicas." },
    { name: "Raciocínio Matemático", color: BRAND.liftRose, desc: "Acurácia, modelagem do problema, reconhecimento de padrões e a capacidade de explicar o pensamento matemático. Avaliado no nível da série — não em dificuldade absoluta." },
    { name: "Reflexão & Metacognição", color: BRAND.sky, desc: "Consciência sobre o próprio processo de aprendizagem. O EduInsights mede como os alunos avaliam o próprio trabalho, nomeiam desafios e planejam próximos passos." },
    { name: "Persistência em Tarefas", color: BRAND.magenta, desc: "Engajamento sustentado sob desafio. Medido por profundidade de revisão, tempo na tarefa e disposição de retornar a itens difíceis." },
    { name: "Auto-Advocacia Acadêmica", color: BRAND.mint, desc: "Como os alunos buscam apoio — se usam dicas, pedem esclarecimento ou aproveitam ferramentas disponíveis quando travam." },
  ];
  return (
    <Section id="features">
      <Label>O que o EduInsights mede</Label>
      <h2 style={{ fontSize: 38, color: BRAND.white, marginBottom: 16 }}>Sete dimensões de prontidão de aprendizagem.</h2>
      <p style={{ fontSize: 17, color: BRAND.muted, maxWidth: 720, marginBottom: 48, lineHeight: 1.7 }}>
        O EduInsights não diagnostica. Ele revela como o aluno aborda tarefas acadêmicas — os sinais que indicam quem prosperará com o suporte certo.
      </p>
      <div className="lift-dimensions-grid" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 24, marginBottom: 36 }}>
        {dims.map((d) => (
          <Glass key={d.name} style={{ borderLeft: `4px solid ${d.color}` }}>
            <h3 style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 20, fontWeight: 700, color: BRAND.white, marginBottom: 8 }}>{d.name}</h3>
            <p style={{ fontSize: 15, color: BRAND.muted, lineHeight: 1.7 }}>{d.desc}</p>
          </Glass>
        ))}
      </div>
      <Glass style={{ borderLeft: `4px solid ${BRAND.liftIndigo}`, background: "rgba(20,184,166,0.10)" }}>
        <p style={{ fontSize: 15, color: BRAND.muted, lineHeight: 1.7 }}>
          <strong style={{ color: BRAND.white }}>O EduInsights não é uma ferramenta diagnóstica.</strong> Não avalia transtornos de aprendizagem, condições clínicas ou características protegidas. Os resultados apoiam a análise de admissão e devem ser interpretados por profissionais qualificados da escola.
        </p>
      </Glass>
    </Section>
  );
}

/* ─── Enriched Signals ─── */

function SignalsSection() {
  const signals = [
    { name: "Tempo Estendido de Leitura", category: "Leitura", desc: "Detecta quando um aluno gasta significativamente mais tempo do que o esperado em trechos de leitura — pode se beneficiar de tempo adicional de processamento." },
    { name: "Distância Raciocínio–Expressão", category: "Escrita", desc: "Forte desempenho em raciocínio acompanhado de produção escrita limitada — a barreira pode ser de expressão, não de compreensão." },
    { name: "Ritmo Variável nas Tarefas", category: "Atenção", desc: "Alocação de tempo muito variável entre tarefas — apressando algumas e gastando tempo desproporcional em outras." },
    { name: "Pouca Busca de Apoio", category: "Auto-regulação", desc: "Raramente usou as dicas disponíveis ao ter dificuldade — pode se beneficiar de estratégias explícitas para buscar apoio." },
    { name: "Dificuldade de Concluir Tarefas", category: "Atenção", desc: "Deixou várias tarefas incompletas — pode refletir dificuldade em sustentar o esforço ao longo de experiências mais longas." },
    { name: "Expressão Metacognitiva Limitada", category: "Auto-regulação", desc: "Respostas reflexivas curtas que raramente fazem referência ao próprio processo de pensamento." },
  ];

  return (
    <div style={{ background: "rgba(13,148,136,0.08)", width: "100%" }}>
      <Section>
        <Label>Além das notas</Label>
        <h2 style={{ fontSize: 38, color: BRAND.white, marginBottom: 16 }}>
          9 sinais comportamentais enriquecidos. Não são diagnósticos — são observações.
        </h2>
        <p style={{ fontSize: 17, color: BRAND.muted, maxWidth: 780, marginBottom: 48, lineHeight: 1.7 }}>
          O EduInsights captura mais de 40 sinais de aprendizagem em cada sessão e os destila em observações comportamentais acionáveis em leitura, escrita, matemática, atenção e auto-regulação. Cada sinal descreve o que foi observado — nunca o que está &quot;errado.&quot; Cada um inclui evidências em linguagem clara e uma recomendação específica para sua equipe.
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
        <Glass style={{ marginTop: 32, borderLeft: `4px solid ${BRAND.sky}`, background: "rgba(125,211,252,0.08)" }}>
          <p style={{ fontSize: 15, color: BRAND.muted, lineHeight: 1.7 }}>
            <strong style={{ color: BRAND.white }}>Cada sinal inclui:</strong> um nível de severidade (consultivo ou notável), as evidências da sessão e uma recomendação específica — como explorar tempo estendido, andaimes de pré-escrita ou estratégias de busca de apoio com a família.
          </p>
        </Glass>
      </Section>
    </div>
  );
}

/* ─── Year-Round ─── */

function YearRoundSection() {
  const seasons = [
    { period: "Ago–Nov", title: "Período de Admissões", desc: "Conduza seu ciclo completo: sessões dos candidatos, análise dos avaliadores, inteligência de lista de espera." },
    { period: "Dez–Fev", title: "Pós-Admissões", desc: "Prepare-se para os novos alunos: integração com sistemas escolares, planos de suporte, acompanhamento de resultados." },
    { period: "Jan–Fev", title: "Período de Integração", desc: "Receba bem novos alunos: painel do coordenador pedagógico, checkpoints de 90 dias, orientação de turma." },
    { period: "Mar–Jul", title: "Preparação de Ciclo", desc: "Esteja pronto: configuração de ciclo, integração da equipe, modo demonstração para feiras." },
  ];
  return (
    <Section>
      <Label>Mais que apenas o período de admissões</Label>
      <h2 style={{ fontSize: 38, color: BRAND.white, marginBottom: 48 }}>Uma plataforma que sua equipe usa o ano inteiro.</h2>
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
    { title: "Escolas Particulares", desc: "Obtenha visibilidade estruturada de cada candidato. Substitua a intuição por dados de prontidão em nível de dimensão que orientam colocação e suporte desde o primeiro dia." },
    { title: "Escolas Bilíngues e Internacionais", desc: "Entenda como os candidatos aprendem antes de chegarem à sua escola. Identifique alunos que precisam de suporte na transição e prepare sua equipe pedagógica adequadamente." },
    { title: "Escolas com Suporte Psicopedagógico", desc: "Veja comportamentos de aprendizagem — não apenas históricos. O EduInsights revela sinais de persistência, reflexão e auto-advocacia que mais importam em ambientes com apoio estruturado." },
    { title: "Redes e Grupos Escolares", desc: "Padronize a inteligência de admissão entre unidades. Benchmarks de coorte e rubricas compartilhadas garantem decisões consistentes e defensáveis em escala." },
  ];
  return (
    <Section>
      <Label>Para quem é</Label>
      <h2 style={{ fontSize: 40, color: BRAND.white, marginBottom: 48 }}>Feito para escolas que querem entender seus candidatos, não apenas classificá-los.</h2>
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
    ["Boletins estáticos e notas de prova", "Perfis dinâmicos de prontidão"],
    ["Entrevistas de 30 minutos", "Briefings pré-entrevista e rubricas estruturadas"],
    ["Decisões de colocação por intuição", "Pontuação IPT e análise por dimensão com IA"],
    ["Sem visibilidade após a admissão", "Acompanhamento de plano de suporte o ano todo"],
    ["Um avaliador, uma perspectiva", "Benchmarks de coorte e alinhamento de equipe"],
  ];
  return (
    <Section>
      <div className="lift-transform-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1.2fr", gap: 56, alignItems: "center" }}>
        <div>
          <Label>A mudança</Label>
          <h2 style={{ fontSize: 38, color: BRAND.white, marginBottom: 16 }}>Da intuição &rarr; à confiança</h2>
          <p style={{ fontSize: 16, color: BRAND.muted, lineHeight: 1.7 }}>
            O EduInsights substitui dados fragmentados de admissão por uma camada estruturada de insight assistida por IA, que acompanha cada candidato da inscrição à integração.
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
        <Label>A equipe por trás do EduInsights</Label>
        <h2 style={{ fontSize: 38, color: BRAND.white }}>Fundado por educadores e engenheiros.</h2>
      </div>
      <div className="lift-founders-grid" style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 32 }}>
        <Glass style={{ textAlign: "center" }}>
          <img src={IMAGES.barbaraImg} alt="Barbara Leventhal" style={{ width: 130, height: 130, borderRadius: "50%", objectFit: "cover", display: "block", margin: "0 auto 20px", border: `3px solid ${BRAND.line}` }} />
          <h3 style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 24, color: BRAND.white, marginBottom: 4 }}>Barbara Leventhal</h3>
          <p style={{ color: BRAND.sky, fontSize: 14, fontWeight: 600, marginBottom: 16 }}>Co-Fundadora &amp; Diretora Pedagógica</p>
          <p style={{ fontSize: 15, color: BRAND.muted, lineHeight: 1.7 }}>
            Com mais de 30 anos em educação em três países, Barbara traz profunda experiência em design curricular, avaliação de alunos e suporte à aprendizagem. Ela lidera o framework pedagógico do EduInsights, garantindo que cada dimensão seja fundamentada em décadas de visão real de sala de aula.
          </p>
        </Glass>
        <Glass style={{ textAlign: "center" }}>
          <img src={IMAGES.marvinImg} alt="Marvin Leventhal" style={{ width: 130, height: 130, borderRadius: "50%", objectFit: "cover", display: "block", margin: "0 auto 20px", border: `3px solid ${BRAND.line}` }} />
          <h3 style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 24, color: BRAND.white, marginBottom: 4 }}>Marvin Leventhal</h3>
          <p style={{ color: BRAND.sky, fontSize: 14, fontWeight: 600, marginBottom: 16 }}>Co-Fundador &amp; CEO</p>
          <p style={{ fontSize: 15, color: BRAND.muted, lineHeight: 1.7 }}>
            Tecnólogo e empreendedor com duas décadas de experiência construindo plataformas que conectam sistemas complexos. Marvin lidera a estratégia de produto e engenharia, garantindo que o EduInsights entregue insight real — não apenas dados — a cada escola que atende.
          </p>
        </Glass>
      </div>
    </Section>
  );
}

/* ─── Compliance ─── */

function ComplianceSection() {
  const badges = [
    { src: IMAGES.coppaLogo, alt: "COPPA", label: "Alinhado à COPPA" },
    { src: IMAGES.ferpaLogo, alt: "FERPA", label: "Alinhado à FERPA" },
    { src: IMAGES.gdprLogo, alt: "GDPR/LGPD", label: "Conforme LGPD/GDPR" },
  ];
  return (
    <Section id="compliance">
      <Glass style={{ position: "relative", overflow: "hidden", textAlign: "center", padding: "56px 40px" }}>
        <Glow left={-100} top={-100} size={350} from={BRAND.liftIndigo} to="transparent" />
        <Glow right={-100} bottom={-100} size={350} from={BRAND.sky} to="transparent" />
        <div style={{ position: "relative", zIndex: 1 }}>
          <Label>Confiança &amp; Conformidade</Label>
          <h2 style={{ fontSize: 36, color: BRAND.white, marginBottom: 12 }}>Construído com a privacidade do aluno no centro.</h2>
          <p style={{ fontSize: 16, color: BRAND.muted, maxWidth: 600, margin: "0 auto 40px", lineHeight: 1.7 }}>
            O EduInsights segue as melhores práticas de proteção de dados de alunos. Todos os dados são criptografados em trânsito e em repouso, com controle de acesso baseado em função e isolamento por instituição. Em conformidade com a LGPD (Lei Geral de Proteção de Dados Pessoais).
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
    { q: "O EduInsights é uma avaliação diagnóstica?", a: "Não. O EduInsights é explicitamente não-diagnóstico. Ele não avalia transtornos de aprendizagem, condições clínicas ou características protegidas. Revela comportamentos de aprendizagem e padrões de prontidão para apoiar a análise de admissão — não para diagnosticar ou rotular alunos." },
    { q: "Quanto tempo dura uma sessão do EduInsights?", a: "A maioria dos candidatos completa a experiência em 45 a 75 minutos. As sessões são autônomas e podem ser pausadas e retomadas. A plataforma adapta a complexidade das tarefas por faixa etária (6º-7º ano, 8º ano, 9º ano ao Ensino Médio)." },
    { q: "Quais séries o EduInsights atende?", a: "O EduInsights atende atualmente do 6º ano ao Ensino Médio em três experiências por faixa etária. Cada faixa usa tarefas, linguagem e UX adequados ao estágio de desenvolvimento do aluno." },
    { q: "Os candidatos podem completar o EduInsights em dispositivos móveis?", a: "Sim. O EduInsights é um Progressive Web App (PWA) que funciona em qualquer dispositivo com navegador moderno. Suporta modo offline em áreas com conectividade instável — as respostas sincronizam automaticamente quando a conexão é restaurada." },
    { q: "Como o EduInsights cuida da privacidade dos dados dos alunos?", a: "O EduInsights segue as melhores práticas da LGPD, FERPA, COPPA e GDPR. Todos os dados são criptografados em trânsito e em repouso. Os dados de cada escola são isolados por políticas de banco de dados por instituição. Gravações de áudio das respostas por voz são excluídas após a transcrição por padrão." },
    { q: "O EduInsights se integra aos nossos sistemas existentes?", a: "O EduInsights inclui uma ponte de integração para handoff pós-admissão. Planos Enterprise incluem integrações com sistemas de gestão escolar e acesso à API para integrações personalizadas. Todos os planos incluem exportação CSV e PDF." },
    { q: "É possível personalizar a marca da escola (white-label)?", a: "Sim, no plano Enterprise. As escolas podem implantar o EduInsights em seu próprio domínio com personalização completa — logo, cores e identidade institucional na experiência do candidato, relatórios e e-mails." },
    { q: "O EduInsights está disponível em português?", a: "Sim. A interface, os relatórios, os briefings e a experiência do candidato estão totalmente disponíveis em português brasileiro. Tarefas, narrativas geradas por IA e orientações pedagógicas foram adaptadas ao contexto educacional brasileiro." },
  ];

  return (
    <Section id="faq">
      <div style={{ textAlign: "center", marginBottom: 48 }}>
        <Label>Perguntas</Label>
        <h2 style={{ fontSize: 38, color: BRAND.white }}>Frequentemente perguntadas.</h2>
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
  const [form, setForm] = useState({ full_name: "", school_name: "", email: "", role: "", school_type: "", message: "", website: "" });
  const [status, setStatus] = useState("idle");
  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });
  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus("loading");
    try {
      await submitToHL(form, formType);
      setStatus("success");
      setForm({ full_name: "", school_name: "", email: "", role: "", school_type: "", message: "", website: "" });
    } catch { setStatus("error"); }
  };
  const inputStyle = { width: "100%", padding: "12px 16px", background: "rgba(255,255,255,0.06)", border: `1px solid ${BRAND.line}`, borderRadius: 10, color: BRAND.white, fontSize: 15, fontFamily: "'DM Sans', sans-serif", outline: "none", transition: "border-color 0.2s" };
  const labelStyle = { fontSize: 13, color: BRAND.muted, fontWeight: 600, marginBottom: 6, display: "block" };

  if (status === "success") {
    return (
      <Glass style={{ textAlign: "center", padding: 40 }}>
        <div style={{ fontSize: 40, marginBottom: 12 }}>&#10003;</div>
        <h3 style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 22, color: BRAND.white, marginBottom: 8 }}>Obrigado!</h3>
        <p style={{ color: BRAND.muted, fontSize: 15 }}>Entraremos em contato em até 1 dia útil.</p>
        <button onClick={() => setStatus("idle")} style={{ marginTop: 20, background: "none", border: "none", color: BRAND.sky, cursor: "pointer", fontSize: 14, fontFamily: "'DM Sans', sans-serif" }}>Enviar outra mensagem</button>
      </Glass>
    );
  }

  return (
    <Glass>
      <h3 style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 22, color: BRAND.white, marginBottom: 20 }}>{formType}</h3>
      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div style={{ position: "absolute", left: "-10000px", width: 1, height: 1, overflow: "hidden" }} aria-hidden="true">
          <label>Website<input name="website" value={form.website} onChange={handleChange} tabIndex={-1} autoComplete="off" /></label>
        </div>
        <div><label style={labelStyle}>Nome Completo *</label><input name="full_name" value={form.full_name} onChange={handleChange} required style={inputStyle} /></div>
        <div><label style={labelStyle}>Nome da Escola *</label><input name="school_name" value={form.school_name} onChange={handleChange} required style={inputStyle} /></div>
        <div><label style={labelStyle}>E-mail Profissional *</label><input name="email" type="email" value={form.email} onChange={handleChange} required style={inputStyle} /></div>
        <div>
          <label style={labelStyle}>Cargo</label>
          <select name="role" value={form.role} onChange={handleChange} style={{ ...inputStyle, cursor: "pointer" }}>
            <option value="">Selecione um cargo...</option>
            <option value="Diretor(a)">Diretor(a) da Escola</option>
            <option value="Coordenador(a) de Admissões">Coordenador(a) de Admissões</option>
            <option value="Equipe de Admissões">Equipe de Admissões</option>
            <option value="Coordenador(a) Pedagógico(a)">Coordenador(a) Pedagógico(a)</option>
            <option value="Suporte à Aprendizagem">Suporte à Aprendizagem</option>
            <option value="TI / Tecnologia">TI / Tecnologia</option>
            <option value="Outro">Outro</option>
          </select>
        </div>
        <div>
          <label style={labelStyle}>Tipo de Escola</label>
          <select name="school_type" value={form.school_type} onChange={handleChange} style={{ ...inputStyle, cursor: "pointer" }}>
            <option value="">Selecione um tipo...</option>
            <option value="Particular">Escola Particular</option>
            <option value="Bilíngue">Escola Bilíngue</option>
            <option value="Internacional">Escola Internacional</option>
            <option value="Rede / Grupo Escolar">Rede / Grupo Escolar</option>
            <option value="Outro">Outro</option>
          </select>
        </div>
        <div><label style={labelStyle}>Mensagem</label><textarea name="message" value={form.message} onChange={handleChange} rows={3} style={{ ...inputStyle, resize: "vertical" }} /></div>
        {status === "error" && (
          <p style={{ fontSize: 14, color: BRAND.liftRose }}>
            Algo deu errado. Por favor,{" "}
            <a href={`mailto:lift@inteliflowai.com?subject=${encodeURIComponent(formType)}&body=${encodeURIComponent(`Nome: ${form.full_name}\nEscola: ${form.school_name}\nE-mail: ${form.email}\nCargo: ${form.role}\nTipo: ${form.school_type}\nMensagem: ${form.message}`)}`} style={{ color: BRAND.sky, textDecoration: "underline" }}>envie por e-mail</a>{" "}diretamente.
          </p>
        )}
        <GradientButton onClick={undefined} style={{ width: "100%", textAlign: "center", opacity: status === "loading" ? 0.7 : 1, pointerEvents: status === "loading" ? "none" : "auto" }}>
          <button type="submit" disabled={status === "loading"} style={{ background: "none", border: "none", color: "inherit", font: "inherit", fontWeight: 700, cursor: "pointer", width: "100%" }}>
            {status === "loading" ? "Enviando..." : "Enviar Solicitação"}
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
      <Label>Entre em Contato</Label>
      <h2 style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 42, color: BRAND.white, textAlign: "center", marginBottom: 12 }}>Pronto para ver o EduInsights em ação?</h2>
      <p style={{ color: BRAND.muted, fontSize: 16, textAlign: "center", marginBottom: 40, maxWidth: 560, margin: "0 auto 40px" }}>
        Conte sobre sua escola e organizaremos uma demonstração — ou tire dúvidas sobre planos, implantação e suporte.
      </p>
      <div style={{ maxWidth: 560, margin: "0 auto" }}>
        <InquiryForm formType="Solicitar Demonstração" />
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
          <h2 style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 42, color: BRAND.white, marginBottom: 20 }}>Veja sua próxima turma com mais clareza.</h2>
          <div className="lift-cta-buttons" style={{ display: "flex", justifyContent: "center", gap: 16, flexWrap: "wrap" }}>
            <GradientButton href="#contact">Agendar Demonstração</GradientButton>
            <GlassButton href="#how-it-works">Ver Como Funciona</GlassButton>
          </div>
        </div>
      </Glass>
    </Section>
  );
}

/* ─── Footer ─── */

function Footer() {
  return (
    <footer style={{ background: BRAND.bg, borderTop: `1px solid ${BRAND.line}`, padding: "48px 24px", width: "100%" }}>
      <div style={{ maxWidth: 1140, margin: "0 auto", display: "flex", flexDirection: "column", alignItems: "center", gap: 20 }}>
        <img src={IMAGES.liftLogo} alt="EduInsights" style={{ height: 56 }} />
        <p style={{ fontSize: 14, color: BRAND.muted, textAlign: "center" }}>
          Inteligência de aprendizagem para admissões. Construído sobre pedagogia. Potencializado por IA.
        </p>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontSize: 12, color: `${BRAND.muted}88` }}>Um produto</span>
          <img src={IMAGES.inteliflowLogo} alt="Inteliflow" style={{ height: 28, borderRadius: 4 }} />
        </div>
        <div style={{ display: "flex", gap: 24, fontSize: 13, color: BRAND.muted }}>
          <a href="/legal/privacy" style={{ color: BRAND.muted, textDecoration: "underline", textUnderlineOffset: 3 }}>Política de Privacidade</a>
          <a href="/legal/terms" style={{ color: BRAND.muted, textDecoration: "underline", textUnderlineOffset: 3 }}>Termos de Uso</a>
        </div>
        <a href="mailto:lift@inteliflowai.com" style={{ fontSize: 14, color: BRAND.sky, fontWeight: 500 }}>
          lift@inteliflowai.com
        </a>
        <p style={{ fontSize: 12, color: `${BRAND.muted}66`, textAlign: "center" }}>
          &copy; 2026 Inteliflow &middot; EduInsights é uma plataforma não-diagnóstica de inteligência de aprendizagem
        </p>
      </div>
    </footer>
  );
}

/* ─── Main App ─── */

export function LiftLandingPagePt() {
  usePageStyles();
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    document.title = "EduInsights — Inteligência de Aprendizagem para Admissões | Inteliflow";
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
      <AudienceSection />
      <TransformationSection />
      <FoundersSection />
      <ComplianceSection />
      <FAQSection />
      <FormsSection />
      <CTASection />
      <Footer />
      <AnalyticsHealthCard variant="overlay" />
    </div>
  );
}
