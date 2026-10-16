import type { Metadata } from 'next';
import './globals.css';

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

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&family=Plus+Jakarta+Sans:wght@500;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-screen bg-[#0B1120] text-slate-100 flex flex-col antialiased selection:bg-slate-700 selection:text-white" suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
