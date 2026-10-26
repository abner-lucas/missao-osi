'use client';

import React from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { BookOpen } from 'lucide-react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import HeroWires from '@/components/HeroWires';

const BriefingPlayer = dynamic(() => import('@/components/BriefingPlayer'), {
  ssr: false,
  loading: () => <div className="rounded-2xl bg-lousa aspect-video" aria-hidden="true" />,
});

const MOMENTS = [
  { key: 'A', title: 'Observar', text: 'Veja como os equipamentos se comportam e anote o que parece estranho.' },
  { key: 'B', title: 'Consultar o Atlas', text: 'Busque os conceitos da camada que ajudam a explicar o que você viu.' },
  { key: 'C', title: 'Levantar uma suspeita', text: 'Escreva o que você acha que está acontecendo, e por quê.' },
  { key: 'D', title: 'Prever e testar', text: 'Diga o que espera ver antes de rodar o teste. Depois compare.' },
  { key: 'E', title: 'Intervir', text: 'Aplique a correção no sistema e observe se a rede volta a responder.' },
  { key: 'F', title: 'Justificar', text: 'Explique com suas palavras por que a correção funcionou.' },
];

const RULES = [
  { title: 'O Atlas é livre', text: 'Consulte quando quiser. Isso não tira pontos.' },
  { title: 'Raciocínio conta mais que acerto', text: 'Sua nota vem das evidências e das justificativas.' },
  { title: 'Chutar não resolve', text: 'O professor lê cada justificativa que você escreve.' },
  { title: 'Tudo fica salvo', text: 'Pode fechar a janela: o progresso e o caderno continuam lá.' },
];

export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main id="conteudo" className="flex-1 w-full">
        <section className="max-w-6xl mx-auto px-4 sm:px-6 pt-10 sm:pt-16 pb-12 grid lg:grid-cols-[1.05fr_1fr] gap-10 lg:gap-14 items-center">
          <div>
            <h1 className="text-[clamp(2.4rem,6vw,4.25rem)] font-extrabold text-grafite [font-stretch:78%] leading-[1.02]">
              A rede do laboratório parou de responder.
            </h1>
            <p className="mt-5 text-lg sm:text-xl text-grafite-2 max-w-[36rem] leading-relaxed">
              Algo impede o computador dos alunos de falar com o servidor de notas. Investigue as sete camadas do modelo OSI,
              junte evidências e descubra onde está a falha.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row gap-3">
              <Link href="/acesso" className="btn btn-primario !text-base !px-6 !min-h-12">
                Começar investigação
              </Link>
              <Link href="/atlas" className="btn btn-secundario !text-base !px-5 !min-h-12">
                <BookOpen className="w-5 h-5" aria-hidden="true" />
                Consultar o Atlas OSI
              </Link>
            </div>
            <ul className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-grafite-2">
              <li>3 encontros de 50 minutos</li>
              <li>8 missões</li>
              <li>1º ano do Técnico em Informática</li>
            </ul>
          </div>
          <div className="lg:pl-4">
            <HeroWires />
          </div>
        </section>

        <section aria-labelledby="titulo-video" className="max-w-6xl mx-auto px-4 sm:px-6 py-12 grid lg:grid-cols-[1fr_1.6fr] gap-8 items-start">
          <div className="lg:pt-6">
            <h2 id="titulo-video" className="text-3xl sm:text-4xl font-extrabold">
              Antes de começar, assista ao vídeo
            </h2>
            <p className="mt-3 text-grafite-2 text-lg max-w-md">
              Em pouco mais de meio minuto, o vídeo mostra o problema e como você vai investigar. Ele não conta onde está a falha.
            </p>
          </div>
          <BriefingPlayer />
        </section>

        <section aria-labelledby="titulo-metodo" className="max-w-6xl mx-auto px-4 sm:px-6 py-12">
          <h2 id="titulo-metodo" className="text-3xl sm:text-4xl font-extrabold">
            Como cada missão funciona
          </h2>
          <p className="mt-3 text-grafite-2 text-lg max-w-2xl">
            As oito missões seguem os mesmos seis momentos, sempre nesta ordem.
          </p>
          <ol className="mt-10 grid gap-8 sm:grid-cols-2 lg:grid-cols-6 lg:gap-0 relative">
            <span aria-hidden="true" className="hidden lg:block absolute top-6 left-[8%] right-[8%] h-[3px] bg-linha-forte rounded-full" />
            {MOMENTS.map((m) => (
              <li key={m.key} className="relative flex lg:flex-col gap-4 lg:gap-3 lg:px-3 lg:text-center lg:items-center">
                <span
                  aria-hidden="true"
                  className="relative z-10 shrink-0 w-12 h-12 rounded-full bg-folha border-[3px] border-grafite flex items-center justify-center font-display font-extrabold text-xl"
                >
                  {m.key}
                </span>
                <div>
                  <h3 className="text-xl font-extrabold">
                    <span className="sr-only">Momento {m.key}: </span>
                    {m.title}
                  </h3>
                  <p className="mt-1 text-grafite-2">{m.text}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        <section aria-labelledby="titulo-combinados" className="max-w-6xl mx-auto px-4 sm:px-6 py-12 mb-6">
          <div className="folha p-6 sm:p-10">
            <h2 id="titulo-combinados" className="text-3xl font-extrabold">
              Combinados da atividade
            </h2>
            <dl className="mt-6 grid sm:grid-cols-2 gap-x-10 gap-y-6">
              {RULES.map((r) => (
                <div key={r.title} className="border-l-4 border-caneta pl-4">
                  <dt className="font-bold text-lg">{r.title}</dt>
                  <dd className="text-grafite-2 mt-0.5">{r.text}</dd>
                </div>
              ))}
            </dl>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
