import React from 'react';
import { AbsoluteFill, Easing, Sequence, interpolate, useCurrentFrame, useVideoConfig } from 'remotion';

// "Briefing" da Missão OSI (36 s, 30 fps, sem áudio, legendas na tela).
// Apresenta o problema e o método sem revelar a causa de nenhuma missão.

export const BRIEFING_FPS = 30;
export const BRIEFING_DURATION = 36 * BRIEFING_FPS;
export const BRIEFING_WIDTH = 1280;
export const BRIEFING_HEIGHT = 720;

const LOUSA = '#1e2d29';
const GIZ = '#eef1ec';
const GIZ_2 = '#b4c3bd';
const MARCA = '#ffe680';
const DISPLAY = 'var(--font-display), Arial Narrow, sans-serif';
const SANS = 'var(--font-sans), system-ui, sans-serif';

const WIRES = [
  { n: 7, name: 'Aplicação', color: '#2e62c9', striped: true },
  { n: 6, name: 'Apresentação', color: '#2c9a57', striped: true },
  { n: 5, name: 'Sessão', color: '#e1701f', striped: true },
  { n: 4, name: 'Transporte', color: '#8a5636', striped: false },
  { n: 3, name: 'Rede', color: '#2e62c9', striped: false },
  { n: 2, name: 'Enlace', color: '#2c9a57', striped: false },
  { n: 1, name: 'Física', color: '#e1701f', striped: false },
];

const MOMENTS = ['Observar', 'Consultar o Atlas', 'Levantar suspeita', 'Prever e testar', 'Intervir', 'Justificar'];

const ease = Easing.bezier(0.22, 0.8, 0.2, 1);
const fadeIn = (frame: number, start: number, length = 15) =>
  interpolate(frame, [start, start + length], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: ease });

const Caption: React.FC<{ text: string; from?: number }> = ({ text, from = 0 }) => {
  const frame = useCurrentFrame();
  const opacity = fadeIn(frame, from, 12);
  return (
    <div
      style={{
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 56,
        display: 'flex',
        justifyContent: 'center',
        opacity,
        translate: `0px ${interpolate(opacity, [0, 1], [10, 0])}px`,
      }}
    >
      <div
        style={{
          maxWidth: 980,
          padding: '14px 26px',
          borderRadius: 14,
          background: 'rgba(15, 22, 20, 0.88)',
          color: GIZ,
          fontFamily: SANS,
          fontSize: 34,
          lineHeight: 1.3,
          textAlign: 'center',
        }}
      >
        {text}
      </div>
    </div>
  );
};

// Cena 1: o lugar e a hora
const SceneLab: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{ background: LOUSA, alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ display: 'flex', gap: 34, marginBottom: 120 }}>
        {[0, 1, 2, 3, 4].map((i) => {
          const o = fadeIn(frame, 8 + i * 6, 14);
          return (
            <div key={i} style={{ opacity: o, translate: `0px ${interpolate(o, [0, 1], [18, 0])}px` }}>
              <div style={{ width: 150, height: 96, borderRadius: 10, border: `4px solid ${GIZ_2}`, background: '#16221f' }} />
              <div style={{ width: 40, height: 18, margin: '0 auto', background: GIZ_2 }} />
              <div style={{ width: 90, height: 8, margin: '0 auto', borderRadius: 4, background: GIZ_2 }} />
            </div>
          );
        })}
      </div>
      <div
        style={{
          position: 'absolute',
          top: 86,
          fontFamily: DISPLAY,
          fontStretch: '80%',
          fontWeight: 800,
          fontSize: 64,
          color: GIZ,
          opacity: fadeIn(frame, 0, 18),
        }}
      >
        Segunda-feira, 7h30
      </div>
      <Caption text="Laboratório de Informática do IFPA, Campus Breves." from={20} />
    </AbsoluteFill>
  );
};

