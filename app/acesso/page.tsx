'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { RotateCcw, AlertCircle, ShieldCheck } from 'lucide-react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { fetchClasses, FALLBACK_CLASSES } from '@/lib/classes';
import { createOrResumeStudentSession, getActiveStudent, getActiveSession, clearActiveStudentSession } from '@/lib/storage';

export default function AcessoPage() {
  const router = useRouter();
  const [fullName, setFullName] = useState('');
  const [className, setClassName] = useState('1º Ano Informática Integrado - Breves');
  const [existingStudent, setExistingStudent] = useState<any>(null);
  const [existingSession, setExistingSession] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [classes, setClasses] = useState<string[]>(FALLBACK_CLASSES);
  const [removed, setRemoved] = useState(false);

  useEffect(() => {
    setRemoved(new URLSearchParams(window.location.search).get('removido') === '1');
    const student = getActiveStudent();
    const session = getActiveSession();
    if (student) {
      setExistingStudent(student);
      setFullName(student.fullName);
      if (student.className) setClassName(student.className);
    }
    if (session) {
      setExistingSession(session);
    }
    fetchClasses().then(({ turmas }) => {
      const names = turmas.map((t) => t.nome);
      if (names.length === 0) return;
      setClasses(names);
      // New students start on the first registered class
      if (!student) setClassName(names[0]);
    });
  }, []);

  const handleStartSession = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim() || fullName.trim().length < 3) {
      setError('Por favor, informe seu nome completo para registro pedagógico da atividade.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      createOrResumeStudentSession(fullName, className);
      router.push('/painel');
    } catch (err: any) {
      setError('Erro ao inicializar sessão. Verifique seu navegador.');
      setLoading(false);
    }
  };

  const handleResumeExisting = () => {
    if (existingStudent) {
      router.push('/painel');
    }
  };

  const handleStartNewStudent = () => {
    clearActiveStudentSession();
    setExistingStudent(null);
    setExistingSession(null);
    setFullName('');
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main id="conteudo" className="flex-1 w-full max-w-6xl mx-auto px-4 sm:px-6 py-10 sm:py-16 grid lg:grid-cols-[1fr_1.1fr] gap-10 lg:gap-16 items-start">
        <div className="lg:pt-4">
          <h1 className="text-[clamp(2.2rem,5vw,3.5rem)] font-extrabold [font-stretch:78%] leading-[1.04]">
            Quem vai investigar?
          </h1>
          <p className="mt-4 text-lg text-grafite-2 max-w-md">
            Seu nome aparece no relatório final e no painel do professor. Use o nome completo, como na chamada.
          </p>
          <div className="mt-8 flex gap-3 max-w-md text-grafite-2">
            <ShieldCheck className="w-6 h-6 text-ok shrink-0 mt-0.5" aria-hidden="true" />
            <p>
              <strong className="text-grafite">Só nome e turma.</strong> Nada de CPF, e-mail ou outros dados pessoais. As
              informações servem apenas para acompanhar a atividade e atribuir a nota (LGPD).
            </p>
          </div>
        </div>

        <div className="folha p-6 sm:p-8 space-y-6">
          {existingStudent && existingSession && (
            <section aria-labelledby="titulo-retomar" className="rounded-xl bg-ok-fundo border border-ok/25 p-5 space-y-4">
              <div className="flex items-start gap-3">
                <span className="led led-verde mt-2" aria-hidden="true" />
                <div>
                  <h2 id="titulo-retomar" className="text-xl font-extrabold">
                    Você já começou como {existingStudent.fullName}
                  </h2>
                  <p className="text-grafite-2 mt-1">Seu progresso está na etapa {existingSession.currentStage} de 8.</p>
                </div>
              </div>
              <div className="flex flex-col sm:flex-row gap-2">
                <button type="button" onClick={handleResumeExisting} className="btn btn-sucesso flex-1">
                  <RotateCcw className="w-4 h-4" aria-hidden="true" />
                  Retomar de onde parei
                </button>
                <button type="button" onClick={handleStartNewStudent} className="btn btn-secundario">
                  Sou outro aluno
                </button>
              </div>
            </section>
          )}

          <form onSubmit={handleStartSession} className="space-y-5" noValidate>
            {removed && !existingStudent && (
              <div role="status" className="rounded-xl bg-alerta-fundo border border-alerta/25 p-4 text-alerta">
                O professor removeu sua sessão anterior. Identifique-se de novo para começar.
              </div>
            )}

            {error && (
              <div role="alert" className="rounded-xl bg-erro-fundo border border-erro/30 p-4 text-erro flex items-start gap-2.5">
                <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" aria-hidden="true" />
                <span>{error}</span>
              </div>
            )}

            <div>
              <label htmlFor="student-name" className="rotulo">
                Nome completo <span aria-hidden="true" className="text-erro">*</span>
              </label>
              <input
                id="student-name"
                type="text"
                required
                aria-required="true"
                aria-invalid={Boolean(error)}
                autoComplete="name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Ex: Carlos Eduardo de Oliveira"
                className="campo"
              />
            </div>

            <div>
              <label htmlFor="student-class" className="rotulo">
                Turma
              </label>
              <select id="student-class" value={className} onChange={(e) => setClassName(e.target.value)} className="campo">
                {(classes.includes(className) || !className ? classes : [className, ...classes]).map((nome) => (
                  <option key={nome} value={nome}>
                    {nome}
                  </option>
                ))}
              </select>
            </div>

            <button type="submit" disabled={loading} className="btn btn-primario w-full !min-h-12 !text-base">
              {existingStudent ? 'Atualizar e continuar' : 'Iniciar minha sessão'}
            </button>
          </form>
        </div>
      </main>

      <Footer />
    </div>
  );
}
