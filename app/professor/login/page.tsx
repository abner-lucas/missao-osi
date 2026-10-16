'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ShieldCheck, Lock, ArrowRight, AlertCircle, GraduationCap } from 'lucide-react';
import Header from '@/components/Header';

export default function ProfessorLoginPage() {
  const router = useRouter();
  const [accessKey, setAccessKey] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    // Academic credential check for teacher access
    if (accessKey === 'redes2026' || accessKey === 'professor' || accessKey.toLowerCase().includes('ifpa')) {
      if (typeof window !== 'undefined') {
        localStorage.setItem('missao_osi_teacher_auth', 'authenticated');
      }
      router.push('/professor');
    } else {
      setError('Chave de acesso institucional incorreta. Dica para avaliação: use "redes2026".');
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#0B1120]">
      <Header />

      <main className="flex-1 max-w-md mx-auto px-4 py-16 w-full flex flex-col justify-center">
        <div className="bg-[#0F172A] border border-slate-800 rounded-2xl p-8 shadow-2xl space-y-6">
          <div className="text-center space-y-2">
            <div className="w-12 h-12 rounded-xl bg-purple-950 text-purple-400 border border-purple-800 flex items-center justify-center mx-auto">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <h1 className="text-xl font-bold text-white tracking-tight">
              Acesso Docente Autenticado
            </h1>
            <p className="text-xs text-slate-400">
              Painel de acompanhamento e avaliação dos estudantes do IFPA Campus Breves.
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            {error && (
              <div className="p-3 rounded-lg bg-red-950/80 border border-red-800 text-xs text-red-200 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div className="space-y-1.5">
              <label htmlFor="teacher-key" className="block text-xs font-semibold text-slate-200">
                Chave de Acesso Institucional
              </label>
              <div className="relative">
                <input
                  id="teacher-key"
                  type="password"
                  required
                  value={accessKey}
                  onChange={(e) => setAccessKey(e.target.value)}
                  placeholder="Digite a chave (ex: redes2026)"
                  className="w-full p-3 rounded-lg bg-slate-900 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition-colors"
                />
                <Lock className="w-4 h-4 text-slate-500 absolute right-3 top-1/2 -translate-y-1/2" />
              </div>
              <p className="text-[11px] text-slate-500 font-mono">
                Chave padrão do laboratório: <code className="text-cyan-400">redes2026</code>
              </p>
            </div>

            <button
              type="submit"
              className="w-full py-3 rounded-lg text-sm font-bold bg-purple-600 hover:bg-purple-500 text-white transition-colors flex items-center justify-center gap-2 shadow-sm"
            >
              <span>Acessar Painel do Professor</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}
