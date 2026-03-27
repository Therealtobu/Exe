"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LayoutGrid, LogOut, Menu, User, ChevronRight } from "lucide-react";
import { clearAuth, getUser } from "@/lib/api";

export default function Sidebar({ children }: { children: React.ReactNode }) {
  const router   = useRouter();
  const pathname = usePathname();
  const [user, setUser]     = useState<any>(null);
  const [mobile, setMobile] = useState(false);

  useEffect(() => {
    const u = getUser();
    if (!u) { router.push("/login"); return; }
    setUser(u);
  }, [router]);

  const logout = () => { clearAuth(); router.push("/login"); };
  const nav = [{ href: "/dashboard", icon: LayoutGrid, label: "Projects" }];

  const NavContent = () => (
    <div className="flex flex-col h-full">
      <div className="px-4 h-14 flex items-center gap-3 flex-shrink-0"
        style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/exe-logo.png" alt="ExeGuard" width={28} height={28} style={{ objectFit:"contain", flexShrink:0 }} />
        <span className="font-display font-bold text-[13px] tracking-tight text-white">ExeGuard</span>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1">
        {nav.map(item => {
          const active = pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link key={item.href} href={item.href} onClick={() => setMobile(false)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                active ? "nav-active" : "text-white/30 hover:text-white/60 hover:bg-white/5"
              }`}>
              <item.icon size={14} />
              {item.label}
              {active && <ChevronRight size={12} className="ml-auto opacity-50" />}
            </Link>
          );
        })}
      </nav>

      <div className="px-3 pb-4 flex-shrink-0" style={{ borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: "12px" }}>
        <div className="glass rounded-xl px-3 py-2.5 flex items-center gap-3">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ background: "linear-gradient(135deg,#2563eb,#7c3aed)" }}>
            <User size={11} className="text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-white truncate">{user?.username || "…"}</p>
            <p className="text-[10px] text-white/30 mt-0.5">Free plan</p>
          </div>
          <button onClick={logout} title="Sign out" className="text-white/30 hover:text-red-400 transition-colors p-1">
            <LogOut size={13} />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-[#08080f] overflow-hidden">
      <aside className="hidden md:flex flex-col w-52 flex-shrink-0"
        style={{ background: "rgba(255,255,255,0.02)", borderRight: "1px solid rgba(255,255,255,0.06)" }}>
        <NavContent />
      </aside>

      {mobile && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setMobile(false)} />
          <aside className="relative w-52 flex flex-col z-10"
            style={{ background: "rgba(12,12,20,0.96)", backdropFilter: "blur(40px)", borderRight: "1px solid rgba(255,255,255,0.08)" }}>
            <NavContent />
          </aside>
        </div>
      )}

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <div className="md:hidden h-12 flex items-center px-4 gap-3 flex-shrink-0"
          style={{ borderBottom: "1px solid rgba(255,255,255,0.06)", background: "rgba(255,255,255,0.02)" }}>
          <button onClick={() => setMobile(true)} className="text-white/30 hover:text-white transition-colors">
            <Menu size={17} />
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/exe-logo.png" alt="ExeGuard" width={20} height={20} style={{ objectFit:"contain" }} />
          <span className="font-display font-bold text-sm tracking-tight text-white">ExeGuard</span>
        </div>
        <main className="flex-1 overflow-hidden">{children}</main>
      </div>
    </div>
  );
}
