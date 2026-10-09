"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import { Eye, EyeOff, Lock, Mail, Compass } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

/* ── Particle canvas ── */
function ParticleCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    const PARTICLE_COUNT = 55;
    type Particle = { x: number; y: number; r: number; dx: number; dy: number; alpha: number; dAlpha: number };
    const particles: Particle[] = Array.from({ length: PARTICLE_COUNT }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      r: Math.random() * 2 + 0.4,
      dx: (Math.random() - 0.5) * 0.35,
      dy: (Math.random() - 0.5) * 0.35,
      alpha: Math.random() * 0.6 + 0.1,
      dAlpha: (Math.random() - 0.5) * 0.004,
    }));

    let raf: number;
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particles.forEach((p) => {
        p.x += p.dx; p.y += p.dy; p.alpha += p.dAlpha;
        if (p.alpha < 0.05 || p.alpha > 0.7) p.dAlpha *= -1;
        if (p.x < 0) p.x = canvas.width;
        if (p.x > canvas.width) p.x = 0;
        if (p.y < 0) p.y = canvas.height;
        if (p.y > canvas.height) p.y = 0;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(16,185,129,${p.alpha})`;
        ctx.fill();
      });
      raf = requestAnimationFrame(draw);
    };
    draw();
    return () => { cancelAnimationFrame(raf); window.removeEventListener("resize", resize); };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{ position: "fixed", inset: 0, zIndex: 0, pointerEvents: "none" }}
    />
  );
}

export default function LoginPage() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [ripple, setRipple] = useState<{ x: number; y: number; id: number } | null>(null);
  const [authError, setAuthError] = useState("");

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 60);
    return () => clearTimeout(t);
  }, []);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    setAuthError("");
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      router.push("/profile");
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : "Unable to sign in. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    setAuthError("");
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: `${window.location.origin}/auth/callback` },
      });
      if (error) throw error;
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : "Unable to start Google sign in.");
      setIsLoading(false);
    }
  };

  const handleGuestSignIn = async () => {
    setIsLoading(true);
    setAuthError("");
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInAnonymously();
      if (error) throw error;
      router.push("/ride-share");
    } catch (error) {
      setAuthError(
        error instanceof Error
          ? `${error.message} If guest access is not enabled, turn on Anonymous Sign-Ins in your Supabase Auth settings.`
          : "Unable to start a guest session.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleBtnClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setRipple({ x: e.clientX - rect.left, y: e.clientY - rect.top, id: Date.now() });
    setTimeout(() => setRipple(null), 700);
  };

  const inputStyle = (field: string): React.CSSProperties => ({
    width: "100%",
    background: focusedField === field ? "rgba(16,185,129,0.08)" : "rgba(255,255,255,0.05)",
    border: `1px solid ${focusedField === field ? "rgba(16,185,129,0.7)" : "rgba(255,255,255,0.12)"}`,
    borderRadius: "12px",
    padding: field === "password" ? "0.82rem 3rem 0.82rem 2.6rem" : "0.82rem 1rem 0.82rem 2.6rem",
    color: "#fff",
    fontSize: "0.95rem",
    outline: "none",
    boxSizing: "border-box",
    transition: "border-color 0.3s, background 0.3s, box-shadow 0.3s",
    boxShadow: focusedField === field ? "0 0 0 3px rgba(16,185,129,0.15), 0 0 20px rgba(16,185,129,0.08)" : "none",
  });

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');

        * { font-family: 'Inter', sans-serif; }

        @keyframes floatY {
          0%,100% { transform: translateY(0px) rotate(0deg); }
          33%      { transform: translateY(-8px) rotate(3deg); }
          66%      { transform: translateY(-4px) rotate(-2deg); }
        }
        @keyframes pulseGlow {
          0%,100% { box-shadow: 0 0 30px 6px rgba(16,185,129,0.4), 0 0 60px 10px rgba(5,150,105,0.2); }
          50%     { box-shadow: 0 0 50px 14px rgba(245,158,11,0.35), 0 0 80px 20px rgba(16,185,129,0.15); }
        }
        @keyframes shimmerGreen {
          0%   { background-position: -200% center; }
          100% { background-position:  200% center; }
        }
        @keyframes fadeSlideUp {
          from { opacity:0; transform:translateY(30px); }
          to   { opacity:1; transform:translateY(0); }
        }
        @keyframes orbDrift1 {
          0%,100% { transform: translate(0,0) scale(1) rotate(0deg); }
          25%     { transform: translate(40px,-30px) scale(1.12) rotate(5deg); }
          50%     { transform: translate(-20px,-50px) scale(0.92) rotate(-3deg); }
          75%     { transform: translate(-40px,20px) scale(1.05) rotate(4deg); }
        }
        @keyframes orbDrift2 {
          0%,100% { transform: translate(0,0) scale(1) rotate(0deg); }
          30%     { transform: translate(-35px,25px) scale(1.15) rotate(-6deg); }
          60%     { transform: translate(30px,-40px) scale(0.88) rotate(3deg); }
          80%     { transform: translate(20px,15px) scale(1.08) rotate(-4deg); }
        }
        @keyframes orbDrift3 {
          0%,100% { transform: translate(0,0) scale(1); }
          40%     { transform: translate(25px,-20px) scale(1.1); }
          70%     { transform: translate(-15px,30px) scale(0.9); }
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        @keyframes rippleAnim {
          0% { transform: scale(0); opacity: 0.5; }
          100% { transform: scale(4); opacity: 0; }
        }
        @keyframes slideInCard {
          from { opacity:0; transform: translateY(40px) scale(0.97); filter: blur(4px); }
          to   { opacity:1; transform: translateY(0) scale(1); filter: blur(0); }
        }

        .login-card {
          opacity: 0;
          animation: slideInCard 0.75s cubic-bezier(.16,1,.3,1) 0.1s both;
        }
        .login-card.mounted { opacity: 1; }

        .logo-icon {
          animation: floatY 4s ease-in-out infinite, pulseGlow 4s ease-in-out infinite;
        }

        .shimmer-btn {
          background: linear-gradient(90deg,
            #059669 0%, #10b981 20%, #f59e0b 40%, #10b981 60%, #059669 80%, #10b981 100%
          );
          background-size: 250% auto;
          animation: shimmerGreen 2.5s linear infinite;
        }
        .shimmer-btn:disabled { animation: none; background: rgba(16,185,129,0.35); }

        .orb { position: fixed; border-radius: 50%; filter: blur(85px); pointer-events: none; z-index: 0; }
        .orb-1 {
          width: 420px; height: 420px;
          background: radial-gradient(circle, rgba(16,185,129,0.22) 0%, rgba(5,150,105,0.08) 70%);
          top: -140px; left: -150px;
          animation: orbDrift1 13s ease-in-out infinite;
        }
        .orb-2 {
          width: 340px; height: 340px;
          background: radial-gradient(circle, rgba(245,158,11,0.18) 0%, rgba(217,119,6,0.05) 70%);
          bottom: -100px; right: -120px;
          animation: orbDrift2 15s ease-in-out infinite;
        }
        .orb-3 {
          width: 220px; height: 220px;
          background: radial-gradient(circle, rgba(6,182,212,0.15) 0%, transparent 70%);
          top: 45%; left: 65%;
          animation: orbDrift3 10s ease-in-out infinite reverse;
        }

        .form-field { animation: fadeSlideUp 0.5s cubic-bezier(.16,1,.3,1) both; }
        .form-field:nth-child(1) { animation-delay: 0.38s; }
        .form-field:nth-child(2) { animation-delay: 0.5s; }
        .form-field:nth-child(3) { animation-delay: 0.6s; }
        .form-field:nth-child(4) { animation-delay: 0.7s; }

        .spinner {
          display: inline-block; width: 18px; height: 18px;
          border: 2.5px solid rgba(255,255,255,0.3);
          border-top-color: #fff; border-radius: 50%;
          animation: spin 0.75s linear infinite;
          vertical-align: middle; margin-right: 10px;
        }

        .social-btn { transition: all 0.25s cubic-bezier(.16,1,.3,1); }
        .social-btn:hover {
          transform: translateY(-3px);
          background: rgba(255,255,255,0.12) !important;
          box-shadow: 0 8px 24px rgba(0,0,0,0.25);
        }

        .divider-text {
          background: linear-gradient(90deg, #10b981, #f59e0b, #10b981);
          background-size: 200% auto;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          animation: shimmerGreen 3s linear infinite;
          font-size: 0.78rem; font-weight: 700; letter-spacing: 2px;
        }

        input::placeholder { color: rgba(255,255,255,0.28); }
      `}</style>

      {/* Background */}
      <div style={{
        minHeight: "calc(100vh - 130px)",
        background: "linear-gradient(135deg, #020c08 0%, #041a12 30%, #050f14 60%, #080818 100%)",
        display: "flex", alignItems: "center", justifyContent: "center",
        position: "relative", padding: "2rem 1rem", overflow: "hidden",
      }}>
        <ParticleCanvas />

        {/* Orbs */}
        <div className="orb orb-1" />
        <div className="orb orb-2" />
        <div className="orb orb-3" />

        {/* Grid overlay */}
        <div style={{
          position: "fixed", inset: 0, zIndex: 0, pointerEvents: "none",
          backgroundImage: "linear-gradient(rgba(16,185,129,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(16,185,129,0.03) 1px, transparent 1px)",
          backgroundSize: "60px 60px",
        }} />

        {/* Card */}
        <div
          className={`login-card${mounted ? " mounted" : ""}`}
          style={{
            position: "relative", zIndex: 10, width: "100%", maxWidth: "450px",
            borderRadius: "28px", padding: "2.8rem 2.2rem",
            backdropFilter: "blur(32px)",
            background: "linear-gradient(135deg, rgba(16,185,129,0.06) 0%, rgba(255,255,255,0.04) 50%, rgba(245,158,11,0.04) 100%)",
            border: "1px solid rgba(255,255,255,0.1)",
            boxShadow: "0 12px 70px rgba(0,0,0,0.6), 0 0 0 1px rgba(16,185,129,0.12), inset 0 1px 0 rgba(255,255,255,0.08), 0 0 80px rgba(16,185,129,0.06)",
            overflow: "hidden",
          }}
        >
          {/* Animated top border */}
          <div style={{
            position: "absolute", top: 0, left: "10%", right: "10%", height: "2px",
            background: "linear-gradient(90deg, transparent, #10b981, #f59e0b, #10b981, transparent)",
            borderRadius: "2px",
            animation: "shimmerGreen 3s linear infinite",
            backgroundSize: "200% auto",
          }} />

          {/* Logo */}
          <div style={{ textAlign: "center", marginBottom: "2.2rem" }}>
            <div className="logo-icon" style={{
              display: "inline-flex", alignItems: "center", justifyContent: "center",
              width: 68, height: 68, borderRadius: "20px",
              background: "linear-gradient(135deg, #059669 0%, #10b981 50%, #f59e0b 100%)",
              marginBottom: "1.1rem", position: "relative",
            }}>
              <Compass size={32} color="#fff" />
            </div>

            <div style={{ animation: "fadeSlideUp 0.55s cubic-bezier(.16,1,.3,1) 0.15s both" }}>
              <h1 style={{
                color: "#fff", fontSize: "2rem", fontWeight: 900,
                letterSpacing: "-0.8px", margin: 0, lineHeight: 1.1,
              }}>
                Welcome Back
              </h1>
              <p style={{
                color: "rgba(255,255,255,0.45)", fontSize: "0.88rem",
                marginTop: "0.45rem", letterSpacing: "0.2px",
              }}>
                Continue your adventure ✈️
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1.15rem" }}>
            {/* Email */}
            <div className="form-field">
              <label htmlFor="login-email" style={{
                display: "block",
                color: focusedField === "email" ? "#10b981" : "rgba(255,255,255,0.55)",
                fontSize: "0.72rem", fontWeight: 700, marginBottom: "0.4rem",
                letterSpacing: "1.2px", transition: "color 0.3s",
              }}>
                EMAIL ADDRESS
              </label>
              <div style={{ position: "relative" }}>
                <Mail size={15} style={{
                  position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)",
                  color: focusedField === "email" ? "#10b981" : "rgba(255,255,255,0.3)",
                  transition: "color 0.3s",
                }} />
                <input
                  id="login-email" type="email" autoComplete="email" required
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  style={inputStyle("email")}
                  onFocus={() => setFocusedField("email")}
                  onBlur={() => setFocusedField(null)}
                />
              </div>
            </div>

            {/* Password */}
            <div className="form-field">
              <label htmlFor="login-password" style={{
                display: "block",
                color: focusedField === "password" ? "#10b981" : "rgba(255,255,255,0.55)",
                fontSize: "0.72rem", fontWeight: 700, marginBottom: "0.4rem",
                letterSpacing: "1.2px", transition: "color 0.3s",
              }}>
                PASSWORD
              </label>
              <div style={{ position: "relative" }}>
                <Lock size={15} style={{
                  position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)",
                  color: focusedField === "password" ? "#10b981" : "rgba(255,255,255,0.3)",
                  transition: "color 0.3s",
                }} />
                <input
                  id="login-password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password" required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  style={inputStyle("password")}
                  onFocus={() => setFocusedField("password")}
                  onBlur={() => setFocusedField(null)}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: "absolute", right: 12, top: "50%",
                    transform: "translateY(-50%)", background: "none",
                    border: "none", cursor: "pointer",
                    color: showPassword ? "#10b981" : "rgba(255,255,255,0.35)",
                    padding: 0, transition: "color 0.2s, transform 0.2s",
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-50%) scale(1.25)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.transform = "translateY(-50%) scale(1)"; }}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Remember / Forgot */}
            <div className="form-field" style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <label style={{
                display: "flex", alignItems: "center", gap: "0.5rem",
                color: "rgba(255,255,255,0.5)", fontSize: "0.84rem", cursor: "pointer",
              }}>
                <input type="checkbox" id="remember-me" style={{ accentColor: "#10b981", width: 15, height: 15 }} />
                Remember me
              </label>
              <a href="#" style={{
                color: "#10b981", fontSize: "0.84rem", textDecoration: "none",
                fontWeight: 600, transition: "color 0.2s",
              }}
                onMouseEnter={(e) => (e.currentTarget.style.color = "#f59e0b")}
                onMouseLeave={(e) => (e.currentTarget.style.color = "#10b981")}
              >
                Forgot password?
              </a>
            </div>

            {authError && (
              <p role="alert" style={{ color: "#fca5a5", fontSize: "0.85rem", margin: 0 }}>
                {authError}
              </p>
            )}

            {/* Submit */}
            <div className="form-field">
              <button
                id="login-submit" type="submit" disabled={isLoading}
                className={isLoading ? "" : "shimmer-btn"}
                onClick={handleBtnClick}
                style={{
                  position: "relative", overflow: "hidden",
                  width: "100%", marginTop: "0.2rem", padding: "0.92rem",
                  borderRadius: "14px", border: "none", color: "#fff",
                  fontSize: "1rem", fontWeight: 700,
                  cursor: isLoading ? "not-allowed" : "pointer",
                  letterSpacing: "0.3px",
                  boxShadow: "0 4px 28px rgba(16,185,129,0.35)",
                  transition: "transform 0.25s, box-shadow 0.25s",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}
                onMouseEnter={(e) => { if (!isLoading) { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 8px 36px rgba(16,185,129,0.5)"; } }}
                onMouseLeave={(e) => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "0 4px 28px rgba(16,185,129,0.35)"; }}
              >
                {ripple && (
                  <span style={{
                    position: "absolute",
                    left: ripple.x, top: ripple.y,
                    width: 80, height: 80,
                    marginLeft: -40, marginTop: -40,
                    borderRadius: "50%",
                    background: "rgba(255,255,255,0.25)",
                    animation: "rippleAnim 0.7s ease-out forwards",
                    pointerEvents: "none",
                  }} key={ripple.id} />
                )}
                {isLoading ? <><span className="spinner" />Signing in…</> : "Sign In →"}
              </button>
            </div>
          </form>

          {/* Divider */}
          <div style={{ display: "flex", alignItems: "center", gap: "1rem", margin: "1.6rem 0" }}>
            <div style={{ flex: 1, height: 1, background: "linear-gradient(to right, transparent, rgba(255,255,255,0.1))" }} />
            <span className="divider-text">OR</span>
            <div style={{ flex: 1, height: 1, background: "linear-gradient(to left, transparent, rgba(255,255,255,0.1))" }} />
          </div>

          {/* Google */}
          <button
            id="google-login" type="button" className="social-btn"
            onClick={handleGoogleSignIn}
            disabled={isLoading}
            style={{
              width: "100%", display: "flex", alignItems: "center", justifyContent: "center",
              gap: "0.65rem", padding: "0.8rem", borderRadius: "14px",
              background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)",
              color: "#fff", fontSize: "0.9rem", fontWeight: 600, cursor: "pointer",
              animation: "fadeSlideUp 0.5s 0.85s both",
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            Continue with Google
          </button>

          <button
            type="button"
            className="social-btn"
            onClick={handleGuestSignIn}
            disabled={isLoading}
            style={{
              width: "100%", display: "flex", alignItems: "center", justifyContent: "center",
              gap: "0.65rem", padding: "0.8rem", marginTop: "0.75rem", borderRadius: "14px",
              background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.1)",
              color: "rgba(255,255,255,0.82)", fontSize: "0.9rem", fontWeight: 600,
              cursor: isLoading ? "not-allowed" : "pointer", opacity: isLoading ? 0.6 : 1,
            }}
          >
            {isLoading ? "Starting guest session..." : "Continue as guest"}
          </button>
          <p style={{ textAlign: "center", color: "rgba(255,255,255,0.4)", fontSize: "0.76rem", marginTop: "0.55rem" }}>
            Browse rides and routes. Sign in to post or message.
          </p>

          <p style={{
            textAlign: "center", color: "rgba(255,255,255,0.4)", fontSize: "0.84rem",
            marginTop: "1.6rem", animation: "fadeSlideUp 0.5s 0.95s both",
          }}>
            New to TravelMate?{" "}
            <Link
              href="/signup"
              style={{ color: "#10b981", fontWeight: 700, textDecoration: "none", transition: "color 0.2s" }}
              onMouseEnter={(e) => (e.currentTarget.style.color = "#f59e0b")}
              onMouseLeave={(e) => (e.currentTarget.style.color = "#10b981")}
            >
              Create an account
            </Link>
          </p>
        </div>
      </div>
    </>
  );
}
