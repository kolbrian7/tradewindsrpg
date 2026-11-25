import React, { useEffect, useRef, useState } from 'react';
import { AnimatedMarker } from './AnimatedMarker';

// A port drawn as separate layers (sky and sea, hills, town, foreground piers).
// Swiping moves the near layers faster than the far ones, which gives the scene depth.

interface Layer {
  src: string;
  w: number;      // image size in pixels
  h: number;
  height: number; // drawn height, as a share of the scene height
  base: number;   // where its bottom edge sits, as a share of the scene height from the top
  speed: number;  // 0 = never moves, 1 = moves with your finger
  shift?: number; // slides the whole layer sideways (share of its width) so the right buildings open in view
}

interface Hotspot {
  id: string;     // building id: mkt, ship, bar
  layer: string;
  x: number;      // position inside the layer image, 0..1
  y: number;
}

interface Scene {
  horizon: number; // where the sea meets the sky, as a share of the scene height
  skySrc: string;
  skyHorizon: number; // where the horizon sits inside the sky image, 0..1
  skyAspect: number;  // sky image width divided by height
  layers: Record<string, Layer>;
  order: string[];  // back to front
  hotspots: Hotspot[];
  quay: number;     // where the player's ship floats, as a share of the scene height
  quayX: number;    // where along the near dock it is moored, 0..1
}

const dir = (port: string) => `/assets/parallax/${port}`;

