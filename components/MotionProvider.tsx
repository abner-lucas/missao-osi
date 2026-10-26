'use client';

import React, { useEffect, useState } from 'react';
import { MotionConfig } from 'motion/react';
import { getReducedMotionPreference } from '@/lib/storage';

// Applies the site's "Movimento reduzido" toggle (and the OS preference) to every animation:
// motion components through MotionConfig, CSS animations through html[data-movimento].
export default function MotionProvider({ children }: { children: React.ReactNode }) {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const apply = (value: boolean) => {
      setReduced(value);
      document.documentElement.dataset.movimento = value ? 'reduzido' : 'normal';
    };
    apply(getReducedMotionPreference());
    const onChange = (e: Event) => apply(Boolean((e as CustomEvent<boolean>).detail));
    window.addEventListener('missao-osi-motion-change', onChange);
    return () => window.removeEventListener('missao-osi-motion-change', onChange);
  }, []);

  return <MotionConfig reducedMotion={reduced ? 'always' : 'user'}>{children}</MotionConfig>;
}

// Shared hook for components that drive their own timers (topology, encapsulation, hero).
export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const read = () => setReduced(media.matches || getReducedMotionPreference());
    read();
    const onChange = () => read();
    window.addEventListener('missao-osi-motion-change', onChange);
    media.addEventListener('change', onChange);
    return () => {
      window.removeEventListener('missao-osi-motion-change', onChange);
      media.removeEventListener('change', onChange);
    };
  }, []);
  return reduced;
}
