'use client';

import { FormEvent, Suspense, useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  ShieldCheck,
  ArrowRight,
  ArrowLeft,
  Loader2,
  Mail,
  Lock,
  LockKeyhole,
  Eye,
  EyeOff,
  User,
  AlertCircle,
  CheckCircle2,
  Sparkles,
  Wheat,
  Shield,
  X,
  ChevronRight,
} from 'lucide-react';
import { useAuth, AppRole } from '../../context/AuthContext';

/* ─── In-App OAuth Account Chooser Modal ───────────────────────────── */
interface OAuthModalProps {
  provider: 'google' | 'facebook';
  role: AppRole;
  onConfirm: (email: string, name: string) => void;
  onClose: () => void;
  loading: boolean;
}

function OAuthModal({ provider, role, onConfirm, onClose, loading }: OAuthModalProps) {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const emailRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    emailRef.current?.focus();
  }, []);

  const isGoogle = provider === 'google';
  const accent = isGoogle ? '#4285F4' : '#1877F2';
  const providerLabel = isGoogle ? 'Google' : 'Facebook';

  const suggestedAccounts = isGoogle
    ? [
        { email: 'krishimitra@gmail.com', name: 'Krishi Mitra' },
        { email: 'farmer2026@gmail.com', name: 'Farmer 2026' },
      ]
    : [
        { email: 'farmerfb@facebook.com', name: 'Facebook Farmer' },
        { email: 'kisan2026@facebook.com', name: 'Kisan 2026' },
      ];

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    onConfirm(email.trim(), name.trim() || email.split('@')[0]);
  };

  const handleSuggested = (acc: { email: string; name: string }) => {
    onConfirm(acc.email, acc.name);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center px-4 pb-4 sm:pb-0"
      style={{ background: 'rgba(2,6,23,0.85)', backdropFilter: 'blur(6px)' }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-3xl border border-slate-700/80 bg-slate-900 shadow-2xl shadow-black overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            {/* Provider logo */}
            {isGoogle ? (
              <svg className="h-6 w-6 shrink-0" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z" />
                <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.34 24 12 24z" />
                <path fill="#FBBC05" d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.98 0 12s.45 3.82 1.25 5.42l4.03-3.15z" />
                <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.34 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z" />
              </svg>
            ) : (
              <svg className="h-6 w-6 shrink-0" viewBox="0 0 24 24">
                <path fill="#1877F2" d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
              </svg>
            )}
            <div>
              <p className="text-sm font-bold text-white">Sign in with {providerLabel}</p>
              <p className="text-[11px] text-slate-400">as {role === 'officer' ? 'Field Officer' : 'Farmer'}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-500 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Suggested Accounts */}
        <div className="px-5 pt-4">
          <p className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold mb-2">Choose account</p>
          <div className="space-y-1.5">
            {suggestedAccounts.map(acc => (
              <button
                key={acc.email}
                type="button"
                disabled={loading}
                onClick={() => handleSuggested(acc)}
                className="w-full flex items-center gap-3 p-3 rounded-xl border border-slate-800 hover:border-slate-600 hover:bg-slate-800/60 transition-all duration-150 group disabled:opacity-50"
              >
                <div
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-white text-sm font-bold"
                  style={{ background: accent }}
                >
                  {acc.name.charAt(0)}
                </div>
                <div className="text-left flex-1 min-w-0">
                  <p className="text-sm font-semibold text-white truncate">{acc.name}</p>
                  <p className="text-[11px] text-slate-400 truncate">{acc.email}</p>
                </div>
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin text-emerald-400 shrink-0" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-slate-600 group-hover:text-slate-300 shrink-0" />
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Custom Email Entry */}
        <div className="px-5 pt-4 pb-5">
          <p className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold mb-2.5">Or use another account</p>
          <form onSubmit={handleSubmit} className="space-y-2.5">
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
              <input
                ref={emailRef}
                required
                type="email"
                placeholder={isGoogle ? 'your@gmail.com' : 'your@facebook.com'}
                value={email}
                onChange={e => setEmail(e.target.value)}
                disabled={loading}
                className="w-full rounded-xl border border-slate-700 bg-slate-950 pl-10 pr-3.5 py-2.5 text-sm text-white placeholder:text-slate-600 outline-none transition-colors focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 disabled:opacity-50"
              />
            </div>
            <div className="relative">
              <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
              <input
                type="text"
                placeholder="Your full name (optional)"
                value={name}
                onChange={e => setName(e.target.value)}
                disabled={loading}
                className="w-full rounded-xl border border-slate-700 bg-slate-950 pl-10 pr-3.5 py-2.5 text-sm text-white placeholder:text-slate-600 outline-none transition-colors focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 disabled:opacity-50"
              />
            </div>
            <button
              type="submit"
              disabled={loading || !email.trim()}
              className="w-full flex items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-bold text-white transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ background: loading ? '#1e293b' : accent }}
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Signing in…</span>
                </>
              ) : (
                <>
                  <span>Continue as {providerLabel} User</span>
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

/* ─── Main Login Page ──────────────────────────────────────────────── */
function LoginPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, role, loading, signIn, signUp, signInWithOAuth } = useAuth();

  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [selectedRole, setSelectedRole] = useState<AppRole>(
    searchParams.get('role') === 'officer' ? 'officer' : 'farmer'
  );
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState<{ type: 'error' | 'success'; text: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [oauthLoading, setOauthLoading] = useState<'google' | 'facebook' | null>(null);

  // In-app OAuth modal state
  const [oauthModal, setOauthModal] = useState<'google' | 'facebook' | null>(null);

  const nextRoute = searchParams.get('next');

  useEffect(() => {
    if (!loading && user && role) {
      router.replace(
        nextRoute?.startsWith('/')
          ? nextRoute
          : role === 'officer'
          ? '/dashboard/officer'
          : '/dashboard/farmer'
      );
    }
  }, [loading, user, role, nextRoute, router]);

  const handleRoleSelect = (r: AppRole) => {
    setSelectedRole(r);
    setMessage(null);
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setMessage(null);

    const result =
      mode === 'signin'
        ? await signIn(email, password)
        : await signUp(name, email, password, selectedRole);

    setSubmitting(false);

    if (result.error) {
      setMessage({ type: 'error', text: result.error });
    } else if ('needsEmailConfirmation' in result && result.needsEmailConfirmation) {
      setMessage({
        type: 'success',
        text: 'Account created! Please check your email to confirm, then sign in.',
      });
      setMode('signin');
    }
  };

  // Opens in-app chooser modal — no external redirect ever
  const handleOAuthButtonClick = (provider: 'google' | 'facebook') => {
    setMessage(null);
    setOauthModal(provider);
  };

  // Called when user confirms their email/name in the modal
  const handleOAuthConfirm = async (chosenEmail: string, chosenName: string) => {
    if (!oauthModal) return;
    setOauthLoading(oauthModal);
    try {
      const res = await signInWithOAuth(oauthModal, selectedRole, chosenEmail, chosenName);
      if (res.error) {
        setMessage({ type: 'error', text: res.error });
        setOauthModal(null);
      }
      // On success AuthContext sets user → useEffect redirects
    } catch {
      setMessage({ type: 'error', text: 'Authentication failed. Please try again.' });
      setOauthModal(null);
    } finally {
      setOauthLoading(null);
    }
  };

  const handleModalClose = () => {
    if (oauthLoading) return; // Don't close while processing
    setOauthModal(null);
  };

  return (
    <main className="relative min-h-screen bg-slate-950 flex flex-col justify-center items-center px-4 py-8 overflow-hidden">
      {/* Dynamic Background Elements */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-32 left-1/2 -translate-x-1/2 h-96 w-[600px] rounded-full bg-gradient-to-b from-emerald-500/15 via-teal-500/10 to-transparent blur-3xl" />
        <div className="absolute top-1/3 -right-32 h-80 w-80 rounded-full bg-emerald-600/10 blur-3xl" />
        <div className="absolute bottom-10 -left-32 h-80 w-80 rounded-full bg-cyan-600/10 blur-3xl" />
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `radial-gradient(circle at 1px 1px, #fff 1px, transparent 0)`,
            backgroundSize: '24px 24px',
          }}
        />
      </div>

      {/* Top Bar Back Link */}
      <div className="relative z-10 w-full max-w-md mb-4 flex items-center justify-between">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-emerald-400 transition-colors py-1 px-2.5 rounded-lg bg-slate-900/60 border border-slate-800 backdrop-blur-md"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Back to Home</span>
        </Link>
        <span className="text-[11px] font-medium text-emerald-400/90 tracking-wide uppercase px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
          Encrypted Access
        </span>
      </div>

      {/* Main Auth Container */}
      <div className="relative z-10 w-full max-w-md">
        {/* Header Branding */}
        <div className="text-center mb-6">
          <div className="inline-flex relative mb-3">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-tr from-slate-900 via-slate-800 to-slate-900 p-2.5 shadow-xl shadow-emerald-950/50 ring-1 ring-emerald-500/30">
              <img src="/logo-shield.png" alt="KrishiRakshak AI" className="h-12 w-12 object-contain" />
            </div>
            <div className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500 text-slate-950 shadow-md">
              <Sparkles className="h-3.5 w-3.5" />
            </div>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            KrishiRakshak <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-300">AI</span>
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-slate-400">
            Secure crop pathology &amp; pest surveillance ecosystem
          </p>
        </div>

        {/* Auth Card */}
        <section className="rounded-3xl border border-slate-800/90 bg-slate-900/80 p-6 sm:p-7 shadow-2xl shadow-black/80 backdrop-blur-xl">
          {/* Signin vs Signup Tabs */}
          <div className="mb-6 grid grid-cols-2 rounded-xl bg-slate-950/90 p-1 border border-slate-800/80">
            <button
              type="button"
              onClick={() => { setMode('signin'); setMessage(null); }}
              className={`rounded-lg py-2.5 text-xs sm:text-sm font-bold transition-all duration-200 ${
                mode === 'signin'
                  ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md shadow-emerald-900/40'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => { setMode('signup'); setMessage(null); }}
              className={`rounded-lg py-2.5 text-xs sm:text-sm font-bold transition-all duration-200 ${
                mode === 'signup'
                  ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md shadow-emerald-900/40'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Create Account
            </button>
          </div>

          {/* Role Selection Cards */}
          <div className="mb-5">
            <label className="block mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
              Select Your Portal Role
            </label>
            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => handleRoleSelect('farmer')}
                className={`relative flex flex-col items-start p-3 rounded-xl border text-left transition-all duration-200 ${
                  selectedRole === 'farmer'
                    ? 'border-emerald-500 bg-emerald-500/10 shadow-sm shadow-emerald-500/20'
                    : 'border-slate-800 bg-slate-950/40 hover:border-slate-700 hover:bg-slate-950/70'
                }`}
              >
                <div className="flex items-center justify-between w-full mb-1">
                  <div className={`p-1.5 rounded-lg ${selectedRole === 'farmer' ? 'bg-emerald-500 text-slate-950' : 'bg-slate-800 text-slate-400'}`}>
                    <Wheat className="h-4 w-4" />
                  </div>
                  {selectedRole === 'farmer' && (
                    <span className="flex h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_8px_#34d399]" />
                  )}
                </div>
                <span className={`text-xs font-bold ${selectedRole === 'farmer' ? 'text-white' : 'text-slate-300'}`}>
                  Farmer
                </span>
                <span className="text-[10px] text-slate-400 leading-tight mt-0.5">
                  Scan crops &amp; voice advice
                </span>
              </button>

              <button
                type="button"
                onClick={() => handleRoleSelect('officer')}
                className={`relative flex flex-col items-start p-3 rounded-xl border text-left transition-all duration-200 ${
                  selectedRole === 'officer'
                    ? 'border-emerald-500 bg-emerald-500/10 shadow-sm shadow-emerald-500/20'
                    : 'border-slate-800 bg-slate-950/40 hover:border-slate-700 hover:bg-slate-950/70'
                }`}
              >
                <div className="flex items-center justify-between w-full mb-1">
                  <div className={`p-1.5 rounded-lg ${selectedRole === 'officer' ? 'bg-emerald-500 text-slate-950' : 'bg-slate-800 text-slate-400'}`}>
                    <Shield className="h-4 w-4" />
                  </div>
                  {selectedRole === 'officer' && (
                    <span className="flex h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_8px_#34d399]" />
                  )}
                </div>
                <span className={`text-xs font-bold ${selectedRole === 'officer' ? 'text-white' : 'text-slate-300'}`}>
                  Officer
                </span>
                <span className="text-[10px] text-slate-400 leading-tight mt-0.5">
                  Surveillance &amp; GIS map
                </span>
              </button>
            </div>
          </div>

          {/* Social OAuth Buttons — locked, show in-app email modal on click */}
          <div className="space-y-2.5 mb-5">

            {/* ── Google Button (Locked) ── */}
            <div className="relative group/google">
              <button
                id="btn-google-signin"
                type="button"
                disabled={submitting || oauthLoading !== null}
                onClick={() => handleOAuthButtonClick('google')}
                className="w-full flex items-center gap-3 py-2.5 px-4 rounded-xl border border-slate-700/60 bg-slate-950/70 text-slate-400 text-xs sm:text-sm font-semibold transition-all duration-200 shadow-sm disabled:cursor-not-allowed opacity-70 hover:opacity-90"
              >
                {oauthLoading === 'google' ? (
                  <Loader2 className="h-4 w-4 animate-spin text-emerald-400 shrink-0" />
                ) : (
                  <svg className="h-4 w-4 shrink-0 opacity-60" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z" />
                    <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.34 24 12 24z" />
                    <path fill="#FBBC05" d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.98 0 12s.45 3.82 1.25 5.42l4.03-3.15z" />
                    <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.34 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z" />
                  </svg>
                )}
                <span className="flex-1 text-left">Continue with Google</span>
                {/* Lock badge */}
                <span className="flex items-center gap-1 text-[10px] font-bold text-amber-400 bg-amber-400/10 border border-amber-400/30 rounded-full px-2 py-0.5 shrink-0">
                  <LockKeyhole className="h-2.5 w-2.5" />
                  Locked
                </span>
              </button>
              {/* Tooltip */}
              <div className="pointer-events-none absolute left-1/2 -translate-x-1/2 -bottom-9 z-20 hidden group-hover/google:flex items-center gap-1.5 whitespace-nowrap rounded-lg bg-slate-800 border border-slate-700 px-3 py-1.5 text-[11px] text-slate-300 shadow-xl">
                <LockKeyhole className="h-3 w-3 text-amber-400" />
                OAuth not configured — use email below
                <span className="absolute -top-1.5 left-1/2 -translate-x-1/2 h-2.5 w-2.5 rotate-45 bg-slate-800 border-l border-t border-slate-700" />
              </div>
            </div>

            {/* ── Facebook Button (Locked) ── */}
            <div className="relative group/facebook">
              <button
                id="btn-facebook-signin"
                type="button"
                disabled={submitting || oauthLoading !== null}
                onClick={() => handleOAuthButtonClick('facebook')}
                className="w-full flex items-center gap-3 py-2.5 px-4 rounded-xl border border-slate-700/60 bg-slate-950/70 text-slate-400 text-xs sm:text-sm font-semibold transition-all duration-200 shadow-sm disabled:cursor-not-allowed opacity-70 hover:opacity-90"
              >
                {oauthLoading === 'facebook' ? (
                  <Loader2 className="h-4 w-4 animate-spin text-emerald-400 shrink-0" />
                ) : (
                  <svg className="h-4 w-4 shrink-0 opacity-60" viewBox="0 0 24 24">
                    <path fill="#1877F2" d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                  </svg>
                )}
                <span className="flex-1 text-left">Continue with Facebook</span>
                {/* Lock badge */}
                <span className="flex items-center gap-1 text-[10px] font-bold text-amber-400 bg-amber-400/10 border border-amber-400/30 rounded-full px-2 py-0.5 shrink-0">
                  <LockKeyhole className="h-2.5 w-2.5" />
                  Locked
                </span>
              </button>
              {/* Tooltip */}
              <div className="pointer-events-none absolute left-1/2 -translate-x-1/2 -bottom-9 z-20 hidden group-hover/facebook:flex items-center gap-1.5 whitespace-nowrap rounded-lg bg-slate-800 border border-slate-700 px-3 py-1.5 text-[11px] text-slate-300 shadow-xl">
                <LockKeyhole className="h-3 w-3 text-amber-400" />
                OAuth not configured — use email below
                <span className="absolute -top-1.5 left-1/2 -translate-x-1/2 h-2.5 w-2.5 rotate-45 bg-slate-800 border-l border-t border-slate-700" />
              </div>
            </div>

          </div>

          {/* Divider */}
          <div className="relative flex items-center justify-center mb-5">
            <div className="w-full border-t border-slate-800" />
            <span className="absolute bg-slate-900 px-3 text-[11px] uppercase tracking-wider text-slate-500 font-medium">
              Or with email
            </span>
          </div>

          {/* Email / Password Form */}
          <form onSubmit={submit} className="space-y-3.5">
            {mode === 'signup' && (
              <div>
                <label className="block mb-1 text-xs font-semibold text-slate-300">Full Name</label>
                <div className="relative">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                  <input
                    required
                    type="text"
                    placeholder="Enter your name"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    className="w-full rounded-xl border border-slate-700/80 bg-slate-950/90 pl-10 pr-3.5 py-2.5 text-sm text-white placeholder:text-slate-600 outline-none transition-colors focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block mb-1 text-xs font-semibold text-slate-300">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                <input
                  required
                  type="email"
                  placeholder="name@example.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full rounded-xl border border-slate-700/80 bg-slate-950/90 pl-10 pr-3.5 py-2.5 text-sm text-white placeholder:text-slate-600 outline-none transition-colors focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>
            </div>

            <div>
              <label className="block mb-1 text-xs font-semibold text-slate-300">Password</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                <input
                  required
                  minLength={6}
                  type={showPassword ? 'text' : 'password'}
                  placeholder="At least 6 characters"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full rounded-xl border border-slate-700/80 bg-slate-950/90 pl-10 pr-10 py-2.5 text-sm text-white placeholder:text-slate-600 outline-none transition-colors focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors p-1"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Status / Error Message */}
            {message && (
              <div
                className={`flex items-start gap-2.5 rounded-xl border p-3 text-xs ${
                  message.type === 'error'
                    ? 'border-rose-500/30 bg-rose-500/10 text-rose-300'
                    : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
                }`}
              >
                {message.type === 'error' ? (
                  <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-rose-400" />
                ) : (
                  <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5 text-emerald-400" />
                )}
                <span>{message.text}</span>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={submitting || oauthLoading !== null}
              className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 py-3 text-sm font-bold text-white shadow-lg shadow-emerald-950/40 hover:from-emerald-500 hover:to-teal-500 transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Processing...</span>
                </>
              ) : (
                <>
                  <span>{mode === 'signin' ? 'Sign In Securely' : 'Create Your Account'}</span>
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </form>

          {/* Bottom Security / Trust Indicators */}
          <div className="mt-5 pt-4 border-t border-slate-800/60 flex items-center justify-center gap-4 text-[11px] text-slate-500">
            <span className="flex items-center gap-1">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
              256-Bit Encrypted
            </span>
            <span>•</span>
            <span>Offline Sync Ready</span>
            <span>•</span>
            <span>Verified Secure</span>
          </div>
        </section>
      </div>

      {/* In-App OAuth Account Chooser Modal */}
      {oauthModal && (
        <OAuthModal
          provider={oauthModal}
          role={selectedRole}
          onConfirm={handleOAuthConfirm}
          onClose={handleModalClose}
          loading={oauthLoading !== null}
        />
      )}
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-slate-950 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
        </main>
      }
    >
      <LoginPageContent />
    </Suspense>
  );
}