export const PARALLAX_SCENES: Record<string, Scene> = {
  sardinia: {
    horizon: 0.47,
    skySrc: `${dir('sardinia')}/sky.webp`,
    skyHorizon: 0.47,
    skyAspect: 1376 / 981,
    order: ['hills', 'town', 'fg'],
    layers: {
      hills: { src: `${dir('sardinia')}/hills.webp`, w: 1374, h: 600, height: 0.42, base: 0.6,  speed: 0.25 },
      town:  { src: `${dir('sardinia')}/town.webp`,  w: 2750, h: 634, height: 0.27, base: 0.71, speed: 0.55 },
      fg:    { src: `${dir('sardinia')}/fg.webp`,    w: 2778, h: 421, height: 0.21, base: 1.025,  speed: 1 },
    },
    hotspots: [
      { id: 'ship', layer: 'town', x: 0.36, y: 0.24 },
      { id: 'bar', layer: 'town', x: 0.655, y: 0.3 },
      { id: 'mkt', layer: 'fg', x: 0.215, y: 0.04 },
    ],
    quay: 0.805,
    quayX: 0.5,
  },
  athens: {
    horizon: 0.47,
    skySrc: `${dir('sardinia')}/sky.webp`,
    skyHorizon: 0.47,
    skyAspect: 1376 / 981,
    order: ['hills', 'town', 'fg'],
    layers: {
      hills: { src: `${dir('athens')}/hills.webp`, w: 1374, h: 600, height: 0.42, base: 0.6, speed: 0.25 },
      town:  { src: `${dir('athens')}/town.webp`,  w: 2750, h: 582, height: 0.248, base: 0.71, speed: 0.55 },
      fg:    { src: `${dir('athens')}/fg.webp`,    w: 2404, h: 497, height: 0.248, base: 1.063, speed: 1 },
    },
    hotspots: [
      { id: 'ship', layer: 'town', x: 0.235, y: 0.467 },
      { id: 'bar', layer: 'town', x: 0.63, y: 0.714 },
      { id: 'mkt', layer: 'fg', x: 0.244, y: 0.04 },
    ],
    quay: 0.805,
    quayX: 0.5,
  },
  rome: {
    horizon: 0.47,
    skySrc: `${dir('sardinia')}/sky.webp`,
    skyHorizon: 0.47,
    skyAspect: 1376 / 981,
    order: ['hills', 'town', 'fg'],
    layers: {
      hills: { src: `${dir('rome')}/hills.webp`, w: 1374, h: 600, height: 0.42, base: 0.6, speed: 0.25, shift: -0.08 },
      town:  { src: `${dir('rome')}/town.webp`,  w: 2750, h: 753, height: 0.32, base: 0.71, speed: 0.55 },
      fg:    { src: `${dir('rome')}/fg.webp`,    w: 2192, h: 448, height: 0.224, base: 1.039, speed: 1 },
    },
    hotspots: [
      { id: 'ship', layer: 'town', x: 0.42, y: 0.292 },
      { id: 'bar', layer: 'town', x: 0.68, y: 0.558 },
      { id: 'mkt', layer: 'fg', x: 0.191, y: 0.04 },
    ],
    quay: 0.805,
    quayX: 0.5,
  },
  venice: {
    horizon: 0.47,
    skySrc: `${dir('sardinia')}/sky.webp`,
    skyHorizon: 0.47,
    skyAspect: 1376 / 981,
    order: ['hills', 'town', 'fg'],
    layers: {
      hills: { src: `${dir('venice')}/hills.webp`, w: 1374, h: 600, height: 0.42, base: 0.6, speed: 0.25 },
      town:  { src: `${dir('venice')}/town.webp`,  w: 2750, h: 698, height: 0.297, base: 0.71, speed: 0.55, shift: 0.05 },
      fg:    { src: `${dir('venice')}/fg.webp`,    w: 2512, h: 492, height: 0.245, base: 1.06, speed: 1 },
    },
    hotspots: [
      { id: 'ship', layer: 'town', x: 0.375, y: 0.37 },
      { id: 'bar', layer: 'town', x: 0.53, y: 0.6 },
      { id: 'mkt', layer: 'fg', x: 0.183, y: 0.04 },
    ],
    quay: 0.805,
    quayX: 0.5,
  },
  crete: {
    horizon: 0.47,
    skySrc: `${dir('sardinia')}/sky.webp`,
    skyHorizon: 0.47,
    skyAspect: 1376 / 981,
    order: ['hills', 'town', 'fg'],
    layers: {
      hills: { src: `${dir('crete')}/hills.webp`, w: 1374, h: 600, height: 0.42, base: 0.6, speed: 0.25, shift: -0.15 },
      town:  { src: `${dir('crete')}/town.webp`,  w: 2750, h: 641, height: 0.273, base: 0.71, speed: 0.55 },
      fg:    { src: `${dir('crete')}/fg.webp`,    w: 2502, h: 537, height: 0.268, base: 1.083, speed: 1 },
    },
    hotspots: [
      { id: 'ship', layer: 'town', x: 0.4, y: 0.34 },
      { id: 'bar', layer: 'town', x: 0.64, y: 0.7 },
      { id: 'mkt', layer: 'fg', x: 0.187, y: 0.04 },
    ],
    quay: 0.805,
    quayX: 0.5,
  },
  barcelona: {
    horizon: 0.47,
    skySrc: `${dir('sardinia')}/sky.webp`,
    skyHorizon: 0.47,
    skyAspect: 1376 / 981,
    order: ['hills', 'town', 'fg'],
    layers: {
      hills: { src: `${dir('barcelona')}/hills.webp`, w: 1374, h: 600, height: 0.42, base: 0.6, speed: 0.25 },
      town:  { src: `${dir('barcelona')}/town.webp`,  w: 2750, h: 674, height: 0.287, base: 0.71, speed: 0.55 },
      fg:    { src: `${dir('barcelona')}/fg.webp`,    w: 2404, h: 474, height: 0.236, base: 1.051, speed: 1 },
    },
    hotspots: [
      { id: 'ship', layer: 'town', x: 0.82, y: 0.41 },
      { id: 'bar', layer: 'town', x: 0.39, y: 0.63 },
      { id: 'mkt', layer: 'fg', x: 0.184, y: 0.04 },
    ],
    quay: 0.805,
    quayX: 0.5,
  },
  tunisia: {
    horizon: 0.47,
    skySrc: `${dir('sardinia')}/sky.webp`,
    skyHorizon: 0.47,
    skyAspect: 1376 / 981,
    order: ['hills', 'town', 'fg'],
    layers: {
      hills: { src: `${dir('tunisia')}/hills.webp`, w: 1374, h: 600, height: 0.42, base: 0.6, speed: 0.25 },
      town:  { src: `${dir('tunisia')}/town.webp`,  w: 2750, h: 644, height: 0.274, base: 0.71, speed: 0.55 },
      fg:    { src: `${dir('tunisia')}/fg.webp`,    w: 2596, h: 478, height: 0.238, base: 1.053, speed: 1 },
    },
    hotspots: [
      { id: 'ship', layer: 'town', x: 0.42, y: 0.32 },
      { id: 'bar', layer: 'town', x: 0.63, y: 0.63 },
      { id: 'mkt', layer: 'fg', x: 0.188, y: 0.04 },
    ],
    quay: 0.805,
    quayX: 0.5,
  },
  egypt: {
    horizon: 0.47,
    skySrc: `${dir('sardinia')}/sky.webp`,
    skyHorizon: 0.47,
    skyAspect: 1376 / 981,
    order: ['hills', 'town', 'fg'],
    layers: {
      hills: { src: `${dir('egypt')}/hills.webp`, w: 1374, h: 600, height: 0.42, base: 0.6, speed: 0.25 },
      town:  { src: `${dir('egypt')}/town.webp`,  w: 2750, h: 627, height: 0.267, base: 0.71, speed: 0.55, shift: 0.06 },
      fg:    { src: `${dir('egypt')}/fg.webp`,    w: 2332, h: 464, height: 0.231, base: 1.046, speed: 1 },
    },
    hotspots: [
      { id: 'ship', layer: 'town', x: 0.56, y: 0.37 },
      { id: 'bar', layer: 'town', x: 0.3, y: 0.64 },
      { id: 'mkt', layer: 'fg', x: 0.205, y: 0.04 },
    ],
    quay: 0.805,
    quayX: 0.5,
  },
  nice: {
    horizon: 0.47,
    skySrc: `${dir('sardinia')}/sky.webp`,
    skyHorizon: 0.47,
    skyAspect: 1376 / 981,
    order: ['hills', 'town', 'fg'],
    layers: {
      hills: { src: `${dir('nice')}/hills.webp`, w: 1374, h: 600, height: 0.42, base: 0.6, speed: 0.25 },
      town:  { src: `${dir('nice')}/town.webp`,  w: 2750, h: 678, height: 0.288, base: 0.71, speed: 0.55 },
      fg:    { src: `${dir('nice')}/fg.webp`,    w: 2522, h: 532, height: 0.265, base: 1.08, speed: 1 },
    },
    hotspots: [
      { id: 'ship', layer: 'town', x: 0.335, y: 0.58 },
      { id: 'bar', layer: 'town', x: 0.655, y: 0.6 },
      { id: 'mkt', layer: 'fg', x: 0.196, y: 0.04 },
    ],
    quay: 0.805,
    quayX: 0.5,
  },
};

