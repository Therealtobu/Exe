"use client";
import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Home as HomeIcon, BookOpen, Tag, LogIn as LoginIcon, ArrowRight,
  Shield, Lock, BarChart2, Key, Users, Check,
  Zap, ChevronDown, ChevronUp, Terminal, UserPlus, Star, AlertTriangle
} from "lucide-react";
import { api } from "@/lib/api";
import { ensureTurnstileLoaded } from "@/lib/turnstile";

// ── Liquid Glass Bottom Nav ──────────────────────────────────────────────────
const LANDING_TABS = [
  { id: "home",     label: "Home",     Icon: HomeIcon  },
  { id: "tutorial", label: "Tutorial", Icon: BookOpen  },
  { id: "price",    label: "Pricing",  Icon: Tag       },
  { id: "login",    label: "Account",  Icon: LoginIcon },
] as const;
type TabId = typeof LANDING_TABS[number]["id"];

function LiquidNav({ active, onChange }: { active: TabId; onChange: (t: TabId) => void }) {
  const barRef      = useRef<HTMLDivElement>(null);
  const pillRef     = useRef<HTMLDivElement>(null);
  const refrRef     = useRef<HTMLDivElement>(null); // refraction overlay
  const rafRef      = useRef<number>(0);

  // Spring physics state
  const spring = useRef({ x: 0, target: 0, vel: 0, dragging: false, dragOffset: 0 });
  const activeIdx = LANDING_TABS.findIndex(t => t.id === active);

  // Spring constants
  const K = 280;   // stiffness
  const D = 22;    // damping
  const M = 1;     // mass

  const getTabLeft = useCallback((idx: number) => {
    try { const bar = barRef.current; if (!bar) return idx * 88 + 4; return (bar.offsetWidth / 4) * idx + 4; } catch { return idx * 88 + 4; }
  }, []);

  const getTabWidth = useCallback(() => {
    try { const bar = barRef.current; if (!bar) return 80; return bar.offsetWidth / 4 - 8; } catch { return 80; }
  }, []);

  const mountedRef = useRef(true);
  useEffect(() => { mountedRef.current = true; return () => { mountedRef.current = false; cancelAnimationFrame(rafRef.current); }; }, []);

  // Run spring simulation
  const runSpring = useCallback(() => {
    if (!mountedRef.current) return;
    const s = spring.current;
    const pill = pillRef.current;
    const bar = barRef.current;
    const refr = refrRef.current;
    if (!pill || !bar) return;

    if (!s.dragging) {
      // Spring toward target
      const dx = s.target - s.x;
      const force = K * dx - D * s.vel;
      s.vel += (force / M) * (1 / 60);
      s.x += s.vel * (1 / 60);

      const tw = getTabWidth();
      pill.style.left = `${s.x}px`;

      // Stretch pill based on velocity — Newton inertia
      const stretch = 1 + Math.abs(s.vel) * 0.0018;
      const squish  = 1 - Math.abs(s.vel) * 0.0012;
      pill.style.transform = `scaleX(${Math.min(stretch, 1.18)}) scaleY(${Math.max(squish, 0.88)})`;

      // Refraction distortion based on velocity
      if (refr) {
        const intensity = Math.min(Math.abs(s.vel) * 0.6, 18);
        const dir = s.vel > 0 ? 1 : -1;
        refr.style.backdropFilter = intensity > 0.5
          ? `blur(${0.5 + intensity * 0.04}px) brightness(1.08)`
          : "none";
        // Shift refraction window slightly opposite velocity (inertia)
        refr.style.transform = `translateX(${-dir * intensity * 0.4}px)`;
      }

      // Stop if settled
      if (Math.abs(dx) < 0.1 && Math.abs(s.vel) < 0.1) {
        s.x = s.target; s.vel = 0;
        pill.style.transform = "scaleX(1) scaleY(1)";
        if (refr) { refr.style.backdropFilter = "none"; refr.style.transform = "translateX(0)"; }
        return;
      }
    }
    rafRef.current = requestAnimationFrame(runSpring);
  }, [getTabWidth]);

  // Init pill position on mount / active change
  useEffect(() => {
    const target = getTabLeft(activeIdx);
    spring.current.target = target;
    if (spring.current.x === 0) spring.current.x = target; // init
    cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(runSpring);
    return () => cancelAnimationFrame(rafRef.current);
  }, [active, activeIdx, getTabLeft, runSpring]);

  // Shimmer light animation
  const shimRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let t = 0; let f: number;
    const tick = () => {
      t += 0.008;
      if (shimRef.current) {
        const x = 50 + Math.sin(t) * 35;
        const y = 50 + Math.cos(t * 0.6) * 25;
        shimRef.current.style.background =
          `radial-gradient(ellipse 70% 50% at ${x}% ${y}%, rgba(255,255,255,0.10) 0%, transparent 70%),` +
          `radial-gradient(ellipse 35% 35% at ${100-x}% ${100-y}%, rgba(160,210,255,0.06) 0%, transparent 55%)`;
      }
      f = requestAnimationFrame(tick);
    };
    f = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(f);
  }, []);

  // Drag handlers
  const onPointerDown = (e: React.PointerEvent) => {
    const bar = barRef.current; if (!bar) return;
    spring.current.dragging = true;
    spring.current.dragOffset = e.clientX - spring.current.x;
    cancelAnimationFrame(rafRef.current);
    spring.current.vel = 0;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!spring.current.dragging) return;
    const bar = barRef.current; const pill = pillRef.current;
    if (!bar || !pill) return;

    const tw = getTabWidth();
    const minX = 4;
    const maxX = bar.offsetWidth - tw - 4;
    const raw = e.clientX - spring.current.dragOffset;

    // Rubber band at edges
    const rubberBand = (val: number, min: number, max: number) => {
      if (val < min) return min - Math.sqrt(min - val) * 3;
      if (val > max) return max + Math.sqrt(val - max) * 3;
      return val;
    };
    const x = rubberBand(raw, minX, maxX);
    spring.current.x = x;
    pill.style.left = `${x}px`;

    // Slight compression when hitting edges
    const edgeDist = Math.min(Math.abs(x - minX), Math.abs(x - maxX));
    if (edgeDist < 20) {
      const compress = 1 - (20 - edgeDist) * 0.003;
      pill.style.transform = `scaleX(${compress}) scaleY(${1 + (1-compress) * 0.5})`;
    } else {
      pill.style.transform = "scaleX(1) scaleY(1)";
    }

    // Refraction follows drag
    const refr = refrRef.current;
    if (refr) {
      refr.style.backdropFilter = "blur(1px) brightness(1.1)";
    }
  };

  const onPointerUp = (e: React.PointerEvent) => {
    if (!spring.current.dragging) return;
    spring.current.dragging = false;
    const bar = barRef.current; if (!bar) return;
    const tw = bar.offsetWidth / 4;
    // Snap to nearest tab
    const nearestIdx = Math.max(0, Math.min(3, Math.round((spring.current.x - 4) / tw)));
    spring.current.target = getTabLeft(nearestIdx);
    // Give initial velocity toward target for overshoot feel
    const dir = spring.current.target > spring.current.x ? 1 : -1;
    spring.current.vel = dir * Math.min(Math.abs(spring.current.target - spring.current.x) * 2, 400);
    rafRef.current = requestAnimationFrame(runSpring);
    onChange(LANDING_TABS[nearestIdx].id);
  };

  return (
    <div
      ref={barRef}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerLeave={onPointerUp}
      style={{
        position: "relative",
        display: "flex",
        height: 64,
        padding: "4px",
        borderRadius: 999,
        // Fully transparent glass
        background: "rgba(255,255,255,0.04)",
        backdropFilter: "blur(32px) saturate(180%) brightness(115%)",
        WebkitBackdropFilter: "blur(32px) saturate(180%) brightness(115%)",
        border: "1px solid rgba(255,255,255,0.15)",
        boxShadow:
          "0 8px 40px rgba(0,0,0,0.45)," +
          "inset 0 1.5px 0 rgba(255,255,255,0.25)," +
          "inset 0 -1px 0 rgba(0,0,0,0.3)," +
          "inset 1px 0 0 rgba(255,255,255,0.08)," +
          "inset -1px 0 0 rgba(255,255,255,0.08)",
        overflow: "hidden",
        userSelect: "none",
        WebkitUserSelect: "none",
        touchAction: "none",
        cursor: "grab",
      }}
    >
      {/* Moving shimmer light */}
      <div ref={shimRef} style={{ position:"absolute",inset:0,pointerEvents:"none",borderRadius:999 }} />

      {/* Top gloss */}
      <div style={{
        position:"absolute",top:0,left:"8%",right:"8%",height:1,pointerEvents:"none",
        background:"linear-gradient(90deg,transparent,rgba(255,255,255,0.55) 40%,rgba(255,255,255,0.55) 60%,transparent)",
      }} />

      {/* Bottom subtle reflection */}
      <div style={{
        position:"absolute",bottom:0,left:"20%",right:"20%",height:1,pointerEvents:"none",
        background:"linear-gradient(90deg,transparent,rgba(255,255,255,0.12) 50%,transparent)",
      }} />

      {/* Pill with refraction overlay */}
      <div
        ref={pillRef}
        style={{
          position:"absolute", top:4, bottom:4,
          width: getTabWidth(),
          borderRadius:999,
          transformOrigin:"center",
          // Crystal clear glass
          background:"linear-gradient(155deg,rgba(255,255,255,0.22) 0%,rgba(255,255,255,0.07) 50%,rgba(255,255,255,0.02) 100%)",
          backdropFilter:"blur(8px) brightness(1.12) saturate(150%)",
          WebkitBackdropFilter:"blur(8px) brightness(1.12) saturate(150%)",
          border:"1px solid rgba(255,255,255,0.30)",
          boxShadow:
            "0 2px 20px rgba(0,0,0,0.2)," +
            "inset 0 1.5px 0 rgba(255,255,255,0.6)," +
            "inset 0 -1px 0 rgba(255,255,255,0.12)," +
            "inset 1px 0 0 rgba(255,255,255,0.2)," +
            "inset -1px 0 0 rgba(255,255,255,0.1)",
          pointerEvents:"none",
          zIndex:1,
          overflow:"hidden",
        }}
      >
        {/* Inner refraction light — shifts opposite to velocity (Newton) */}
        <div ref={refrRef} style={{
          position:"absolute",inset:0,borderRadius:999,
          transition:"transform 0.05s",
        }} />
        {/* Pill top gloss */}
        <div style={{
          position:"absolute",top:0,left:"15%",right:"15%",height:1,
          background:"linear-gradient(90deg,transparent,rgba(255,255,255,0.9) 50%,transparent)",
        }} />
        {/* Caustic light beam — moves with inertia */}
        <div style={{
          position:"absolute",top:"20%",bottom:"20%",left:"30%",width:"40%",
          background:"linear-gradient(90deg,transparent,rgba(255,255,255,0.08),transparent)",
          borderRadius:999,
          filter:"blur(4px)",
        }} />
      </div>

      {/* Tab items */}
      {LANDING_TABS.map(({ id, label, Icon }) => {
        const act = id === active;
        return (
          <div key={id} onClick={() => onChange(id)} className="lgnav-tab flex-1" style={{ zIndex:2, cursor:"pointer" }}>
            <Icon size={18} style={{
              color: act ? "#fff" : "rgba(255,255,255,0.40)",
              filter: act ? "drop-shadow(0 0 8px rgba(255,255,255,0.8))" : "none",
              transition:"all 0.3s ease",
            }} />
            <span style={{
              fontSize:10, fontWeight:600, letterSpacing:"0.03em",
              color: act ? "#fff" : "rgba(255,255,255,0.35)",
              textShadow: act ? "0 0 14px rgba(255,255,255,0.6)" : "none",
              transition:"all 0.3s ease",
              fontFamily:"var(--font-sans)",
            }}>
              {label}
            </span>
          </div>
        );
      })}
    </div>
  );
}


