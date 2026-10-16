'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion, useScroll, useTransform } from 'framer-motion';
import {
  MapPin,
  Shield,
  ShieldCheck,
  ShieldAlert,
  Radio,
  Hexagon,
  Database,
  ArrowRight,
  CheckCircle2,
  Lock,
  Layers,
  Clock,
  Compass,
  Activity,
  Zap,
  Users,
  Eye,
  ChevronRight,
  Sparkles,
  Server,
  Smartphone,
  ExternalLink,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CinematicBackground } from '@/components/landing/cinematic-background';

// Feature Highlights
const FEATURES = [
  {
    icon: Radio,
    color: 'from-blue-500 to-cyan-400',
    title: 'Live Sub-Meter Telemetry',
    subtitle: 'Real-Time Position Tracking',
    description:
      'Continuous high-fidelity GPS breadcrumbs with velocity, accuracy radius, and direction vectors streamed with sub-second latency.',
    metrics: '<150ms sync speed',
  },
  {
    icon: ShieldAlert,
    color: 'from-rose-500 to-amber-500',
    title: 'Anti-Spoofing Shield',
    subtitle: 'Zero Mock Location Tolerance',
    description:
      'Hardware-level heuristics intercept mock GPS apps, impossible speed anomalies, developer mode exploits, and GPS jumper attacks.',
    metrics: '100% detection rate',
  },
  {
    icon: Hexagon,
    color: 'from-indigo-500 to-purple-500',
    title: 'Polygonal Geofencing',
    subtitle: 'Custom Boundary Enforcement',
    description:
      'Define precise multi-vertex polygon and radial perimeters with automated clock-in triggers and tamper-resistant dwell verification.',
    metrics: 'Dynamic triggers',
  },
  {
    icon: Database,
    color: 'from-emerald-500 to-teal-400',
    title: 'Offline-First Edge Sync',
    subtitle: 'Zero Dropped Data Points',
    description:
      'Local on-device SQLite queuing ensures field workers in cellular dead zones never lose records. Automatically reconciles upon reconnection.',
    metrics: 'Zero data loss',
  },
  {
    icon: Clock,
    color: 'from-amber-500 to-orange-400',
    title: 'Automated Attendance',
    subtitle: 'Verified Time & Geolocation',
    description:
      'Seamless shift check-ins cryptographically tied to biometric device hardware, geofence polygons, and timestamp attestation.',
    metrics: 'Tamper-proof logs',
  },
  {
    icon: Layers,
    color: 'from-violet-500 to-pink-500',
    title: 'Compliance Audit Trails',
    subtitle: 'SOC-2 Ready Supervision',
    description:
      'Comprehensive administrative logs, exportable movement reports, and audit trails for regulatory compliance and dispute resolution.',
    metrics: 'Exportable logs',
  },
];

// Workflow Steps
const WORKFLOW_STEPS = [
  {
    step: '01',
    title: 'Mobile Telemetry Capture',
    desc: 'Native Android client records fused location data, satellite count, and device telemetry at adaptive intervals.',
    icon: Smartphone,
  },
  {
    step: '02',
    title: 'Hardware Integrity Verification',
    desc: 'On-device security checks identify mock providers, rooted runtimes, and location spoofing before transmission.',
    icon: Shield,
  },
  {
    step: '03',
    title: 'Edge Queue & Resilient Sync',
    desc: 'Stored in local encrypted SQLite if offline, then dispatched securely via Supabase Edge Functions with SSL pinning.',
    icon: Server,
  },
  {
    step: '04',
    title: 'Real-Time Dispatch Console',
    desc: 'Administrators view live positions, path replays, security alerts, and attendance metrics on high-performance maps.',
    icon: Activity,
  },
];