interface ParallaxPortProps {
  portId: string;
  labels: Record<string, string>; // building id -> label
  ship: React.ReactNode;          // the player's ship
  shipLabel: string;
  onOpen: (buildingId: string) => void;
}

const CLOUDS = [
  { top: 5, size: 150, seconds: 95, delay: -10, opacity: 0.85 },
  { top: 14, size: 105, seconds: 130, delay: -70, opacity: 0.7 },
  { top: 2, size: 80, seconds: 160, delay: -120, opacity: 0.6 },
  { top: 20, size: 125, seconds: 110, delay: -45, opacity: 0.75 },
];

// Glints of sunlight on the sea, as shares of the area below the horizon
const GLINTS = Array.from({ length: 16 }, (_, i) => ({
  x: (i * 37) % 100,
  y: 4 + ((i * 53) % 92),
  w: 26 + ((i * 29) % 50),
  seconds: 3.5 + ((i * 7) % 5),
  delay: -((i * 13) % 9),
}));

// Gulls are far off over the hills, so they are small, and the further ones are smaller and slower.
const GULLS = [
  { top: 14, seconds: 40, delay: -6, scale: 0.5 },
  { top: 20, seconds: 58, delay: -27, scale: 0.34 },
  { top: 17, seconds: 70, delay: -48, scale: 0.26 },
];

