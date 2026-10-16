'use client';

import React, { useEffect, useRef, useCallback } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

// ============================================================================
// MANDATORY VIDEO SEQUENCE & HIGH-FIDELITY ASSETS
// 1. Worker operating in the field: Field_worker_operating_digital_t…_20261013185812.mp4
// 2. Map interface transforms worker's location: Map_interface_transforms_worker_…_20261013190052.mp4
// 3. Camera reveals employee tracking: Camera_reveals_employee_tracking…_1080p_20261013190349.mp4
// ============================================================================
export const CINEMATIC_VIDEOS = [
  {
    id: 'worker',
    stageNumber: '01',
    stageLabel: 'FIELD TELEMETRY',
    caption: 'Worker Operating in Field',
    description: 'Worker operating digital telemetry terminal in active field operations',
    filename: 'Field_worker_operating_digital_t…_20261013185812.mp4',
    src: '/videos/Field_worker_operating_digital_t…_20261013185812.mp4',
  },
  {
    id: 'map-transform',
    stageNumber: '02',
    stageLabel: 'MAP TRANSFORMATION',
    caption: 'Location Transformation',
    description: "Map interface dynamically transforms the worker's geospatial location",
    filename: 'Map_interface_transforms_worker_…_20261013190052.mp4',
    src: '/videos/Map_interface_transforms_worker_…_20261013190052.mp4',
  },
  {
    id: 'tracking-reveal',
    stageNumber: '03',
    stageLabel: 'FLEET INTELLIGENCE',
    caption: 'Employee Tracking Reveal',
    description: 'Camera reveals employee tracking and live command interface',
    filename: 'Camera_reveals_employee_tracking…_1080p_20261013190349.mp4',
    src: '/videos/Camera_reveals_employee_tracking…_1080p_20261013190349.mp4',
  },
] as const;

interface CinematicBackgroundProps {
  contentSelector?: string;
}