// Cena 2: o pedido sai e não volta
const SceneRequest: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const travel = interpolate(frame, [20, 20 + 2.4 * fps], [0, 0.56], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: ease });
  const stopped = frame > 20 + 2.4 * fps;
  const ring = stopped ? interpolate((frame - (20 + 2.4 * fps)) % 30, [0, 30], [1, 1.8]) : 1;
  const x = 260 + travel * 760;
  return (
    <AbsoluteFill style={{ background: LOUSA }}>
      <div style={{ position: 'absolute', left: 120, top: 220, width: 200, textAlign: 'center', color: GIZ, fontFamily: SANS, fontSize: 26 }}>
        <div style={{ width: 170, height: 110, margin: '0 auto 10px', borderRadius: 12, border: `4px solid ${GIZ}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>
          Ver notas
        </div>
        PC do aluno
      </div>
      <div style={{ position: 'absolute', right: 120, top: 210, width: 200, textAlign: 'center', color: GIZ, fontFamily: SANS, fontSize: 26 }}>
        <div style={{ width: 120, height: 150, margin: '0 auto 10px', borderRadius: 10, border: `4px solid ${GIZ}` }} />
        Servidor
      </div>
      <div style={{ position: 'absolute', left: 300, right: 300, top: 290, height: 6, borderRadius: 3, background: GIZ_2, opacity: 0.6 }} />
      <div style={{ position: 'absolute', left: x - 18, top: 275, width: 36, height: 36, borderRadius: 18, background: GIZ, border: `4px solid ${LOUSA}` }} />
      {stopped && (
        <>
          <div style={{ position: 'absolute', left: x - 30, top: 263, width: 60, height: 60, borderRadius: 30, border: '4px solid #d6382c', scale: String(ring), opacity: interpolate(ring, [1, 1.8], [1, 0]) }} />
          <div style={{ position: 'absolute', left: x - 26, top: 190, width: 52, height: 52, borderRadius: 12, background: '#0f1614', color: MARCA, fontFamily: DISPLAY, fontWeight: 800, fontSize: 40, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            ?
          </div>
        </>
      )}
      <Sequence durationInFrames={Math.round(3.6 * fps)} layout="none">
        <Caption text="Um aluno pede a página de notas. O pedido sai do computador..." from={4} />
      </Sequence>
      <Sequence from={Math.round(3.6 * fps)} layout="none">
        <Caption text="...mas a resposta nunca chega." />
      </Sequence>
    </AbsoluteFill>
  );
};

// Cena 3: as sete camadas
const SceneLayers: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{ background: LOUSA, paddingLeft: 170, paddingTop: 70 }}>
      {WIRES.map((w, i) => {
        const grow = interpolate(frame, [10 + i * 6, 40 + i * 6], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: ease });
        return (
          <div key={w.n} style={{ display: 'flex', alignItems: 'center', gap: 22, height: 62 }}>
            <div style={{ width: 230, color: GIZ, fontFamily: SANS, fontSize: 28, opacity: fadeIn(frame, 6 + i * 6) }}>
              <b>{w.n}</b> {w.name}
            </div>
            <div
              style={{
                width: 640 * grow,
                height: 16,
                borderRadius: 8,
                background: w.striped ? `repeating-linear-gradient(115deg, ${w.color} 0 14px, #ffffff 14px 24px)` : w.color,
              }}
            />
          </div>
        );
      })}
      <Caption text="Entre o clique e a resposta, a mensagem passa por sete camadas. Algo pode falhar em qualquer uma delas." from={30} />
    </AbsoluteFill>
  );
};

// Cena 4: o método de investigação (sequência real A–F)
const SceneMethod: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{ background: LOUSA, alignItems: 'center', paddingTop: 120 }}>
      <div style={{ display: 'flex', alignItems: 'center' }}>
        {MOMENTS.map((m, i) => {
          const o = fadeIn(frame, 10 + i * 22, 14);
          const lit = frame > 18 + i * 22;
          return (
            <React.Fragment key={m}>
              {i > 0 && <div style={{ width: 46, height: 6, background: lit ? MARCA : '#3a4e48', borderRadius: 3 }} />}
              <div style={{ width: 150, textAlign: 'center', opacity: o }}>
                <div
                  style={{
                    width: 74,
                    height: 74,
                    margin: '0 auto 14px',
                    borderRadius: 37,
                    border: `5px solid ${lit ? MARCA : GIZ_2}`,
                    color: GIZ,
                    fontFamily: DISPLAY,
                    fontWeight: 800,
                    fontSize: 36,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {String.fromCharCode(65 + i)}
                </div>
                <div style={{ color: GIZ, fontFamily: SANS, fontSize: 24, lineHeight: 1.2 }}>{m}</div>
              </div>
            </React.Fragment>
          );
        })}
      </div>
      <Caption text="Em cada missão, você investiga com evidências: observa, consulta, levanta uma suspeita, testa, intervém e justifica." from={150} />
    </AbsoluteFill>
  );
};

// Cena 5: fechamento
const SceneTitle: React.FC = () => {
  const frame = useCurrentFrame();
  const o = fadeIn(frame, 0, 20);
  return (
    <AbsoluteFill style={{ background: LOUSA, alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ opacity: o, scale: String(interpolate(o, [0, 1], [0.96, 1])), textAlign: 'center' }}>
        <div style={{ fontFamily: DISPLAY, fontStretch: '78%', fontWeight: 800, fontSize: 132, color: GIZ, lineHeight: 1 }}>Missão OSI</div>
        <div style={{ fontFamily: SANS, fontSize: 36, color: GIZ_2, marginTop: 20, opacity: fadeIn(frame, 18) }}>
          8 missões, um caderno de evidências e um relatório final.
        </div>
      </div>
      <Caption text="Identifique-se e comece pela primeira missão." from={50} />
    </AbsoluteFill>
  );
};

export const Briefing: React.FC = () => {
  const { fps } = useVideoConfig();
  const scenes: [React.FC, number][] = [
    [SceneLab, 5],
    [SceneRequest, 8],
    [SceneLayers, 8],
    [SceneMethod, 9],
    [SceneTitle, 6],
  ];
  let from = 0;
  return (
    <AbsoluteFill style={{ background: LOUSA }}>
      {scenes.map(([Scene, seconds], i) => {
        const start = from;
        from += seconds * fps;
        return (
          <Sequence key={i} from={start} durationInFrames={seconds * fps}>
            <Scene />
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
};

export const BRIEFING_TRANSCRIPT = [
  'Segunda-feira, 7h30. Laboratório de Informática do IFPA, Campus Breves.',
  'Um aluno pede a página de notas. O pedido sai do computador, mas a resposta nunca chega.',
  'Entre o clique e a resposta, a mensagem passa por sete camadas. Algo pode falhar em qualquer uma delas.',
  'Em cada missão, você investiga com evidências: observa, consulta, levanta uma suspeita, testa, intervém e justifica.',
  'Missão OSI: 8 missões, um caderno de evidências e um relatório final. Identifique-se e comece pela primeira missão.',
];