/** Every picture a port's layered view needs. */
const sceneImages = (id: string): string[] => {
  const sc = PARALLAX_SCENES[id];
  return sc ? [sc.skySrc, ...sc.order.map(k => sc.layers[k].src)] : [];
};
// Ahead of time the pictures are only downloaded (cheap, off the main thread). Unpacking them is left to the
// moment a harbour is actually shown, because unpacking many big pictures at once makes the game stutter.
const fetched = new Map<string, Promise<void>>();
const fetchImage = (src: string) => {
  if (!fetched.has(src)) fetched.set(src, fetch(src).then(r => r.blob()).then(() => {}).catch(() => {}));
  return fetched.get(src)!;
};
/** Downloads a port's pictures ahead of time so they are already on the device when you arrive. */
export const preloadPort = (id: string) => Promise.all(sceneImages(id).map(fetchImage)).then(() => {});
/** Quietly downloads every port, one after another with a pause between, starting with the ones named first. */
export const preloadAllPorts = async (first: string[] = []) => {
  for (const id of first) await preloadPort(id);
  for (const id of Object.keys(PARALLAX_SCENES).filter(k => !first.includes(k))) {
    await new Promise(r => setTimeout(r, 1500));
    await preloadPort(id);
  }
};

export const ParallaxPort: React.FC<ParallaxPortProps> = ({ portId, labels, ship, shipLabel, onOpen }) => {
  const scene = PARALLAX_SCENES[portId];
  // The scene stays hidden until all of its pictures are in, then fades up whole instead of popping in piece by piece.
  const [ready, setReady] = useState(false);
  const stageRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    let live = true;
    setReady(false);
    // Wait for the pictures actually on screen to be fully unpacked, so nothing pops in after the fade.
    const imgs = Array.from(stageRef.current?.querySelectorAll('img') || []) as HTMLImageElement[];
    const settle = (im: HTMLImageElement) => new Promise<void>(done => {
      const go = () => (im.decode ? im.decode().catch(() => {}) : Promise.resolve()).then(() => done());
      if (im.complete) go(); else { im.addEventListener('load', go, { once: true }); im.addEventListener('error', () => done(), { once: true }); }
    });
    const limit = new Promise<void>(done => setTimeout(done, 4000));      // never leave the harbour blank on a bad connection
    Promise.race([Promise.all(imgs.map(settle)), limit]).then(() => { if (live) requestAnimationFrame(() => live && setReady(true)); });
    return () => { live = false; };
  }, [portId]);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const layerRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const [size, setSize] = useState({ w: 0, h: 0 });

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const measure = () => setSize({ w: el.clientWidth, h: el.clientHeight });
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const { w: V, h: H } = size;
  // A layer is sized from the screen height, but on a wide screen that can leave it narrower than the view,
  // so it is never allowed to be less than 1.12 screens wide.
  const widthOf = (l: Layer) => Math.max((l.w / l.h) * l.height * H, V * 1.12);
  // A layer's sideways shift is cut back when the layer has no width to spare for it.
  const shiftOf = (l: Layer) => {
    const s = l.shift || 0;
    const spare = Math.max(0, (1 - (V * 1.12) / widthOf(l)) / 2);
    return Math.sign(s) * Math.min(Math.abs(s), spare);
  };
  const heightOf = (l: Layer) => widthOf(l) * (l.h / l.w);
  // The nearest layer travels its full width; everything else moves a share of that.
  const travel = scene && H ? Math.max(0, widthOf(scene.layers.fg) - V) : 0;

  // Where the view opens: over the bare stretch of dock where the ship is moored
  const startAt = () => (scene ? Math.max(0, Math.min(travel, travel / 2 + (scene.quayX - 0.5) * widthOf(scene.layers.fg))) : 0);

  // Each layer sits centred when the view is centred, then slides by its own speed.
  // `at` is the eased scroll position: it glides after the real one, which is what makes swiping feel soft.
  const place = (at: number) => {
    const el = scrollRef.current;
    if (!el || !scene || !H) return;
    const fromCentre = at - travel / 2;
    const set = (key: string, speed: number, width: number, shift = 0) => {
      const node = layerRefs.current[key];
      // Never slide a layer further than it is wide, so its edge can't come into view.
      const most = travel > 0 ? Math.max(0, (width - V - 2 * Math.abs(shift) * width) / travel) : 0;
      const move = `translate3d(${V / 2 - width / 2 + shift * width - fromCentre * Math.min(speed, most)}px, 0, 0)`;
      if (node) node.style.transform = move;
      const buttons = layerRefs.current[`${key}:buttons`];
      if (buttons) buttons.style.transform = move;
    };
    scene.order.forEach(key => set(key, scene.layers[key].speed, widthOf(scene.layers[key]), shiftOf(scene.layers[key])));
    set('sky', 0.05, skyWidth);
    // The ship floats in the channel between the town and the near dock, so it slides at a speed between the two.
    const shipSpeed = (scene.layers.town.speed + 1) / 2;
    if (layerRefs.current.quay) layerRefs.current.quay.style.transform = `translate3d(${-(at - startAt()) * shipSpeed}px, 0, 0)`;
  };

  const skyHeight = scene ? (scene.horizon / scene.skyHorizon) * H : 0;
  const skyWidth = Math.max(V * 1.15, scene ? skyHeight * scene.skyAspect : 0);

  // Start on the ship, then keep the layers gliding after the scroll position.
  const shown = useRef(0);
  const glide = useRef(0); // sideways speed left over after a mouse drag, px per ms
  useEffect(() => {
    const el = scrollRef.current;
    if (!el || !H) return;
    el.scrollLeft = startAt();
    shown.current = el.scrollLeft;
    glide.current = 0;
    place(shown.current);
    let frame = 0;
    let last = performance.now();
    const tick = (now: number) => {
      const dt = Math.min(50, now - last);
      last = now;
      // A flicked mouse drag keeps coasting and slows down, like a finger swipe does on a phone.
      if (!drag.current && Math.abs(glide.current) > 0.02) {
        el.scrollLeft += glide.current * dt;
        glide.current *= Math.exp(-dt / 380);
        if (el.scrollLeft <= 0 || el.scrollLeft >= el.scrollWidth - el.clientWidth) glide.current = 0;
      }
      // Ease the picture toward where the scroll is, quickly at first and then settling.
      const gap = el.scrollLeft - shown.current;
      if (Math.abs(gap) > 0.05) {
        shown.current += gap * (1 - Math.exp(-dt / 110));
        place(shown.current);
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [V, H, portId]);

  // Mouse dragging for desktop; phones scroll natively with momentum.
  const drag = useRef<{ x: number; left: number; moved: boolean; lastX: number; lastT: number } | null>(null);
  const onMouseDown = (e: React.MouseEvent) => {
    glide.current = 0;
    if (scrollRef.current) drag.current = { x: e.pageX, left: scrollRef.current.scrollLeft, moved: false, lastX: e.pageX, lastT: performance.now() };
  };
  const onMouseMove = (e: React.MouseEvent) => {
    if (!drag.current || !scrollRef.current) return;
    if (Math.abs(e.pageX - drag.current.x) > 5) drag.current.moved = true;
    scrollRef.current.scrollLeft = drag.current.left - (e.pageX - drag.current.x);
    const now = performance.now();
    const dt = now - drag.current.lastT;
    if (dt > 0) {
      // running estimate of how fast the hand is moving
      glide.current = glide.current * 0.6 + (-(e.pageX - drag.current.lastX) / dt) * 0.4;
      drag.current.lastX = e.pageX;
      drag.current.lastT = now;
    }
  };
  const endDrag = () => {
    if (drag.current && performance.now() - drag.current.lastT > 90) glide.current = 0; // held still before letting go
    glide.current = Math.max(-3, Math.min(3, glide.current));
    const wasDrag = drag.current;
    setTimeout(() => { if (drag.current === wasDrag) drag.current = null; }, 0);
  };
  const open = (id: string) => {
    if (drag.current?.moved) return;
    onOpen(id);
  };

  // A mouse wheel only scrolls up and down, so turn it into sideways movement here.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      if (Math.abs(e.deltaY) <= Math.abs(e.deltaX)) return;
      e.preventDefault();
      glide.current = 0;
      el.scrollLeft += e.deltaY * 1.4;
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, []);

  const nudge = (by: number) => scrollRef.current?.scrollBy({ left: by, behavior: 'smooth' });

  if (!scene) return null;

  const label = (text: string, gold = false) => (
    <span className={`text-[10px] font-display font-black uppercase tracking-[0.14em] px-2.5 py-0.5 rounded-full border shadow-lg whitespace-nowrap ${gold ? 'bg-[#1d120b]/92 text-[#f8d77d] border-[#c8963e]' : 'bg-[#1d120b]/90 text-[#f8e6c1] border-[#c8963e]/75'}`}>
      {text}
    </span>
  );

  return (
    <div
      ref={scrollRef}
      className="relative h-full overflow-x-auto overflow-y-hidden no-scrollbar cursor-grab active:cursor-grabbing"
      style={{ touchAction: 'pan-x', overscrollBehaviorX: 'contain', WebkitOverflowScrolling: 'touch', background: 'linear-gradient(180deg, #7fb6e6 0%, #2a80ac 45%, #14506f 100%)' }}
      onMouseDown={onMouseDown}
      onMouseMove={onMouseMove}
      onMouseUp={endDrag}
      onMouseLeave={endDrag}
    >
      {/* The wide empty strip is what you actually scroll; the scene itself stays pinned in view. */}
      <div style={{ width: V + travel, height: '100%' }}>
        <div
          ref={stageRef}
          className="sticky left-0 top-0 h-full overflow-hidden transition-opacity duration-200"
          style={{ width: V || '100%', opacity: ready ? 1 : 0 }}
        >
          {/* Sea colour under everything */}
          <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, #7fb6e6 0%, #2a80ac 40%, #1c6a94 62%, #14506f 100%)' }} />

          {/* Sky and far sea */}
          <div ref={n => { layerRefs.current.sky = n; }} className="absolute top-0 left-0 will-change-transform" style={{ width: skyWidth, height: skyHeight }}>
            <img src={scene.skySrc} style={{ width: '100%', height: '100%', maxWidth: 'none' }} alt="" draggable="false" />
          </div>

          {/* Clouds drift across the whole view */}
          {CLOUDS.map((c, i) => (
              <div
                key={i}
                className="absolute px-cloud"
                style={{ top: `${c.top * 0.5}%`, width: c.size, height: c.size * 0.32, opacity: c.opacity, animationDuration: `${c.seconds}s`, animationDelay: `${c.delay}s` }}
              />
            ))}
          {/* Gulls cross in front of the sky, behind the land */}
          {GULLS.map((gull, i) => (
            <div key={i} className="absolute px-gull pointer-events-none" style={{ top: `${gull.top}%`, width: 34 * gull.scale, animationDuration: `${gull.seconds}s`, animationDelay: `${gull.delay}s` }}>
              <svg viewBox="0 0 48 28" style={{ animationDelay: `${gull.delay * 0.37}s` }}>
                <g stroke="#2b2118" strokeWidth="1.1" strokeLinejoin="round">
                  <path className="px-gull-wing" style={{ animationDelay: `${gull.delay * 0.21}s` }} d="M22 15 Q15 5 5 3 Q12 10 19 17 Z" fill="#cfd8de" />
                  <path d="M10 20 Q14 17 20 15 Q28 12 34 13.5 Q37 13 38.5 15 L43 16 L38.5 17 Q33 20.5 22 19.5 Q16 19 10 20 Z" fill="#fbfaf5" />
                  <path d="M38.5 15 L43 16 L38.5 17 Z" fill="#e8a23a" />
                  <path className="px-gull-wing" style={{ animationDelay: `${gull.delay * 0.21}s` }} d="M22 15.5 Q23 4 34 1 Q31 9 29 17 Z" fill="#fbfaf5" />
                </g>
                <circle cx="36.3" cy="14.8" r="0.7" fill="#2b2118" />
              </svg>
            </div>
          ))}

          {/* Light on the water */}
          <div className="absolute left-0 right-0 bottom-0 pointer-events-none" style={{ top: `${scene.horizon * 100}%` }}>
            {GLINTS.map((g, i) => (
              <div key={i} className="absolute px-glint" style={{ left: `${g.x}%`, top: `${g.y}%`, width: g.w, animationDuration: `${g.seconds}s`, animationDelay: `${g.delay}s` }} />
            ))}
          </div>

          {scene.order.map(key => {
            const l = scene.layers[key];
            const width = widthOf(l);
            const height = heightOf(l);
            return (
              <React.Fragment key={key}>
                <div
                  ref={n => { layerRefs.current[key] = n; }}
                  className="absolute left-0 will-change-transform"
                  style={{ width, height, top: l.base * H - height }}
                >
                  <img src={l.src} className="pointer-events-none" style={{ width: '100%', height: '100%', maxWidth: 'none' }} alt="" draggable="false" />
                  {/* Where the land meets the sea: a line of foam and a dark reflection fading into the water */}
                  {key === 'town' && <div className="absolute left-0 right-0 px-waterline pointer-events-none" style={{ top: '100%', height: height * 0.3 }} />}
                </div>
              </React.Fragment>
            );
          })}

          <div className="absolute inset-0 bg-gradient-to-t from-[#130c08]/45 via-transparent to-[#130c08]/20 pointer-events-none" />

          {/* Every button sits above all the scenery, so nothing can cover one. Each still slides with its own layer. */}
          <div ref={n => { layerRefs.current.quay = n; }} className="absolute left-0 will-change-transform flex justify-center pointer-events-none" style={{ width: V, top: `${scene.quay * 100}%` }}>
            <button onClick={() => open('sail')} className="flex flex-col items-center -translate-y-full pointer-events-auto">
              {ship}
              <span className="-mt-1">{label(shipLabel, true)}</span>
            </button>
          </div>
          {scene.order.map(key => {
            const l = scene.layers[key];
            const height = heightOf(l);
            return (
              <div key={key} ref={n => { layerRefs.current[`${key}:buttons`] = n; }} className="absolute left-0 will-change-transform pointer-events-none" style={{ width: widthOf(l), height, top: l.base * H - height }}>
                {scene.hotspots.filter(s => s.layer === key).map(s => (
                  <button
                    key={s.id}
                    onClick={() => open(s.id)}
                    className="absolute flex flex-col items-center gap-1 pointer-events-auto"
                    style={{ left: `${s.x * 100}%`, top: `${s.y * 100}%`, transform: 'translate(-50%, -100%)' }}
                  >
                    <AnimatedMarker type={s.id} />
                    {label(labels[s.id] || s.id)}
                  </button>
                ))}
              </div>
            );
          })}

          {/* Arrows for anyone not swiping */}
          {([[-1, 'left-1.5', '‹'], [1, 'right-1.5', '›']] as const).map(([way, side, glyph]) => (
            <button
              key={side}
              onClick={() => nudge(way * V * 0.6)}
              aria-label={way < 0 ? 'Look left' : 'Look right'}
              className={`absolute ${side} top-[25%] z-30 w-9 h-9 rounded-full bg-[#1d120b]/70 border border-[#c8963e]/50 text-[#f8d77d] text-xl leading-none flex items-center justify-center active:scale-95`}
            >
              {glyph}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