export function CinematicBackground({
  contentSelector = '#homepage-content',
}: CinematicBackgroundProps) {
  // References to the 3 video elements
  const v0Ref = useRef<HTMLVideoElement | null>(null);
  const v1Ref = useRef<HTMLVideoElement | null>(null);
  const v2Ref = useRef<HTMLVideoElement | null>(null);

  // Floating chapter HUD refs for zero-render DOM updates
  const stagePillRef = useRef<HTMLDivElement | null>(null);
  const stageLabelRef = useRef<HTMLSpanElement | null>(null);
  const stageNumRef = useRef<HTMLSpanElement | null>(null);

  // Active stage tracker
  const currentStageIndex = useRef<number>(0);
  const scrollTriggerRef = useRef<ScrollTrigger | null>(null);

  // Helper to safely play a video element without unhandled promise rejections
  const safePlay = useCallback((video: HTMLVideoElement | null) => {
    if (!video) return;
    if (video.paused) {
      const playPromise = video.play();
      if (playPromise !== undefined) {
        playPromise.catch(() => {
          // Fallback: Autoplay policy may require initial user interaction
          const unlockAutoplay = () => {
            video.play().catch(() => {});
            window.removeEventListener('pointerdown', unlockAutoplay);
            window.removeEventListener('scroll', unlockAutoplay);
            window.removeEventListener('keydown', unlockAutoplay);
            window.removeEventListener('touchstart', unlockAutoplay);
          };
          window.addEventListener('pointerdown', unlockAutoplay, { once: true });
          window.addEventListener('scroll', unlockAutoplay, { once: true });
          window.addEventListener('keydown', unlockAutoplay, { once: true });
          window.addEventListener('touchstart', unlockAutoplay, { once: true });
        });
      }
    }
  }, []);

  // Helper to pause a video element to conserve GPU decoding resources
  const safePause = useCallback((video: HTMLVideoElement | null) => {
    if (!video) return;
    if (!video.paused) {
      video.pause();
    }
  }, []);

  // 1. Register GSAP ScrollTrigger
  useEffect(() => {
    if (typeof window === 'undefined') return;
    gsap.registerPlugin(ScrollTrigger);
  }, []);

  // 2. Continuous Playback Engine & Scroll Narrative Synchronization
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Check prefers-reduced-motion
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) {
      // Display initial frame cleanly without motion
      if (v0Ref.current) {
        v0Ref.current.style.opacity = '1';
        v0Ref.current.style.visibility = 'visible';
      }
      return;
    }

    const contentEl = document.querySelector(contentSelector);
    if (!contentEl) return;

    const v0 = v0Ref.current;
    const v1 = v1Ref.current;
    const v2 = v2Ref.current;

    // Start Video 1 continuous playback immediately
    if (v0) {
      v0.style.opacity = '1';
      v0.style.visibility = 'visible';
      safePlay(v0);
    }
    if (v1) {
      v1.style.opacity = '0';
      v1.style.visibility = 'hidden';
    }
    if (v2) {
      v2.style.opacity = '0';
      v2.style.visibility = 'hidden';
    }

    // Storyline narrative partition thresholds
    // Stage 1: Hero & Overview -> Video 1 (Worker Operating in Field)
    // Stage 2: Capabilities & Architecture -> Video 2 (Map Interface Transformation)
    // Stage 3: Anti-Spoofing & Live Console & Footer -> Video 3 (Camera Reveals Tracking Command Interface)
    const p1 = 0.30; // End of Stage 1
    const p2 = 0.56; // End of Stage 2 (completes before Anti-Spoofing, eliminating map ghosting)
    const crossfadeHalfBand = 0.02; // Clean 4% crossfade band preventing lingering double-exposure

    const ctx = gsap.context(() => {
      scrollTriggerRef.current = ScrollTrigger.create({
        id: 'cinematic-bg-trigger',
        trigger: contentEl,
        start: 'top top',
        end: 'bottom bottom',
        onUpdate: (self) => {
          const p = self.progress; // 0.0 at top of hero -> 1.0 at footer

          let newStage = 0;

          // -------------------------------------------------------------
          // CONTINUOUS PLAYBACK NARRATIVE TRANSITIONS
          // Smooth opacity crossfades without per-scroll seek operations
          // -------------------------------------------------------------
          if (p < p1 - crossfadeHalfBand) {
            // Pure Stage 1: Video 1 playing continuously
            newStage = 0;
            if (v0) {
              v0.style.opacity = '1';
              v0.style.visibility = 'visible';
              safePlay(v0);
            }
            if (v1) {
              v1.style.opacity = '0';
              v1.style.visibility = 'hidden';
              safePause(v1);
            }
            if (v2) {
              v2.style.opacity = '0';
              v2.style.visibility = 'hidden';
              safePause(v2);
            }
          } else if (p >= p1 - crossfadeHalfBand && p <= p1 + crossfadeHalfBand) {
            // Stage 1 -> Stage 2 Crossfade Window
            const f = (p - (p1 - crossfadeHalfBand)) / (crossfadeHalfBand * 2);
            newStage = f >= 0.5 ? 1 : 0;
            if (v0) {
              v0.style.opacity = String(1 - f);
              v0.style.visibility = 'visible';
              safePlay(v0);
            }
            if (v1) {
              v1.style.opacity = String(f);
              v1.style.visibility = 'visible';
              safePlay(v1);
            }
            if (v2) {
              v2.style.opacity = '0';
              v2.style.visibility = 'hidden';
              safePause(v2);
            }
          } else if (p > p1 + crossfadeHalfBand && p < p2 - crossfadeHalfBand) {
            // Pure Stage 2: Video 2 playing continuously
            newStage = 1;
            if (v0) {
              v0.style.opacity = '0';
              v0.style.visibility = 'hidden';
              safePause(v0);
            }
            if (v1) {
              v1.style.opacity = '1';
              v1.style.visibility = 'visible';
              safePlay(v1);
            }
            if (v2) {
              v2.style.opacity = '0';
              v2.style.visibility = 'hidden';
              safePause(v2);
            }
          } else if (p >= p2 - crossfadeHalfBand && p <= p2 + crossfadeHalfBand) {
            // Stage 2 -> Stage 3 Crossfade Window
            const f = (p - (p2 - crossfadeHalfBand)) / (crossfadeHalfBand * 2);
            newStage = f >= 0.5 ? 2 : 1;
            if (v0) {
              v0.style.opacity = '0';
              v0.style.visibility = 'hidden';
              safePause(v0);
            }
            if (v1) {
              v1.style.opacity = String(1 - f);
              v1.style.visibility = 'visible';
              safePlay(v1);
            }
            if (v2) {
              v2.style.opacity = String(f);
              v2.style.visibility = 'visible';
              safePlay(v2);
            }
          } else {
            // Pure Stage 3: Video 3 playing continuously (reveals tracking dashboard)
            newStage = 2;
            if (v0) {
              v0.style.opacity = '0';
              v0.style.visibility = 'hidden';
              safePause(v0);
            }
            if (v1) {
              v1.style.opacity = '0';
              v1.style.visibility = 'hidden';
              safePause(v1);
            }
            if (v2) {
              v2.style.opacity = '1';
              v2.style.visibility = 'visible';
              safePlay(v2);
            }
          }

          // -------------------------------------------------------------
          // FLOATING CHAPTER HUD UPDATES (Zero-State DOM Text Updates)
          // -------------------------------------------------------------
          if (newStage !== currentStageIndex.current) {
            currentStageIndex.current = newStage;
            if (stageLabelRef.current) {
              stageLabelRef.current.textContent = CINEMATIC_VIDEOS[newStage].stageLabel;
            }
            if (stageNumRef.current) {
              stageNumRef.current.textContent = `0${newStage + 1}`;
            }
          }
        },
      });
    });

    return () => {
      ctx.revert();
    };
  }, [contentSelector, safePlay, safePause]);

  return (
    <>
      {/* =================================================================== */}
      {/* LAYER 1: PERSISTENT FULL-PAGE CINEMATIC VIDEO BACKGROUND            */}
      {/* =================================================================== */}
      <div
        className="fixed inset-0 w-full h-full pointer-events-none z-0 overflow-hidden bg-slate-950"
        aria-hidden="true"
      >
        {/* VIDEO 1 — Worker operating in the field */}
        <video
          ref={v0Ref}
          src={CINEMATIC_VIDEOS[0].src}
          muted
          loop
          playsInline
          preload="auto"
          className="absolute inset-0 w-full h-full object-cover object-center"
          style={{ opacity: 1, visibility: 'visible' }}
        />

        {/* VIDEO 2 — Map interface transforms the worker's location */}
        <video
          ref={v1Ref}
          src={CINEMATIC_VIDEOS[1].src}
          muted
          loop
          playsInline
          preload="auto"
          className="absolute inset-0 w-full h-full object-cover object-center"
          style={{ opacity: 0, visibility: 'hidden' }}
        />

        {/* VIDEO 3 — Camera reveals employee tracking view */}
        <video
          ref={v2Ref}
          src={CINEMATIC_VIDEOS[2].src}
          muted
          loop
          playsInline
          preload="auto"
          className="absolute inset-0 w-full h-full object-cover object-center"
          style={{ opacity: 0, visibility: 'hidden' }}
        />

        {/* =================================================================== */}
        {/* LAYER 2: REFINED, HIGH-CLARITY NAVY OVERLAY                         */}
        {/* Preserves 1080p native brightness while keeping cards legible        */}
        {/* =================================================================== */}
        {/* Balanced translucent navy wash (40% opacity) */}
        <div className="absolute inset-0 bg-[#030712]/40 pointer-events-none" />

        {/* Subtle peripheral vignette (50% opacity) for deep slate border depth */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_45%,#020617_95%)] pointer-events-none opacity-50" />
      </div>

      {/* =================================================================== */}
      {/* FLOATING SUBTLE CHAPTER HUD (Fixed corner pill indicator)          */}
      {/* =================================================================== */}
      <div
        ref={stagePillRef}
        className="fixed bottom-6 right-6 z-40 pointer-events-none hidden sm:flex items-center gap-2.5 px-3 py-1.5 rounded-full bg-slate-950/80 border border-slate-800/80 backdrop-blur-md shadow-2xl transition-all"
        aria-hidden="true"
      >
        <span className="h-2 w-2 rounded-full bg-cyan-400 animate-pulse" />
        <span
          ref={stageLabelRef}
          className="text-[11px] font-mono text-cyan-300 font-semibold tracking-wider"
        >
          {CINEMATIC_VIDEOS[0].stageLabel}
        </span>
        <span className="text-slate-600 font-mono text-[11px]">/</span>
        <span
          ref={stageNumRef}
          className="text-slate-400 font-mono text-[11px]"
        >
          01
        </span>
        <span className="text-slate-600 font-mono text-[11px]">OF 03</span>
      </div>
    </>
  );
}

export default CinematicBackground;
