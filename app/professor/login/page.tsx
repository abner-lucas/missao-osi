'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Lock, AlertCircle } from 'lucide-react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

export default function ProfessorLoginPage() {
  const router = useRouter();
  const [accessKey, setAccessKey] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    // Access key is checked on the server (TEACHER_ACCESS_KEY), which sets an httpOnly session cookie
    try {
      const res = await fetch('/api/professor/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accessKey })
      });
      if (res.ok) {
        localStorage.setItem('missao_osi_teacher_auth', 'authenticated');
        router.push('/professor');
        return;
      }
      setError('Chave de acesso institucional incorreta.');
    } catch {
      setError('Não foi possível contatar o servidor. Tente novamente.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main id="conteudo" className="flex-1 w-full max-w-md mx-auto px-4 sm:px-6 py-12 sm:py-20">
        <h1 className="text-[clamp(2rem,5vw,2.75rem)] font-extrabold [font-stretch:78%] leading-[1.05]">Área do professor</h1>
        <p className="mt-3 text-lg text-grafite-2">Acompanhe a turma, revise os dossiês e atribua as notas.</p>

        <form onSubmit={handleLogin} className="folha mt-8 p-6 sm:p-8 space-y-5" noValidate>
          {error && (
            <div role="alert" className="rounded-xl bg-erro-fundo border border-erro/30 p-4 text-erro flex items-start gap-2.5">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" aria-hidden="true" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label htmlFor="teacher-key" className="rotulo">
              Chave de acesso
            </label>
            <div className="relative">
              <input
                id="teacher-key"
                type="password"
                required
                aria-required="true"
                aria-invalid={Boolean(error)}
                autoComplete="current-password"
                value={accessKey}
                onChange={(e) => setAccessKey(e.target.value)}
                placeholder="Digite a chave de acesso"
                className="campo !pr-11"
              />
              <Lock className="w-5 h-5 text-grafite-3 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" aria-hidden="true" />
            </div>
          </div>

          <button type="submit" disabled={submitting} className="btn btn-primario w-full !min-h-12 !text-base">
            {submitting ? 'Verificando...' : 'Acessar Painel do Professor'}
          </button>
        </form>
      </main>

      <Footer />
    </div>
  );
}
