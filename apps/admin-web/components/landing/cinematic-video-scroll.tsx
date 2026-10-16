'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import Link from 'next/link';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import {
  ArrowRight,
  ChevronDown,
  Lock,
  Sparkles,
  Play,
  Pause,
  RotateCcw,
  CheckCircle2,
  Compass,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export { CinematicBackground } from './cinematic-background';

// ============================================================================
// MANDATORY VIDEO SEQUENCE
// 1. Worker operating in the field: Field_worker_operating_digital_t…_20261013185812.mp4
// 2. Map interface transforms worker's location: Map_interface_transforms_worker_…_20261013190052.mp4
// 3. Camera reveals employee tracking: Camera_reveals_employee_tracking…_1080p_20261013190349.mp4
// ============================================================================
export const CINEMATIC_VIDEOS = [
  {
    id: 'worker',
    stageNumber: '01',
    stageLabel: 'FIELD OPERATIONS',
    caption: 'Worker Operating in Field',
    description: 'Worker operating digital telemetry terminal in active field operations',
    filename: 'Field_worker_operating_digital_t…_20261013185812.mp4',
    src: '/videos/Field_worker_operating_digital_t…_20261013185812.mp4',
  },
  {
    id: 'map-transform',
    stageNumber: '02',
    stageLabel: 'MAP SYNTHESIS',
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

export function CinematicVideoScroll() {
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLDivElement>(null);

  // References to the 3 video elements
  const v0Ref = useRef<HTMLVideoElement | null>(null);
  const v1Ref = useRef<HTMLVideoElement | null>(null);
  const v2Ref = useRef<HTMLVideoElement | null>(null);

  // Video metadata durations (defaults to 10s until loadedmetadata)
  const durationsRef = useRef<[number, number, number]>([10, 10, 10]);
  const [metadataLoaded, setMetadataLoaded] = useState<[boolean, boolean, boolean]>([
    false,
    false,
    false,
  ]);

  // Current visual stage (0: Worker, 1: Map, 2: Tracking)
  const [currentStage, setCurrentStage] = useState<number>(0);
  const [scrollProgress, setScrollProgress] = useState<number>(0);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState<boolean>(false);

  // Reduced motion manual tab state
  const [reducedTab, setReducedTab] = useState<number>(0);

  // Target seek time tracking for smooth scrub reconciliation
  const targetTimes = useRef<[number, number, number]>([0, 0, 0]);
  const rafSeekId = useRef<number | null>(null);

  // 1. Detect reduced motion
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);

    const listener = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
    mediaQuery.addEventListener('change', listener);
    return () => mediaQuery.removeEventListener('change', listener);
  }, []);

  // 2. Register GSAP ScrollTrigger
  useEffect(() => {
    if (typeof window === 'undefined') return;
    gsap.registerPlugin(ScrollTrigger);
  }, []);

  // 3. Handle video metadata loading and capture actual durations
  const handleLoadedMetadata = useCallback((index: 0 | 1 | 2) => {
    const video = index === 0 ? v0Ref.current : index === 1 ? v1Ref.current : v2Ref.current;
    if (video && !isNaN(video.duration) && video.duration > 0) {
      durationsRef.current[index] = video.duration;
    }
    // Ensure initial frame is decoded and rendered
    if (video && video.currentTime === 0) {
      try {
        video.currentTime = 0.001;
      } catch (err) {
        // Safe to ignore in autoplay-restricted contexts
      }
    }
    setMetadataLoaded((prev) => {
      const next: [boolean, boolean, boolean] = [...prev];
      next[index] = true;
      return next;
    });
  }, []);

  // 4. Smooth seeking executor with seeked listener reconciliation
  const scheduleSeek = useCallback(() => {
    if (rafSeekId.current !== null) return;

    rafSeekId.current = requestAnimationFrame(() => {
      rafSeekId.current = null;
      const videos = [v0Ref.current, v1Ref.current, v2Ref.current];

      videos.forEach((vid, i) => {
        if (!vid || vid.readyState < 1) return;
        const target = targetTimes.current[i];
        // Only set currentTime if not currently seeking and delta is significant
        if (!vid.seeking && Math.abs(vid.currentTime - target) > 0.03) {
          try {
            vid.currentTime = target;
          } catch (e) {
            // Browser seek throttle safe catch
          }
        }
      });
    });
  }, []);

  // 5. Main GSAP ScrollTrigger Scrubbing Engine
  useEffect(() => {
    if (typeof window === 'undefined' || prefersReducedMotion) return;
    if (!triggerRef.current) return;

    const ctx = gsap.context(() => {
      // Calculate partition boundaries from real metadata durations
      const [d0, d1, d2] = durationsRef.current;
      const totalDuration = d0 + d1 + d2;
      const p1 = d0 / totalDuration; // Boundary between Video 1 & Video 2 (~0.333)
      const p2 = (d0 + d1) / totalDuration; // Boundary between Video 2 & Video 3 (~0.667)
      const crossfadeDelta = 0.015; // Smooth micro-crossfade band at boundaries

      // Elements
      const v0El = v0Ref.current;
      const v1El = v1Ref.current;
      const v2El = v2Ref.current;

      // Initial visual state: Video 1 full visibility, Video 2 & 3 hidden
      if (v0El) gsap.set(v0El, { opacity: 1, visibility: 'visible' });
      if (v1El) gsap.set(v1El, { opacity: 0, visibility: 'hidden' });
      if (v2El) gsap.set(v2El, { opacity: 0, visibility: 'hidden' });

      // Opening hero text & reveal overlay initial states
      gsap.set('.cinematic-opening-hero', { autoAlpha: 1 });
      gsap.set('.cinematic-chapter-tag', { autoAlpha: 0 });
      gsap.set('.cinematic-reveal-overlay', { autoAlpha: 0, y: 30 });

      // Master scroll timeline
      ScrollTrigger.create({
        trigger: triggerRef.current,
        start: 'top top',
        end: '+=3200', // 3200px scroll scrub distance for cinematic control
        pin: true,
        scrub: 0.6, // Butter-smooth catch-up without input latency
        anticipatePin: 1,
        onUpdate: (self) => {
          const p = self.progress;
          setScrollProgress(p);

          // -------------------------------------------------------------
          // VIDEO PLAYBACK TIME MAPPING
          // -------------------------------------------------------------
          if (p <= p1) {
            // Stage 1: Video 1 actively playing from 0 -> d0
            const stage0Progress = Math.min(1, Math.max(0, p / p1));
            targetTimes.current[0] = stage0Progress * d0;
            targetTimes.current[1] = 0;
            targetTimes.current[2] = 0;
            setCurrentStage(0);
          } else if (p <= p2) {
            // Stage 2: Video 1 parked at end; Video 2 actively playing from 0 -> d1
            const stage1Progress = Math.min(1, Math.max(0, (p - p1) / (p2 - p1)));
            targetTimes.current[0] = d0;
            targetTimes.current[1] = stage1Progress * d1;
            targetTimes.current[2] = 0;
            setCurrentStage(1);
          } else {
            // Stage 3: Video 1 & 2 parked at end; Video 3 actively playing from 0 -> d2
            const stage2Progress = Math.min(1, Math.max(0, (p - p2) / (1 - p2)));
            targetTimes.current[0] = d0;
            targetTimes.current[1] = d1;
            targetTimes.current[2] = stage2Progress * d2;
            setCurrentStage(2);
          }

          scheduleSeek();

          // -------------------------------------------------------------
          // VIDEO OPACITY & BOUNDARY CROSSFADE TRANSITIONS
          // -------------------------------------------------------------
          // Stage 1 -> Stage 2 boundary around p1
          if (p < p1 - crossfadeDelta) {
            if (v0El) {
              v0El.style.opacity = '1';
              v0El.style.visibility = 'visible';
            }
            if (v1El) {
              v1El.style.opacity = '0';
              v1El.style.visibility = 'hidden';
            }
            if (v2El) {
              v2El.style.opacity = '0';
              v2El.style.visibility = 'hidden';
            }
          } else if (p >= p1 - crossfadeDelta && p <= p1 + crossfadeDelta) {
            const f = (p - (p1 - crossfadeDelta)) / (crossfadeDelta * 2);
            if (v0El) {
              v0El.style.opacity = String(1 - f);
              v0El.style.visibility = 'visible';
            }
            if (v1El) {
              v1El.style.opacity = String(f);
              v1El.style.visibility = 'visible';
            }
            if (v2El) {
              v2El.style.opacity = '0';
              v2El.style.visibility = 'hidden';
            }
          }
          // Stage 2 -> Stage 3 boundary around p2
          else if (p > p1 + crossfadeDelta && p < p2 - crossfadeDelta) {
            if (v0El) {
              v0El.style.opacity = '0';
              v0El.style.visibility = 'hidden';
            }
            if (v1El) {
              v1El.style.opacity = '1';
              v1El.style.visibility = 'visible';
            }
            if (v2El) {
              v2El.style.opacity = '0';
              v2El.style.visibility = 'hidden';
            }
          } else if (p >= p2 - crossfadeDelta && p <= p2 + crossfadeDelta) {
            const f = (p - (p2 - crossfadeDelta)) / (crossfadeDelta * 2);
            if (v0El) {
              v0El.style.opacity = '0';
              v0El.style.visibility = 'hidden';
            }
            if (v1El) {
              v1El.style.opacity = String(1 - f);
              v1El.style.visibility = 'visible';
            }
            if (v2El) {
              v2El.style.opacity = String(f);
              v2El.style.visibility = 'visible';
            }
          } else {
            // Stage 3 active
            if (v0El) {
              v0El.style.opacity = '0';
              v0El.style.visibility = 'hidden';
            }
            if (v1El) {
              v1El.style.opacity = '0';
              v1El.style.visibility = 'hidden';
            }
            if (v2El) {
              v2El.style.opacity = '1';
              v2El.style.visibility = 'visible';
            }
          }

          // -------------------------------------------------------------
          // TYPOGRAPHY OVERLAY PROGRESSION
          // -------------------------------------------------------------
          // Opening text fades out smoothly between p = 0.00 and 0.08
          if (p <= 0.08) {
            const textAlpha = Math.max(0, 1 - p / 0.08);
            gsap.set('.cinematic-opening-hero', {
              autoAlpha: textAlpha,
              y: -20 * (1 - textAlpha),
            });
          } else {
            gsap.set('.cinematic-opening-hero', { autoAlpha: 0 });
          }

          // Minimal chapter pill tag in corner (subtle visibility during middle journey)
          if (p > 0.12 && p < 0.82) {
            gsap.set('.cinematic-chapter-tag', { autoAlpha: 0.9 });
          } else {
            gsap.set('.cinematic-chapter-tag', { autoAlpha: 0 });
          }

          // Final product reveal emerges deliberately as Video 3 approaches completion (p > 0.82)
          if (p >= 0.82) {
            const revealProgress = Math.min(1, (p - 0.82) / 0.14);
            gsap.set('.cinematic-reveal-overlay', {
              autoAlpha: revealProgress,
              y: 30 * (1 - revealProgress),
            });
          } else {
            gsap.set('.cinematic-reveal-overlay', { autoAlpha: 0, y: 30 });
          }
        },
      });
    }, triggerRef);

    return () => {
      ctx.revert();
      if (rafSeekId.current !== null) {
        cancelAnimationFrame(rafSeekId.current);
      }
    };
  }, [prefersReducedMotion, scheduleSeek]);

  // Reduced motion view tab selection
  const handleReducedTabChange = (index: number) => {
    setReducedTab(index);
  };

  // --------------------------------------------------------------------------
  // ACCESSIBLE REDUCED MOTION FALLBACK
  // --------------------------------------------------------------------------
  if (prefersReducedMotion) {
    const activeClip = CINEMATIC_VIDEOS[reducedTab];
    return (
      <section className="relative py-20 bg-slate-950 text-white border-b border-slate-800">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-8 space-y-2">
            <Badge
              variant="outline"
              className="text-xs border-indigo-500/40 text-indigo-300 bg-indigo-500/10"
            >
              Accessible Reduced Motion View
            </Badge>
            <h2 className="text-3xl font-extrabold text-white tracking-tight">
              FieldTrack Cinematic Sequence
            </h2>
            <p className="text-sm text-slate-400 max-w-xl mx-auto">
              Step through the three-stage workforce telemetry sequence with standard video controls.
            </p>
          </div>

          {/* Stepper Tabs */}
          <div className="flex justify-center gap-2 mb-6">
            {CINEMATIC_VIDEOS.map((clip, idx) => (
              <Button
                key={clip.id}
                size="sm"
                variant={reducedTab === idx ? 'default' : 'outline'}
                onClick={() => handleReducedTabChange(idx)}
                className={`text-xs ${
                  reducedTab === idx
                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                    : 'border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                <span className="font-mono mr-1.5 opacity-70">{clip.stageNumber}</span>
                {clip.stageLabel}
              </Button>
            ))}
          </div>

          {/* Video Container */}
          <div className="relative rounded-2xl overflow-hidden border border-slate-800 bg-slate-900 aspect-video max-w-4xl mx-auto shadow-2xl">
            <video
              key={activeClip.src}
              src={activeClip.src}
              controls
              playsInline
              muted
              className="w-full h-full object-cover"
            />
          </div>

          <div className="mt-6 text-center max-w-xl mx-auto space-y-2">
            <h3 className="text-lg font-bold text-white">{activeClip.caption}</h3>
            <p className="text-sm text-slate-400">{activeClip.description}</p>
          </div>
        </div>
      </section>
    );
  }

  // --------------------------------------------------------------------------
  // FULL-SCREEN IMMERSIVE CINEMATIC INTRO
  // --------------------------------------------------------------------------
  return (
    <div ref={containerRef} className="relative w-full bg-slate-950 overflow-hidden">
      {/* Pinned Viewport Container (Edge-to-Edge) */}
      <div
        ref={triggerRef}
        className="relative w-full h-[100dvh] min-h-[640px] overflow-hidden select-none bg-black flex flex-col justify-between"
      >
        {/* ================================================================= */}
        {/* VIDEO LAYERS (Full Viewport, absolute edge-to-edge)               */}
        {/* ================================================================= */}
        <div className="absolute inset-0 z-0 w-full h-full bg-black overflow-hidden pointer-events-none">
          {/* VIDEO 1 — Worker operating in the field */}
          <video
            ref={v0Ref}
            src={CINEMATIC_VIDEOS[0].src}
            muted
            playsInline
            preload="auto"
            onLoadedMetadata={() => handleLoadedMetadata(0)}
            className="absolute inset-0 w-full h-full object-cover will-change-transform"
            style={{ opacity: 1, visibility: 'visible' }}
          />

          {/* VIDEO 2 — Map interface transforms the worker's location */}
          <video
            ref={v1Ref}
            src={CINEMATIC_VIDEOS[1].src}
            muted
            playsInline
            preload="auto"
            onLoadedMetadata={() => handleLoadedMetadata(1)}
            className="absolute inset-0 w-full h-full object-cover will-change-transform"
            style={{ opacity: 0, visibility: 'hidden' }}
          />

          {/* VIDEO 3 — Camera reveals employee tracking view */}
          <video
            ref={v2Ref}
            src={CINEMATIC_VIDEOS[2].src}
            muted
            playsInline
            preload="auto"
            onLoadedMetadata={() => handleLoadedMetadata(2)}
            className="absolute inset-0 w-full h-full object-cover will-change-transform"
            style={{ opacity: 0, visibility: 'hidden' }}
          />

          {/* Subtle cinematic gradient vignette for maximum contrast and polish */}
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-slate-950/60 pointer-events-none" />
        </div>

        {/* ================================================================= */}
        {/* LAYER 1: MINIMAL CHAPTER HUD (Subtle in upper corner)            */}
        {/* ================================================================= */}
        <div className="relative z-20 pt-20 px-6 sm:px-10 max-w-7xl mx-auto w-full flex items-center justify-between pointer-events-none">
          <div className="cinematic-chapter-tag flex items-center gap-2.5 px-3 py-1.5 rounded-full bg-slate-950/60 border border-slate-700/60 backdrop-blur-md transition-opacity">
            <span className="h-2 w-2 rounded-full bg-cyan-400 animate-pulse" />
            <span className="text-xs font-mono text-cyan-300 font-semibold tracking-wider">
              {CINEMATIC_VIDEOS[currentStage].stageLabel}
            </span>
            <span className="text-slate-500 font-mono text-xs">/</span>
            <span className="text-slate-400 font-mono text-xs">
              0{currentStage + 1} OF 03
            </span>
          </div>

          {/* Tiny Timeline Gauge */}
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-950/50 border border-slate-800/60 backdrop-blur-md text-[11px] font-mono text-slate-400">
            <Compass className="h-3 w-3 text-indigo-400 animate-spin" style={{ animationDuration: '10s' }} />
            <span>PROGRESS: {Math.round(scrollProgress * 100)}%</span>
          </div>
        </div>

        {/* ================================================================= */}
        {/* LAYER 2: OPENING STAGE 1 MINIMAL TYPOGRAPHY (Fades on Scroll)     */}
        {/* ================================================================= */}
        <div className="cinematic-opening-hero relative z-20 px-6 sm:px-12 max-w-7xl mx-auto w-full my-auto py-8">
          <div className="max-w-3xl space-y-4">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-500/15 border border-indigo-500/30 text-indigo-300 text-xs font-medium backdrop-blur-md shadow-lg shadow-indigo-500/10">
              <Sparkles className="h-3.5 w-3.5 text-cyan-300" />
              <span>Next-Gen Enterprise Workforce Telemetry</span>
            </div>

            <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold text-white tracking-tight leading-[1.1] drop-shadow-2xl">
              Enterprise-Grade{' '}
              <span className="bg-gradient-to-r from-indigo-400 via-cyan-300 to-indigo-300 bg-clip-text text-transparent">
                Workforce Tracking
              </span>
            </h1>

            <p className="text-base sm:text-lg text-slate-200/90 max-w-2xl leading-relaxed drop-shadow-md">
              Sub-meter GPS precision, automated polygonal geofencing, hardware mock detection,
              and offline-first queue synchronization—engineered for mission-critical operations.
            </p>

            <div className="pt-2 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-slate-300 font-medium drop-shadow">
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                <span>Offline-First SQLite Cache</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                <span>Hardware Mock Protection</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                <span>Sub-Second Telemetry Sync</span>
              </div>
            </div>
          </div>
        </div>

        {/* ================================================================= */}
        {/* LAYER 3: STAGE 3 & 4 DELIBERATE PRODUCT REVEAL (Emerges near end) */}
        {/* ================================================================= */}
        <div className="cinematic-reveal-overlay absolute inset-0 z-20 flex items-center justify-center px-6 sm:px-12 pointer-events-none">
          <div className="max-w-2xl w-full text-center p-8 sm:p-10 rounded-3xl bg-slate-950/85 border border-slate-800/90 backdrop-blur-2xl shadow-2xl space-y-6 pointer-events-auto">
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-cyan-500/15 border border-cyan-500/30 text-cyan-300 text-xs font-mono">
              <span className="h-2 w-2 rounded-full bg-cyan-400 animate-pulse" />
              <span>PHASE 03 // LIVE FLEET INTELLIGENCE</span>
            </div>

            <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tight leading-tight">
              Complete Operational Visibility
            </h2>

            <p className="text-sm sm:text-base text-slate-300 leading-relaxed max-w-lg mx-auto">
              Transform raw field movement into real-time operational intelligence. Verify location locks,
              eliminate GPS spoofing, and orchestrate shifts with cryptographic certainty.
            </p>

            {/* Deliberate Action Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3.5 pt-2">
              <Link href="/dashboard" className="w-full sm:w-auto">
                <Button
                  size="lg"
                  className="w-full sm:w-auto h-12 px-8 bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white font-medium text-sm rounded-xl shadow-xl shadow-indigo-600/30 gap-2 transition-all hover:scale-[1.02] active:scale-[0.98]"
                >
                  Launch Live Console
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link href="/login" className="w-full sm:w-auto">
                <Button
                  size="lg"
                  variant="outline"
                  className="w-full sm:w-auto h-12 px-8 border-slate-700 bg-slate-900/80 hover:bg-slate-800 text-slate-200 hover:text-white font-medium text-sm rounded-xl backdrop-blur-sm gap-2 transition-all"
                >
                  <Lock className="h-4 w-4 text-indigo-400" />
                  Sign In to Portal
                </Button>
              </Link>
            </div>

            <p className="text-xs text-slate-400 font-mono pt-1">
              Scroll down to explore system architecture, anti-spoofing heuristics, and capabilities ↓
            </p>
          </div>
        </div>

        {/* ================================================================= */}
        {/* LAYER 4: BOTTOM SCROLL GUIDANCE (Subtle breathing prompt)          */}
        {/* ================================================================= */}
        <div className="relative z-20 pb-8 px-6 sm:px-10 max-w-7xl mx-auto w-full flex items-center justify-between text-xs text-slate-400 pointer-events-none">
          <div className="flex items-center gap-2 font-mono text-[11px] text-slate-400/80">
            <span>Scroll-Controlled Sequence</span>
          </div>

          <div className="flex items-center gap-2 font-mono text-[11px] text-cyan-300">
            <span>Scroll to advance cinematic flow</span>
            <ChevronDown className="h-4 w-4 animate-bounce text-cyan-400" />
          </div>
        </div>
      </div>
    </div>
  );
}

export default CinematicVideoScroll;
