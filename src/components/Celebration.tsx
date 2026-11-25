import React, { useEffect, useRef } from 'react';

const COLORS = ['#f8d77d', '#e2574c', '#3fb6c6', '#f4f0e0', '#f59e42', '#7fd18b', '#c97be0'];

type Bit = { x: number; y: number; vx: number; vy: number; life: number; max: number; color: string; size: number; kind: 'spark' | 'paper' | 'rocket'; spin: number; rot: number };

/** Fireworks bursting over the screen with confetti drifting down. Drawn on one canvas; does nothing when off screen. */
export const Celebration: React.FC = () => {
  const ref = useRef<HTMLCanvasElement | null>(null);
  useEffect(() => {
    const cv = ref.current;
    if (!cv) return;
    const ctx = cv.getContext('2d');
    if (!ctx) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    let W = 0, H = 0;
    const size = () => { W = cv.clientWidth; H = cv.clientHeight; cv.width = W * dpr; cv.height = H * dpr; };
    size();
    window.addEventListener('resize', size);
    const bits: Bit[] = [];
    const pick = () => COLORS[Math.floor(Math.random() * COLORS.length)];
    const burst = (x: number, y: number) => {
      const color = pick(), second = pick(), n = 46 + Math.floor(Math.random() * 20);
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2 + Math.random() * 0.2, sp = 90 + Math.random() * 150;
        bits.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 0, max: 1.1 + Math.random() * 0.7, color: i % 3 ? color : second, size: 2.4, kind: 'spark', spin: 0, rot: 0 });
      }
    };
    const rocket = () => bits.push({ x: W * (0.15 + Math.random() * 0.7), y: H, vx: (Math.random() - 0.5) * 50, vy: -(H * (0.75 + Math.random() * 0.35)), life: 0, max: 0.8 + Math.random() * 0.25, color: '#fff3cf', size: 2.5, kind: 'rocket', spin: 0, rot: 0 });
    const paper = (n: number, fromTop = true) => {
      for (let i = 0; i < n; i++) {
        bits.push({ x: Math.random() * W, y: fromTop ? -20 - Math.random() * H * 0.5 : Math.random() * H, vx: (Math.random() - 0.5) * 60, vy: 70 + Math.random() * 110, life: 0, max: 9, color: pick(), size: 5 + Math.random() * 5, kind: 'paper', spin: (Math.random() - 0.5) * 9, rot: Math.random() * 6 });
      }
    };
    paper(90);
    rocket(); rocket();
    let raf = 0, last = performance.now(), nextRocket = 0.35, nextPaper = 1.2;
    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      nextRocket -= dt; nextPaper -= dt;
      if (nextRocket <= 0) { rocket(); if (Math.random() < 0.35) rocket(); nextRocket = 0.5 + Math.random() * 0.7; }
      if (nextPaper <= 0) { paper(26); nextPaper = 1.1; }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, W, H);
      for (let i = bits.length - 1; i >= 0; i--) {
        const b = bits[i];
        b.life += dt;
        if (b.kind === 'spark') { b.vx *= 1 - 1.6 * dt; b.vy = b.vy * (1 - 1.6 * dt) + 90 * dt; }
        else if (b.kind === 'rocket') b.vy += 260 * dt;
        else { b.vx += Math.sin(b.life * 3 + b.rot) * 40 * dt; b.rot += b.spin * dt; }
        b.x += b.vx * dt; b.y += b.vy * dt;
        const done = b.life >= b.max || b.y > H + 30;
        if (done) { if (b.kind === 'rocket') burst(b.x, b.y); bits.splice(i, 1); continue; }
        if (b.kind === 'paper') {
          ctx.save(); ctx.translate(b.x, b.y); ctx.rotate(b.rot); ctx.scale(1, Math.cos(b.life * 5 + b.rot));
          ctx.fillStyle = b.color; ctx.fillRect(-b.size / 2, -b.size / 3, b.size, b.size * 0.66); ctx.restore();
        } else {
          ctx.globalAlpha = b.kind === 'spark' ? Math.max(0, 1 - b.life / b.max) : 0.9;
          ctx.fillStyle = b.color; ctx.shadowColor = b.color; ctx.shadowBlur = 8;
          ctx.beginPath(); ctx.arc(b.x, b.y, b.size, 0, Math.PI * 2); ctx.fill();
          ctx.shadowBlur = 0; ctx.globalAlpha = 1;
        }
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', size); };
  }, []);
  return <canvas ref={ref} className="absolute inset-0 w-full h-full pointer-events-none" />;
};
