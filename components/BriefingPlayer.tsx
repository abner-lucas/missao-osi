'use client';

import React from 'react';
import { Player } from '@remotion/player';
import {
  Briefing,
  BRIEFING_DURATION,
  BRIEFING_FPS,
  BRIEFING_HEIGHT,
  BRIEFING_TRANSCRIPT,
  BRIEFING_WIDTH,
} from './video/Briefing';

// Video plays only when the student presses play (never autoplays), with a text transcript for screen readers.
export default function BriefingPlayer() {
  return (
    <div className="space-y-3">
      <div className="rounded-2xl overflow-hidden border border-linha bg-lousa">
        <Player
          component={Briefing}
          durationInFrames={BRIEFING_DURATION}
          fps={BRIEFING_FPS}
          compositionWidth={BRIEFING_WIDTH}
          compositionHeight={BRIEFING_HEIGHT}
          controls
          clickToPlay
          spaceKeyToPlayOrPause
          showVolumeControls={false}
          allowFullscreen
          showPosterWhenUnplayed
          renderPoster={() => (
            <div className="absolute inset-0 lousa flex flex-col items-center justify-center gap-3 text-center px-6">
              <span className="font-display font-extrabold [font-stretch:78%] text-[clamp(2rem,6vw,4.5rem)] leading-none">
                Missão OSI
              </span>
              <span className="text-giz-2 text-[clamp(0.95rem,2vw,1.25rem)]">Vídeo de apresentação, 36 segundos</span>
            </div>
          )}
          style={{ width: '100%', aspectRatio: '16 / 9' }}
          acknowledgeRemotionLicense
        />
      </div>
      <details className="text-grafite-2">
        <summary className="inline-flex items-center min-h-11 font-semibold text-caneta">
          Ler a transcrição do vídeo
        </summary>
        <div className="mt-2 space-y-2 max-w-prose">
          {BRIEFING_TRANSCRIPT.map((line) => (
            <p key={line}>{line}</p>
          ))}
        </div>
      </details>
    </div>
  );
}
