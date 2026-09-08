'use client';

import { FormEvent, Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Leaf, ShieldCheck, UserRound, ArrowRight, Loader2 } from 'lucide-react';
import { useAuth, AppRole } from '../../context/AuthContext';

function LoginPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, role, loading, signIn, signUp } = useAuth();
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [selectedRole, setSelectedRole] = useState<AppRole>(searchParams.get('role') === 'officer' ? 'officer' : 'farmer');
  const [name, setName] = useState('');
  const [email, setEmail] = useState(searchParams.get('role') === 'officer' ? 'admin@gmail.com' : '');
  const [password, setPassword] = useState(searchParams.get('role') === 'officer' ? 'admin@11' : '');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const nextRoute = searchParams.get('next');

  useEffect(() => {
    if (!loading && user && role) router.replace(nextRoute?.startsWith('/') ? nextRoute : role === 'officer' ? '/dashboard/officer' : '/dashboard/farmer');
  }, [loading, user, role, nextRoute, router]);

  const handleRoleSelect = (r: AppRole) => {
    setSelectedRole(r);
    if (mode === 'signin') {
      if (r === 'officer') {
        setEmail('admin@gmail.com');
        setPassword('admin@11');
      } else if (email === 'admin@gmail.com') {
        setEmail('');
        setPassword('');
      }
    }
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setMessage('');
    const result = mode === 'signin'
      ? await signIn(email, password)
      : await signUp(name, email, password, selectedRole);
    setSubmitting(false);
    if (result.error) {
      setMessage(result.error);
    } else if ('needsEmailConfirmation' in result && result.needsEmailConfirmation) {
      setMessage('Account created. Confirm the email, then sign in.');
      setMode('signin');
    }
  };

  return (
    <main className="min-h-screen bg-slate-950 flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-2xl bg-white/95 p-2 shadow-xl shadow-green-600/20 ring-1 ring-white/30">
            <img src="/logo-shield.png" alt="KrishiRakshak AI Logo" className="h-16 w-16 object-contain" />
          </div>
          <h1 className="text-3xl font-black text-white">KrishiRakshak AI</h1>
          <p className="mt-2 text-sm text-slate-400">Secure crop intelligence for farmers and agriculture officers</p>
        </div>

        <section className="rounded-2xl border border-slate-800 bg-slate-900/80 p-6 shadow-2xl">
          <div className="mb-6 grid grid-cols-2 rounded-lg bg-slate-950 p-1">
            <button onClick={() => setMode('signin')} className={`rounded-md py-2 text-sm font-bold ${mode === 'signin' ? 'bg-green-600 text-white' : 'text-slate-400'}`}>Sign in</button>
            <button onClick={() => setMode('signup')} className={`rounded-md py-2 text-sm font-bold ${mode === 'signup' ? 'bg-green-600 text-white' : 'text-slate-400'}`}>Create account</button>
          </div>

          <form onSubmit={submit} className="space-y-4">
            {mode === 'signup' && <label className="block text-sm text-slate-300">Full name<input required value={name} onChange={e => setName(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-white outline-none focus:border-green-500" /></label>}
            <div>
              <p className="mb-2 text-sm text-slate-300">Account role</p>
              <div className="grid grid-cols-2 gap-2">
                <button type="button" onClick={() => handleRoleSelect('farmer')} className={`flex items-center justify-center gap-2 rounded-lg border p-2.5 text-sm font-semibold transition-all ${selectedRole === 'farmer' ? 'border-green-500 bg-green-950/40 text-green-300' : 'border-slate-700 text-slate-400'}`}><UserRound className="h-4 w-4" /> Farmer</button>
                <button type="button" onClick={() => handleRoleSelect('officer')} className={`flex items-center justify-center gap-2 rounded-lg border p-2.5 text-sm font-semibold transition-all ${selectedRole === 'officer' ? 'border-green-500 bg-green-950/40 text-green-300' : 'border-slate-700 text-slate-400'}`}><ShieldCheck className="h-4 w-4" /> Officer</button>
              </div>
            </div>
            <label className="block text-sm text-slate-300">Email<input required type="email" value={email} onChange={e => setEmail(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-white outline-none focus:border-green-500" /></label>
            <label className="block text-sm text-slate-300">Password<input required minLength={6} type="password" value={password} onChange={e => setPassword(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-white outline-none focus:border-green-500" /></label>
            {message && <p className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-200">{message}</p>}
            <button disabled={submitting} className="flex w-full items-center justify-center gap-2 rounded-lg bg-green-600 py-3 text-sm font-bold text-white hover:bg-green-500 disabled:opacity-60">{submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}{mode === 'signin' ? 'Continue securely' : 'Create account'}</button>
          </form>
          {mode === 'signin' && (
            <div className="mt-4 rounded-xl border border-slate-800/80 bg-slate-950/60 p-3 text-center text-xs text-slate-400">
              Agriculture administrator demo: <span className="font-mono text-green-400">admin@gmail.com</span> / <span className="font-mono text-green-400">admin@11</span>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

export default function LoginPage() {
  return <Suspense fallback={<main className="min-h-screen bg-slate-950" />}><LoginPageContent /></Suspense>;
}
