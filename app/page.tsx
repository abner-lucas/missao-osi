'use client';

import React from 'react';
import Link from 'next/link';
import {
  Network,
  ArrowRight,
  BookOpen,
  FlaskConical,
  Search,
  CheckCircle2,
  HelpCircle,
  FileText,
  Clock,
  Layers,
  ShieldCheck,
  GraduationCap
} from 'lucide-react';
import Header from '@/components/Header';

export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col bg-[#0B1120]">
      <Header />

      <main className="flex-1 max-w-7xl mx-auto px-4 py-8 space-y-12 w-full">
        {/* Direct Academic Portal Hero */}
        <section className="p-8 rounded-2xl bg-[#0F172A] border border-slate-800 shadow-xl grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          <div className="lg:col-span-7 space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-md bg-cyan-950/80 text-cyan-300 border border-cyan-800 text-xs font-mono">
              <span>DISCIPLINA: REDES DE COMPUTADORES</span>
              <span>•</span>
              <span>IFPA CAMPUS BREVES</span>
            </div>

            <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight leading-tight">
              MISSÃO OSI: <br />
              <span className="text-cyan-400">Investigadores da Rede</span>
            </h1>

            <p className="text-sm sm:text-base text-slate-300 leading-relaxed">
              Uma rede está apresentando problemas de comunicação entre o laboratório acadêmico e o servidor central. Sua missão é investigar o que acontece, compreender o caminho percorrido pelos dados e restabelecer os serviços utilizando as sete camadas do modelo OSI.
            </p>

            <div className="flex flex-wrap items-center gap-3 pt-2 text-xs text-slate-400">
              <span className="flex items-center gap-1.5 bg-slate-900 px-2.5 py-1 rounded border border-slate-800">
                <Clock className="w-3.5 h-3.5 text-cyan-400" />
                Carga: ~3 encontros de 50 min
              </span>
              <span className="flex items-center gap-1.5 bg-slate-900 px-2.5 py-1 rounded border border-slate-800">
                <GraduationCap className="w-3.5 h-3.5 text-emerald-400" />
                1º Ano Técnico em Informática
              </span>
              <span className="flex items-center gap-1.5 bg-slate-900 px-2.5 py-1 rounded border border-slate-800">
                <Layers className="w-3.5 h-3.5 text-purple-400" />
                7 Camadas + Desafio Integrador
              </span>
            </div>

            <div className="pt-4 flex flex-wrap items-center gap-4">
              <Link
                href="/acesso"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-lg text-sm font-bold bg-cyan-600 hover:bg-cyan-500 text-white transition-all shadow-md hover:shadow-cyan-500/20"
              >
                <span>INICIAR INVESTIGAÇÃO</span>
                <ArrowRight className="w-4 h-4" />
              </Link>

              <Link
                href="/atlas"
                className="inline-flex items-center gap-2 px-5 py-3 rounded-lg text-sm font-medium bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 transition-colors"
              >
                <BookOpen className="w-4 h-4 text-amber-400" />
                <span>Consultar Atlas OSI</span>
              </Link>
            </div>
          </div>

          {/* Interactive Topology Preview Animation */}
          <div className="lg:col-span-5 bg-[#080D1A] border border-slate-800 rounded-xl p-5 space-y-3">
            <div className="flex items-center justify-between text-xs border-b border-slate-800 pb-2">
              <span className="font-mono text-slate-400">STATUS DA REDE EM DIAGNÓSTICO</span>
              <span className="flex items-center gap-1 text-red-400 font-mono text-[11px]">
                <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
                FALHA ATIVA
              </span>
            </div>

            {/* Visual Mini Map */}
            <div className="relative py-6 flex items-center justify-between px-2">
              <div className="text-center space-y-1">
                <div className="w-12 h-12 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center text-xl mx-auto">
                  💻
                </div>
                <div className="text-[10px] font-mono text-slate-300">PC ALUNO</div>
                <div className="text-[9px] font-mono text-slate-500">192.168.10.25</div>
              </div>

              {/* Broken Line */}
              <div className="flex-1 px-2 relative">
                <div className="h-0.5 border-t-2 border-dashed border-red-500 w-full" />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 px-1.5 py-0.5 rounded bg-red-950 text-red-300 border border-red-800 text-[10px] font-mono font-bold">
                  SINAL INTERROMPIDO
                </div>
              </div>

              <div className="text-center space-y-1">
                <div className="w-12 h-12 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center text-xl mx-auto">
                  🔀
                </div>
                <div className="text-[10px] font-mono text-slate-300">SWITCH SW-01</div>
                <div className="text-[9px] font-mono text-slate-500">Fa0/1 • Fa0/24</div>
              </div>

              {/* Regular Line */}
              <div className="flex-1 px-2">
                <div className="h-0.5 bg-slate-700 w-full" />
              </div>

              <div className="text-center space-y-1">
                <div className="w-12 h-12 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center text-xl mx-auto">
                  🌐
                </div>
                <div className="text-[10px] font-mono text-slate-300">ROTEADOR</div>
                <div className="text-[9px] font-mono text-slate-500">192.168.10.1</div>
              </div>
            </div>

            <div className="p-3 rounded-lg bg-slate-900 border border-slate-800/80 text-xs text-slate-400">
              <strong className="text-slate-200">Objetivo Pedagógico:</strong> Diagnosticar a rede de baixo para cima (da Camada Física à Camada de Aplicação), usando o Atlas OSI para justificar cada passo.
            </div>
          </div>
        </section>

        {/* The 6 Steps Method Grid */}
        <section className="space-y-4">
          <div>
            <h2 className="text-lg font-bold text-white tracking-tight">
              Metodologia de Investigação Científica
            </h2>
            <p className="text-xs text-slate-400">
              Cada uma das investigações segue o ciclo de raciocínio orientado a evidências:
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="p-5 rounded-xl bg-[#0F172A] border border-slate-800 space-y-2">
              <div className="w-8 h-8 rounded-lg bg-cyan-950 text-cyan-400 border border-cyan-800 flex items-center justify-center font-bold text-xs font-mono">
                01
              </div>
              <h3 className="text-sm font-bold text-white">Investigue</h3>
              <p className="text-xs text-slate-400 leading-normal">
                Observe o comportamento dos equipamentos, portas, interfaces e sinais de anomalia na topologia.
              </p>
            </div>

            <div className="p-5 rounded-xl bg-[#0F172A] border border-slate-800 space-y-2">
              <div className="w-8 h-8 rounded-lg bg-amber-950 text-amber-400 border border-amber-800 flex items-center justify-center font-bold text-xs font-mono">
                02
              </div>
              <h3 className="text-sm font-bold text-white">Consulte</h3>
              <p className="text-xs text-slate-400 leading-normal">
                Utilize o mapa mental do Atlas OSI livremente para descobrir normas, PDUs e funções de cada camada.
              </p>
            </div>

            <div className="p-5 rounded-xl bg-[#0F172A] border border-slate-800 space-y-2">
              <div className="w-8 h-8 rounded-lg bg-purple-950 text-purple-400 border border-purple-800 flex items-center justify-center font-bold text-xs font-mono">
                03
              </div>
              <h3 className="text-sm font-bold text-white">Formule Hipóteses</h3>
              <p className="text-xs text-slate-400 leading-normal">
                Apresente explicações fundamentadas para a falha observada antes de realizar alterações no sistema.
              </p>
            </div>

            <div className="p-5 rounded-xl bg-[#0F172A] border border-slate-800 space-y-2">
              <div className="w-8 h-8 rounded-lg bg-blue-950 text-blue-400 border border-blue-800 flex items-center justify-center font-bold text-xs font-mono">
                04
              </div>
              <h3 className="text-sm font-bold text-white">Preveja e Experimente</h3>
              <p className="text-xs text-slate-400 leading-normal">
                Declare o resultado esperado e dispare testes de diagnóstico (tensão, ARP, ping, TCP handshake, HTTP).
              </p>
            </div>

            <div className="p-5 rounded-xl bg-[#0F172A] border border-slate-800 space-y-2">
              <div className="w-8 h-8 rounded-lg bg-emerald-950 text-emerald-400 border border-emerald-800 flex items-center justify-center font-bold text-xs font-mono">
                05
              </div>
              <h3 className="text-sm font-bold text-white">Reavalie & Intervenha</h3>
              <p className="text-xs text-slate-400 leading-normal">
                Compare sua previsão com a resposta do sistema e aplique as correções técnicas reais na simulação.
              </p>
            </div>

            <div className="p-5 rounded-xl bg-[#0F172A] border border-slate-800 space-y-2">
              <div className="w-8 h-8 rounded-lg bg-rose-950 text-rose-400 border border-rose-800 flex items-center justify-center font-bold text-xs font-mono">
                06
              </div>
              <h3 className="text-sm font-bold text-white">Consolide & Justifique</h3>
              <p className="text-xs text-slate-400 leading-normal">
                Explique tecnicamente por que a intervenção resolveu o problema e salve o registro no seu dossiê.
              </p>
            </div>
          </div>
        </section>

        {/* Essential Pedagogical Rules Callout */}
        <section className="p-6 rounded-xl bg-[#0F172A] border border-slate-800 space-y-3">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
            <h3 className="text-sm font-bold text-white">
              Regras e Diretrizes de Avaliação da Atividade
            </h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs text-slate-300">
            <div className="flex items-start gap-2 p-2.5 rounded bg-slate-900 border border-slate-800">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <span><strong>Consulta Livre:</strong> O Atlas OSI pode ser consultado a qualquer instante sem redução de nota.</span>
            </div>
            <div className="flex items-start gap-2 p-2.5 rounded bg-slate-900 border border-slate-800">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <span><strong>Sem Decoreba:</strong> O foco é raciocinar com base nas evidências coletadas e testes práticos.</span>
            </div>
            <div className="flex items-start gap-2 p-2.5 rounded bg-slate-900 border border-slate-800">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <span><strong>Tentativa e Erro Não Basta:</strong> Respostas aleatórias não aprovam; justificativas são avaliadas pelo professor.</span>
            </div>
            <div className="flex items-start gap-2 p-2.5 rounded bg-slate-900 border border-slate-800">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <span><strong>Salvamento Automático:</strong> Seu progresso e Caderno de Evidências persistem mesmo ao fechar a janela.</span>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-slate-800 py-6 text-center text-xs text-slate-500 bg-[#080D1A]">
        Instituto Federal do Pará (IFPA) Campus Breves • Curso Técnico Integrado em Informática • Redes de Computadores
      </footer>
    </div>
  );
}
