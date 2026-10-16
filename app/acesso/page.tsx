'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  User,
  GraduationCap,
  ArrowRight,
  RotateCcw,
  Shield,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import Header from '@/components/Header';
import { createOrResumeStudentSession, getActiveStudent, getActiveSession, clearActiveStudentSession } from '@/lib/storage';

export default function AcessoPage() {
  const router = useRouter();
  const [fullName, setFullName] = useState('');
  const [className, setClassName] = useState('1º Ano Informática Integrado - Breves');
  const [existingStudent, setExistingStudent] = useState<any>(null);
  const [existingSession, setExistingSession] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
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
    <div className="min-h-screen flex flex-col bg-[#0B1120]">
      <Header />

      <main className="flex-1 max-w-xl mx-auto px-4 py-12 w-full flex flex-col justify-center">
        <div className="bg-[#0F172A] border border-slate-800 rounded-2xl p-8 shadow-2xl space-y-6">
          {/* Header */}
          <div className="text-center space-y-2">
            <div className="w-12 h-12 rounded-xl bg-cyan-950 text-cyan-400 border border-cyan-800 flex items-center justify-center mx-auto">
              <User className="w-6 h-6" />
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight">
              Identificação do Estudante
            </h1>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              Atividade avaliativa de Redes de Computadores no IFPA Campus Breves.
            </p>
          </div>

          {/* Existing Session Alert if found */}
          {existingStudent && existingSession && (
            <div className="p-4 rounded-xl bg-slate-900 border border-slate-700/80 space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-emerald-400 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4" />
                  Sessão em Andamento Detectada
                </span>
                <span className="font-mono text-[11px] text-cyan-400 bg-cyan-950 px-2 py-0.5 rounded border border-cyan-800">
                  Etapa {existingSession.currentStage}/8
                </span>
              </div>
              <p className="text-xs text-slate-300">
                Você já possui progresso gravado como <strong>{existingStudent.fullName}</strong>.
              </p>
              <div className="flex flex-col sm:flex-row gap-2">
                <button
                  type="button"
                  onClick={handleResumeExisting}
                  className="flex-1 py-2.5 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white transition-colors flex items-center justify-center gap-1.5"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Retomar Onde Parei</span>
                </button>
                <button
                  type="button"
                  onClick={handleStartNewStudent}
                  className="py-2.5 px-3 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors"
                >
                  Sou Outro Aluno
                </button>
              </div>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleStartSession} className="space-y-4">
            {error && (
              <div className="p-3 rounded-lg bg-red-950/80 border border-red-800 text-xs text-red-200 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div className="space-y-1.5">
              <label htmlFor="student-name" className="block text-xs font-semibold text-slate-200">
                Nome Completo do Estudante <span className="text-red-400">*</span>
              </label>
              <input
                id="student-name"
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Ex: Carlos Eduardo de Oliveira"
                className="w-full p-3 rounded-lg bg-slate-900 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition-colors"
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="student-class" className="block text-xs font-semibold text-slate-200">
                Turma / Campus
              </label>
              <select
                id="student-class"
                value={className}
                onChange={(e) => setClassName(e.target.value)}
                className="w-full p-3 rounded-lg bg-slate-900 border border-slate-800 text-xs text-white focus:outline-none focus:border-cyan-500 transition-colors"
              >
                <option value="1º Ano Informática Integrado - Breves">1º Ano Informática Integrado - Campus Breves</option>
                <option value="Turma A - Redes de Computadores">Turma A - Redes de Computadores</option>
                <option value="Turma B - Redes de Computadores">Turma B - Redes de Computadores</option>
              </select>
            </div>

            {/* Privacy note */}
            <div className="p-3.5 rounded-lg bg-slate-950 border border-slate-800/80 text-[11px] text-slate-400 space-y-1">
              <div className="flex items-center gap-1.5 text-slate-300 font-semibold">
                <Shield className="w-3.5 h-3.5 text-cyan-400" />
                <span>Finalidade Pedagógica e Privacidade (LGPD)</span>
              </div>
              <p>
                Apenas seu nome e turma são coletados para acompanhamento e atribuição da nota pelo professor. Nenhum dado pessoal desnecessário (como CPF ou e-mail) é solicitado.
              </p>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-lg text-sm font-bold bg-cyan-600 hover:bg-cyan-500 disabled:opacity-60 text-white transition-colors flex items-center justify-center gap-2 shadow-sm"
            >
              <span>{existingStudent ? 'Atualizar e Continuar' : 'Iniciar Minha Sessão'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}
