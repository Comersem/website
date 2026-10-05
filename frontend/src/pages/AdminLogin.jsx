import React, { useState } from "react";
import { useNavigate, Navigate } from "react-router-dom";
import { Lock, LogIn } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { apiError } from "../lib/api";
import { COMPANY } from "../mock";

export default function AdminLogin() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  if (user) return <Navigate to="/admin" replace />;

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await login(email, password);
      navigate("/admin");
    } catch (err) {
      setError(apiError(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0B2A4A] px-4 relative overflow-hidden">
      <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse 60% 50% at 50% 30%, rgba(62,106,138,0.35), transparent 70%)" }} />
      <form
        onSubmit={submit}
        className="relative w-full max-w-md rounded-3xl bg-white/95 backdrop-blur-xl shadow-2xl p-8 sm:p-10"
        data-testid="admin-login-form"
      >
        <img src={COMPANY.logo} alt="COMERSEM" className="h-10 w-auto" />
        <h1 className="mt-6 text-3xl font-extrabold text-slate-800 tracking-tight">Panel de administración</h1>
        <p className="mt-1 text-sm text-slate-500">Acceso exclusivo para el equipo {COMPANY.name}.</p>

        <label className="block mt-8 text-xs font-bold uppercase tracking-wider text-slate-500">Correo</label>
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="mt-1.5 h-12 w-full rounded-2xl border border-slate-200 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-sky-300"
          data-testid="admin-email-input"
        />
        <label className="block mt-4 text-xs font-bold uppercase tracking-wider text-slate-500">Contraseña</label>
        <input
          type="password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="mt-1.5 h-12 w-full rounded-2xl border border-slate-200 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-sky-300"
          data-testid="admin-password-input"
        />
        {error && (
          <p className="mt-3 text-sm font-semibold text-red-600" data-testid="admin-login-error">{error}</p>
        )}
        <button
          type="submit"
          disabled={busy}
          className="mt-6 w-full h-12 inline-flex items-center justify-center gap-2 rounded-full bg-sky-600 text-white font-semibold hover:bg-sky-700 disabled:opacity-50 transition-colors"
          data-testid="admin-login-submit"
        >
          {busy ? <Lock className="w-4 h-4 animate-pulse" /> : <LogIn className="w-4 h-4" />}
          {busy ? "Entrando…" : "Iniciar sesión"}
        </button>
      </form>
    </div>
  );
}