export default function LandingPage() {
  const [activeTab, setActiveTab] = useState<'map' | 'alerts' | 'analytics'>('map');
  const [isNavVisible, setIsNavVisible] = useState(false);
  const { scrollYProgress } = useScroll();
  const backgroundY = useTransform(scrollYProgress, [0, 1], ['0%', '20%']);

  // Efficient scroll detection with hysteresis to reveal navbar smoothly beyond 50px
  useEffect(() => {
    let ticking = false;

    const handleScroll = () => {
      const scrollY = window.scrollY;
      if (!ticking) {
        window.requestAnimationFrame(() => {
          // Reveal when scrolling past 50px; hide when returning to very top (<= 20px)
          setIsNavVisible((prev) => {
            if (!prev && scrollY > 50) return true;
            if (prev && scrollY <= 20) return false;
            return prev;
          });
          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    // Check initial position on mount
    handleScroll();

    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div
      id="homepage-content"
      className="relative min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-indigo-500/30 selection:text-indigo-200 overflow-x-hidden"
    >
      {/* LAYER 1 & 2: Persistent Full-Page Cinematic Background with Restrained Navy Overlay */}
      <CinematicBackground contentSelector="#homepage-content" />

      {/* Top Header / Navigation — Cinematic Scroll-Revealed Glass Navbar */}
      <header
        className={`fixed top-0 inset-x-0 z-50 transition-all duration-300 ease-out motion-reduce:transition-none ${
          isNavVisible
            ? 'translate-y-0 opacity-100 pointer-events-auto visible'
            : '-translate-y-full opacity-0 pointer-events-none invisible'
        } bg-[#050a19]/55 backdrop-blur-[12px] border-b border-white/[0.08] shadow-lg shadow-black/20`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-cyan-400 text-white shadow-lg shadow-indigo-500/25 group-hover:scale-105 transition-transform">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div className="flex flex-col">
              <span className="text-base font-bold tracking-tight text-white font-mono flex items-center gap-1.5">
                FieldTrack
                <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 border-indigo-500/40 text-indigo-300 bg-indigo-500/10">
                  PRO
                </Badge>
              </span>
            </div>
          </Link>

          {/* Desktop Nav Links */}
          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-300">
            <a href="#hero" className="hover:text-white transition-colors flex items-center gap-1.5 text-cyan-300">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
              Overview
            </a>
            <a href="#features" className="hover:text-white transition-colors">
              Capabilities
            </a>
            <a href="#architecture" className="hover:text-white transition-colors">
              Architecture
            </a>
            <a href="#security" className="hover:text-white transition-colors">
              Anti-Spoofing
            </a>
            <a href="#preview" className="hover:text-white transition-colors">
              Live Console
            </a>
          </nav>

          {/* Action CTAs */}
          <div className="flex items-center gap-3">
            <Link href="/login">
              <Button
                variant="ghost"
                size="sm"
                className="text-slate-300 hover:text-white hover:bg-slate-800/60 text-xs font-medium"
              >
                Sign In
              </Button>
            </Link>
            <Link href="/dashboard">
              <Button
                size="sm"
                className="bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/30 text-xs font-medium gap-1.5"
              >
                Launch Console
                <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content — Layer 3: Foreground Content above the persistent video */}
      <main className="relative z-10">
        {/* HERO SECTION — Floating directly above Video 1 */}
        <section id="hero" className="pt-32 pb-20 sm:pt-40 sm:pb-28 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto text-left">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-indigo-500/25 bg-slate-900/80 text-indigo-300 text-xs font-medium tracking-tight mb-6 shadow-sm backdrop-blur-md"
          >
            <Sparkles className="h-3.5 w-3.5 text-cyan-400" />
            <span>Next-Gen Enterprise Workforce Telemetry</span>
            <span className="flex h-1.5 w-1.5 rounded-full bg-cyan-400 animate-ping" />
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.1, ease: 'easeOut' }}
            className="font-display text-4xl sm:text-6xl lg:text-[4.25rem] font-bold tracking-[-0.035em] text-white max-w-4xl leading-[1.08] drop-shadow-2xl"
          >
            Enterprise-Grade{' '}
            <span className="bg-gradient-to-r from-indigo-300 via-cyan-300 to-indigo-400 bg-clip-text text-transparent">
              Workforce Tracking
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.2, ease: 'easeOut' }}
            className="mt-6 text-base sm:text-lg lg:text-[1.125rem] text-slate-300/95 max-w-2xl leading-[1.7] tracking-[-0.01em] font-normal drop-shadow"
          >
            Sub-meter GPS precision, automated polygonal geofencing, hardware-level mock detection,
            and offline-first queue synchronization—engineered for mission-critical operations.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.3, ease: 'easeOut' }}
            className="mt-10 flex flex-col sm:flex-row items-stretch sm:items-center justify-start gap-4"
          >
            <Link href="/dashboard" className="w-full sm:w-auto">
              <Button
                size="lg"
                className="w-full sm:w-auto h-12 px-8 bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-sm rounded-xl shadow-lg shadow-indigo-600/25 gap-2 transition-all hover:scale-[1.01] active:scale-[0.99]"
              >
                Go to Dashboard
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>

            <Link href="/login" className="w-full sm:w-auto">
              <Button
                size="lg"
                variant="outline"
                className="w-full sm:w-auto h-12 px-8 border border-slate-700/80 bg-slate-900/70 hover:bg-slate-800/80 text-slate-200 hover:text-white font-medium text-sm rounded-xl backdrop-blur-md gap-2 transition-all"
              >
                <Lock className="h-4 w-4 text-indigo-400" />
                Login to Portal
              </Button>
            </Link>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.45 }}
            className="mt-12 flex flex-wrap items-center justify-start gap-x-8 gap-y-3 text-xs text-slate-300/90 font-medium tracking-tight drop-shadow"
          >
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-400/90 shrink-0" />
              <span>Offline-First SQLite Cache</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-400/90 shrink-0" />
              <span>Hardware Mock Protection</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-400/90 shrink-0" />
              <span>Sub-second Live Map Stream</span>
            </div>
          </motion.div>
        </section>

        {/* HERO PREVIEW CARD (Interactive Mockup) */}
        <section className="py-20 sm:py-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto text-center">
          <motion.div
            id="preview"
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.9, ease: 'easeOut' }}
            className="max-w-5xl mx-auto rounded-2xl border border-white/[0.08] bg-slate-950/75 p-3 sm:p-5 shadow-[0_20px_50px_-15px_rgba(0,0,0,0.6)] backdrop-blur-xl relative overflow-hidden"
          >
            {/* Top specular highlight edge */}
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/[0.15] to-transparent pointer-events-none" />

            {/* Header Bar of Mockup */}
            <div className="flex flex-wrap items-center justify-between pb-4 mb-4 border-b border-white/[0.06] gap-3">
              <div className="flex items-center gap-2">
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-rose-500/80" />
                  <div className="w-3 h-3 rounded-full bg-amber-500/80" />
                  <div className="w-3 h-3 rounded-full bg-emerald-500/80" />
                </div>
                <span className="text-xs font-mono text-slate-400 ml-2 tracking-tight">
                  live-telemetry://fleet-hq.fieldtrack.internal
                </span>
              </div>

              {/* Mock status pills */}
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                  <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                  48 Active Units Online
                </span>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
                  <ShieldCheck className="h-3 w-3 text-indigo-400" />
                  Fraud Shield 100%
                </span>
              </div>
            </div>

            {/* Inner Dashboard Simulation */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-left">
              {/* Telemetry stream column */}
              <div className="space-y-3">
                <div className="p-3.5 rounded-xl border border-white/[0.06] bg-slate-900/60 hover:border-white/[0.1] transition-colors space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-100 tracking-tight">Unit EMP-101 (John Doe)</span>
                    <Badge variant="outline" className="text-[10px] text-emerald-300 border-emerald-500/30 bg-emerald-500/10">
                      Moving
                    </Badge>
                  </div>
                  <div className="text-[11px] text-slate-400 font-mono tracking-tight">
                    Coord: 12.9716° N, 77.5946° E
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-slate-400/80 border-t border-white/[0.05] pt-2 font-medium">
                    <span>Speed: 38 km/h</span>
                    <span>Accuracy: ±3.4m</span>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl border border-white/[0.06] bg-slate-900/60 hover:border-white/[0.1] transition-colors space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-100 tracking-tight">Unit EMP-102 (Alex Vance)</span>
                    <Badge variant="outline" className="text-[10px] text-cyan-300 border-cyan-500/30 bg-cyan-500/10">
                      Inside HQ Geofence
                    </Badge>
                  </div>
                  <div className="text-[11px] text-slate-400 font-mono tracking-tight">
                    Coord: 12.9750° N, 77.6010° E
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-slate-400/80 border-t border-white/[0.05] pt-2 font-medium">
                    <span>Speed: 0 km/h</span>
                    <span>Status: Checked In</span>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl border border-rose-500/30 bg-rose-950/25 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-rose-200 tracking-tight">Threat Detected (EMP-104)</span>
                    <Badge variant="destructive" className="text-[10px]">
                      BLOCKED
                    </Badge>
                  </div>
                  <p className="text-[11px] text-rose-200/90 leading-relaxed font-normal">
                    Mock GPS provider attempt blocked. Security incident logged to audit trail.
                  </p>
                </div>
              </div>

              {/* Central Map Simulation Graphic */}
              <div className="md:col-span-2 relative min-h-[260px] rounded-xl border border-white/[0.06] bg-slate-900/40 overflow-hidden flex flex-col items-center justify-center p-6 text-center">
                {/* Visual Radar grid representation */}
                <div className="absolute inset-0 bg-[radial-gradient(#38bdf8_1px,transparent_1px)] [background-size:24px_24px] opacity-15" />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-transparent" />

                {/* Pulsing center radar node */}
                <div className="relative z-10 flex flex-col items-center">
                  <div className="relative flex items-center justify-center">
                    <div className="w-20 h-20 rounded-full border border-indigo-500/25 animate-ping absolute" />
                    <div className="w-28 h-28 rounded-full border border-cyan-500/15 absolute" />
                    <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-indigo-600 to-cyan-500 flex items-center justify-center text-white shadow-lg shadow-cyan-500/25">
                      <Compass className="h-6 w-6 animate-pulse" />
                    </div>
                  </div>
                  <div className="mt-4 font-mono text-xs font-medium text-indigo-300 tracking-tight">
                    Live Dispatch Map Feed &bull; 100% Signal Integrity
                  </div>
                  <p className="text-xs text-slate-300/80 mt-1 max-w-sm leading-relaxed">
                    Interactive multi-worker telemetry visualizer with route history and geofence overlays.
                  </p>
                  <Link href="/dashboard" className="mt-4">
                    <Button size="sm" variant="secondary" className="h-8 gap-1.5 text-xs bg-slate-800/80 hover:bg-slate-700 text-slate-100 border border-white/[0.06]">
                      Enter Live Telemetry Console <ExternalLink className="h-3 w-3" />
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          </motion.div>
        </section>

        {/* METRICS STRIP */}
        <section className="border-y border-white/[0.06] bg-slate-950/60 backdrop-blur-sm py-10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5 }}
                className="space-y-1"
              >
                <div className="font-display text-3xl sm:text-4xl font-bold text-white tracking-tight">
                  99.98%
                </div>
                <div className="text-xs text-slate-400 font-medium tracking-tight">GPS Signal Reliability</div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: 0.1 }}
                className="space-y-1"
              >
                <div className="font-display text-3xl sm:text-4xl font-bold text-cyan-300 tracking-tight">
                  &lt;150ms
                </div>
                <div className="text-xs text-slate-400 font-medium tracking-tight">Live Telemetry Latency</div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: 0.2 }}
                className="space-y-1"
              >
                <div className="font-display text-3xl sm:text-4xl font-bold text-rose-300 tracking-tight">
                  100%
                </div>
                <div className="text-xs text-slate-400 font-medium tracking-tight">Mock Location Interception</div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: 0.3 }}
                className="space-y-1"
              >
                <div className="font-display text-3xl sm:text-4xl font-bold text-emerald-300 tracking-tight">
                  Zero Loss
                </div>
                <div className="text-xs text-slate-400 font-medium tracking-tight">Offline Room Queue</div>
              </motion.div>
            </div>
          </div>
        </section>

        {/* SCROLL-ANIMATED FEATURES SECTION */}
        <section id="features" className="py-24 lg:py-32 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
            >
              <Badge variant="outline" className="text-xs px-3 py-1 border-indigo-500/30 text-indigo-300 bg-indigo-500/10 mb-3 font-medium tracking-wide">
                Capabilities
              </Badge>
              <h2 className="font-display text-3xl sm:text-4xl lg:text-[2.75rem] font-bold text-white tracking-[-0.03em] leading-[1.15]">
                Architected for Extreme Field Precision
              </h2>
              <p className="mt-4 text-base sm:text-[1.0625rem] text-slate-300/85 leading-relaxed max-w-2xl mx-auto font-normal">
                Standard tracking applications fail in deep rural areas or when employees spoof GPS.
                FieldTrack provides enterprise cryptographic validation for every coordinate point.
              </p>
            </motion.div>
          </div>

          {/* Staggered Feature Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {FEATURES.map((feature, idx) => {
              const Icon = feature.icon;
              return (
                <motion.div
                  key={feature.title}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: '-50px' }}
                  transition={{ duration: 0.6, delay: idx * 0.08, ease: 'easeOut' }}
                  whileHover={{ y: -4, transition: { duration: 0.2 } }}
                  className="group relative rounded-2xl border border-white/[0.08] bg-slate-900/50 p-6 sm:p-7 backdrop-blur-md hover:border-indigo-500/35 hover:bg-slate-900/70 shadow-[0_4px_20px_-2px_rgba(0,0,0,0.35)] hover:shadow-[0_12px_32px_-4px_rgba(15,23,42,0.6)] transition-all duration-300 flex flex-col justify-between overflow-hidden"
                >
                  {/* Subtle top edge specular highlight */}
                  <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/[0.12] to-transparent pointer-events-none" />

                  {/* Subtle inner card glow on hover */}
                  <div className="absolute inset-0 rounded-2xl bg-gradient-to-b from-indigo-500/[0.04] via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />

                  <div>
                    {/* Icon header */}
                    <div className="flex items-center justify-between mb-5">
                      <div className={`flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br ${feature.color} text-white shadow-md shadow-black/20`}>
                        <Icon className="h-5 w-5" />
                      </div>
                      <span className="text-[11px] font-mono font-medium text-slate-300/90 border border-white/[0.08] px-2.5 py-0.5 rounded-full bg-slate-950/60 backdrop-blur-xs">
                        {feature.metrics}
                      </span>
                    </div>

                    <div className="text-[11px] font-semibold tracking-wider text-indigo-400 uppercase font-mono mb-1.5">
                      {feature.subtitle}
                    </div>
                    <h3 className="font-display text-lg sm:text-xl font-semibold tracking-[-0.02em] text-white group-hover:text-indigo-100 transition-colors">
                      {feature.title}
                    </h3>
                    <p className="mt-2.5 text-sm text-slate-300/85 leading-[1.65] font-normal">
                      {feature.description}
                    </p>
                  </div>

                  <div className="mt-6 pt-4 border-t border-white/[0.06] flex items-center justify-between text-xs text-slate-400 font-medium group-hover:text-slate-200 transition-colors">
                    <span>Learn technical specs</span>
                    <ChevronRight className="h-3.5 w-3.5 transform group-hover:translate-x-1 transition-transform text-indigo-400" />
                  </div>
                </motion.div>
              );
            })}
          </div>
        </section>

        {/* WORKFLOW / ARCHITECTURE SECTION */}
        <section id="architecture" className="py-24 border-t border-white/[0.06] bg-slate-950/50 backdrop-blur-xs">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-3xl mx-auto mb-16">
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5 }}
              >
                <Badge variant="outline" className="text-xs px-3 py-1 border-cyan-500/30 text-cyan-300 bg-cyan-500/10 mb-3 font-medium tracking-wide">
                  Data Pipeline
                </Badge>
                <h2 className="font-display text-3xl sm:text-4xl lg:text-[2.5rem] font-bold text-white tracking-[-0.03em] leading-tight">
                  How FieldTrack Secures Every GPS Coordinate
                </h2>
                <p className="mt-3 text-base text-slate-300/85 max-w-2xl mx-auto leading-relaxed font-normal">
                  From mobile hardware sensor capture to the administrator dashboard in four resilient stages.
                </p>
              </motion.div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {WORKFLOW_STEPS.map((step, idx) => {
                const StepIcon = step.icon;
                return (
                  <motion.div
                    key={step.step}
                    initial={{ opacity: 0, y: 25 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.6, delay: idx * 0.1 }}
                    className="group relative p-6 rounded-2xl border border-white/[0.08] bg-slate-900/50 backdrop-blur-md hover:border-slate-700/80 transition-all duration-300 space-y-4 shadow-[0_4px_20px_-2px_rgba(0,0,0,0.3)] overflow-hidden"
                  >
                    <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/[0.1] to-transparent pointer-events-none" />

                    <div className="flex items-center justify-between">
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-500/10 border border-indigo-500/25 text-indigo-300 font-mono text-xs font-semibold">
                        {step.step}
                      </div>
                      <StepIcon className="h-5 w-5 text-slate-400 group-hover:text-slate-300 transition-colors" />
                    </div>

                    <h4 className="font-display text-base font-semibold text-white tracking-[-0.015em] leading-snug">
                      {step.title}
                    </h4>

                    <p className="text-xs text-slate-300/85 leading-relaxed font-normal">
                      {step.desc}
                    </p>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </section>

        {/* SECURITY SPOTLIGHT SECTION */}
        <section id="security" className="py-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="rounded-3xl border border-white/[0.08] bg-slate-900/60 p-8 sm:p-12 lg:p-16 relative overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.5)] backdrop-blur-md">
            {/* Top specular highlight */}
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/[0.15] to-transparent pointer-events-none" />

            {/* Restrained subtle accent glow without heavy blur smear */}
            <div className="absolute top-0 right-0 -mr-16 -mt-16 w-72 h-72 bg-gradient-to-bl from-rose-500/10 via-rose-500/5 to-transparent rounded-full pointer-events-none" />

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center relative z-10">
              <div>
                <Badge variant="outline" className="text-xs px-3 py-1 border-rose-500/30 text-rose-300 bg-rose-500/10 mb-4 font-medium tracking-wide">
                  Security Deep Dive
                </Badge>
                <h3 className="font-display text-3xl sm:text-4xl lg:text-[2.5rem] font-bold text-white tracking-[-0.03em] leading-tight">
                  Defeating Mock Location & Fake GPS Applications
                </h3>
                <p className="mt-4 text-slate-300/90 text-sm sm:text-base leading-relaxed font-normal">
                  Employees routinely use mock GPS apps like FakeGPS, GPS JoyStick, or developer mock providers to claim false attendance. FieldTrack’s Android engine operates beneath standard user-space APIs:
                </p>

                <div className="mt-6 space-y-3.5 text-xs sm:text-sm text-slate-300/90">
                  <div className="flex items-start gap-2.5">
                    <CheckCircle2 className="h-5 w-5 text-rose-400 shrink-0 mt-0.5" />
                    <span><strong className="text-white font-medium">FusedLocationProvider Mock Flag:</strong> Direct inspection of `location.isFromMockProvider()` at byte level.</span>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <CheckCircle2 className="h-5 w-5 text-rose-400 shrink-0 mt-0.5" />
                    <span><strong className="text-white font-medium">Kinematic Velocity Check:</strong> Flags impossible speed (&gt;150 km/h) teleports between subsequent coordinates.</span>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <CheckCircle2 className="h-5 w-5 text-rose-400 shrink-0 mt-0.5" />
                    <span><strong className="text-white font-medium">Secure Android Attestation:</strong> Verifies device integrity, root detection (Magisk/KernelSU), and app signatures.</span>
                  </div>
                </div>

                <div className="mt-8 flex gap-3">
                  <Link href="/dashboard">
                    <Button className="bg-rose-600 hover:bg-rose-500 text-white font-medium text-xs h-10 px-5 gap-1.5 shadow-lg shadow-rose-600/20">
                      Explore Fraud Alert Dashboard <ArrowRight className="h-3.5 w-3.5" />
                    </Button>
                  </Link>
                </div>
              </div>

              {/* Graphic Card — Consistent solid dark surface with clear contrast */}
              <div className="p-6 rounded-2xl border border-white/[0.08] bg-slate-950/80 shadow-xl space-y-4 relative overflow-hidden">
                <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
                  <div className="flex items-center gap-2">
                    <ShieldAlert className="h-5 w-5 text-rose-400" />
                    <span className="text-sm font-semibold text-white tracking-tight">Live Threat Interception Log</span>
                  </div>
                  <Badge variant="destructive" className="text-[10px]">Active Shield</Badge>
                </div>

                <div className="space-y-2 text-xs font-mono">
                  <div className="p-3.5 rounded-xl bg-slate-900/70 border border-white/[0.06] hover:border-white/[0.1] transition-colors flex items-center justify-between">
                    <div>
                      <div className="text-slate-100 font-medium">com.lexa.fakegps</div>
                      <div className="text-[10px] text-slate-400 mt-0.5">Mock Provider ProviderHook</div>
                    </div>
                    <span className="text-rose-300 font-bold px-2 py-0.5 rounded bg-rose-500/10 border border-rose-500/20">REJECTED</span>
                  </div>

                  <div className="p-3.5 rounded-xl bg-slate-900/70 border border-white/[0.06] hover:border-white/[0.1] transition-colors flex items-center justify-between">
                    <div>
                      <div className="text-slate-100 font-medium">Velocity Teleport (340 km/h)</div>
                      <div className="text-[10px] text-slate-400 mt-0.5">Coordinate Jump Delta 42km</div>
                    </div>
                    <span className="text-rose-300 font-bold px-2 py-0.5 rounded bg-rose-500/10 border border-rose-500/20">BLOCKED</span>
                  </div>

                  <div className="p-3.5 rounded-xl bg-slate-900/70 border border-white/[0.06] hover:border-white/[0.1] transition-colors flex items-center justify-between">
                    <div>
                      <div className="text-slate-100 font-medium">Root / Magisk Hide Active</div>
                      <div className="text-[10px] text-slate-400 mt-0.5">Su Binary Detected in /sbin</div>
                    </div>
                    <span className="text-amber-300 font-bold px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/20">FLAGGED</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* BOTTOM FINAL CALL TO ACTION */}
        <section className="py-20 lg:py-28 text-center px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="rounded-3xl border border-white/[0.1] bg-gradient-to-b from-indigo-950/50 via-slate-900/75 to-slate-950/90 p-10 sm:p-16 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.7)] backdrop-blur-md relative overflow-hidden"
          >
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-indigo-400/30 to-transparent pointer-events-none" />
            <div className="absolute inset-0 bg-radial-gradient from-indigo-500/10 via-transparent to-transparent pointer-events-none" />

            <h2 className="font-display text-3xl sm:text-5xl font-bold text-white tracking-[-0.03em] leading-tight">
              Ready to Upgrade Your Field Operations?
            </h2>
            <p className="mt-4 text-base sm:text-lg text-slate-300/90 max-w-2xl mx-auto leading-relaxed font-normal">
              Empower your supervisors with real-time visibility, automated shift tracking,
              and tamper-proof security in minutes.
            </p>

            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link href="/dashboard" className="w-full sm:w-auto">
                <Button
                  size="lg"
                  className="w-full sm:w-auto h-12 px-8 bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-sm rounded-xl shadow-xl shadow-indigo-600/30 gap-2"
                >
                  Enter FieldTrack Dashboard
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link href="/login" className="w-full sm:w-auto">
                <Button
                  size="lg"
                  variant="outline"
                  className="w-full sm:w-auto h-12 px-8 border border-slate-700/80 bg-slate-900/60 hover:bg-slate-800 text-slate-200 font-medium text-sm rounded-xl"
                >
                  Sign In to Admin Portal
                </Button>
              </Link>
            </div>
          </motion.div>
        </section>
      </main>

      {/* FOOTER */}
      <footer className="border-t border-slate-800/80 bg-slate-950/90 py-12 px-4 sm:px-6 lg:px-8 text-xs text-slate-400">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2.5">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-600 text-white shadow-md">
              <ShieldCheck className="h-4 w-4" />
            </div>
            <span className="font-bold text-sm text-white font-mono">FieldTrack</span>
            <span className="text-slate-500 ml-2">&copy; {new Date().getFullYear()} FieldTrack Inc. All rights reserved.</span>
          </div>

          <div className="flex items-center gap-6">
            <Link href="/login" className="hover:text-white transition-colors">
              Admin Login
            </Link>
            <Link href="/dashboard" className="hover:text-white transition-colors">
              Dashboard
            </Link>
            <span className="text-slate-600">|</span>
            <span className="flex items-center gap-1.5 text-emerald-400 font-mono text-[11px]">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
              All Systems Operational
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}
