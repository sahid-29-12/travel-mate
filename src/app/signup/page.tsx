"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useRef, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  Plus, Trash2, User, Phone, Calendar,
  Hash, Users, Camera, ChevronDown, ChevronUp, CheckCircle2, Compass,
} from "lucide-react";

interface Profile {
  id: number;
  name: string;
  mobile: string;
  dob: string;
  age: string;
  gender: string;
  photo: string | null;
  photoFile: File | null;
}

const emptyProfile = (id: number): Profile => ({
  id, name: "", mobile: "", dob: "", age: "", gender: "", photo: null, photoFile: null,
});

const GENDER_OPTIONS = ["Male", "Female", "Non-binary", "Prefer not to say"];

/* ── Shared input style factory ── */
const makeInputStyle = (focused: boolean): React.CSSProperties => ({
  width: "100%",
  background: focused ? "rgba(16,185,129,0.08)" : "rgba(255,255,255,0.05)",
  border: `1px solid ${focused ? "rgba(16,185,129,0.7)" : "rgba(255,255,255,0.1)"}`,
  borderRadius: "10px",
  padding: "0.72rem 1rem 0.72rem 2.5rem",
  color: "#fff",
  fontSize: "0.9rem",
  outline: "none",
  boxSizing: "border-box",
  transition: "border-color 0.3s, background 0.3s, box-shadow 0.3s",
  boxShadow: focused ? "0 0 0 3px rgba(16,185,129,0.15)" : "none",
});

const labelStyle = (focused?: boolean): React.CSSProperties => ({
  display: "block",
  color: focused ? "#10b981" : "rgba(255,255,255,0.5)",
  fontSize: "0.7rem",
  fontWeight: 700,
  marginBottom: "0.35rem",
  letterSpacing: "1px",
  transition: "color 0.3s",
});

