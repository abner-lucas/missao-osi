'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { AnimatePresence, motion } from 'motion/react';
import { NotebookPen, Menu, X, UserRound } from 'lucide-react';
import { getActiveStudent, getActiveSession, getReducedMotionPreference, setReducedMotionPreference } from '@/lib/storage';
import { StudentProfile, ActivitySession } from '@/lib/types';
import EvidenceNotebookDrawer from './EvidenceNotebookDrawer';

function MotionSwitch({ reduced, onToggle, compact = false }: { reduced: boolean; onToggle: () => void; compact?: boolean }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={reduced}
      title={compact ? "Reduzir movimento" : undefined}
      className="inline-flex items-center gap-2.5 min-h-11 px-2 rounded-lg text-sm font-semibold text-grafite-2 hover:text-caneta"
    >
      <span
        aria-hidden="true"
        className={`relative w-9 h-5 rounded-full transition-colors ${reduced ? 'bg-caneta' : 'bg-linha-forte'}`}
      >
        <span
          className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${reduced ? 'translate-x-4' : ''}`}
        />
      </span>
      <span className={compact ? "sr-only" : undefined}>Reduzir movimento</span>
    </button>
  );
}

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
    setMobileMenuOpen(false);
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

  const isActive = (href: string) => pathname === href || (href !== '/' && pathname.startsWith(href));

  return (
    <>
      <header className="sticky top-0 z-40 bg-papel/95 backdrop-blur-sm border-b border-linha nao-imprimir">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-3 rounded-lg py-1" aria-label="Missão OSI, página inicial">
            <svg width="34" height="34" viewBox="0 0 34 34" aria-hidden="true" className="shrink-0">
              <rect x="1" y="5" width="32" height="24" rx="5" fill="#1b2430" />
              {[0, 1, 2, 3, 4, 5, 6].map((i) => (
                <rect
                  key={i}
                  x={5.5 + i * 3.4}
                  y="9"
                  width="2"
                  height="10"
                  rx="1"
                  fill={['#e1701f', '#2c9a57', '#2e62c9', '#8a5636', '#f0b38a', '#9fd3b3', '#a9c0ee'][i]}
                />
              ))}
              <rect x="11" y="22" width="12" height="4" rx="1" fill="#f5f7f6" />
            </svg>
            <span className="leading-none">
              <span className="block font-display text-xl font-extrabold [font-stretch:80%] text-grafite">Missão OSI</span>
              <span className="block text-[0.8125rem] text-grafite-2 mt-0.5 whitespace-nowrap">IFPA Campus Breves</span>
            </span>
          </Link>

          <nav aria-label="Principal" className="hidden xl:block">
            <ul className="flex items-center gap-1">
              {navLinks.map((link) => {
                const active = isActive(link.href);
                return (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      aria-current={active ? 'page' : undefined}
                      className={`relative inline-flex items-center min-h-11 px-3 rounded-lg whitespace-nowrap text-[0.9375rem] font-semibold transition-colors ${
                        active ? 'text-caneta' : 'text-grafite-2 hover:text-grafite'
                      }`}
                    >
                      {link.label}
                      {active && (
                        <motion.span
                          layoutId="nav-ativo"
                          className="absolute left-3 right-3 bottom-1.5 h-[3px] rounded-full bg-caneta"
                          transition={{ type: 'spring', stiffness: 500, damping: 40 }}
                        />
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>

          <div className="flex items-center gap-1.5 sm:gap-2">
            <button
              type="button"
              onClick={() => setNotebookOpen(true)}
              className="btn btn-secundario !px-3"
              aria-label="Abrir Caderno de Evidências"
            >
              <NotebookPen className="w-[18px] h-[18px]" aria-hidden="true" />
              <span className="hidden sm:inline">Caderno</span>
            </button>

            {student ? (
              <Link
                href="/painel"
                className="hidden sm:inline-flex items-center gap-2 min-h-11 px-3 rounded-lg hover:bg-caneta-clara"
                title={`${student.fullName} (${student.className})`}
              >
                <span className="led led-verde" aria-hidden="true" />
                <span className="font-semibold max-w-[9rem] truncate">{student.fullName.split(' ')[0]}</span>
                {session && (
                  <span className="text-sm text-grafite-2">
                    <span className="sr-only">, etapa </span>
                    {session.currentStage}/8
                  </span>
                )}
              </Link>
            ) : (
              <Link href="/acesso" className="btn btn-primario !px-3.5 whitespace-nowrap">
                <UserRound className="w-[18px] h-[18px]" aria-hidden="true" />
                <span className="hidden sm:inline">Identificar aluno</span>
                <span className="sm:hidden">Entrar</span>
              </Link>
            )}

            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="xl:hidden btn btn-discreto !w-11 !p-0"
              aria-expanded={mobileMenuOpen}
              aria-controls="menu-movel"
              aria-label={mobileMenuOpen ? 'Fechar menu' : 'Abrir menu'}
            >
              {mobileMenuOpen ? <X className="w-6 h-6" aria-hidden="true" /> : <Menu className="w-6 h-6" aria-hidden="true" />}
            </button>

            <div className="hidden xl:block">
              <MotionSwitch compact reduced={reducedMotion} onToggle={toggleMotion} />
            </div>
          </div>
        </div>

        <AnimatePresence initial={false}>
          {mobileMenuOpen && (
            <motion.nav
              id="menu-movel"
              aria-label="Principal"
              className="xl:hidden overflow-hidden border-t border-linha bg-papel"
              initial={{ height: 0 }}
              animate={{ height: 'auto' }}
              exit={{ height: 0 }}
              transition={{ duration: 0.22, ease: [0.22, 0.8, 0.2, 1] }}
            >
              <ul className="max-w-7xl mx-auto px-4 sm:px-6 py-3 space-y-1">
                {navLinks.map((link) => {
                  const active = isActive(link.href);
                  return (
                    <li key={link.href}>
                      <Link
                        href={link.href}
                        aria-current={active ? 'page' : undefined}
                        onClick={() => setMobileMenuOpen(false)}
                        className={`flex items-center min-h-12 px-3 rounded-lg text-base font-semibold ${
                          active ? 'bg-caneta-clara text-caneta' : 'text-grafite hover:bg-folha'
                        }`}
                      >
                        {link.label}
                      </Link>
                    </li>
                  );
                })}
                {student && (
                  <li className="px-3 pt-2 text-grafite-2 flex items-center gap-2">
                    <span className="led led-verde" aria-hidden="true" />
                    {student.fullName}
                    {session && <span>(etapa {session.currentStage}/8)</span>}
                  </li>
                )}
                <li className="pt-1">
                  <MotionSwitch reduced={reducedMotion} onToggle={toggleMotion} />
                </li>
              </ul>
            </motion.nav>
          )}
        </AnimatePresence>
      </header>

      <EvidenceNotebookDrawer isOpen={notebookOpen} onClose={() => setNotebookOpen(false)} />
    </>
  );
}
