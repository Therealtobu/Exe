"use client";
import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, ArrowRight } from "lucide-react";
import toast from "react-hot-toast";
import { api, saveAuth } from "@/lib/api";

export default function LoginPage() {
  const router = useRouter();
  const [form,    setForm]    = useState({ email: "", password: "" });
  const [show,    setShow]    = useState(false);
  const [loading, setLoading] = useState(false);
  const [cfToken, setCfToken] = useState("");
  const [tsReady, setTsReady] = useState(false);
  const widgetRef = useRef<HTMLDivElement>(null);
  const widgetId  = useRef<string>("");

  useEffect(() => {
    const SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || "1x00000000000000000000AA";
    let retries = 0;
    const tryRender = () => {
      if (widgetId.current) return;
      if (!widgetRef.current) { if (retries++ < 20) setTimeout(tryRender, 200); return; }
      if (!(window as any).turnstile) { if (retries++ < 20) setTimeout(tryRender, 300); return; }
      try {
        widgetId.current = (window as any).turnstile.render(widgetRef.current, {
          sitekey: SITE_KEY, theme: "dark", size: "normal",
          callback: (t: string) => setCfToken(t),
          "expired-callback": () => setCfToken(""),
        });
      } catch (_) { if (retries++ < 5) setTimeout(tryRender, 500); }
    };
    const id = "cf-ts-script";
    if (!document.getElementById(id)) {
      (window as any).onTsLogin = () => setTimeout(tryRender, 100);
      const s = document.createElement("script");
      s.id = id;
      s.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?onload=onTsLogin&render=explicit";
      s.async = true;
      document.head.appendChild(s);
    } else {
      setTimeout(tryRender, 100);
    }
    return () => {
      try { if ((window as any).turnstile && widgetId.current) { (window as any).turnstile.remove(widgetId.current); widgetId.current = ""; } } catch (_) {}
    };
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (cfToken) { try { await api.verifyTurnstile(cfToken); } catch (_) {} }
      const res = await api.login(form);
      saveAuth(res.token, res.user);
      toast.success(`Welcome back, ${res.user.username}`);
      router.push("/dashboard");
    } catch (e: any) { toast.error(e.message); }
    finally { setLoading(false); }
  };

  return (
    <main className="min-h-screen bg-[#08080f] flex items-center justify-center px-4 relative overflow-hidden">
      <div className="orb w-[500px] h-[500px] -top-40 -left-40 opacity-20"
        style={{ background: "radial-gradient(circle,#2563eb,transparent 70%)" }} />
      <div className="orb w-[400px] h-[400px] -bottom-40 -right-40 opacity-15"
        style={{ background: "radial-gradient(circle,#7c3aed,transparent 70%)" }} />

      <div className="relative z-10 w-full max-w-sm animate-scale-in">
        <div className="text-center mb-7">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/exe-logo.png" alt="ExeGuard" width={52} height={52} className="mx-auto mb-4" style={{ objectFit:"contain" }} />
          <h1 className="font-display font-bold text-2xl text-white tracking-tight">Sign in</h1>
          <p className="text-white/40 text-sm mt-1 font-light">Access your dashboard</p>
        </div>

        <div className="glass-strong rounded-3xl p-7">
          <form onSubmit={submit} className="space-y-4">
            <div>
              <label className="block text-[10px] font-semibold text-white/40 mb-1.5 uppercase tracking-wider">Email</label>
              <input type="email" required value={form.email}
                onChange={e => setForm({ ...form, email: e.target.value })}
                placeholder="you@example.com"
                className="input-glass w-full px-4 py-3 rounded-xl text-sm" />
            </div>
            <div>
              <label className="block text-[10px] font-semibold text-white/40 mb-1.5 uppercase tracking-wider">Password</label>
              <div className="relative">
                <input type={show ? "text" : "password"} required value={form.password}
                  onChange={e => setForm({ ...form, password: e.target.value })}
                  placeholder="••••••••"
                  className="input-glass w-full px-4 py-3 pr-11 rounded-xl text-sm" />
                <button type="button" onClick={() => setShow(!show)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors">
                  {show ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            {/* Cloudflare Turnstile */}
            <div style={{ display:"flex", justifyContent:"center", minHeight: 65 }}>
              <div ref={widgetRef} />
            </div>

            <button type="submit" disabled={loading}
              className="btn-primary w-full py-3 rounded-xl flex items-center justify-center gap-2 disabled:opacity-40">
              {loading ? "Signing in…" : <><span>Sign In</span><ArrowRight size={14} /></>}
            </button>
          </form>

          <div className="mt-5 pt-5" style={{ borderTop: "1px solid rgba(255,255,255,0.07)" }}>
            <p className="text-center text-sm text-white/30">
              No account?{" "}
              <Link href="/register" className="text-blue-400 hover:text-blue-300 font-medium transition-colors">
                Create one →
              </Link>
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
