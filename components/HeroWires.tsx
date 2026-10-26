'use client';

import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { wireOf } from '@/lib/wires';
import { useReducedMotion } from './MotionProvider';

const LAYERS = [
  { n: 7, name: 'Aplicação' },
  { n: 6, name: 'Apresentação' },
  { n: 5, name: 'Sessão' },
  { n: 4, name: 'Transporte' },
  { n: 3, name: 'Rede' },
  { n: 2, name: 'Enlace' },
  { n: 1, name: 'Física' },
];

const wirePath = (i: number) => {
  const y = 46 + i * 40;
  const plugY = 152 + i * 9;
  return `M 16 ${y} L 250 ${y} C 330 ${y}, 340 ${plugY}, 410 ${plugY} L 440 ${plugY}`;
};

// Seven wires (one per OSI layer) converge on an RJ-45 plug. A signal runs along one wire per cycle
// and stops at a "?" — the fault could be anywhere, so the hero never hints at a specific layer.
export default function HeroWires() {
  const reduced = useReducedMotion();
  const pathRefs = useRef<(SVGPathElement | null)[]>([]);
  const [pulse, setPulse] = useState<{ x: number; y: number; holding: boolean; wire: number } | null>(null);

  useEffect(() => {
    if (reduced) {
      setPulse(null);
      return;
    }
    let raf = 0;
    let cancelled = false;
    let cycle = 0;
    const order = [3, 0, 5, 2, 6, 1, 4];

    const run = () => {
      const wire = order[cycle % order.length];
      const path = pathRefs.current[wire];
      if (!path || cancelled) return;
      const length = path.getTotalLength();
      const stopAt = 0.38 + ((cycle * 0.17) % 0.4);
      const start = performance.now();
      const travel = 1500;

      const step = (now: number) => {
        if (cancelled) return;
        const t = Math.min(1, (now - start) / travel);
        const eased = 1 - Math.pow(1 - t, 3);
        const p = path.getPointAtLength(eased * stopAt * length);
        setPulse({ x: p.x, y: p.y, holding: t >= 1, wire });
        if (t < 1) {
          raf = requestAnimationFrame(step);
        } else {
          window.setTimeout(() => {
            if (cancelled) return;
            setPulse(null);
            cycle += 1;
            window.setTimeout(run, 500);
          }, 1700);
        }
      };
      raf = requestAnimationFrame(step);
    };

    const first = window.setTimeout(run, 1600);
    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      window.clearTimeout(first);
    };
  }, [reduced]);

  return (
    <figure className="relative">
      <svg
        viewBox="0 0 520 330"
        className="w-full h-auto"
        role="img"
        aria-label="Sete fios coloridos, um para cada camada do modelo OSI, chegam a um conector de rede. Um sinal percorre os fios e para em algum ponto desconhecido: a falha pode estar em qualquer camada."
      >
        {LAYERS.map((layer, i) => {
          const w = wireOf(layer.n);
          const d = wirePath(i);
          return (
            <g key={layer.n}>
              <text x="16" y={46 + i * 40 - 11} fontSize="15" fill="#4b5765" fontFamily="var(--font-sans)">
                <tspan fontWeight="700" fill="#1b2430">{layer.n}</tspan> {layer.name}
              </text>
              <motion.path
                ref={(el) => {
                  pathRefs.current[i] = el;
                }}
                d={d}
                fill="none"
                stroke={w.base}
                strokeWidth="7"
                strokeLinecap="round"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 1.1, delay: 0.1 + i * 0.07, ease: [0.22, 0.8, 0.2, 1] }}
              />
              {w.striped && (
                <motion.path
                  d={d}
                  fill="none"
                  stroke="#ffffff"
                  strokeWidth="3.5"
                  strokeDasharray="6 9"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.4, delay: 0.9 + i * 0.07 }}
                />
              )}
            </g>
          );
        })}

        {/* RJ-45 plug */}
        <motion.g initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5, delay: 0.8 }}>
          <rect x="436" y="132" width="72" height="104" rx="8" fill="#dfe7ec" stroke="#aebbc4" strokeWidth="1.5" />
          <rect x="446" y="146" width="44" height="76" rx="3" fill="#ffffff" fillOpacity="0.7" stroke="#aebbc4" />
          {Array.from({ length: 8 }).map((_, k) => (
            <rect key={k} x="492" y={148 + k * 9} width="10" height="5" rx="1" fill="#c9a227" />
          ))}
          <path d="M 508 166 L 516 160 L 516 208 L 508 202 Z" fill="#cfd9df" stroke="#aebbc4" />
        </motion.g>

        {pulse && (
          <g transform={`translate(${pulse.x}, ${pulse.y})`}>
            <circle r="7" fill="#ffffff" stroke="#1b2430" strokeWidth="2" />
            {pulse.holding && (
              <motion.g initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring', stiffness: 500, damping: 22 }}>
                <circle r="17" fill="none" stroke="#d6382c" strokeWidth="2.5" />
                <rect x="-14" y="-46" width="28" height="26" rx="7" fill="#1b2430" />
                <text y="-27" textAnchor="middle" fontSize="18" fontWeight="800" fill="#ffe680" fontFamily="var(--font-display)">
                  ?
                </text>
              </motion.g>
            )}
          </g>
        )}

        {reduced && (
          <g transform="translate(470, 112)">
            <rect x="-14" y="-26" width="28" height="26" rx="7" fill="#1b2430" />
            <text y="-7" textAnchor="middle" fontSize="18" fontWeight="800" fill="#ffe680" fontFamily="var(--font-display)">
              ?
            </text>
          </g>
        )}
      </svg>
      <figcaption className="sr-only">
        Representação das sete camadas como fios de um cabo de rede.
      </figcaption>
    </figure>
  );
}