// ── FAQ ──────────────────────────────────────────────────────────────────────
const FAQS = [
  { q: "How does ExeGuard protect my scripts?",        a: "ExeGuard encrypts your scripts using AES-256-GCM and delivers them through a secure API. Each request receives a unique key with a 10-second TTL, preventing replay attacks and unauthorized access." },
  { q: "How does the Key System work?",                a: "Create Free and Paid keys in the Key System tab. Each key is locked to the user's HWID on first use. You can assign which script runs for each key tier." },
  { q: "What is a HWID ban?",                          a: "Hardware ID (HWID) is a unique device identifier. Banning a HWID prevents that device from running your scripts even if they have a valid key." },
  { q: "What is the whitelist for?",                   a: "Whitelisted HWIDs bypass key restrictions. Use it to grant special access to testers or trusted partners without requiring a key." },
  { q: "What is the maximum file size I can upload?",  a: "ExeGuard supports script uploads up to 10MB per file. All files are encrypted and stored securely on the server." },
];

function FAQItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="glass glass-hover rounded-2xl overflow-hidden cursor-pointer" onClick={() => setOpen(!open)}>
      <div className="flex items-center justify-between px-5 py-4">
        <p className="text-sm font-semibold text-white pr-4">{q}</p>
        {open ? <ChevronUp size={14} className="text-blue-400 flex-shrink-0" /> : <ChevronDown size={14} className="text-white/30 flex-shrink-0" />}
      </div>
      {open && <div className="px-5 pb-4"><p className="text-sm text-white/50 leading-relaxed">{a}</p></div>}
    </div>
  );
}

