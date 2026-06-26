'use client';

import React, { useState, Suspense } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const callbackUrl = searchParams.get('callbackUrl') || '/';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await signIn('credentials', {
        email,
        password,
        redirect: false,
      });

      if (res?.error) {
        setError('Hatalı e-posta adresi veya şifre.');
        setLoading(false);
      } else {
        router.push(callbackUrl);
        router.refresh();
      }
    } catch (err) {
      setError('Bir bağlantı sorunu oluştu, lütfen tekrar deneyin.');
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 flex items-center justify-center bg-slate-950 text-white p-4 relative overflow-hidden">
      {/* Yeşil/Teal Arka Plan Işık Efekti */}
      <div className="absolute top-1/4 left-1/4 w-[600px] h-[600px] bg-teal-950/20 rounded-full blur-[130px] pointer-events-none"></div>

      <div className="max-w-md w-full bg-slate-900/40 backdrop-blur-xl border border-slate-800 rounded-2xl p-8 shadow-2xl relative z-10">
        <div className="text-center mb-8">
          <span className="text-2xl font-bold tracking-widest text-teal-400">GIDA-REHBERİ</span>
          <p className="text-xs text-slate-500 font-mono tracking-widest mt-1 uppercase">On-Premise Giriş Paneli</p>
        </div>

        {error && (
          <div className="bg-red-950/40 border border-red-900/50 text-red-400 text-sm px-4 py-3 rounded-lg mb-6 flex items-center space-x-2">
            <span>⚠️</span>
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">E-posta Adresi</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-slate-950 border border-slate-850 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition-all font-mono text-slate-100"
              placeholder="kalite@fabrika.com"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">Şifre</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-slate-950 border border-slate-850 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition-all font-mono text-slate-100"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 px-4 bg-teal-600 hover:bg-teal-500 active:bg-teal-700 disabled:bg-teal-800 disabled:opacity-50 text-white font-semibold rounded-xl text-sm transition-all flex items-center justify-center space-x-2 shadow-lg shadow-teal-950/40 mt-8"
          >
            {loading ? (
              <>
                <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span>Giriş Yapılıyor...</span>
              </>
            ) : (
              <span>Sisteme Giriş Yap</span>
            )}
          </button>
        </form>

        <div className="mt-8 text-center text-xs text-slate-600">
          <span>Novexistech Kalite Kontrol Yazılımları © 2026</span>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="flex-1 flex items-center justify-center bg-slate-950 text-white p-4">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-teal-500"></div>
      </div>
    }>
      <LoginForm />
    </Suspense>
  );
}
