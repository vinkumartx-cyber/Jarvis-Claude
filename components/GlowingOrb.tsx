'use client';

import { useEffect, useRef, useState } from 'react';

type OrbState = 'idle' | 'listening' | 'processing' | 'speaking';

interface GlowingOrbProps {
  state: OrbState;
  onClick?: () => void;
  size?: number;
}

export function GlowingOrb({ state, onClick, size = 120 }: GlowingOrbProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const timeRef = useRef<number>(0);

  const stateConfig = {
    idle: {
      core: ['#1e40af', '#3b82f6', '#60a5fa'],
      glow: 'rgba(59,130,246,0.35)',
      ring: 'rgba(96,165,250,0.2)',
      label: 'Ready',
      labelColor: 'text-blue-400',
    },
    listening: {
      core: ['#0e7490', '#06b6d4', '#67e8f9'],
      glow: 'rgba(6,182,212,0.55)',
      ring: 'rgba(103,232,249,0.3)',
      label: 'Listening...',
      labelColor: 'text-cyan-400',
    },
    processing: {
      core: ['#92400e', '#f59e0b', '#fcd34d'],
      glow: 'rgba(245,158,11,0.5)',
      ring: 'rgba(252,211,77,0.25)',
      label: 'Thinking...',
      labelColor: 'text-amber-400',
    },
    speaking: {
      core: ['#5b21b6', '#8b5cf6', '#c4b5fd'],
      glow: 'rgba(139,92,246,0.55)',
      ring: 'rgba(196,181,253,0.3)',
      label: 'Speaking...',
      labelColor: 'text-violet-400',
    },
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const dpr = window.devicePixelRatio || 1;
    const s = size * dpr;
    canvas.width = s;
    canvas.height = s;
    canvas.style.width = `${size}px`;
    canvas.style.height = `${size}px`;

    const cx = s / 2;
    const cy = s / 2;
    const r = (s / 2) * 0.38;

    const draw = (ts: number) => {
      const dt = ts - timeRef.current;
      timeRef.current = ts;
      const t = ts / 1000;

      ctx.clearRect(0, 0, s, s);
      const cfg = stateConfig[state];

      // Outer pulse rings
      const numRings = state === 'listening' ? 3 : state === 'speaking' ? 4 : 2;
      for (let i = 0; i < numRings; i++) {
        const phase = (t * (state === 'listening' ? 1.4 : state === 'speaking' ? 1.8 : 0.7) + i * (1 / numRings)) % 1;
        const rr = r * (1.3 + phase * (state === 'speaking' ? 2.2 : 1.6));
        const alpha = (1 - phase) * (state === 'idle' ? 0.18 : 0.32);
        ctx.beginPath();
        ctx.arc(cx, cy, rr, 0, Math.PI * 2);
        ctx.strokeStyle = cfg.ring.replace('0.3)', `${alpha})`).replace('0.2)', `${alpha})`);
        ctx.lineWidth = dpr * 1.5;
        ctx.stroke();
      }

      // Glow backdrop
      const glowR = r * (1 + Math.sin(t * (state === 'idle' ? 0.8 : 2)) * 0.08 + 0.15);
      const grd = ctx.createRadialGradient(cx, cy, r * 0.1, cx, cy, glowR * 1.5);
      grd.addColorStop(0, cfg.glow);
      grd.addColorStop(1, 'transparent');
      ctx.beginPath();
      ctx.arc(cx, cy, glowR * 1.5, 0, Math.PI * 2);
      ctx.fillStyle = grd;
      ctx.fill();

      // Core orb
      const coreR = r * (1 + Math.sin(t * (state === 'idle' ? 0.6 : 2.5)) * 0.04);
      const corGrd = ctx.createRadialGradient(cx - r * 0.2, cy - r * 0.25, r * 0.05, cx, cy, coreR);
      corGrd.addColorStop(0, cfg.core[2]);
      corGrd.addColorStop(0.45, cfg.core[1]);
      corGrd.addColorStop(1, cfg.core[0]);
      ctx.beginPath();
      ctx.arc(cx, cy, coreR, 0, Math.PI * 2);
      ctx.fillStyle = corGrd;
      ctx.fill();

      // Processing spinner arc
      if (state === 'processing') {
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(t * 3.5);
        ctx.beginPath();
        ctx.arc(0, 0, r * 1.2, 0, Math.PI * 1.4);
        ctx.strokeStyle = '#fcd34d';
        ctx.lineWidth = dpr * 3;
        ctx.lineCap = 'round';
        ctx.stroke();
        ctx.restore();
      }

      // Speaking waveform rings
      if (state === 'speaking') {
        for (let i = 0; i < 36; i++) {
          const angle = (i / 36) * Math.PI * 2;
          const wave = Math.sin(t * 8 + i * 0.7) * r * 0.15;
          const x1 = cx + Math.cos(angle) * (r * 1.05);
          const y1 = cy + Math.sin(angle) * (r * 1.05);
          const x2 = cx + Math.cos(angle) * (r * 1.05 + wave + r * 0.1);
          const y2 = cy + Math.sin(angle) * (r * 1.05 + wave + r * 0.1);
          ctx.beginPath();
          ctx.moveTo(x1, y1);
          ctx.lineTo(x2, y2);
          ctx.strokeStyle = `rgba(196,181,253,${0.4 + Math.abs(Math.sin(t * 8 + i * 0.7)) * 0.5})`;
          ctx.lineWidth = dpr * 1.5;
          ctx.stroke();
        }
      }

      // Listening ripple dots
      if (state === 'listening') {
        for (let i = 0; i < 8; i++) {
          const angle = (i / 8) * Math.PI * 2 + t * 1.2;
          const rr = r * (1.15 + Math.sin(t * 3 + i) * 0.06);
          const x = cx + Math.cos(angle) * rr;
          const y = cy + Math.sin(angle) * rr;
          ctx.beginPath();
          ctx.arc(x, y, dpr * 2.5, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(103,232,249,${0.5 + Math.sin(t * 4 + i) * 0.3})`;
          ctx.fill();
        }
      }

      // Specular highlight
      const hlGrd = ctx.createRadialGradient(cx - r * 0.28, cy - r * 0.32, 0, cx - r * 0.15, cy - r * 0.2, r * 0.45);
      hlGrd.addColorStop(0, 'rgba(255,255,255,0.38)');
      hlGrd.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.beginPath();
      ctx.arc(cx, cy, coreR, 0, Math.PI * 2);
      ctx.fillStyle = hlGrd;
      ctx.fill();

      animRef.current = requestAnimationFrame(draw);
    };

    animRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(animRef.current);
  }, [state, size]);

  const cfg = stateConfig[state];

  return (
    <div className="flex flex-col items-center gap-3 select-none">
      <button
        onClick={onClick}
        className="relative focus:outline-none group"
        title={state === 'idle' ? 'Click to talk' : cfg.label}
      >
        <canvas ref={canvasRef} className="cursor-pointer transition-transform duration-200 group-hover:scale-105 group-active:scale-95" />
      </button>
      <span className={`text-xs font-medium tracking-widest uppercase ${cfg.labelColor} opacity-80`}>
        {cfg.label}
      </span>
    </div>
  );
}
