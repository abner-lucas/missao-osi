import type { Metadata, Viewport } from 'next';
import { Archivo, Atkinson_Hyperlegible_Next, Atkinson_Hyperlegible_Mono } from 'next/font/google';
import MotionProvider from '@/components/MotionProvider';
import './globals.css';

// Archivo (estreita) para títulos, como etiquetas de equipamentos de rede;
// Atkinson Hyperlegible (Braille Institute) para leitura, pensada para baixa visão.
const archivo = Archivo({ subsets: ['latin'], axes: ['wdth'], variable: '--font-archivo', display: 'swap' });
const atkinson = Atkinson_Hyperlegible_Next({ subsets: ['latin'], variable: '--font-atkinson', display: 'swap', adjustFontFallback: false });
const atkinsonMono = Atkinson_Hyperlegible_Mono({ subsets: ['latin'], variable: '--font-atkinson-mono', display: 'swap', adjustFontFallback: false });

export const metadata: Metadata = {
  title: 'Missão OSI — Investigadores da Rede | IFPA Campus Breves',
  description: 'Uma jornada investigativa pelas sete camadas da comunicação em redes para estudantes do Ensino Médio Técnico Integrado em Informática.',
  openGraph: {
    title: 'Missão OSI — Investigadores da Rede',
    description: 'Simulador investigativo educacional das sete camadas do modelo OSI no IFPA Campus Breves.',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Missão OSI — Investigadores da Rede',
    description: 'Simulador investigativo educacional das sete camadas do modelo OSI no IFPA Campus Breves.',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#f5f7f6',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR" className={`${archivo.variable} ${atkinson.variable} ${atkinsonMono.variable}`}>
      <body className="min-h-screen bg-papel text-grafite flex flex-col antialiased" suppressHydrationWarning>
        <a href="#conteudo" className="pular-conteudo">
          Pular para o conteúdo
        </a>
        <MotionProvider>{children}</MotionProvider>
      </body>
    </html>
  );
}