/* ─── Profile card ─── */
function ProfileCard({
  profile, index, onChange, onRemove, canRemove, isExpanded, onToggle,
}: {
  profile: Profile; index: number;
  onChange: (id: number, field: keyof Profile, value: string | File | null) => void;
  onRemove: (id: number) => void;
  canRemove: boolean; isExpanded: boolean; onToggle: () => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [photoHover, setPhotoHover] = useState(false);
  const [focused, setFocused] = useState<string | null>(null);

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    onChange(profile.id, "photoFile", file);
    const reader = new FileReader();
    reader.onload = () => onChange(profile.id, "photo", reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleDobChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const dob = e.target.value;
    onChange(profile.id, "dob", dob);
    if (dob) {
      const today = new Date(), birth = new Date(dob);
      let age = today.getFullYear() - birth.getFullYear();
      const m = today.getMonth() - birth.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
      onChange(profile.id, "age", age >= 0 ? String(age) : "");
    }
  };

  const isComplete = !!(profile.name && profile.mobile && profile.dob && profile.gender);

  return (
    <div
      className="profile-card"
      style={{
        background: isComplete
          ? "linear-gradient(135deg, rgba(16,185,129,0.06) 0%, rgba(255,255,255,0.03) 100%)"
          : "rgba(255,255,255,0.04)",
        border: `1px solid ${isComplete ? "rgba(16,185,129,0.45)" : "rgba(255,255,255,0.1)"}`,
        borderRadius: "18px",
        overflow: "hidden",
        transition: "border-color 0.4s, box-shadow 0.4s, background 0.4s",
        marginBottom: "1rem",
        boxShadow: isComplete ? "0 0 24px rgba(16,185,129,0.12)" : "none",
      }}
    >
      {/* Header */}
      <button
        type="button" onClick={onToggle}
        style={{
          width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "1rem 1.25rem", background: "none", border: "none", cursor: "pointer", color: "#fff",
          transition: "background 0.2s",
        }}
        onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(16,185,129,0.05)"; }}
        onMouseLeave={(e) => { e.currentTarget.style.background = "none"; }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          {/* Avatar */}
          <div style={{
            width: 46, height: 46, borderRadius: "50%", overflow: "hidden",
            background: "linear-gradient(135deg, #059669, #10b981, #f59e0b)",
            display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
            border: `2px solid ${isComplete ? "rgba(16,185,129,0.5)" : "rgba(255,255,255,0.15)"}`,
            transition: "transform 0.3s, box-shadow 0.3s, border-color 0.3s",
            boxShadow: isComplete ? "0 0 16px rgba(16,185,129,0.45)" : "none",
          }}>
            {profile.photo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={profile.photo} alt="avatar" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            ) : (
              <User size={20} color="rgba(255,255,255,0.7)" />
            )}
          </div>
          <div style={{ textAlign: "left" }}>
            <div style={{ fontWeight: 700, fontSize: "0.95rem" }}>
              {profile.name || `Traveller ${index + 1}`}
            </div>
            <div style={{ color: isComplete ? "#34d399" : "rgba(255,255,255,0.35)", fontSize: "0.78rem", transition: "color 0.3s" }}>
              {isComplete ? "✓ Profile complete" : "Fill in details below"}
            </div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          {isComplete && (
            <CheckCircle2 size={18} color="#34d399" style={{ animation: "checkPop 0.4s cubic-bezier(.22,1,.36,1) both" }} />
          )}
          {canRemove && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onRemove(profile.id); }}
              style={{
                background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)",
                borderRadius: "8px", padding: "0.3rem 0.5rem", color: "#f87171",
                cursor: "pointer", display: "flex", alignItems: "center",
                transition: "background 0.2s, transform 0.2s",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(239,68,68,0.25)"; e.currentTarget.style.transform = "scale(1.1)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(239,68,68,0.1)"; e.currentTarget.style.transform = "scale(1)"; }}
            >
              <Trash2 size={14} />
            </button>
          )}
          {isExpanded
            ? <ChevronUp size={18} color="rgba(255,255,255,0.45)" />
            : <ChevronDown size={18} color="rgba(255,255,255,0.45)" />}
        </div>
      </button>

      {/* Expandable Body */}
      <div style={{ maxHeight: isExpanded ? "900px" : "0", overflow: "hidden", transition: "max-height 0.55s cubic-bezier(.16,1,.3,1)" }}>
        <div style={{ padding: "0 1.25rem 1.4rem" }}>
          {/* Photo Upload */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginBottom: "1.4rem" }}>
            <div
              style={{ position: "relative", cursor: "pointer" }}
              onClick={() => fileRef.current?.click()}
              onMouseEnter={() => setPhotoHover(true)}
              onMouseLeave={() => setPhotoHover(false)}
            >
              <div style={{
                width: 96, height: 96, borderRadius: "50%", overflow: "hidden",
                background: "linear-gradient(135deg, #059669, #10b981, #f59e0b)",
                display: "flex", alignItems: "center", justifyContent: "center",
                border: `3px solid ${photoHover ? "rgba(16,185,129,0.8)" : "rgba(255,255,255,0.15)"}`,
                boxShadow: photoHover ? "0 0 36px rgba(16,185,129,0.5)" : "0 4px 20px rgba(16,185,129,0.2)",
                transition: "transform 0.35s, box-shadow 0.35s, border-color 0.35s",
                transform: photoHover ? "scale(1.07)" : "scale(1)",
              }}>
                {profile.photo ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={profile.photo} alt="Profile" style={{ width: "100%", height: "100%", objectFit: "cover", filter: photoHover ? "brightness(0.7)" : "none", transition: "filter 0.3s" }} />
                ) : (
                  <User size={38} color={photoHover ? "rgba(255,255,255,0.9)" : "rgba(255,255,255,0.5)"} style={{ transition: "color 0.3s" }} />
                )}
              </div>
              {/* Camera badge */}
              <div style={{
                position: "absolute", bottom: 2, right: 2,
                background: "linear-gradient(135deg, #059669, #f59e0b)",
                borderRadius: "50%", width: 30, height: 30,
                display: "flex", alignItems: "center", justifyContent: "center",
                border: "2px solid rgba(4,26,18,0.9)",
                transform: photoHover ? "scale(1.2) rotate(15deg)" : "scale(1) rotate(0deg)",
                transition: "transform 0.3s",
                boxShadow: "0 2px 10px rgba(16,185,129,0.4)",
              }}>
                <Camera size={13} color="#fff" />
              </div>
            </div>
            <input ref={fileRef} type="file" accept="image/*" id={`photo-${profile.id}`} style={{ display: "none" }} onChange={handlePhotoChange} />
            <p style={{ color: "rgba(255,255,255,0.3)", fontSize: "0.73rem", marginTop: "0.5rem" }}>
              Click to upload photo
            </p>
          </div>

          {/* Fields */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.85rem" }}>
            {/* Name */}
            <div style={{ gridColumn: "1 / -1" }}>
              <label htmlFor={`name-${profile.id}`} style={labelStyle(focused === `name-${profile.id}`)}>FULL NAME</label>
              <div style={{ position: "relative" }}>
                <User size={14} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: focused === `name-${profile.id}` ? "#10b981" : "rgba(255,255,255,0.3)", transition: "color 0.3s" }} />
                <input id={`name-${profile.id}`} type="text" placeholder="John Doe" value={profile.name} required
                  onChange={(e) => onChange(profile.id, "name", e.target.value)}
                  style={makeInputStyle(focused === `name-${profile.id}`)}
                  onFocus={() => setFocused(`name-${profile.id}`)}
                  onBlur={() => setFocused(null)}
                />
              </div>
            </div>

            {/* Mobile */}
            <div>
              <label htmlFor={`mobile-${profile.id}`} style={labelStyle(focused === `mobile-${profile.id}`)}>MOBILE</label>
              <div style={{ position: "relative" }}>
                <Phone size={14} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: focused === `mobile-${profile.id}` ? "#10b981" : "rgba(255,255,255,0.3)", transition: "color 0.3s" }} />
                <input id={`mobile-${profile.id}`} type="tel" placeholder="+91 98765 43210" value={profile.mobile} required
                  onChange={(e) => onChange(profile.id, "mobile", e.target.value)}
                  style={makeInputStyle(focused === `mobile-${profile.id}`)}
                  onFocus={() => setFocused(`mobile-${profile.id}`)}
                  onBlur={() => setFocused(null)}
                />
              </div>
            </div>

            {/* DOB */}
            <div>
              <label htmlFor={`dob-${profile.id}`} style={labelStyle(focused === `dob-${profile.id}`)}>DATE OF BIRTH</label>
              <div style={{ position: "relative" }}>
                <Calendar size={14} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: focused === `dob-${profile.id}` ? "#10b981" : "rgba(255,255,255,0.3)", zIndex: 1, transition: "color 0.3s" }} />
                <input id={`dob-${profile.id}`} type="date" value={profile.dob} required
                  onChange={handleDobChange}
                  style={{ ...makeInputStyle(focused === `dob-${profile.id}`), colorScheme: "dark" }}
                  onFocus={() => setFocused(`dob-${profile.id}`)}
                  onBlur={() => setFocused(null)}
                />
              </div>
            </div>

            {/* Age */}
            <div>
              <label htmlFor={`age-${profile.id}`} style={labelStyle(focused === `age-${profile.id}`)}>AGE</label>
              <div style={{ position: "relative" }}>
                <Hash size={14} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: focused === `age-${profile.id}` ? "#10b981" : "rgba(255,255,255,0.3)", transition: "color 0.3s" }} />
                <input id={`age-${profile.id}`} type="number" min="1" max="120" placeholder="Auto" value={profile.age}
                  onChange={(e) => onChange(profile.id, "age", e.target.value)}
                  style={{ ...makeInputStyle(focused === `age-${profile.id}`), background: "rgba(255,255,255,0.03)" }}
                  onFocus={() => setFocused(`age-${profile.id}`)}
                  onBlur={() => setFocused(null)}
                />
              </div>
            </div>

            {/* Gender pills */}
            <div style={{ gridColumn: "1 / -1" }}>
              <label style={labelStyle()}>GENDER</label>
              <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                {GENDER_OPTIONS.map((g) => (
                  <button key={g} type="button" onClick={() => onChange(profile.id, "gender", g)}
                    style={{
                      padding: "0.45rem 0.95rem", borderRadius: "20px",
                      border: `1px solid ${profile.gender === g ? "rgba(16,185,129,0.8)" : "rgba(255,255,255,0.12)"}`,
                      background: profile.gender === g ? "rgba(16,185,129,0.22)" : "rgba(255,255,255,0.04)",
                      color: profile.gender === g ? "#6ee7b7" : "rgba(255,255,255,0.45)",
                      fontSize: "0.8rem", fontWeight: 600, cursor: "pointer",
                      transition: "all 0.25s cubic-bezier(.16,1,.3,1)",
                      display: "flex", alignItems: "center", gap: "0.3rem",
                      transform: profile.gender === g ? "scale(1.08)" : "scale(1)",
                      boxShadow: profile.gender === g ? "0 0 12px rgba(16,185,129,0.25)" : "none",
                    }}
                  >
                    {profile.gender === g && <Users size={12} style={{ animation: "checkPop 0.3s ease" }} />}
                    {g}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Particle Canvas ─── */
function ParticleCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const resize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; };
    resize();
    window.addEventListener("resize", resize);
    type Particle = { x: number; y: number; r: number; dx: number; dy: number; alpha: number; dAlpha: number };
    const particles: Particle[] = Array.from({ length: 50 }, () => ({
      x: Math.random() * canvas.width, y: Math.random() * canvas.height,
      r: Math.random() * 1.8 + 0.4,
      dx: (Math.random() - 0.5) * 0.3, dy: (Math.random() - 0.5) * 0.3,
      alpha: Math.random() * 0.5 + 0.1, dAlpha: (Math.random() - 0.5) * 0.003,
    }));
    let raf: number;
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particles.forEach((p) => {
        p.x += p.dx; p.y += p.dy; p.alpha += p.dAlpha;
        if (p.alpha < 0.05 || p.alpha > 0.65) p.dAlpha *= -1;
        if (p.x < 0) p.x = canvas.width; if (p.x > canvas.width) p.x = 0;
        if (p.y < 0) p.y = canvas.height; if (p.y > canvas.height) p.y = 0;
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
  return <canvas ref={canvasRef} style={{ position: "fixed", inset: 0, zIndex: 0, pointerEvents: "none" }} />;
}

/* ─── Main Page ─── */
export default function SignupPage() {
  const router = useRouter();
  const [profiles, setProfiles] = useState<Profile[]>([emptyProfile(1)]);
  const [expandedId, setExpandedId] = useState<number>(1);
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mounted, setMounted] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [ripple, setRipple] = useState<{ x: number; y: number; id: number } | null>(null);
  const [authError, setAuthError] = useState("");
  const [authNotice, setAuthNotice] = useState("");

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 60);
    return () => clearTimeout(t);
  }, []);

  const addProfile = () => {
    if (profiles.length >= 3) return;
    const newId = Date.now();
    setProfiles((prev) => [...prev, emptyProfile(newId)]);
    setExpandedId(newId);
  };
  const removeProfile = (id: number) => {
    setProfiles((prev) => prev.filter((p) => p.id !== id));
    setExpandedId(profiles[0]?.id ?? 0);
  };
  const handleChange = (id: number, field: keyof Profile, value: string | File | null) => {
    setProfiles((prev) => prev.map((p) => p.id === id ? { ...p, [field]: value } : p));
  };
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    setAuthError("");
    setAuthNotice("");
    try {
      const primaryProfile = profiles[0];
      const supabase = createClient();
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
          data: {
            full_name: primaryProfile.name.trim(),
            phone: primaryProfile.mobile.trim(),
            date_of_birth: primaryProfile.dob,
            gender: primaryProfile.gender,
            traveler_profiles: profiles.map((profile) => ({
              full_name: profile.name.trim(),
              phone: profile.mobile.trim(),
              date_of_birth: profile.dob,
              gender: profile.gender,
            })),
          },
        },
      });
      if (error) throw error;
      if (data.session) {
        router.push("/profile");
      } else {
        setAuthNotice("Your account is created. Check your email to confirm it before signing in.");
      }
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : "Unable to create your account. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };
  const handleBtnClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setRipple({ x: e.clientX - rect.left, y: e.clientY - rect.top, id: Date.now() });
    setTimeout(() => setRipple(null), 700);
  };

  const credInputStyle = (field: string): React.CSSProperties => ({
    width: "100%",
    background: focusedField === field ? "rgba(16,185,129,0.08)" : "rgba(255,255,255,0.05)",
    border: `1px solid ${focusedField === field ? "rgba(16,185,129,0.7)" : "rgba(255,255,255,0.1)"}`,
    borderRadius: "10px",
    padding: "0.78rem 1rem 0.78rem 2.5rem",
    color: "#fff",
    fontSize: "0.92rem",
    outline: "none",
    boxSizing: "border-box",
    transition: "border-color 0.3s, background 0.3s, box-shadow 0.3s",
    boxShadow: focusedField === field ? "0 0 0 3px rgba(16,185,129,0.15)" : "none",
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
          from { opacity:0; transform:translateY(28px); }
          to   { opacity:1; transform:translateY(0); }
        }
        @keyframes orbDrift1 {
          0%,100% { transform: translate(0,0) scale(1); }
          25%     { transform: translate(40px,-30px) scale(1.12); }
          50%     { transform: translate(-20px,-50px) scale(0.92); }
          75%     { transform: translate(-40px,20px) scale(1.05); }
        }
        @keyframes orbDrift2 {
          0%,100% { transform: translate(0,0) scale(1); }
          30%     { transform: translate(-35px,25px) scale(1.15); }
          60%     { transform: translate(30px,-40px) scale(0.88); }
          80%     { transform: translate(20px,15px) scale(1.08); }
        }
        @keyframes orbDrift3 {
          0%,100% { transform: translate(0,0) scale(1); }
          40%     { transform: translate(25px,-20px) scale(1.1); }
          70%     { transform: translate(-15px,30px) scale(0.9); }
        }
        @keyframes checkPop {
          0%  { transform:scale(0) rotate(-20deg); opacity:0; }
          70% { transform:scale(1.2) rotate(5deg); opacity:1; }
          100%{ transform:scale(1) rotate(0deg);  opacity:1; }
        }
        @keyframes spin { to { transform:rotate(360deg); } }
        @keyframes rippleAnim {
          0% { transform: scale(0); opacity: 0.5; }
          100% { transform: scale(4); opacity: 0; }
        }
        @keyframes profileSlideIn {
          from { opacity:0; transform: translateX(-20px) scale(0.97); }
          to   { opacity:1; transform: translateX(0) scale(1); }
        }
        @keyframes slideInCard {
          from { opacity:0; transform: translateY(40px) scale(0.97); filter: blur(4px); }
          to   { opacity:1; transform: translateY(0) scale(1); filter: blur(0); }
        }

        .signup-card {
          opacity: 0;
          animation: slideInCard 0.75s cubic-bezier(.16,1,.3,1) 0.1s both;
        }
        .signup-card.mounted { opacity: 1; }

        .logo-icon { animation: floatY 4s ease-in-out infinite, pulseGlow 4s ease-in-out infinite; }

        .shimmer-btn {
          background: linear-gradient(90deg,
            #059669 0%, #10b981 20%, #f59e0b 40%, #10b981 60%, #059669 80%, #10b981 100%
          );
          background-size: 250% auto;
          animation: shimmerGreen 2.5s linear infinite;
        }
        .shimmer-btn:disabled { animation: none; background: rgba(16,185,129,0.35); }

        .add-profile-btn .plus-icon { transition: transform 0.35s cubic-bezier(.22,1,.36,1); }
        .add-profile-btn:hover .plus-icon { transform: rotate(90deg); }

        .profile-card { animation: profileSlideIn 0.45s cubic-bezier(.16,1,.3,1) both; }

        .spinner {
          display:inline-block; width:16px; height:16px;
          border:2px solid rgba(255,255,255,0.3);
          border-top-color:#fff; border-radius:50%;
          animation:spin 0.75s linear infinite;
          vertical-align:middle; margin-right:8px;
        }

        .orb { position:fixed; border-radius:50%; filter:blur(85px); pointer-events:none; z-index:0; }
        .orb-1 {
          width:420px; height:420px;
          background: radial-gradient(circle, rgba(16,185,129,0.22) 0%, rgba(5,150,105,0.08) 70%);
          top:-140px; left:-150px; animation:orbDrift1 13s ease-in-out infinite;
        }
        .orb-2 {
          width:340px; height:340px;
          background: radial-gradient(circle, rgba(245,158,11,0.18) 0%, rgba(217,119,6,0.05) 70%);
          bottom:-100px; right:-120px; animation:orbDrift2 15s ease-in-out infinite;
        }
        .orb-3 {
          width:220px; height:220px;
          background: radial-gradient(circle, rgba(6,182,212,0.15) 0%, transparent 70%);
          top:45%; left:65%; animation:orbDrift3 10s ease-in-out infinite reverse;
        }

        input::placeholder { color: rgba(255,255,255,0.25); }
        input[type="date"]::-webkit-calendar-picker-indicator { filter: invert(0.5); cursor: pointer; }
      `}</style>

      <div style={{
        minHeight: "calc(100vh - 130px)",
        background: "linear-gradient(135deg, #020c08 0%, #041a12 30%, #050f14 60%, #080818 100%)",
        display: "flex", alignItems: "flex-start", justifyContent: "center",
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

        {/* Main Card */}
        <div
          className={`signup-card${mounted ? " mounted" : ""}`}
          style={{
            position: "relative", zIndex: 10, width: "100%", maxWidth: "560px",
            borderRadius: "28px", padding: "2.6rem 2.2rem",
            backdropFilter: "blur(32px)",
            background: "linear-gradient(135deg, rgba(16,185,129,0.06) 0%, rgba(255,255,255,0.04) 50%, rgba(245,158,11,0.04) 100%)",
            border: "1px solid rgba(255,255,255,0.1)",
            boxShadow: "0 12px 70px rgba(0,0,0,0.6), 0 0 0 1px rgba(16,185,129,0.1), inset 0 1px 0 rgba(255,255,255,0.07)",
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

          {/* Header */}
          <div style={{ textAlign: "center", marginBottom: "2rem" }}>
            <div className="logo-icon" style={{
              display: "inline-flex", alignItems: "center", justifyContent: "center",
              width: 64, height: 64, borderRadius: "20px",
              background: "linear-gradient(135deg, #059669 0%, #10b981 50%, #f59e0b 100%)",
              marginBottom: "1.1rem",
            }}>
              <Compass size={30} color="#fff" />
            </div>
            <h1 style={{
              color: "#fff", fontSize: "1.85rem", fontWeight: 900,
              letterSpacing: "-0.6px", margin: 0,
              animation: "fadeSlideUp 0.6s cubic-bezier(.16,1,.3,1) 0.1s both",
            }}>
              Create Your Account
            </h1>
            <p style={{
              color: "rgba(255,255,255,0.45)", fontSize: "0.88rem", marginTop: "0.4rem",
              animation: "fadeSlideUp 0.6s cubic-bezier(.16,1,.3,1) 0.2s both",
            }}>
              Set up to 3 traveller profiles on one account 🌍
            </p>
          </div>

          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            {/* Account credentials */}
            <div style={{
              background: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: "16px", padding: "1.2rem", marginBottom: "0.5rem",
              animation: "fadeSlideUp 0.55s cubic-bezier(.16,1,.3,1) 0.3s both",
            }}>
              <p style={{
                color: "rgba(255,255,255,0.45)", fontSize: "0.7rem", fontWeight: 700,
                letterSpacing: "1px", marginBottom: "0.9rem",
              }}>
                ACCOUNT CREDENTIALS
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}>
                {/* Email */}
                <div>
                  <label htmlFor="signup-email" style={{
                    display: "block",
                    color: focusedField === "signup-email" ? "#10b981" : "rgba(255,255,255,0.5)",
                    fontSize: "0.7rem", fontWeight: 700, marginBottom: "0.35rem",
                    letterSpacing: "1px", transition: "color 0.3s",
                  }}>EMAIL ADDRESS</label>
                  <div style={{ position: "relative" }}>
                    <span style={{
                      position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)",
                      color: focusedField === "signup-email" ? "#10b981" : "rgba(255,255,255,0.3)",
                      fontSize: 14, transition: "color 0.3s",
                    }}>@</span>
                    <input id="signup-email" type="email" placeholder="you@example.com" required value={email}
                      onChange={(e) => setEmail(e.target.value)} style={credInputStyle("signup-email")}
                      onFocus={() => setFocusedField("signup-email")}
                      onBlur={() => setFocusedField(null)}
                    />
                  </div>
                </div>
                {/* Password */}
                <div>
                  <label htmlFor="signup-password" style={{
                    display: "block",
                    color: focusedField === "signup-password" ? "#10b981" : "rgba(255,255,255,0.5)",
                    fontSize: "0.7rem", fontWeight: 700, marginBottom: "0.35rem",
                    letterSpacing: "1px", transition: "color 0.3s",
                  }}>PASSWORD</label>
                  <div style={{ position: "relative" }}>
                    <span style={{
                      position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)",
                      color: focusedField === "signup-password" ? "#10b981" : "rgba(255,255,255,0.3)",
                      fontSize: 14, transition: "color 0.3s",
                    }}>🔒</span>
                    <input id="signup-password" type="password" placeholder="Min. 8 characters" required minLength={8} value={password}
                      onChange={(e) => setPassword(e.target.value)} style={credInputStyle("signup-password")}
                      onFocus={() => setFocusedField("signup-password")}
                      onBlur={() => setFocusedField(null)}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Profiles */}
            <div style={{ animation: "fadeSlideUp 0.55s cubic-bezier(.16,1,.3,1) 0.42s both" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.75rem" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <p style={{ color: "rgba(255,255,255,0.55)", fontSize: "0.7rem", fontWeight: 700, letterSpacing: "1px", margin: 0 }}>
                    TRAVELLER PROFILES
                  </p>
                  <span style={{
                    background: "linear-gradient(135deg, #059669, #f59e0b)",
                    color: "#fff", fontSize: "0.7rem", fontWeight: 800,
                    borderRadius: "20px", padding: "0.15rem 0.5rem",
                    transition: "transform 0.3s",
                  }}>
                    {profiles.length}/3
                  </span>
                </div>
                {profiles.length < 3 && (
                  <button type="button" onClick={addProfile} id="add-profile-btn" className="add-profile-btn"
                    style={{
                      display: "flex", alignItems: "center", gap: "0.3rem",
                      padding: "0.35rem 0.75rem", borderRadius: "20px",
                      background: "rgba(16,185,129,0.15)", border: "1px solid rgba(16,185,129,0.35)",
                      color: "#6ee7b7", fontSize: "0.8rem", fontWeight: 600, cursor: "pointer",
                      transition: "background 0.2s, transform 0.2s, box-shadow 0.2s",
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(16,185,129,0.28)"; e.currentTarget.style.transform = "scale(1.06)"; e.currentTarget.style.boxShadow = "0 0 14px rgba(16,185,129,0.25)"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(16,185,129,0.15)"; e.currentTarget.style.transform = "scale(1)"; e.currentTarget.style.boxShadow = "none"; }}
                  >
                    <Plus size={14} className="plus-icon" /> Add Profile
                  </button>
                )}
              </div>

              {profiles.map((profile, index) => (
                <ProfileCard
                  key={profile.id} profile={profile} index={index}
                  onChange={handleChange} onRemove={removeProfile}
                  canRemove={profiles.length > 1}
                  isExpanded={expandedId === profile.id}
                  onToggle={() => setExpandedId(expandedId === profile.id ? -1 : profile.id)}
                />
              ))}
            </div>

            {/* Submit */}
            {authError && (
              <p role="alert" style={{ color: "#fca5a5", fontSize: "0.84rem", margin: 0 }}>
                {authError}
              </p>
            )}
            {authNotice && (
              <p role="status" style={{ color: "#6ee7b7", fontSize: "0.84rem", margin: 0 }}>
                {authNotice}
              </p>
            )}
            <button
              id="signup-submit" type="submit" disabled={isLoading}
              className={isLoading ? "" : "shimmer-btn"}
              onClick={handleBtnClick}
              style={{
                position: "relative", overflow: "hidden",
                marginTop: "0.5rem", padding: "0.95rem", borderRadius: "14px",
                border: "none", color: "#fff", fontSize: "1rem", fontWeight: 700,
                cursor: isLoading ? "not-allowed" : "pointer", letterSpacing: "0.3px",
                boxShadow: "0 4px 28px rgba(16,185,129,0.35)",
                transition: "transform 0.25s, box-shadow 0.25s",
                display: "flex", alignItems: "center", justifyContent: "center",
                animation: "fadeSlideUp 0.55s cubic-bezier(.16,1,.3,1) 0.55s both",
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
              {isLoading
                ? <><span className="spinner" />Creating Account…</>
                : "Create account →"
              }
            </button>

            <p style={{
              textAlign: "center", color: "rgba(255,255,255,0.4)", fontSize: "0.82rem",
              animation: "fadeSlideUp 0.55s cubic-bezier(.16,1,.3,1) 0.65s both",
            }}>
              Already have an account?{" "}
              <Link href="/login" style={{ color: "#10b981", fontWeight: 700, textDecoration: "none", transition: "color 0.2s" }}
                onMouseEnter={(e) => (e.currentTarget.style.color = "#f59e0b")}
                onMouseLeave={(e) => (e.currentTarget.style.color = "#10b981")}
              >
                Sign in
              </Link>
            </p>
          </form>
        </div>
      </div>
    </>
  );
}