// ── HOME TAB ─────────────────────────────────────────────────────────────────
function HomeTab() {
  return (
    <div>
      <div className="max-w-lg mx-auto px-5 pt-8 pb-8">
        {/* Hero */}
        <div className="text-center mb-10 animate-fade-up">
          {/* Logo */}
          <div className="flex justify-center mb-6">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/exe-logo.png" alt="ExeGuard" style={{ width: 72, height: 72, objectFit: "contain", display: "block" }} />
          </div>

          <div className="inline-flex items-center gap-2 glass px-4 py-1.5 rounded-full mb-6">
            <span className="w-1.5 h-1.5 rounded-full status-active" />
            <span className="text-xs text-white/50 font-medium">Script delivery platform · v5</span>
          </div>

          <h1 className="font-display font-bold mb-5"
            style={{ fontSize: "clamp(2.4rem,5vw,4rem)", letterSpacing: "-0.03em", lineHeight: 1.05 }}>
            <span className="text-white">Protect. Deploy.</span>
            <br />
            <span style={{ background: "linear-gradient(135deg,#60a5fa,#a78bfa)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              Control.
            </span>
          </h1>
          <p className="text-white/40 text-base leading-relaxed max-w-lg mx-auto mb-8 font-light">
            Manage, protect and deliver scripts with AES-256 encryption, key system, HWID bans and real-time analytics.
          </p>
          <div className="flex items-center justify-center gap-3">
            <Link href="/register" className="btn-primary px-7 py-3 rounded-2xl text-sm flex items-center gap-2">
              Get started free <ArrowRight size={14} />
            </Link>
            <Link href="/login" className="btn-ghost px-7 py-3 rounded-2xl text-sm">Sign in</Link>
          </div>
        </div>

        {/* Hero image */}
        <div className="relative mb-10 animate-fade-up" style={{ animationDelay: "0.15s", borderRadius: 20, overflow: "hidden", minHeight: 180, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/exe-hero.png"
            alt="ExeGuard Platform"
            style={{ width: "100%", height: "auto", minHeight: 180, maxHeight: 300, objectFit: "cover", display: "block" }}
            onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
          />
          <div className="absolute inset-0" style={{ background: "linear-gradient(to top,rgba(8,8,15,0.7) 0%,transparent 60%)", pointerEvents:"none" }} />
        </div>

        {/* Features */}
        <div className="grid grid-cols-1 gap-4 mb-10">
          {[
            { Icon: Lock,     title: "AES-256 Encryption",  desc: "Per-request keys with 10-second TTL. Sessions expire instantly.",    delay: "0.2s" },
            { Icon: Shield,   title: "Anti-Hook Engine",    desc: "Detects replay, rate abuse, UA tampering and debug injection.",       delay: "0.3s" },
            { Icon: Key,      title: "Key System",          desc: "Create Free/Paid keys, HWID-locked, with full access control.",      delay: "0.35s" },
            { Icon: Users,    title: "HWID Management",     desc: "Ban or whitelist devices by Hardware ID in real time.",               delay: "0.4s" },
            { Icon: BarChart2, title: "Live Analytics",      desc: "Real-time charts tracking runs, unique devices, and hook attempts.", delay: "0.45s" },
            { Icon: Zap,      title: "Smart Loader",        desc: "Auto-delivers the right script based on key tier.",                  delay: "0.5s" },
          ].map(f => (
            <div key={f.title} className="glass glass-hover rounded-2xl p-5 animate-fade-up" style={{ animationDelay: f.delay }}>
              <div className="w-9 h-9 rounded-xl flex items-center justify-center mb-4"
                style={{ background: "rgba(37,99,235,0.15)", border: "1px solid rgba(37,99,235,0.25)" }}>
                <f.Icon size={16} className="text-blue-400" />
              </div>
              <h3 className="font-display font-bold text-white text-sm mb-1.5 tracking-tight">{f.title}</h3>
              <p className="text-white/40 text-xs leading-relaxed font-light">{f.desc}</p>
            </div>
          ))}
        </div>

        {/* FAQ */}
        <div className="mb-6">
          <h2 className="font-display font-bold text-xl text-white mb-5 tracking-tight">Frequently Asked Questions</h2>
          <div className="space-y-2">
            {FAQS.map(f => <FAQItem key={f.q} q={f.q} a={f.a} />)}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── TUTORIAL TAB ─────────────────────────────────────────────────────────────
const STEPS = [
  { step: "01", title: "Create an account",      Icon: UserPlus,  desc: "Sign up for a free ExeGuard account. Complete the Cloudflare Turnstile verification to protect the system." },
  { step: "02", title: "Create a Project",        Icon: Terminal,  desc: "Go to Dashboard and click 'New Project'. Give it a name and description to organize your scripts." },
  { step: "03", title: "Upload a Script",         Icon: Zap,       desc: "In the Files tab, upload your script file (up to 10MB). The system automatically encrypts and stores it securely." },
  { step: "04", title: "Configure the Key System",Icon: Key,       desc: "Go to the Keys tab, create Free and Paid keys. Assign which script runs for each tier. Enable Role Management to enforce access." },
  { step: "05", title: "Manage HWIDs",            Icon: Shield,    desc: "The Management tab lets you ban abusive HWIDs or whitelist trusted devices. Lists update in real time." },
  { step: "06", title: "Get the Loader",          Icon: ArrowRight,desc: "Click the Download icon on any script to get the loader code. The loader checks the key, HWID, and runs the correct script." },
];

function TutorialTab() {
  return (
    <div>
      <div className="max-w-3xl mx-auto px-6 pt-10 pb-8">
        <div className="mb-8 animate-fade-up">
          <div className="inline-flex items-center gap-2 glass px-3 py-1 rounded-full mb-4">
            <BookOpen size={11} className="text-blue-400" />
            <span className="text-xs text-white/50 font-medium">Getting Started</span>
          </div>
          <h2 className="font-display font-bold text-3xl text-white tracking-tight mb-2">Up and running in 6 steps</h2>
          <p className="text-white/40 text-sm font-light">Set up ExeGuard and protect your scripts in minutes.</p>
        </div>
        <div className="space-y-4">
          {STEPS.map((s, i) => (
            <div key={s.step} className="glass glass-hover rounded-2xl p-5 animate-fade-up flex gap-4" style={{ animationDelay: `${i * 0.08}s` }}>
              <div className="flex-shrink-0">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                  style={{ background: "rgba(37,99,235,0.12)", border: "1px solid rgba(37,99,235,0.25)" }}>
                  <s.Icon size={16} className="text-blue-400" />
                </div>
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[10px] font-bold text-blue-400/70 font-mono tracking-widest">{s.step}</span>
                  <h3 className="font-display font-bold text-white text-sm tracking-tight">{s.title}</h3>
                </div>
                <p className="text-white/40 text-sm leading-relaxed font-light">{s.desc}</p>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-8 glass rounded-2xl p-5 animate-fade-up" style={{ animationDelay: "0.5s", borderColor: "rgba(37,99,235,0.3)", background: "rgba(37,99,235,0.07)" }}>
          <div className="flex items-start gap-3">
            <AlertTriangle size={16} className="text-yellow-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-white mb-1">Important notice</p>
              <p className="text-xs text-white/40 leading-relaxed">
                Never share your API token or project ID publicly. Loader code contains sensitive information — only distribute it to trusted users. The system automatically detects and logs all hook attempts.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── PRICING TAB ───────────────────────────────────────────────────────────────
const PLANS = [
  {
    name: "Free",
    price: "$0",
    period: "/month",
    desc: "For individuals getting started",
    features: ["1 Project", "Up to 3 Scripts", "Basic analytics", "Key System (limited)", "Community support"],
    cta: "Get started free",
    href: "/register",
    featured: false,
  },
  {
    name: "Go",
    price: "$0",
    period: "/month",
    badge: "Coming soon",
    desc: "For developers and small teams",
    features: ["5 Projects", "Up to 20 Scripts", "Advanced analytics", "HWID Management", "Full Key System", "Priority support"],
    cta: "Choose Go",
    href: "/register",
    featured: true,
  },
  {
    name: "Expert",
    price: "$0",
    period: "/month",
    badge: "Coming soon",
    desc: "Full-featured solution for power users",
    features: ["Unlimited Projects", "Unlimited Scripts", "Live Feed & Alerts", "Custom Loader", "API Access", "24/7 SLA Support"],
    cta: "Choose Expert",
    href: "/register",
    featured: false,
  },
] as const;

function PriceTab() {
  return (
    <div>
      <div className="max-w-lg mx-auto px-5 pt-8 pb-8">
        <div className="text-center mb-10 animate-fade-up">
          <div className="inline-flex items-center gap-2 glass px-3 py-1 rounded-full mb-4">
            <Tag size={11} className="text-blue-400" />
            <span className="text-xs text-white/50 font-medium">Pricing</span>
          </div>
          <h2 className="font-display font-bold text-3xl text-white tracking-tight mb-2">Simple, transparent pricing</h2>
          <p className="text-white/40 text-sm font-light">All plans are free during the beta period.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {PLANS.map((p, i) => (
            <div key={p.name} className={`price-card p-6 flex flex-col animate-fade-up ${p.featured ? "featured" : ""}`}
              style={{ animationDelay: `${i * 0.1}s` }}>
              <div className="flex items-start justify-between mb-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-display font-bold text-white text-lg tracking-tight">{p.name}</h3>
                    {(p as any).badge && (
                      <span className="text-[9px] font-bold px-2 py-0.5 rounded-full text-blue-300"
                        style={{ background: "rgba(37,99,235,0.2)", border: "1px solid rgba(37,99,235,0.3)" }}>
                        {(p as any).badge}
                      </span>
                    )}
                  </div>
                  <p className="text-white/35 text-xs">{p.desc}</p>
                </div>
                {p.featured && <Star size={14} className="text-blue-400 mt-1" />}
              </div>
              <div className="mb-5">
                <span className="font-display font-bold text-4xl text-white">{p.price}</span>
                <span className="text-white/30 text-sm ml-1">{p.period}</span>
              </div>
              <div className="space-y-2 flex-1 mb-6">
                {p.features.map(f => (
                  <div key={f} className="flex items-center gap-2">
                    <Check size={12} className="text-blue-400 flex-shrink-0" />
                    <span className="text-xs text-white/60">{f}</span>
                  </div>
                ))}
              </div>
              <Link href={p.href}
                className={`text-center py-3 rounded-xl text-sm font-semibold transition-all ${p.featured ? "btn-primary" : "btn-ghost"}`}>
                {p.cta}
              </Link>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── ACCOUNT TAB ───────────────────────────────────────────────────────────────
function AccountTab() {
  return (
    <div>
      <div className="max-w-sm mx-auto px-6 pt-16 pb-8">
        <div className="text-center mb-10 animate-fade-up">
          <div className="flex justify-center mb-5">
            <div className="w-16 h-16 rounded-2xl overflow-hidden flex items-center justify-center"
              style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)" }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/exe-logo.png" alt="ExeGuard" style={{ width: 44, height: 44, objectFit: "contain" }} />
            </div>
          </div>
          <h2 className="font-display font-bold text-2xl text-white tracking-tight mb-2">Your account</h2>
          <p className="text-white/40 text-sm font-light">Sign in or create a new account</p>
        </div>
        <div className="space-y-3 animate-fade-up" style={{ animationDelay: "0.1s" }}>
          <Link href="/login"
            className="btn-primary w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl text-sm">
            <LoginIcon size={15} /> Sign in
          </Link>
          <Link href="/register"
            className="btn-ghost w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl text-sm">
            <UserPlus size={15} /> Create an account
          </Link>
        </div>
        <div className="mt-10 glass rounded-2xl p-5 animate-fade-up" style={{ animationDelay: "0.2s" }}>
          <div className="flex items-center gap-2 mb-3">
            <Shield size={13} className="text-blue-400" />
            <p className="text-xs font-semibold text-white">Security</p>
          </div>
          <div className="space-y-1.5">
            {["Cloudflare Turnstile verification", "10-second session token TTL", "AES-256-GCM encryption"].map(t => (
              <div key={t} className="flex items-center gap-2">
                <Check size={10} className="text-green-400" />
                <span className="text-[11px] text-white/40">{t}</span>
              </div>
            ))}
          </div>
        </div>
        <p className="text-center text-[11px] text-white/20 mt-6 animate-fade-up" style={{ animationDelay: "0.3s" }}>
          © 2025 ExeGuard · Powered by Exe Security API
        </p>
      </div>
    </div>
  );
}

// ── MAIN PAGE ─────────────────────────────────────────────────────────────────
export default function LandingPage() {
  const router = useRouter();
  const [tab,           setTab]           = useState<TabId>("home");
  const [captchaPassed, setCaptchaPassed] = useState(false);
  const [cfToken,       setCfToken]       = useState("");
  const widgetRef = useRef<HTMLDivElement>(null);
  const widgetId  = useRef<string>("");

  // Redirect if already logged in
  useEffect(() => {
    if (typeof window !== "undefined" && localStorage.getItem("eg_token"))
      router.push("/dashboard");
  }, [router]);

  // Load Turnstile widget with retry
  useEffect(() => {
    if (captchaPassed) return;
    const SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || "1x00000000000000000000AA";
    let disposed = false;
    ensureTurnstileLoaded()
      .then(() => {
        if (disposed || widgetId.current || !widgetRef.current || !(window as any).turnstile) return;
        widgetId.current = (window as any).turnstile.render(widgetRef.current, {
          sitekey: SITE_KEY,
          theme: "dark",
          size: "normal",
          callback: (token: string) => setCfToken(token),
          "expired-callback": () => setCfToken(""),
        });
      })
      .catch((err: Error) => {
        console.error("Turnstile load failed", err);
      });
    return () => {
      disposed = true;
      try { if ((window as any).turnstile && widgetId.current) { (window as any).turnstile.remove(widgetId.current); widgetId.current = ""; } } catch (_) {}
    };
  }, [captchaPassed]);

  const handleContinue = async () => {
    if (cfToken) {
      try { await api.verifyTurnstile(cfToken); } catch (_) {}
    }
    setCaptchaPassed(true);
  };

  const TabContent = { home: HomeTab, tutorial: TutorialTab, price: PriceTab, login: AccountTab }[tab];

  return (
    <main style={{
      position: "relative",
      minHeight: "100dvh",
      width: "100%",
      maxWidth: "100vw",
      overflowX: "hidden",
      background: "#08080f",
    }}>
      {/* Orbs */}
      <div className="orb" style={{ width:500,height:500,top:-160,left:-160,opacity:0.2,background:"radial-gradient(circle,#2563eb,transparent 70%)" }} />
      <div className="orb" style={{ width:400,height:400,top:"50%",right:-160,opacity:0.12,background:"radial-gradient(circle,#7c3aed,transparent 70%)" }} />

      {/* ── CAPTCHA GATE ── z-index 100 so it covers the nav too */}
      {!captchaPassed && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 100,
          display: "flex", alignItems: "center", justifyContent: "center",
          padding: "20px",
          background: "rgba(8,8,15,0.96)",
          backdropFilter: "blur(24px)",
        }}>
          <div className="glass-strong animate-scale-in" style={{
            borderRadius: 28, padding: 32, width: "100%", maxWidth: 320, textAlign: "center",
          }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/exe-logo.png" alt="ExeGuard" width={52} height={52}
              style={{ objectFit:"contain", margin:"0 auto 20px" }} />
            <h2 style={{ fontFamily:"var(--font-display)", fontWeight:700, fontSize:20, color:"#fff", marginBottom:6, letterSpacing:"-0.03em" }}>
              Security Check
            </h2>
            <p style={{ fontSize:13, color:"rgba(255,255,255,0.4)", marginBottom:24, fontFamily:"var(--font-sans)" }}>
              Complete the Cloudflare verification to continue
            </p>

            {/* Turnstile widget container */}
            <div style={{ display:"flex", justifyContent:"center", marginBottom:16 }}>
              <div ref={widgetRef} />
            </div>

            <button
              onClick={handleContinue}
              disabled={!cfToken}
              className="btn-primary"
              style={{
                width:"100%", padding:"12px 0", borderRadius:14,
                fontSize:14, opacity: cfToken ? 1 : 0.4,
                cursor: cfToken ? "pointer" : "not-allowed",
              }}
            >
              Continue
            </button>
          </div>
        </div>
      )}

      {/* ── TAB CONTENT ── */}
      <div key={tab} style={{ paddingBottom: 96 }}>
        <div className="animate-tab-in">
          <TabContent />
        </div>
      </div>

      {/* ── FIXED BOTTOM NAV ── z-index 50 (below gate) */}
      <div style={{
        position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 50,
        display: "flex", justifyContent: "center",
        padding: "0 16px 18px",
        background: "linear-gradient(to top, rgba(8,8,15,0.9) 0%, rgba(8,8,15,0.5) 55%, transparent 100%)",
        pointerEvents: "none",
      }}>
        <div style={{ width:"100%", maxWidth:360, pointerEvents:"all" }}>
          <LiquidNav active={tab} onChange={setTab} />
        </div>
      </div>
    </main>
  );
}
