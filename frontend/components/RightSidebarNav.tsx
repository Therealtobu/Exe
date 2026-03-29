"use client";
import { useRef, useEffect, useCallback } from "react";

export interface NavTab {
  id: string;
  label: string;
  Icon: React.FC<{ size?: number; style?: React.CSSProperties }>;
}

interface LiquidNavProps {
  tabs: NavTab[];
  active: string;
  onChange: (id: string) => void;
}

/**
 * Horizontal liquid-pill nav — floats at bottom, full-width content behind it.
 * Same spring physics as the original ProjectLiquidNav.
 */
export function RightSidebarNav({ tabs, active, onChange }: LiquidNavProps) {
  const barRef   = useRef<HTMLDivElement>(null);
  const pillRef  = useRef<HTMLDivElement>(null);
  const lensRef  = useRef<HTMLDivElement>(null);
  const shimRef  = useRef<HTMLDivElement>(null);
  const spring   = useRef({ x: 0, target: 0, vel: 0 });
  const rafRef   = useRef<number>(0);
  const mountedRef = useRef(true);

  const n = tabs.length;
  const activeIdx = tabs.findIndex(t => t.id === active);

  const getTW = () => {
    try { const b = barRef.current; return b ? b.offsetWidth / n : 80; }
    catch { return 80; }
  };
  const getLeft = (idx: number) => getTW() * idx + 4;

  const tick = useCallback(() => {
    if (!mountedRef.current) return;
    const s = spring.current;
    const pill = pillRef.current;
    if (!pill) return;
    const dx = s.target - s.x;
    const force = 300 * dx - 24 * s.vel;
    s.vel += force / 60;
    s.x   += s.vel / 60;
    pill.style.left = `${s.x}px`;
    const speed = Math.abs(s.vel);
    pill.style.transform = `scaleX(${Math.min(1 + speed * 0.0014, 1.15)}) scaleY(${Math.max(1 - speed * 0.0008, 0.9)})`;
    if (lensRef.current) {
      const intensity = Math.min(speed * 0.18, 12);
      lensRef.current.style.opacity  = intensity > 0.5 ? "1" : "0";
      lensRef.current.style.left     = `${s.x + 2}px`;
      lensRef.current.style.width    = `${getTW() - 12}px`;
      const dir = s.vel > 0 ? 1 : -1;
      lensRef.current.style.transform = `translateX(${-dir * intensity * 0.5}px)`;
    }
    if (Math.abs(dx) < 0.15 && speed < 0.15) {
      s.x = s.target; s.vel = 0;
      pill.style.transform = "scaleX(1) scaleY(1)";
      if (lensRef.current) lensRef.current.style.opacity = "0";
      return;
    }
    rafRef.current = requestAnimationFrame(tick);
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; cancelAnimationFrame(rafRef.current); };
  }, []);

  useEffect(() => {
    const target = getLeft(activeIdx);
    spring.current.target = target;
    if (spring.current.x === 0) spring.current.x = target;
    cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(tick);
  }, [active, activeIdx, tick]);

  // Shimmer
  useEffect(() => {
    let t = 0; let f: number;
    const go = () => {
      t += 0.007;
      if (shimRef.current) {
        const x = 50 + Math.sin(t * 1.1) * 38;
        const y = 50 + Math.cos(t * 0.8) * 22;
        shimRef.current.style.background =
          `radial-gradient(ellipse 65% 55% at ${x}% ${y}%, rgba(255,255,255,0.10) 0%, transparent 65%),` +
          `radial-gradient(ellipse 30% 30% at ${100-x}% ${100-y}%, rgba(180,220,255,0.06) 0%, transparent 55%)`;
      }
      f = requestAnimationFrame(go);
    };
    f = requestAnimationFrame(go);
    return () => cancelAnimationFrame(f);
  }, []);

  return (
    <div
      ref={barRef}
      style={{
        position: "relative",
        display: "flex",
        height: 60,
        padding: "4px",
        borderRadius: 999,
        background: "rgba(255,255,255,0.045)",
        backdropFilter: "blur(36px) saturate(190%) brightness(112%)",
        WebkitBackdropFilter: "blur(36px) saturate(190%) brightness(112%)",
        border: "1px solid rgba(255,255,255,0.14)",
        boxShadow: "0 6px 32px rgba(0,0,0,0.5), inset 0 1.5px 0 rgba(255,255,255,0.2), inset 0 -1px 0 rgba(0,0,0,0.2)",
        overflow: "hidden",
        userSelect: "none",
        WebkitUserSelect: "none",
      }}
    >
      {/* Shimmer */}
      <div ref={shimRef} style={{ position:"absolute",inset:0,pointerEvents:"none",borderRadius:999,zIndex:0 }} />

      {/* Top gloss */}
      <div style={{
        position:"absolute",top:0,left:"5%",right:"5%",height:1,zIndex:1,pointerEvents:"none",
        background:"linear-gradient(90deg,transparent,rgba(255,255,255,0.6) 35%,rgba(255,255,255,0.6) 65%,transparent)"
      }} />

      {/* Lens blur */}
      <div ref={lensRef} style={{
        position:"absolute",top:4,bottom:4,borderRadius:999,zIndex:1,pointerEvents:"none",
        backdropFilter:"blur(2px) brightness(1.15)",WebkitBackdropFilter:"blur(2px) brightness(1.15)",
        opacity:0,transition:"opacity 0.15s",
        boxShadow:"inset 2px 0 8px rgba(255,255,255,0.25),inset -2px 0 8px rgba(255,255,255,0.25)",
      }} />

      {/* Animated pill */}
      <div ref={pillRef} style={{
        position:"absolute",top:4,bottom:4,
        width: `calc(${100/n}% - 8px)`,
        borderRadius:999,transformOrigin:"center",zIndex:2,pointerEvents:"none",
        background:"linear-gradient(155deg,rgba(255,255,255,0.18) 0%,rgba(255,255,255,0.06) 55%,rgba(255,255,255,0.02) 100%)",
        backdropFilter:"blur(6px) brightness(1.1)",WebkitBackdropFilter:"blur(6px) brightness(1.1)",
        border:"1px solid rgba(255,255,255,0.22)",
        boxShadow:"0 2px 12px rgba(0,0,0,0.15),inset 0 1.5px 0 rgba(255,255,255,0.55)",
        overflow:"hidden",
      }}>
        <div style={{
          position:"absolute",top:0,left:"12%",right:"12%",height:1,
          background:"linear-gradient(90deg,transparent,rgba(255,255,255,0.95) 50%,transparent)"
        }} />
        <div style={{
          position:"absolute",inset:0,borderRadius:999,
          background:"linear-gradient(180deg,rgba(255,255,255,0.08) 0%,transparent 60%)"
        }} />
      </div>

      {/* Tab items */}
      {tabs.map(({ id, label, Icon }) => {
        const act = id === active;
        return (
          <div
            key={id}
            onClick={() => onChange(id)}
            style={{
              zIndex: 3, cursor: "pointer", flex: 1,
              display: "flex", flexDirection: "column",
              alignItems: "center", justifyContent: "center", gap: 4,
            }}
          >
            <Icon size={16} style={{
              color: act ? "#fff" : "rgba(255,255,255,0.38)",
              filter: act ? "drop-shadow(0 0 7px rgba(255,255,255,0.8))" : "none",
              transition: "all 0.28s",
            }} />
            <span style={{
              fontSize: 9, fontWeight: 600, letterSpacing: "0.03em",
              color: act ? "#fff" : "rgba(255,255,255,0.35)",
              textShadow: act ? "0 0 12px rgba(255,255,255,0.7)" : "none",
              transition: "all 0.28s", fontFamily: "var(--font-sans)",
            }}>
              {label}
            </span>
          </div>
        );
      })}
    </div>
  );
}
