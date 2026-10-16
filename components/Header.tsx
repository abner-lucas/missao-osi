'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Network,
  BookOpen,
  ClipboardList,
  User,
  GraduationCap,
  Sparkles,
  Eye,
  CheckCircle2,
  ChevronRight,
  Menu
} from 'lucide-react';
import { getActiveStudent, getActiveSession, getReducedMotionPreference, setReducedMotionPreference } from '@/lib/storage';
import { StudentProfile, ActivitySession } from '@/lib/types';
import EvidenceNotebookDrawer from './EvidenceNotebookDrawer';

export default function Header() {
  const pathname = usePathname();
  const [student, setStudent] = useState<StudentProfile | null>(null);
  const [session, setSession] = useState<ActivitySession | null>(null);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [notebookOpen, setNotebookOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    setStudent(getActiveStudent());
    setSession(getActiveSession());
    setReducedMotion(getReducedMotionPreference());
  }, [pathname]);

  const toggleMotion = () => {
    const next = !reducedMotion;
    setReducedMotion(next);
    setReducedMotionPreference(next);
  };

  const navLinks = [
    { href: '/', label: 'Orientações' },
    { href: '/painel', label: 'Painel da Missão' },
    { href: '/atlas', label: 'Atlas OSI' },
    { href: '/conclusao', label: 'Relatório Final' },
    { href: '/professor', label: 'Área Docente' },
  ];

  return (
    <>
      {/* Top Academic Identification Strip */}
      <div className="bg-[#080D1A] border-b border-slate-800/80 px-4 py-1.5 text-xs text-slate-400">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-emerald-950/80 text-emerald-400 border border-emerald-800/60 font-mono">
              IFPA CAMPUS BREVES
            </span>
            <span className="hidden sm:inline text-slate-500">•</span>
            <span className="hidden sm:inline text-slate-300">
              Curso Técnico Integrado em Informática • Redes de Computadores
            </span>
          </div>
          <div className="flex items-center gap-4 text-[11px]">
            <span className="text-slate-400 font-medium">
              Prof. Me. Ábner Lucas
            </span>
            <button
              onClick={toggleMotion}
              className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-mono transition-colors border ${
                reducedMotion
                  ? 'bg-amber-950/60 text-amber-300 border-amber-800/60'
                  : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200'
              }`}
              title="Ativar/desativar modo de animação reduzida"
              aria-label="Alternar modo de movimento reduzido"
            >
              <Eye className="w-3 h-3" />
              <span>Movimento {reducedMotion ? 'Reduzido' : 'Normal'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main App Navigation Bar */}
      <header className="sticky top-0 z-40 bg-[#0B1120]/95 backdrop-blur-md border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between gap-4">
          {/* Logo & Brand */}
          <Link href="/" className="flex items-center gap-3 group focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 rounded-md">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-cyan-600 to-blue-700 flex items-center justify-center border border-cyan-400/30 text-white shadow-sm">
              <Network className="w-5 h-5 text-cyan-100" />
            </div>
            <div>
              <div className="text-sm font-bold tracking-tight text-white flex items-center gap-1.5">
                MISSÃO OSI
                <span className="text-[10px] uppercase font-mono tracking-widest px-1.5 py-0.2 rounded bg-cyan-950 text-cyan-300 border border-cyan-800">
                  Lab
                </span>
              </div>
              <div className="text-[11px] text-slate-400 hidden sm:block">
                Investigadores da Rede
              </div>
            </div>
          </Link>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center gap-1 text-sm">
            {navLinks.map((link) => {
              const active = pathname === link.href || (link.href !== '/' && pathname.startsWith(link.href));
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                    active
                      ? 'bg-slate-800 text-cyan-300 border border-slate-700'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>

          {/* User actions */}
          <div className="flex items-center gap-2.5">
            {/* Caderno de Evidências button */}
            <button
              onClick={() => setNotebookOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 hover:border-slate-600 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500"
              aria-label="Abrir Caderno de Evidências"
            >
              <ClipboardList className="w-4 h-4 text-amber-400" />
              <span className="hidden sm:inline">Caderno de Evidências</span>
              <span className="sm:hidden">Caderno</span>
            </button>

            {/* Mobile Menu Toggle Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-1.5 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              aria-label="Alternar menu de navegação"
            >
              <Menu className="w-5 h-5" />
            </button>

            {/* Student profile pill or Login */}
            {student ? (
              <Link
                href="/painel"
                className="inline-flex items-center gap-2 px-2.5 py-1.5 rounded-md text-xs font-medium bg-slate-900 border border-slate-700 text-slate-200 hover:border-cyan-500/60 transition-colors"
                title={`Aluno: ${student.fullName} (${student.className})`}
              >
                <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="max-w-[80px] sm:max-w-[140px] truncate">
                  {student.fullName.split(' ')[0]}
                </span>
                {session && (
                  <span className="font-mono text-[10px] text-cyan-400 bg-cyan-950/80 px-1 py-0.2 rounded border border-cyan-800/80">
                    {session.currentStage}/8
                  </span>
                )}
              </Link>
            ) : (
              <Link
                href="/acesso"
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium bg-cyan-600 hover:bg-cyan-500 text-white font-semibold transition-colors shadow-sm shrink-0"
              >
                <User className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Identificar Aluno</span>
                <span className="sm:hidden">Entrar</span>
              </Link>
            )}
          </div>
        </div>

        {/* Mobile Nav dropdown */}
        {mobileMenuOpen && (
          <nav className="md:hidden border-t border-slate-800 bg-[#0B1120] px-4 py-2 space-y-1">
            {navLinks.map((link) => {
              const active = pathname === link.href || (link.href !== '/' && pathname.startsWith(link.href));
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`block px-3 py-2 rounded-md text-xs font-medium transition-colors ${
                    active
                      ? 'bg-slate-800 text-cyan-300 font-bold'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>
        )}
      </header>

      {/* Caderno de Evidências Drawer */}
      <EvidenceNotebookDrawer
        isOpen={notebookOpen}
        onClose={() => setNotebookOpen(false)}
      />
    </>
  );
}
