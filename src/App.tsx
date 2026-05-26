import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
} from 'react';
import gsap from 'gsap';
import { InertiaPlugin } from 'gsap/InertiaPlugin';
import { useInView, useMotionValue, useSpring } from 'motion/react';

gsap.registerPlugin(InertiaPlugin);

/* ─────────────────────────────────────────────────────────────────────────────
   CountUp — animated number counter (inline, no separate file)
───────────────────────────────────────────────────────────────────────────── */
function CountUp({
  to,
  from = 0,
  direction = 'up',
  delay = 0,
  duration = 2,
  className = '',
  startWhen = true,
  separator = '',
  onStart,
  onEnd,
}) {
  const ref = useRef(null);
  const motionValue = useMotionValue(direction === 'down' ? to : from);
  const damping = 20 + 40 * (1 / duration);
  const stiffness = 100 * (1 / duration);
  const springValue = useSpring(motionValue, { damping, stiffness });
  const isInView = useInView(ref, { once: true, margin: '0px' });

  const getDecimalPlaces = (num) => {
    const str = num.toString();
    if (str.includes('.')) {
      const dec = str.split('.')[1];
      if (parseInt(dec) !== 0) return dec.length;
    }
    return 0;
  };
  const maxDecimals = Math.max(getDecimalPlaces(from), getDecimalPlaces(to));

  const formatValue = useCallback(
    (latest) => {
      const opts = {
        useGrouping: !!separator,
        minimumFractionDigits: maxDecimals > 0 ? maxDecimals : 0,
        maximumFractionDigits: maxDecimals > 0 ? maxDecimals : 0,
      };
      const formatted = Intl.NumberFormat('en-US', opts).format(latest);
      return separator ? formatted.replace(/,/g, separator) : formatted;
    },
    [maxDecimals, separator]
  );

  useEffect(() => {
    if (ref.current)
      ref.current.textContent = formatValue(direction === 'down' ? to : from);
  }, [from, to, direction, formatValue]);

  useEffect(() => {
    if (isInView && startWhen) {
      if (typeof onStart === 'function') onStart();
      const t1 = setTimeout(
        () => motionValue.set(direction === 'down' ? from : to),
        delay * 1000
      );
      const t2 = setTimeout(() => {
        if (typeof onEnd === 'function') onEnd();
      }, delay * 1000 + duration * 1000);
      return () => {
        clearTimeout(t1);
        clearTimeout(t2);
      };
    }
  }, [
    isInView,
    startWhen,
    motionValue,
    direction,
    from,
    to,
    delay,
    onStart,
    onEnd,
    duration,
  ]);

  useEffect(() => {
    const unsub = springValue.on('change', (latest) => {
      if (ref.current) ref.current.textContent = formatValue(latest);
    });
    return () => unsub();
  }, [springValue, formatValue]);

  return <span className={className} ref={ref} />;
}
/* ─── End CountUp ────────────────────────────────────────────────────────────── */

/* ─────────────────────────────────────────────────────────────────────────────
   DotGrid — hero background
───────────────────────────────────────────────────────────────────────────── */
function hexToRgbDot(hex) {
  const m = hex.match(/^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i);
  return m
    ? { r: parseInt(m[1], 16), g: parseInt(m[2], 16), b: parseInt(m[3], 16) }
    : { r: 0, g: 0, b: 0 };
}
function throttleFn(fn, ms) {
  let last = 0;
  return (...a) => {
    const now = performance.now();
    if (now - last >= ms) {
      last = now;
      fn(...a);
    }
  };
}
function DotGrid({
  dotSize = 6,
  gap = 22,
  baseColor = '#2a1f50',
  activeColor = '#c084fc',
  proximity = 140,
  speedTrigger = 100,
  shockRadius = 280,
  shockStrength = 6,
  maxSpeed = 5000,
  resistance = 750,
  returnDuration = 1.5,
  style,
}) {
  const wrapRef = useRef(null);
  const canvasRef = useRef(null);
  const dotsRef = useRef([]);
  const ptr = useRef({
    x: 0,
    y: 0,
    vx: 0,
    vy: 0,
    speed: 0,
    lt: 0,
    lx: 0,
    ly: 0,
  });
  const baseRgb = useMemo(() => hexToRgbDot(baseColor), [baseColor]);
  const activeRgb = useMemo(() => hexToRgbDot(activeColor), [activeColor]);
  const path = useMemo(() => {
    const p = new Path2D();
    p.arc(0, 0, dotSize / 2, 0, Math.PI * 2);
    return p;
  }, [dotSize]);

  const buildGrid = useCallback(() => {
    const wrap = wrapRef.current,
      canvas = canvasRef.current;
    if (!wrap || !canvas) return;
    const { width, height } = wrap.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    const ctx = canvas.getContext('2d');
    if (ctx) ctx.scale(dpr, dpr);
    const cell = dotSize + gap;
    const cols = Math.floor((width + gap) / cell),
      rows = Math.floor((height + gap) / cell);
    const startX = (width - (cell * cols - gap)) / 2 + dotSize / 2;
    const startY = (height - (cell * rows - gap)) / 2 + dotSize / 2;
    dotsRef.current = [];
    for (let r = 0; r < rows; r++)
      for (let c = 0; c < cols; c++)
        dotsRef.current.push({
          cx: startX + c * cell,
          cy: startY + r * cell,
          xOffset: 0,
          yOffset: 0,
          busy: false,
        });
  }, [dotSize, gap]);

  useEffect(() => {
    let raf;
    const proxSq = proximity * proximity;
    const tick = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const { x: px, y: py } = ptr.current;
      for (const d of dotsRef.current) {
        const ox = d.cx + d.xOffset,
          oy = d.cy + d.yOffset;
        const dx = d.cx - px,
          dy = d.cy - py,
          dsq = dx * dx + dy * dy;
        let fs = baseColor;
        if (dsq <= proxSq) {
          const t = 1 - Math.sqrt(dsq) / proximity;
          fs = `rgb(${Math.round(
            baseRgb.r + (activeRgb.r - baseRgb.r) * t
          )},${Math.round(
            baseRgb.g + (activeRgb.g - baseRgb.g) * t
          )},${Math.round(baseRgb.b + (activeRgb.b - baseRgb.b) * t)})`;
        }
        ctx.save();
        ctx.translate(ox, oy);
        ctx.fillStyle = fs;
        ctx.fill(path);
        ctx.restore();
      }
      raf = requestAnimationFrame(tick);
    };
    tick();
    return () => cancelAnimationFrame(raf);
  }, [proximity, baseColor, activeRgb, baseRgb, path]);

  useEffect(() => {
    buildGrid();
    const ro = new ResizeObserver(buildGrid);
    if (wrapRef.current) ro.observe(wrapRef.current);
    return () => ro.disconnect();
  }, [buildGrid]);

  useEffect(() => {
    const move = (e) => {
      const now = performance.now(),
        p = ptr.current;
      const dt = p.lt ? now - p.lt : 16,
        dx = e.clientX - p.lx,
        dy = e.clientY - p.ly;
      let vx = (dx / dt) * 1000,
        vy = (dy / dt) * 1000,
        speed = Math.hypot(vx, vy);
      if (speed > maxSpeed) {
        const sc = maxSpeed / speed;
        vx *= sc;
        vy *= sc;
        speed = maxSpeed;
      }
      p.lt = now;
      p.lx = e.clientX;
      p.ly = e.clientY;
      p.vx = vx;
      p.vy = vy;
      p.speed = speed;
      if (!canvasRef.current) return;
      const rect = canvasRef.current.getBoundingClientRect();
      p.x = e.clientX - rect.left;
      p.y = e.clientY - rect.top;
      for (const d of dotsRef.current) {
        if (d.busy) continue;
        const dist = Math.hypot(d.cx - p.x, d.cy - p.y);
        if (speed > speedTrigger && dist < proximity) {
          d.busy = true;
          gsap.killTweensOf(d);
          gsap.to(d, {
            inertia: {
              xOffset: d.cx - p.x + vx * 0.005,
              yOffset: d.cy - p.y + vy * 0.005,
              resistance,
            },
            onComplete: () => {
              gsap.to(d, {
                xOffset: 0,
                yOffset: 0,
                duration: returnDuration,
                ease: 'elastic.out(1,0.75)',
              });
              d.busy = false;
            },
          });
        }
      }
    };
    const click = (e) => {
      if (!canvasRef.current) return;
      const rect = canvasRef.current.getBoundingClientRect();
      const cx = e.clientX - rect.left,
        cy = e.clientY - rect.top;
      for (const d of dotsRef.current) {
        if (d.busy) continue;
        const dist = Math.hypot(d.cx - cx, d.cy - cy);
        if (dist < shockRadius) {
          d.busy = true;
          gsap.killTweensOf(d);
          const f = Math.max(0, 1 - dist / shockRadius);
          gsap.to(d, {
            inertia: {
              xOffset: (d.cx - cx) * shockStrength * f,
              yOffset: (d.cy - cy) * shockStrength * f,
              resistance,
            },
            onComplete: () => {
              gsap.to(d, {
                xOffset: 0,
                yOffset: 0,
                duration: returnDuration,
                ease: 'elastic.out(1,0.75)',
              });
              d.busy = false;
            },
          });
        }
      }
    };
    const tm = throttleFn(move, 50);
    window.addEventListener('mousemove', tm, { passive: true });
    window.addEventListener('click', click);
    return () => {
      window.removeEventListener('mousemove', tm);
      window.removeEventListener('click', click);
    };
  }, [
    maxSpeed,
    speedTrigger,
    proximity,
    resistance,
    returnDuration,
    shockRadius,
    shockStrength,
  ]);

  return (
    <div style={{ position: 'absolute', inset: 0, zIndex: 0, ...style }}>
      <div
        ref={wrapRef}
        style={{ width: '100%', height: '100%', position: 'relative' }}
      >
        <canvas
          ref={canvasRef}
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            pointerEvents: 'none',
          }}
        />
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   CardNav
───────────────────────────────────────────────────────────────────────────── */
function CardNav({
  logoText = '<Ousa />',
  items = [],
  buttonBgColor = '#8B5CF6',
  buttonTextColor = '#fff',
  onCtaClick,
  menuColor = '#A78BFA',
}) {
  const [open, setOpen] = useState(false);
  const navRef = useRef(null);
  const contentRef = useRef(null);
  const cardRefs = useRef([]);
  const CLOSED = 60,
    OPEN_D = 248;

  useEffect(() => {
    if (navRef.current) gsap.set(navRef.current, { height: CLOSED });
    if (contentRef.current)
      gsap.set(contentRef.current, {
        visibility: 'hidden',
        pointerEvents: 'none',
        opacity: 0,
      });
  }, []);

  const toggle = () => {
    const nav = navRef.current,
      content = contentRef.current;
    if (!nav || !content) return;
    if (!open) {
      setOpen(true);
      gsap.set(content, {
        visibility: 'visible',
        pointerEvents: 'auto',
        opacity: 0,
      });
      gsap.set(cardRefs.current.filter(Boolean), { y: 16, opacity: 0 });
      gsap.to(nav, { height: OPEN_D, duration: 0.38, ease: 'power3.out' });
      gsap.to(content, { opacity: 1, duration: 0.2, delay: 0.12 });
      gsap.to(cardRefs.current.filter(Boolean), {
        y: 0,
        opacity: 1,
        duration: 0.28,
        ease: 'power3.out',
        stagger: 0.07,
        delay: 0.15,
      });
    } else {
      setOpen(false);
      gsap.to(cardRefs.current.filter(Boolean), {
        y: 8,
        opacity: 0,
        duration: 0.16,
        ease: 'power2.in',
      });
      gsap.to(content, { opacity: 0, duration: 0.18, delay: 0.05 });
      gsap.to(nav, {
        height: CLOSED,
        duration: 0.32,
        ease: 'power3.in',
        delay: 0.08,
        onComplete: () =>
          gsap.set(content, { visibility: 'hidden', pointerEvents: 'none' }),
      });
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: '1.2em',
        left: '50%',
        transform: 'translateX(-50%)',
        width: '90%',
        maxWidth: 860,
        zIndex: 300,
      }}
    >
      <nav
        ref={navRef}
        style={{
          background: 'rgba(13,11,24,0.72)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          border: '.5px solid rgba(139,92,246,0.25)',
          borderRadius: 14,
          boxShadow: '0 4px 32px rgba(0,0,0,.5)',
          overflow: 'hidden',
          position: 'relative',
        }}
      >
        <div
          style={{
            position: 'relative',
            height: CLOSED,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 8px 0 18px',
            zIndex: 2,
          }}
        >
          {/* Hamburger */}
          <div
            onClick={toggle}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === 'Enter' && toggle()}
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 6,
              cursor: 'pointer',
              padding: '0 6px',
              userSelect: 'none',
              color: menuColor,
            }}
          >
            <div
              style={{
                width: 24,
                height: 1.5,
                background: 'currentColor',
                transition: 'transform .25s',
                transformOrigin: '50% 50%',
                transform: open ? 'translateY(3.75px) rotate(45deg)' : 'none',
              }}
            />
            <div
              style={{
                width: 24,
                height: 1.5,
                background: 'currentColor',
                transition: 'transform .25s',
                transformOrigin: '50% 50%',
                transform: open ? 'translateY(-3.75px) rotate(-45deg)' : 'none',
              }}
            />
          </div>
          {/* Logo */}
          <span
            style={{
              position: 'absolute',
              left: '50%',
              top: '50%',
              transform: 'translate(-50%,-50%)',
              fontFamily: "'DM Mono',monospace",
              fontSize: 14,
              letterSpacing: 1,
              color: '#8B5CF6',
              pointerEvents: 'none',
            }}
          >
            {logoText}
          </span>
          {/* CTA */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onCtaClick?.();
            }}
            style={{
              border: 'none',
              borderRadius: 8,
              padding: '0 18px',
              height: 40,
              fontWeight: 600,
              fontSize: 12,
              cursor: 'pointer',
              background: buttonBgColor,
              color: buttonTextColor,
              fontFamily: "'Sora',sans-serif",
              transition: 'opacity .2s',
            }}
            onMouseEnter={(e) => (e.target.style.opacity = 0.85)}
            onMouseLeave={(e) => (e.target.style.opacity = 1)}
          >
            Hire Me
          </button>
        </div>
        {/* Dropdown */}
        <div
          ref={contentRef}
          style={{
            display: 'flex',
            gap: 10,
            padding: '0 8px 8px',
            visibility: 'hidden',
            pointerEvents: 'none',
            flexWrap: 'wrap',
          }}
        >
          {items.slice(0, 3).map((item, idx) => (
            <div
              key={idx}
              ref={(el) => {
                if (el) cardRefs.current[idx] = el;
              }}
              style={{
                flex: '1 1 180px',
                borderRadius: 10,
                background: item.bgColor || '#120f1e',
                color: item.textColor || '#e8e8e8',
                padding: '16px 18px',
                display: 'flex',
                flexDirection: 'column',
                gap: 8,
                minHeight: 172,
              }}
            >
              <span
                style={{
                  fontWeight: 400,
                  fontSize: 20,
                  letterSpacing: -0.5,
                  fontFamily: "'Sora',sans-serif",
                }}
              >
                {item.label}
              </span>
              <div
                style={{
                  marginTop: 'auto',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 4,
                }}
              >
                {item.links?.map((lnk, i) => (
                  <a
                    key={i}
                    href="#"
                    onClick={(e) => {
                      e.preventDefault();
                      lnk.onClick?.();
                      toggle();
                    }}
                    style={{
                      fontSize: 13,
                      cursor: 'pointer',
                      opacity: 0.6,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 5,
                      fontFamily: "'DM Mono',monospace",
                      color: 'inherit',
                      textDecoration: 'none',
                      transition: 'opacity .2s',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.opacity = 1)}
                    onMouseLeave={(e) => (e.currentTarget.style.opacity = 0.6)}
                  >
                    <svg
                      width="12"
                      height="12"
                      viewBox="0 0 12 12"
                      fill="none"
                      aria-hidden="true"
                    >
                      <path
                        d="M2.5 9.5L9.5 2.5M9.5 2.5H3.5M9.5 2.5V8.5"
                        stroke="currentColor"
                        strokeWidth="1.4"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                    {lnk.label}
                  </a>
                ))}
              </div>
            </div>
          ))}
        </div>
      </nav>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   BorderGlow
───────────────────────────────────────────────────────────────────────────── */
const BORDER_GLOW_CSS = `
.bgc{--edge-proximity:0;--cursor-angle:45deg;--edge-sensitivity:30;--color-sensitivity:calc(var(--edge-sensitivity)+20);--border-radius:16px;--glow-padding:40px;--cone-spread:25;position:relative;border-radius:var(--border-radius);isolation:isolate;transform:translate3d(0,0,0.01px);display:grid;border:1px solid rgb(255 255 255/8%);background:var(--card-bg,#0d0b18);overflow:visible;}
.bgc::before,.bgc::after,.bgc>.egl{content:"";position:absolute;inset:0;border-radius:inherit;transition:opacity .25s ease-out;z-index:-1;}
.bgc:not(:hover)::before,.bgc:not(:hover)::after,.bgc:not(:hover)>.egl{opacity:0;transition:opacity .75s ease-in-out;}
.bgc::before{border:1px solid transparent;background:linear-gradient(var(--card-bg,#0d0b18) 0 100%) padding-box,linear-gradient(rgb(255 255 255/0%) 0 100%) border-box,var(--g1) border-box,var(--g2) border-box,var(--g3) border-box,var(--g4) border-box,var(--g5) border-box,var(--g6) border-box,var(--g7) border-box,var(--gb) border-box;opacity:calc((var(--edge-proximity) - var(--color-sensitivity))/(100 - var(--color-sensitivity)));mask-image:conic-gradient(from var(--cursor-angle) at center,black calc(var(--cone-spread)*1%),transparent calc((var(--cone-spread)+15)*1%),transparent calc((100 - var(--cone-spread) - 15)*1%),black calc((100 - var(--cone-spread))*1%));}
.bgc::after{border:1px solid transparent;background:var(--g1) padding-box,var(--g2) padding-box,var(--g3) padding-box,var(--g4) padding-box,var(--g5) padding-box,var(--g6) padding-box,var(--g7) padding-box,var(--gb) padding-box;mask-image:linear-gradient(to bottom,black,black),radial-gradient(ellipse at 50% 50%,black 40%,transparent 65%),radial-gradient(ellipse at 66% 66%,black 5%,transparent 40%),radial-gradient(ellipse at 33% 33%,black 5%,transparent 40%),radial-gradient(ellipse at 66% 33%,black 5%,transparent 40%),radial-gradient(ellipse at 33% 66%,black 5%,transparent 40%),conic-gradient(from var(--cursor-angle) at center,transparent 5%,black 15%,black 85%,transparent 95%);mask-composite:subtract,add,add,add,add,add;opacity:calc(.4*(var(--edge-proximity) - var(--color-sensitivity))/(100 - var(--color-sensitivity)));mix-blend-mode:soft-light;}
.bgc>.egl{inset:calc(var(--glow-padding)*-1);pointer-events:none;z-index:1;mask-image:conic-gradient(from var(--cursor-angle) at center,black 2.5%,transparent 10%,transparent 90%,black 97.5%);opacity:calc((var(--edge-proximity) - var(--edge-sensitivity))/(100 - var(--edge-sensitivity)));mix-blend-mode:plus-lighter;}
.bgc>.egl::before{content:"";position:absolute;inset:var(--glow-padding);border-radius:inherit;box-shadow:inset 0 0 0 1px var(--gc),inset 0 0 1px 0 var(--gc60),inset 0 0 6px 0 var(--gc40),inset 0 0 15px 0 var(--gc30),inset 0 0 25px 2px var(--gc20),0 0 6px 0 var(--gc40),0 0 15px 0 var(--gc30),0 0 25px 2px var(--gc20),0 0 50px 2px var(--gc10);}
.bgc-inner{display:flex;flex-direction:column;position:relative;overflow:auto;z-index:1;}
`;
function parseHSL(s) {
  const m = s.match(/([\d.]+)\s*([\d.]+)%?\s*([\d.]+)%?/);
  return m ? { h: +m[1], s: +m[2], l: +m[3] } : { h: 270, s: 70, l: 70 };
}
function buildGlowVars(gc, int = 1) {
  const { h, s, l } = parseHSL(gc);
  const b = `${h}deg ${s}% ${l}%`;
  return {
    '--gc': `hsl(${b}/100%)`,
    '--gc60': `hsl(${b}/${Math.min(60 * int, 100)}%)`,
    '--gc40': `hsl(${b}/${Math.min(40 * int, 100)}%)`,
    '--gc30': `hsl(${b}/${Math.min(30 * int, 100)}%)`,
    '--gc20': `hsl(${b}/${Math.min(20 * int, 100)}%)`,
    '--gc10': `hsl(${b}/${Math.min(10 * int, 100)}%)`,
  };
}
const GP = [
  '80% 55%',
  '69% 34%',
  '8% 6%',
  '41% 38%',
  '86% 85%',
  '82% 18%',
  '51% 4%',
],
  GK = ['--g1', '--g2', '--g3', '--g4', '--g5', '--g6', '--g7'],
  CM = [0, 1, 2, 0, 1, 2, 1];
function buildGradVars(colors) {
  const v = {};
  for (let i = 0; i < 7; i++) {
    v[GK[i]] = `radial-gradient(at ${GP[i]}, ${colors[Math.min(CM[i], colors.length - 1)]
      } 0px, transparent 50%)`;
  }
  v['--gb'] = `linear-gradient(${colors[0]} 0 100%)`;
  return v;
}
function BorderGlow({
  children,
  glowColor = '270 70 75',
  backgroundColor = '#0d0b18',
  borderRadius = 16,
  glowRadius = 40,
  glowIntensity = 1.2,
  coneSpread = 25,
  edgeSensitivity = 28,
  colors = ['#c084fc', '#818cf8', '#38bdf8'],
  className = '',
}) {
  const ref = useRef(null);
  const onMove = useCallback((e) => {
    const card = ref.current;
    if (!card) return;
    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left,
      y = e.clientY - rect.top,
      cx = rect.width / 2,
      cy = rect.height / 2,
      dx = x - cx,
      dy = y - cy;
    const kx = dx ? cx / Math.abs(dx) : Infinity,
      ky = dy ? cy / Math.abs(dy) : Infinity;
    card.style.setProperty(
      '--edge-proximity',
      (Math.min(Math.max(1 / Math.min(kx, ky), 0), 1) * 100).toFixed(3)
    );
    card.style.setProperty(
      '--cursor-angle',
      `${(((Math.atan2(dy, dx) * 180) / Math.PI + 90 + 360) % 360).toFixed(
        3
      )}deg`
    );
  }, []);
  return (
    <div
      ref={ref}
      onPointerMove={onMove}
      className={`bgc ${className}`}
      style={{
        '--card-bg': backgroundColor,
        '--edge-sensitivity': edgeSensitivity,
        '--border-radius': `${borderRadius}px`,
        '--glow-padding': `${glowRadius}px`,
        '--cone-spread': coneSpread,
        ...buildGlowVars(glowColor, glowIntensity),
        ...buildGradVars(colors),
      }}
    >
      <span className="egl" />
      <div className="bgc-inner">{children}</div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   Constants
───────────────────────────────────────────────────────────────────────────── */
const ACCENT = '#8B5CF6',
  ACCENT2 = '#A78BFA',
  MAX_W = 1440;

const EXPERIENCE = [
  {
    company: 'Canadia Bank',
    role: 'Digital Product Execution & Implementation Supervisor',
    period: '2024 – Present',
    location: 'Phnom Penh, Cambodia',
    bullets: [
      'Oversee the deployment and execution of digital products including Mobile Banking, managing inquiries and ensuring seamless operations.',
      'Coordinate project implementation activities across Design, Development, UAT, and detailed documentation.',
    ],
  },
  {
    company: 'Freelance',
    role: 'Freelance Web Design & Development',
    period: '2021 – Present',
    location: 'Phnom Penh, Cambodia',
    bullets: [
      'Built websites for leading regional hotels and food & beverage outlets.',
      'Managed full project lifecycle from client briefing through design, development, and delivery.',
    ],
  },
  {
    company: 'Mäd',
    role: 'Webflow Developer & UX/UI Designer',
    period: '2020 – 2023',
    location: 'Phnom Penh, Cambodia',
    bullets: [
      'Designed and developed websites for UNDP, GIZ, and ILO.',
      'Proficient in the full Adobe Suite, Figma, and Webflow end-to-end.',
      'Worked across financial, corporate, and hospitality sectors.',
    ],
  },
  {
    company: 'Khalibre',
    role: 'UX/UI Designer',
    period: '2019 – 2020',
    location: 'Phnom Penh, Cambodia',
    bullets: [
      'Developed a comprehensive design system including UI components, buttons, and color schemes.',
      'Performed quality checks to ensure outputs aligned with prototypes.',
    ],
  },
  {
    company: 'SALA Tech',
    role: 'UX/UI Designer',
    period: '2018 – 2019',
    location: 'Phnom Penh, Cambodia',
    bullets: [
      'Led the design of a school management platform for teachers, students, and parents.',
      'Designed mobile apps and digital marketing campaigns.',
    ],
  },
  {
    company: 'System Experts',
    role: 'Front End Designer',
    period: '2017 – 2018',
    location: 'Phnom Penh, Cambodia',
    bullets: [
      'Designed and developed the company website, handled technical support and SEO for improved rankings.',
    ],
  },
  {
    company: 'Photo Phnom Penh Association',
    role: 'Media & Communication (Volunteer)',
    period: '2016 – 2017',
    location: 'Phnom Penh, Cambodia',
    bullets: [
      'Liaised with the press and coordinated photographers and videographers for event coverage.',
    ],
  },
  {
    company: 'INSPIRED.Cambodia',
    role: 'Photographer (Volunteer)',
    period: '2016 – 2017',
    location: 'Phnom Penh, Cambodia',
    bullets: [
      'Handled photography and creative direction for a Phnom Penh restaurant, coordinating with the magazine team.',
    ],
  },
];

const EDUCATION = [
  {
    degree: 'Bachelor of Computer Science',
    school: 'Royal University of Phnom Penh (RUPP)',
    year: '2016 – 2017',
  },
  {
    degree: 'Diploma in Web Design',
    school: 'IT Step Academy',
    year: '2017 – 2018',
  },
  {
    degree: 'Google UX Design Professional Certificate',
    school: 'Coursera',
    year: '2022 – 2023',
  },
  {
    degree: 'Webflow Experts Certification (95%)',
    school: 'Webflow',
    year: '2022',
  },
  { degree: 'UX Design Certification', school: 'Uxcel', year: '2022' },
  { degree: 'Social Media Management', school: 'Udemy', year: '2017 – 2018' },
];

const TOOLS = [
  { name: 'Figma', icon: '🎨' },
  { name: 'Jira', icon: '📋' },
  { name: 'Notion', icon: '📝' },
  { name: 'Asana', icon: '✅' },
  { name: 'Webflow', icon: '🌐' },
  { name: 'Adobe XD', icon: '🖥' },
  { name: 'Slack', icon: '💬' },
  { name: 'Miro', icon: '🗂' },
  { name: 'HTML/CSS', icon: '💻' },
  { name: 'Google Suite', icon: '📊' },
];

const SERVICES = [
  {
    icon: '🖥',
    title: 'Web Design & Redesign',
    desc: 'New site or a refresh — I design user-friendly, brand-aligned websites that look great on every device.',
  },
  {
    icon: '⚙️',
    title: 'Web Development',
    desc: 'From custom coding to Webflow builds and third-party integrations, I bring your designs to life.',
  },
  {
    icon: '📐',
    title: 'UX/UI Design',
    desc: 'User research, wireframing, prototyping, and usability testing to improve any digital product.',
  },
  {
    icon: '🗓',
    title: 'Project Management',
    desc: 'Agile sprint planning, stakeholder communication, and end-to-end delivery for digital products.',
  },
];

const TESTIMONIALS = [
  {
    name: 'Sarah K.',
    role: 'CEO · RetailBrand',
    quote:
      "Ousa brought clarity and calm to a chaotic project. We launched on time and the design exceeded every expectation. I'd work with him again without hesitation.",
    avatar: 'SK',
  },
  {
    name: 'James T.',
    role: 'CTO · SaaS Startup',
    quote:
      'Rare to find someone who can straddle PM rigour and design sensibility. Ousa kept our team aligned, the scope tight, and the UI beautiful.',
    avatar: 'JT',
  },
  {
    name: 'Mei L.',
    role: 'Marketing Director · FinTech Co.',
    quote:
      'The new website Ousa designed tripled our inbound leads within 3 months. His Webflow skills are exceptional and he communicated every step of the way.',
    avatar: 'ML',
  },
  {
    name: 'David R.',
    role: 'Head of Product · Regional Bank',
    quote:
      'Ousa managed our Mobile Banking rollout end-to-end. His ability to coordinate between design, dev, and UAT teams while keeping stakeholders informed was outstanding.',
    avatar: 'DR',
  },
  {
    name: 'Nita S.',
    role: 'GM · Boutique Hotel Group',
    quote:
      "We needed a website that matched our brand's elegance. Ousa delivered beyond what we imagined — on time, on budget, and stunning on every device.",
    avatar: 'NS',
  },
];

const PROJECTS = [
  {
    id: 1,
    title: 'Canadia Bank V5',
    tag: 'Web Design · Development',
    url: 'https://new-cnb.webflow.io/',
    desc: "Led the Webflow development and UX/UI design for Canadia Bank's V5 website — a modern, responsive platform aligned with the bank's brand identity.",
    caseStudy: {
      problem:
        "The existing site felt dated and didn't reflect the bank's digital ambitions. Navigation was complex and mobile experience was inconsistent.",
      process:
        'Conducted stakeholder workshops, redesigned the IA, created high-fidelity prototypes in Figma, and developed the full site in Webflow.',
      result:
        'Launched on schedule with significantly improved UX scores and positive stakeholder feedback across all departments.',
    },
    accent: '#8B5CF6',
    glowColor: '270 70 75',
    colors: ['#c084fc', '#818cf8', '#38bdf8'],
    icon: '🏦',
  },
  {
    id: 2,
    title: 'UNDP Digital Strategy',
    tag: 'Web Design · Development',
    url: 'https://digitalstrategy.undp.org/',
    desc: "Led the full design and development of UNDP's Digital Strategy microsite — clean, responsive, and accessible across devices.",
    caseStudy: {
      problem:
        'UNDP needed a microsite to present their digital strategy clearly to a global audience across devices and connection speeds.',
      process:
        "Designed the full layout in Figma, aligned with UNDP's global brand guidelines, then developed and optimised in Webflow.",
      result:
        "Delivered a high-performance, accessible microsite that met UNDP's brand and accessibility standards.",
    },
    accent: '#6366F1',
    glowColor: '239 68 68',
    colors: ['#818cf8', '#6366f1', '#c084fc'],
    icon: '🌐',
  },
  {
    id: 3,
    title: 'UNDP DigitalX',
    tag: 'Web Design · Development',
    url: 'https://digitalx.undp.org/index.html',
    desc: 'Designed and developed DigitalX — a UNDP initiative showcasing innovative digital transformation solutions with interactive elements.',
    caseStudy: {
      problem:
        'The initiative needed a visually engaging platform that could communicate complex digital topics to a diverse global audience.',
      process:
        'Created the visual design system, built interactive components, and optimised for performance and accessibility.',
      result:
        'Successfully launched with smooth navigation and strong engagement metrics from the global user base.',
    },
    accent: '#A855F7',
    glowColor: '285 70 70',
    colors: ['#e879f9', '#c084fc', '#818cf8'],
    icon: '✦',
  },
  {
    id: 4,
    title: 'Edge & Story',
    tag: 'Web Design · Development',
    url: 'https://www.edgeandstory.com/',
    desc: 'Redesigned and developed the website for edgeandstory — a consultancy in arts, culture, and sustainable development.',
    caseStudy: {
      problem:
        "The old site didn't communicate the consultancy's expertise or mission effectively, with poor information hierarchy.",
      process:
        'Redesigned the IA and visual design, focused on portfolio-forward layout and clear communication of services.',
      result:
        'Modern, user-friendly experience that enhances accessibility and effectively communicates their mission.',
    },
    accent: '#7C3AED',
    glowColor: '258 80 65',
    colors: ['#7c3aed', '#a78bfa', '#6366f1'],
    icon: '🎨',
  },
];

const SKILLS = [
  { name: 'Project Management', level: 95 },
  { name: 'Agile / Scrum', level: 90 },
  { name: 'Figma', level: 92 },
  { name: 'UI / UX Design', level: 88 },
  { name: 'Stakeholder Communication', level: 85 },
  { name: 'HTML & CSS', level: 78 },
  { name: 'Webflow', level: 74 },
  { name: 'Design Systems', level: 80 },
];

const LANGUAGES = [
  { lang: 'Khmer', level: 'Native', pct: 100 },
  { lang: 'English', level: 'Fluent', pct: 90 },
];

const MARQUEE_SITES = [
  { name: 'UNDP DigitalX', url: 'https://digitalx.undp.org/index.html' },
  { name: 'Data to Policy', url: 'https://www.datatopolicy.org/' },
  { name: 'UN Innovation', url: 'https://www.uninnovation.network/' },
  { name: 'CASIC Cambodia', url: 'https://www.casiccambodia.net/' },
  { name: 'Vertical Fitness', url: 'https://www.verticalfitnesscenter.com/' },
  { name: 'Eleven Degrees', url: 'https://www.elevendegrees.com/' },
  { name: 'Fingertip', url: 'https://www.getfingertip.io/' },
  { name: 'Hotel KVL', url: 'https://www.hotelkvlgroup.com/' },
  { name: 'Bright Consulting', url: 'https://www.bright.edu.vn/' },
  { name: 'Multiple Natures', url: 'https://www.multiplenatures.com/' },
  { name: 'OCIC', url: 'https://www.ocic.com.kh/' },
  { name: 'GIA Tower', url: 'https://www.gia-tower.com/' },
  { name: 'UNDP Digital Strategy', url: 'https://digitalstrategy.undp.org/' },
  { name: 're:edge Architecture', url: 'https://www.reedgearchitecture.com/' },
  { name: 'Edge & Story', url: 'https://www.edgeandstory.com/' },
  { name: 'Canadia Bank', url: 'https://new-cnb.webflow.io/' },
  { name: 'Photo Phnom Penh', url: 'https://www.photophnompenh.com/' },
  { name: 'Residence 110', url: 'https://www.residence110.com/' },
  { name: 'Richreay Group', url: 'https://www.richreay.com/' },
];

const PROCESS = [
  {
    num: '01',
    title: 'Discovery',
    desc: "We kick off with a discovery session to learn about your business and what you're trying to achieve with your website.",
  },
  {
    num: '02',
    title: 'Wireframing',
    desc: "I'll create the structure for the whole site in wireframes to establish the flow and how to best present your product or service.",
  },
  {
    num: '03',
    title: 'High-fidelity Designs',
    desc: 'I turn wireframes into fully polished designs so you can see exactly what the finished website will look like.',
  },
  {
    num: '04',
    title: 'Development',
    desc: 'I build the final site in Webflow with clean code, smooth animations, and a CMS your team can manage with ease.',
  },
  {
    num: '05',
    title: 'Launch & Training',
    desc: 'I help set up your Webflow account, transfer the site, and train you to manage it yourself going forward.',
  },
];

const FAQS = [
  {
    q: 'How long does a website take to build?',
    a: "Most projects take 4–8 weeks depending on scope and complexity. I'll give you a clear timeline after the discovery call.",
  },
  {
    q: 'How much does a website cost?',
    a: "Projects start from $1,500 for a simple site and scale based on features and complexity. I'll send a detailed proposal after understanding your requirements.",
  },
  {
    q: 'Can you build a website from an existing design?',
    a: 'Yes — if you already have designs in Figma or another tool I can develop them directly in Webflow with pixel-perfect accuracy.',
  },
  {
    q: 'Will the website load quickly?',
    a: 'Absolutely. Performance is a priority. I optimise images, minimise code, and follow best practices so your site loads fast on all devices.',
  },
  {
    q: 'Do you provide ongoing support?',
    a: 'Yes. I offer support and maintenance packages after launch to keep your site updated, secure, and performing well.',
  },
];

const ARTICLES = [
  {
    title: 'Canadia Bank Mobile Banking v3 vs v5',
    subtitle:
      'From Strong Roots to Smarter Experiences: A UX/UI and Product Execution Perspective',
    tag: 'Case Study',
    read: '8 min read',
  },
  {
    title: 'Waterfall vs Agile',
    subtitle: 'Which project management methodology is right for your team?',
    tag: 'PM',
    read: '5 min read',
  },
  {
    title: 'Gestalt Principles for UX Designers',
    subtitle:
      'How psychological laws shape effective, user-friendly digital interfaces.',
    tag: 'UX Design',
    read: '6 min read',
  },
];

/* ─────────────────────────────────────────────────────────────────────────────
   Layout helpers
───────────────────────────────────────────────────────────────────────────── */
const Inner = ({ children, style }) => (
  <div
    style={{
      width: '100%',
      maxWidth: MAX_W,
      margin: '0 auto',
      padding: '0 clamp(20px,5vw,40px)',
      textAlign: 'left',
      ...style,
    }}
  >
    {children}
  </div>
);

function useFadeIn(threshold = 0.1) {
  const ref = useRef(null);
  const [vis, setVis] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setVis(true);
          obs.disconnect();
        }
      },
      { threshold }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return [ref, vis];
}

function Section({ id, children, style }) {
  const [ref, vis] = useFadeIn();
  return (
    <section
      id={id}
      ref={ref}
      style={{
        width: '100%',
        padding: 'clamp(60px,7vw,120px) 0',
        opacity: vis ? 1 : 0,
        textAlign: 'left',
        transform: vis ? 'translateY(0)' : 'translateY(28px)',
        transition: 'opacity .65s ease,transform .65s ease',
        ...style,
      }}
    >
      {children}
    </section>
  );
}

function SL({ n, label }) {
  return (
    <p
      style={{
        fontFamily: "'DM Mono',monospace",
        fontSize: 12,
        color: ACCENT,
        letterSpacing: 2,
        margin: '0 0 20px',
        textAlign: 'left',
      }}
    >
      {n} / {label}
    </p>
  );
}

function SkillBar({ name, level, delay }) {
  const [ref, vis] = useFadeIn();
  return (
    <div ref={ref} style={{ marginBottom: 20 }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          marginBottom: 7,
        }}
      >
        <span
          style={{
            fontSize: 13,
            fontFamily: "'DM Mono',monospace",
            color: '#ccc',
            display: 'block',
            textAlign: 'left',
          }}
        >
          {name}
        </span>
        <span
          style={{
            fontSize: 12,
            color: '#555',
            display: 'block',
            textAlign: 'right',
          }}
        >
          {level}%
        </span>
      </div>
      <div
        style={{
          height: 4,
          background: '#1e1e1e',
          borderRadius: 99,
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            height: '100%',
            width: vis ? `${level}%` : '0%',
            background: `linear-gradient(90deg,${ACCENT},${ACCENT2})`,
            borderRadius: 99,
            transition: `width .9s cubic-bezier(.22,1,.36,1) ${delay}ms`,
          }}
        />
      </div>
    </div>
  );
}

function ExperienceList({ items }) {
  return (
    <div style={{ position: 'relative' }}>
      <div
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          bottom: 0,
          width: 1,
          background: `linear-gradient(${ACCENT}44,transparent)`,
        }}
      />
      {items.map((e, i) => (
        <div
          key={i}
          style={{ paddingLeft: 32, marginBottom: 40, position: 'relative' }}
        >
          <div
            style={{
              position: 'absolute',
              left: -5,
              top: 4,
              width: 10,
              height: 10,
              borderRadius: '50%',
              background: ACCENT,
              boxShadow: `0 0 12px ${ACCENT}88`,
            }}
          />
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              marginBottom: 6,
              flexWrap: 'wrap',
              gap: 8,
            }}
          >
            <div>
              <h3
                style={{
                  fontSize: 16,
                  fontWeight: 600,
                  letterSpacing: -0.3,
                  color: '#e8e8e8',
                  margin: '0 0 2px',
                  textAlign: 'left',
                }}
              >
                {e.role}
              </h3>
              <p
                style={{
                  fontSize: 13,
                  color: ACCENT2,
                  fontFamily: "'DM Mono',monospace",
                  margin: '2px 0 0',
                  textAlign: 'left',
                }}
              >
                {e.company}
              </p>
              {e.location && (
                <p
                  style={{
                    fontSize: 11,
                    color: '#444',
                    fontFamily: "'DM Mono',monospace",
                    margin: '4px 0 0',
                    textAlign: 'left',
                  }}
                >
                  📍 {e.location}
                </p>
              )}
            </div>
            <span
              style={{
                fontSize: 11,
                fontFamily: "'DM Mono',monospace",
                color: '#555',
                border: '1px solid #1e1e1e',
                padding: '4px 10px',
                borderRadius: 99,
                whiteSpace: 'nowrap',
              }}
            >
              {e.period}
            </span>
          </div>
          <ul style={{ listStyle: 'none', marginTop: 8, paddingLeft: 0 }}>
            {e.bullets.map((b, j) => (
              <li
                key={j}
                style={{
                  fontSize: 13,
                  color: '#777',
                  lineHeight: 1.7,
                  marginBottom: 4,
                  paddingLeft: 16,
                  position: 'relative',
                }}
              >
                <span style={{ position: 'absolute', left: 0, color: ACCENT }}>
                  ›
                </span>
                {b}
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

/* Marquee strip */
function Marquee({ items }) {
  return (
    <div
      style={{
        overflow: 'hidden',
        width: '100%',
        position: 'relative',
        padding: '20px 0',
        maskImage:
          'linear-gradient(90deg,transparent,black 10%,black 90%,transparent)',
        WebkitMaskImage:
          'linear-gradient(90deg,transparent,black 10%,black 90%,transparent)',
      }}
    >
      <style>{`
        @keyframes marquee{from{transform:translateX(0)}to{transform:translateX(-50%)}}
        .marquee-track{display:flex;gap:0;width:max-content;animation:marquee 40s linear infinite;}
        .marquee-track:hover{animation-play-state:paused;}
      `}</style>
      <div className="marquee-track">
        {[...items, ...items].map((s, i) => (
          <a
            key={i}
            href={s.url}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              padding: '8px 24px',
              whiteSpace: 'nowrap',
              color: '#555',
              fontFamily: "'DM Mono',monospace",
              fontSize: 12,
              letterSpacing: 0.5,
              textDecoration: 'none',
              borderRight: '1px solid #1a1030',
              transition: 'color .2s',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = ACCENT2)}
            onMouseLeave={(e) => (e.currentTarget.style.color = '#555')}
          >
            <span
              style={{
                width: 5,
                height: 5,
                borderRadius: '50%',
                background: '#2a1f50',
                flexShrink: 0,
                transition: 'background .2s',
              }}
            />
            {s.name}
          </a>
        ))}
      </div>
    </div>
  );
}

/* FAQ accordion item */
function FaqItem({ q, a }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ borderBottom: '1px solid #1a1030', overflow: 'hidden' }}>
      <button
        onClick={() => setOpen((o) => !o)}
        style={{
          width: '100%',
          background: 'none',
          border: 'none',
          padding: '20px 0',
          cursor: 'pointer',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 16,
          textAlign: 'left',
        }}
      >
        <span
          style={{
            fontSize: 15,
            fontWeight: 600,
            color: '#e8e8e8',
            textAlign: 'left',
            flex: 1,
          }}
        >
          {q}
        </span>
        <span
          style={{
            fontSize: 18,
            color: ACCENT,
            flexShrink: 0,
            transition: 'transform .25s',
            display: 'inline-block',
            transform: open ? 'rotate(45deg)' : 'none',
            lineHeight: 1,
          }}
        >
          +
        </span>
      </button>
      <div
        style={{
          maxHeight: open ? 200 : 0,
          overflow: 'hidden',
          transition: 'max-height .35s ease',
        }}
      >
        <p
          style={{
            fontSize: 14,
            color: '#777',
            lineHeight: 1.75,
            margin: '0 0 20px',
            paddingRight: 32,
            textAlign: 'left',
          }}
        >
          {a}
        </p>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   Global CSS
───────────────────────────────────────────────────────────────────────────── */
const GLOBAL_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Sora:wght@300;400;600;700&family=DM+Mono:wght@400;500&display=swap');
  *,*::before,*::after{box-sizing:border-box;}
  html,body{width:100%!important;max-width:100%!important;margin:0!important;padding:0!important;overflow-x:hidden!important;background:#080810!important;}
  #root,#app,[data-reactroot]{width:100%!important;max-width:100%!important;margin:0!important;padding:0!important;}
  ::-webkit-scrollbar{width:4px;}
  ::-webkit-scrollbar-track{background:#080810;}
  ::-webkit-scrollbar-thumb{background:#2d1f4e;border-radius:99px;}
  ::selection{background:#8B5CF644;}
  a{color:inherit;text-decoration:none;}
  input,textarea,select{font-family:inherit;}
  img{max-width:100%;}
  button{outline:none;}
  h1,h2,h3,h4,h5,h6,p,ul,ol{margin:0;padding:0;text-align:left;}

  @keyframes fadeUp{from{opacity:0;transform:translateY(24px)}to{opacity:1;transform:translateY(0)}}
  @keyframes fadeIn{from{opacity:0}to{opacity:1}}
  @keyframes pulse{0%,100%{opacity:.4}50%{opacity:1}}
  @keyframes slideIn{from{opacity:0;transform:translateY(40px)}to{opacity:1;transform:translateY(0)}}

  .about-grid{display:grid;grid-template-columns:1fr 1fr;gap:clamp(40px,5vw,80px);align-items:start;}
  @media(max-width:900px){.about-grid{grid-template-columns:1fr;gap:40px;}}
  .exp-grid{display:grid;grid-template-columns:1fr 1fr;gap:0 clamp(40px,5vw,80px);}
  @media(max-width:768px){.exp-grid{grid-template-columns:1fr;}}
  .skills-grid{display:grid;grid-template-columns:1fr 1fr;gap:0 clamp(40px,5vw,80px);}
  @media(max-width:640px){.skills-grid{grid-template-columns:1fr;}}
  .projects-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,360px),1fr));gap:clamp(16px,2vw,28px);}
  .services-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,260px),1fr));gap:clamp(14px,1.5vw,24px);}
  .edu-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,260px),1fr));gap:clamp(12px,1.5vw,20px);}
  .process-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,210px),1fr));gap:clamp(14px,1.5vw,24px);}
  .articles-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,320px),1fr));gap:clamp(14px,1.5vw,24px);}

  /* ── Contact: 2-col desktop, 1-col mobile ── */
  .contact-2col{display:grid;grid-template-columns:1fr 1fr;gap:0 clamp(40px,6vw,100px);align-items:start;}
  @media(max-width:768px){.contact-2col{grid-template-columns:1fr;gap:48px 0;}}

  /* ── Contact inner grid (first/last name) ── */
  .contact-grid{display:grid;grid-template-columns:1fr 1fr;gap:16px;}
  @media(max-width:640px){.contact-grid{grid-template-columns:1fr;}}

  /* ── FAQs: 2-col desktop, 1-col mobile ── */
  .faq-2col{display:grid;grid-template-columns:1fr 1fr;gap:0 clamp(40px,6vw,100px);align-items:start;}
  @media(max-width:768px){.faq-2col{grid-template-columns:1fr;gap:32px 0;}}

  .hero-h1{font-size:clamp(48px,9vw,140px);font-weight:700;line-height:1.02;letter-spacing:-4px;margin-bottom:24px;animation:fadeUp .6s .1s ease both;}
  @media(max-width:480px){.hero-h1{letter-spacing:-2px;}}
  .hero-btns{display:flex;gap:16px;flex-wrap:wrap;}
  @media(max-width:640px){section{padding:60px 0!important;}.modal-inner{padding:24px!important;}}

  /* ── Large screen (1440px+) ── */
  @media(min-width:1440px){
    .projects-grid{grid-template-columns:repeat(2,1fr);}
    .services-grid{grid-template-columns:repeat(4,1fr);}
    .process-grid{grid-template-columns:repeat(5,1fr);}
    .articles-grid{grid-template-columns:repeat(3,1fr);}
  }
`;

/* ─────────────────────────────────────────────────────────────────────────────
   Portfolio
───────────────────────────────────────────────────────────────────────────── */
export default function Portfolio() {
  const [openCase, setOpenCase] = useState(null);
  const [tSlide, setTSlide] = useState(0);
  const [sent, setSent] = useState(false);
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    website: '',
    email: '',
    need: '',
    budget: '',
    message: '',
  });

  // ── RESPONSIVE testimonials: 1 on mobile, 2 on tablet, 3 on desktop ──
  const [tPerSlide, setTPerSlide] = useState(2);

  useEffect(() => {
    const update = () => {
      const w = window.innerWidth;
      setTPerSlide(w < 640 ? 1 : w < 900 ? 2 : 3);
    };
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  // Reset slide index when per-slide count changes to avoid blank slides
  useEffect(() => {
    setTSlide(0);
  }, [tPerSlide]);

  const tGroups = useMemo(() => {
    const g = [];
    for (let i = 0; i < TESTIMONIALS.length; i += tPerSlide)
      g.push(TESTIMONIALS.slice(i, i + tPerSlide));
    return g;
  }, [tPerSlide]);

  useEffect(() => {
    const timer = setInterval(
      () => setTSlide((s) => (s + 1) % tGroups.length),
      5000
    );
    return () => clearInterval(timer);
  }, [tGroups.length]);

  const scrollTo = (id) =>
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });

  const handleSend = () => {
    setSent(true);
    setForm({
      firstName: '',
      lastName: '',
      website: '',
      email: '',
      need: '',
      budget: '',
      message: '',
    });
    setTimeout(() => setSent(false), 4000);
  };

  const activeProject = PROJECTS.find((p) => p.id === openCase);
  const expLeft = EXPERIENCE.filter((_, i) => i % 2 === 0);
  const expRight = EXPERIENCE.filter((_, i) => i % 2 !== 0);

  const inputStyle = {
    padding: '13px 16px',
    background: '#0d0b18',
    border: '1px solid #1a1030',
    borderRadius: 10,
    color: '#e8e8e8',
    fontSize: 14,
    outline: 'none',
    transition: 'border-color .2s, box-shadow .2s',
    width: '100%',
  };
  const onFocus = (e) => {
    e.target.style.borderColor = ACCENT + '88';
    e.target.style.boxShadow = `0 0 0 3px ${ACCENT}22, 0 0 16px ${ACCENT}22`;
  };
  const onBlur = (e) => {
    e.target.style.borderColor = '#1a1030';
    e.target.style.boxShadow = 'none';
  };

  return (
    <div
      style={{
        fontFamily: "'Sora',sans-serif",
        background: '#080810',
        color: '#e8e8e8',
        minHeight: '100vh',
        overflowX: 'hidden',
        width: '100%',
      }}
    >
      <style>
        {GLOBAL_CSS}
        {BORDER_GLOW_CSS}
      </style>

      {/* ── MODAL ── */}
      {openCase && activeProject && (
        <div
          onClick={() => setOpenCase(null)}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 500,
            background: 'rgba(4,2,12,.92)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 20,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="modal-inner"
            style={{
              background: '#0f0c1e',
              border: '1px solid #2a1f50',
              borderRadius: 20,
              padding: 40,
              maxWidth: 620,
              width: '100%',
              maxHeight: '90vh',
              overflowY: 'auto',
              animation: 'slideIn .35s ease both',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                marginBottom: 28,
                gap: 16,
              }}
            >
              <div>
                <span
                  style={{
                    fontSize: 11,
                    fontFamily: "'DM Mono',monospace",
                    color: activeProject.accent,
                    letterSpacing: 1,
                  }}
                >
                  {activeProject.tag}
                </span>
                <h3
                  style={{
                    fontSize: 22,
                    fontWeight: 700,
                    letterSpacing: -0.5,
                    margin: '6px 0 0',
                    textAlign: 'left',
                  }}
                >
                  {activeProject.title}
                </h3>
              </div>
              <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                {activeProject.url && (
                  <a
                    href={activeProject.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      background: '#1a1530',
                      border: '1px solid #2a1f50',
                      borderRadius: 8,
                      color: ACCENT2,
                      padding: '6px 12px',
                      fontFamily: "'DM Mono',monospace",
                      fontSize: 12,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 5,
                    }}
                  >
                    Visit ↗
                  </a>
                )}
                <button
                  onClick={() => setOpenCase(null)}
                  style={{
                    background: '#1a1530',
                    border: '1px solid #2a1f50',
                    borderRadius: 8,
                    color: '#888',
                    cursor: 'pointer',
                    padding: '6px 12px',
                    fontFamily: "'DM Mono',monospace",
                    fontSize: 12,
                  }}
                >
                  ✕
                </button>
              </div>
            </div>
            {[
              ['🔴 Problem', activeProject.caseStudy.problem],
              ['🔵 Process', activeProject.caseStudy.process],
              ['🟢 Result', activeProject.caseStudy.result],
            ].map(([title, text]) => (
              <div key={title} style={{ marginBottom: 24 }}>
                <p
                  style={{
                    fontSize: 12,
                    fontFamily: "'DM Mono',monospace",
                    color: '#666',
                    letterSpacing: 1,
                    margin: '0 0 8px',
                    textAlign: 'left',
                  }}
                >
                  {title}
                </p>
                <p
                  style={{
                    fontSize: 15,
                    color: '#ccc',
                    lineHeight: 1.75,
                    margin: 0,
                    textAlign: 'left',
                  }}
                >
                  {text}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── NAV ── */}
      <CardNav
        logoText="<Ousa />"
        menuColor="#A78BFA"
        buttonBgColor="#8B5CF6"
        buttonTextColor="#fff"
        onCtaClick={() => scrollTo('Contact')}
        items={[
          {
            label: 'About',
            bgColor: '#120f1e',
            textColor: '#e8e8e8',
            links: [
              { label: 'My Story', onClick: () => scrollTo('About') },
              { label: 'Experience', onClick: () => scrollTo('Experience') },
              { label: 'Skills', onClick: () => scrollTo('Skills') },
            ],
          },
          {
            label: 'Work',
            bgColor: '#0f0c1e',
            textColor: '#e8e8e8',
            links: [
              { label: 'Projects', onClick: () => scrollTo('Projects') },
              { label: 'The Process', onClick: () => scrollTo('Process') },
            ],
          },
          {
            label: 'Contact',
            bgColor: '#130f20',
            textColor: '#e8e8e8',
            links: [
              { label: 'Get in Touch', onClick: () => scrollTo('Contact') },
              { label: 'ousauser@gmail.com', onClick: () => { } },
            ],
          },
        ]}
      />

      {/* ── HERO ── */}
      <header
        style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          position: 'relative',
          overflow: 'hidden',
          width: '100%',
        }}
      >
        <DotGrid
          dotSize={6}
          gap={22}
          baseColor="#2a1f50"
          activeColor="#c084fc"
          proximity={140}
          shockRadius={280}
          shockStrength={6}
          resistance={750}
          returnDuration={1.5}
        />
        <div
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: 220,
            background: 'linear-gradient(transparent,#080810)',
            zIndex: 1,
            pointerEvents: 'none',
          }}
        />
        <Inner style={{ position: 'relative', zIndex: 2, textAlign: 'left' }}>
          <div style={{ maxWidth: 820 }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                marginBottom: 20,
                animation: 'fadeUp .6s ease both',
              }}
            >
              <span
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  background: '#3DAB72',
                  display: 'inline-block',
                  boxShadow: '0 0 8px #3DAB72',
                }}
              />
              <span
                style={{
                  fontFamily: "'DM Mono',monospace",
                  fontSize: 12,
                  color: '#3DAB72',
                  letterSpacing: 1,
                }}
              >
                Available for projects
              </span>
            </div>
            <h1 className="hero-h1">
              Chea
              <br />
              <span style={{ color: ACCENT }}>Ousa.</span>
            </h1>
            <p
              style={{
                fontSize: 'clamp(16px,2.2vw,22px)',
                color: '#777',
                fontWeight: 300,
                maxWidth: 540,
                lineHeight: 1.7,
                margin: '0 0 12px',
                textAlign: 'left',
                animation: 'fadeUp .6s .15s ease both',
              }}
            >
              UX/UI, Web Design & Development.
            </p>
            <p
              style={{
                fontSize: 'clamp(14px,1.6vw,17px)',
                color: '#555',
                fontWeight: 300,
                maxWidth: 500,
                lineHeight: 1.8,
                margin: '0 0 36px',
                textAlign: 'left',
                animation: 'fadeUp .6s .2s ease both',
              }}
            >
              Crafting seamless digital experiences — from design to
              development.
            </p>
            <div
              style={{
                display: 'flex',
                gap: 8,
                marginBottom: 40,
                flexWrap: 'wrap',
                animation: 'fadeUp .6s .25s ease both',
              }}
            >
              {['Phnom Penh, Cambodia', 'Web Design', 'UX/UI', 'Webflow'].map(
                (tag) => (
                  <span
                    key={tag}
                    style={{
                      fontSize: 11,
                      fontFamily: "'DM Mono',monospace",
                      color: ACCENT2,
                      border: `1px solid ${ACCENT}44`,
                      padding: '4px 10px',
                      borderRadius: 99,
                      background: '#8B5CF611',
                    }}
                  >
                    {tag}
                  </span>
                )
              )}
            </div>
            <div
              className="hero-btns"
              style={{ animation: 'fadeUp .6s .3s ease both' }}
            >
              <button
                onClick={() => scrollTo('Projects')}
                style={{
                  padding: '14px 32px',
                  background: ACCENT,
                  border: 'none',
                  borderRadius: 8,
                  color: '#fff',
                  fontFamily: "'Sora',sans-serif",
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'opacity .2s',
                }}
                onMouseEnter={(e) => (e.target.style.opacity = 0.85)}
                onMouseLeave={(e) => (e.target.style.opacity = 1)}
              >
                View My Work
              </button>
              <button
                onClick={() => scrollTo('Contact')}
                style={{
                  padding: '14px 32px',
                  background: 'transparent',
                  border: '1px solid #2a2040',
                  borderRadius: 8,
                  color: '#aaa',
                  fontFamily: "'Sora',sans-serif",
                  fontSize: 14,
                  cursor: 'pointer',
                  transition: 'border-color .2s,color .2s',
                }}
                onMouseEnter={(e) => {
                  e.target.style.borderColor = ACCENT;
                  e.target.style.color = ACCENT;
                }}
                onMouseLeave={(e) => {
                  e.target.style.borderColor = '#2a2040';
                  e.target.style.color = '#aaa';
                }}
              >
                Get in Touch
              </button>
            </div>
          </div>
        </Inner>
        <div
          style={{
            position: 'absolute',
            bottom: 32,
            left: '50%',
            transform: 'translateX(-50%)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 8,
            zIndex: 2,
            animation: 'fadeIn 1s 1s ease both',
          }}
        >
          <span
            style={{
              fontSize: 10,
              color: '#2a1f50',
              letterSpacing: 3,
              fontFamily: "'DM Mono',monospace",
            }}
          >
            SCROLL
          </span>
          <div
            style={{
              width: 1,
              height: 40,
              background: `linear-gradient(${ACCENT},transparent)`,
              animation: 'pulse 2s infinite',
            }}
          />
        </div>
      </header>

      {/* ── MARQUEE — past clients ── */}
      <div
        style={{
          borderTop: '1px solid #0f0d1a',
          borderBottom: '1px solid #0f0d1a',
          background: '#06050e',
        }}
      >
        <div
          style={{ padding: '4px 0', display: 'flex', alignItems: 'center' }}
        >
          <div
            style={{
              flexShrink: 0,
              padding: '0 20px',
              borderRight: '1px solid #1a1030',
            }}
          >
            <span
              style={{
                fontSize: 10,
                fontFamily: "'DM Mono',monospace",
                color: '#333',
                letterSpacing: 2,
                whiteSpace: 'nowrap',
              }}
            >
              PAST WORK
            </span>
          </div>
          <Marquee items={MARQUEE_SITES} />
        </div>
      </div>

      {/* ── ABOUT ── */}
      <Section id="About">
        <Inner>
          <SL n="01" label="ABOUT" />
          <div className="about-grid">
            <div>
              <h2
                style={{
                  fontSize: 'clamp(28px,5vw,42px)',
                  fontWeight: 700,
                  letterSpacing: -1.5,
                  margin: '0 0 20px',
                  lineHeight: 1.15,
                  textAlign: 'left',
                }}
              >
                Hello Again 👋
              </h2>
              <p
                style={{
                  color: '#888',
                  lineHeight: 1.85,
                  margin: '0 0 20px',
                  fontSize: 15,
                  textAlign: 'left',
                }}
              >
                I'm a user-centered designer with a passion for creating
                user-friendly and accessible digital experiences. I believe the
                best designs are built with the user in mind — and I use a
                variety of research methods to make sure of it.
              </p>
              <p
                style={{
                  color: '#888',
                  lineHeight: 1.85,
                  margin: '0 0 32px',
                  fontSize: 15,
                  textAlign: 'left',
                }}
              >
                Based in{' '}
                <strong style={{ color: '#ccc' }}>Phnom Penh, Cambodia</strong>,
                I've spent 8+ years working across banking, NGOs, and
                hospitality — bridging the gap between structured execution and
                beautiful design.
              </p>
              <div
                style={{
                  display: 'flex',
                  gap: 'clamp(24px,5vw,48px)',
                  flexWrap: 'wrap',
                }}
              >
                {[
                  { to: 8, suffix: '+', label: 'Years Experience' },
                  { to: 20, suffix: '+', label: 'Projects Delivered' },
                  { to: 3, suffix: '', label: 'Industries' },
                ].map(({ to, suffix, label }) => (
                  <div key={label}>
                    <p
                      style={{
                        fontSize: 36,
                        fontWeight: 700,
                        color: ACCENT2,
                        letterSpacing: -1,
                        margin: '0 0 4px',
                        textAlign: 'left',
                        fontFamily: "'Sora',sans-serif",
                      }}
                    >
                      <CountUp from={0} to={to} duration={2} delay={0.2} />
                      {suffix}
                    </p>
                    <p
                      style={{
                        fontSize: 12,
                        color: '#555',
                        fontFamily: "'DM Mono',monospace",
                        margin: 0,
                        textAlign: 'left',
                      }}
                    >
                      {label}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Highlight cards */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: 12,
              }}
            >
              {[
                {
                  icon: '🏦',
                  title: 'Digital Banking',
                  desc: 'Mobile Banking rollouts at Canadia Bank — from design to go-live.',
                  glowColor: '270 70 75',
                  colors: ['#c084fc', '#818cf8', '#6366f1'],
                },
                {
                  icon: '🌐',
                  title: 'Webflow Expert',
                  desc: '95% certified. Built sites for UNDP, GIZ & ILO.',
                  glowColor: '239 68 68',
                  colors: ['#818cf8', '#6366f1', '#c084fc'],
                },
                {
                  icon: '📐',
                  title: 'UX Strategy',
                  desc: 'Research, wireframes & user testing across 3 industries.',
                  glowColor: '285 70 70',
                  colors: ['#e879f9', '#c084fc', '#818cf8'],
                },
                {
                  icon: '🚀',
                  title: 'Agile PM',
                  desc: 'Zero scope creep. On-time delivery. Stakeholder NPS 9/10.',
                  glowColor: '200 80 65',
                  colors: ['#38bdf8', '#818cf8', '#c084fc'],
                },
              ].map(({ icon, title, desc, glowColor, colors }) => (
                <BorderGlow
                  key={title}
                  glowColor={glowColor}
                  colors={colors}
                  borderRadius={14}
                  glowRadius={32}
                  glowIntensity={1.1}
                >
                  <div style={{ padding: '20px' }}>
                    <span
                      style={{ fontSize: 24, display: 'block', marginBottom: 8 }}
                    >
                      {icon}
                    </span>
                    <p
                      style={{
                        fontSize: 13,
                        fontWeight: 600,
                        color: '#e8e8e8',
                        margin: '0 0 4px',
                        textAlign: 'left',
                      }}
                    >
                      {title}
                    </p>
                    <p
                      style={{
                        fontSize: 12,
                        color: '#555',
                        lineHeight: 1.5,
                        margin: 0,
                        textAlign: 'left',
                      }}
                    >
                      {desc}
                    </p>
                  </div>
                </BorderGlow>
              ))}
            </div>
          </div>
        </Inner>
      </Section>

      {/* ── SERVICES ── */}
      <Section id="Services" style={{ paddingTop: 0 }}>
        <Inner>
          <SL n="02" label="SERVICES" />
          <h2
            style={{
              fontSize: 'clamp(28px,5vw,42px)',
              fontWeight: 700,
              letterSpacing: -1.5,
              margin: '0 0 12px',
              textAlign: 'left',
            }}
          >
            Results-driven design,
            <br />
            with a personal touch.
          </h2>
          <p
            style={{
              color: '#666',
              fontSize: 15,
              margin: '0 0 48px',
              maxWidth: 480,
              lineHeight: 1.75,
              textAlign: 'left',
            }}
          >
            Want a better website? I design user-friendly sites that look great
            and are easy to use. Let's chat.
          </p>
          <div className="services-grid">
            {SERVICES.map((s) => (
              <BorderGlow
                key={s.title}
                glowColor="270 70 75"
                colors={['#c084fc', '#818cf8', '#6366f1']}
                borderRadius={16}
                glowRadius={36}
                glowIntensity={1.1}
              >
                <div style={{ padding: 'clamp(20px,4vw,28px)' }}>
                  <span
                    style={{ fontSize: 28, display: 'block', marginBottom: 14 }}
                  >
                    {s.icon}
                  </span>
                  <h3
                    style={{
                      fontSize: 17,
                      fontWeight: 600,
                      color: '#e8e8e8',
                      margin: '0 0 10px',
                      textAlign: 'left',
                    }}
                  >
                    {s.title}
                  </h3>
                  <p
                    style={{
                      fontSize: 13,
                      color: '#666',
                      lineHeight: 1.75,
                      margin: 0,
                      textAlign: 'left',
                    }}
                  >
                    {s.desc}
                  </p>
                </div>
              </BorderGlow>
            ))}
          </div>
        </Inner>
      </Section>

      {/* ── PROJECTS ── */}
      <Section id="Projects" style={{ paddingTop: 0 }}>
        <Inner>
          <SL n="03" label="SELECTED WORK" />
          <h2
            style={{
              fontSize: 'clamp(28px,5vw,42px)',
              fontWeight: 700,
              letterSpacing: -1.5,
              margin: '0 0 12px',
              textAlign: 'left',
            }}
          >
            A taste of what I can do.
          </h2>
          <p
            style={{
              color: '#555',
              fontSize: 14,
              margin: '0 0 48px',
              fontFamily: "'DM Mono',monospace",
              textAlign: 'left',
            }}
          >
            Hover to illuminate · Click to read the case study →
          </p>
          <div className="projects-grid">
            {PROJECTS.map((p) => (
              <BorderGlow
                key={p.id}
                glowColor={p.glowColor}
                colors={p.colors}
                borderRadius={16}
                glowRadius={44}
                glowIntensity={1.3}
                edgeSensitivity={20}
              >
                <div
                  onClick={() => setOpenCase(p.id)}
                  style={{ padding: 'clamp(20px,4vw,32px)', cursor: 'pointer' }}
                >
                  <span
                    style={{ fontSize: 32, display: 'block', marginBottom: 16 }}
                  >
                    {p.icon}
                  </span>
                  <span
                    style={{
                      fontSize: 11,
                      fontFamily: "'DM Mono',monospace",
                      color: p.accent,
                      letterSpacing: 1,
                      display: 'block',
                      margin: '0 0 8px',
                    }}
                  >
                    {p.tag}
                  </span>
                  <h3
                    style={{
                      fontSize: 19,
                      fontWeight: 600,
                      letterSpacing: -0.5,
                      color: '#e8e8e8',
                      margin: '0 0 10px',
                      textAlign: 'left',
                    }}
                  >
                    {p.title}
                  </h3>
                  <p
                    style={{
                      fontSize: 13,
                      color: '#666',
                      lineHeight: 1.75,
                      margin: '0 0 16px',
                      textAlign: 'left',
                    }}
                  >
                    {p.desc}
                  </p>
                  <span
                    style={{
                      fontSize: 12,
                      color: p.accent,
                      fontFamily: "'DM Mono',monospace",
                    }}
                  >
                    Read case study →
                  </span>
                </div>
              </BorderGlow>
            ))}
          </div>
        </Inner>
      </Section>

      {/* ── THE PROCESS ── */}
      <Section id="Process" style={{ paddingTop: 0 }}>
        <Inner>
          <SL n="04" label="THE PROCESS" />
          <h2
            style={{
              fontSize: 'clamp(28px,5vw,42px)',
              fontWeight: 700,
              letterSpacing: -1.5,
              margin: '0 0 12px',
              textAlign: 'left',
            }}
          >
            You're 5 steps away
            <br />
            from a new website.
          </h2>
          <p
            style={{
              color: '#666',
              fontSize: 15,
              margin: '0 0 48px',
              maxWidth: 480,
              lineHeight: 1.75,
              textAlign: 'left',
            }}
          >
            At every stage I prioritise user research and testing to ensure the
            end result meets the needs of your audience.
          </p>
          <div className="process-grid">
            {PROCESS.map((step, i) => (
              <BorderGlow
                key={step.num}
                glowColor="270 70 75"
                colors={['#c084fc', '#818cf8', '#6366f1']}
                borderRadius={14}
                glowRadius={32}
                glowIntensity={1.0}
              >
                <div style={{ padding: '24px' }}>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                      marginBottom: 14,
                    }}
                  >
                    <span
                      style={{
                        fontSize: 11,
                        fontFamily: "'DM Mono',monospace",
                        color: ACCENT,
                        letterSpacing: 1,
                        background: '#8B5CF611',
                        border: `1px solid ${ACCENT}33`,
                        padding: '3px 10px',
                        borderRadius: 99,
                      }}
                    >
                      {step.num}
                    </span>
                  </div>
                  <h3
                    style={{
                      fontSize: 16,
                      fontWeight: 600,
                      color: '#e8e8e8',
                      margin: '0 0 10px',
                      textAlign: 'left',
                    }}
                  >
                    {step.title}
                  </h3>
                  <p
                    style={{
                      fontSize: 13,
                      color: '#666',
                      lineHeight: 1.7,
                      margin: 0,
                      textAlign: 'left',
                    }}
                  >
                    {step.desc}
                  </p>
                </div>
              </BorderGlow>
            ))}
          </div>
        </Inner>
      </Section>

      {/* ── EXPERIENCE ── */}
      <Section id="Experience" style={{ paddingTop: 0 }}>
        <Inner>
          <SL n="05" label="EXPERIENCE" />
          <h2
            style={{
              fontSize: 'clamp(28px,5vw,42px)',
              fontWeight: 700,
              letterSpacing: -1.5,
              margin: '0 0 56px',
              textAlign: 'left',
            }}
          >
            Work History
          </h2>
          <div className="exp-grid">
            <ExperienceList items={expLeft} />
            <ExperienceList items={expRight} />
          </div>
          <h2
            style={{
              fontSize: 'clamp(22px,4vw,32px)',
              fontWeight: 700,
              letterSpacing: -1,
              margin: '64px 0 32px',
              textAlign: 'left',
            }}
          >
            Education & Certifications
          </h2>
          <div className="edu-grid">
            {EDUCATION.map((ed, i) => (
              <BorderGlow
                key={i}
                glowColor="270 70 75"
                colors={['#c084fc', '#818cf8', '#6366f1']}
                borderRadius={12}
                glowRadius={32}
              >
                <div style={{ padding: '20px 24px' }}>
                  <p
                    style={{
                      fontSize: 15,
                      fontWeight: 600,
                      color: '#e8e8e8',
                      margin: '0 0 6px',
                      textAlign: 'left',
                    }}
                  >
                    {ed.degree}
                  </p>
                  <p
                    style={{
                      fontSize: 13,
                      color: ACCENT2,
                      fontFamily: "'DM Mono',monospace",
                      margin: '0 0 4px',
                      textAlign: 'left',
                    }}
                  >
                    {ed.school}
                  </p>
                  <p
                    style={{
                      fontSize: 11,
                      color: '#444',
                      fontFamily: "'DM Mono',monospace",
                      margin: 0,
                      textAlign: 'left',
                    }}
                  >
                    {ed.year}
                  </p>
                </div>
              </BorderGlow>
            ))}
          </div>
        </Inner>
      </Section>

      {/* ── SKILLS ── */}
      <Section id="Skills" style={{ paddingTop: 0 }}>
        <Inner>
          <SL n="06" label="SKILLS" />
          <h2
            style={{
              fontSize: 'clamp(28px,5vw,42px)',
              fontWeight: 700,
              letterSpacing: -1.5,
              margin: '0 0 56px',
              textAlign: 'left',
            }}
          >
            Areas of Expertise
          </h2>
          <div className="skills-grid">
            <div>
              {SKILLS.slice(0, 4).map((s, i) => (
                <SkillBar
                  key={s.name}
                  name={s.name}
                  level={s.level}
                  delay={i * 80}
                />
              ))}
            </div>
            <div>
              {SKILLS.slice(4).map((s, i) => (
                <SkillBar
                  key={s.name}
                  name={s.name}
                  level={s.level}
                  delay={i * 80}
                />
              ))}
            </div>
          </div>
          <h3
            style={{
              fontSize: 'clamp(18px,3vw,22px)',
              fontWeight: 600,
              margin: '56px 0 24px',
              letterSpacing: -0.5,
              textAlign: 'left',
            }}
          >
            Tools & Platforms
          </h3>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
            {TOOLS.map((t) => (
              <div
                key={t.name}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '9px 16px',
                  borderRadius: 99,
                  border: '1px solid #1a1030',
                  background: '#0d0b18',
                  fontSize: 13,
                  color: '#bbb',
                }}
              >
                <span>{t.icon}</span>
                {t.name}
              </div>
            ))}
          </div>
          <h3
            style={{
              fontSize: 'clamp(18px,3vw,22px)',
              fontWeight: 600,
              margin: '48px 0 24px',
              letterSpacing: -0.5,
              textAlign: 'left',
            }}
          >
            Languages
          </h3>
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 16,
              maxWidth: 480,
            }}
          >
            {LANGUAGES.map((l) => (
              <div key={l.lang}>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    marginBottom: 7,
                  }}
                >
                  <span
                    style={{
                      fontSize: 13,
                      fontFamily: "'DM Mono',monospace",
                      color: '#ccc',
                      textAlign: 'left',
                    }}
                  >
                    {l.lang}
                  </span>
                  <span
                    style={{
                      fontSize: 11,
                      color: '#555',
                      fontFamily: "'DM Mono',monospace",
                      textAlign: 'right',
                    }}
                  >
                    {l.level}
                  </span>
                </div>
                <div
                  style={{
                    height: 3,
                    background: '#1e1e1e',
                    borderRadius: 99,
                    overflow: 'hidden',
                  }}
                >
                  <div
                    style={{
                      height: '100%',
                      width: `${l.pct}%`,
                      background: `linear-gradient(90deg,${ACCENT},${ACCENT2})`,
                      borderRadius: 99,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </Inner>
      </Section>

      {/* ── TESTIMONIALS ── */}
      <Section style={{ paddingTop: 0 }}>
        <Inner>
          <SL n="07" label="TESTIMONIALS" />
          <h2
            style={{
              fontSize: 'clamp(28px,5vw,42px)',
              fontWeight: 700,
              letterSpacing: -1.5,
              margin: '0 0 48px',
              textAlign: 'left',
            }}
          >
            What Clients Say
          </h2>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 24,
            }}
          >
            <span
              style={{
                fontSize: 13,
                color: '#555',
                fontFamily: "'DM Mono',monospace",
              }}
            >
              {tSlide + 1} / {tGroups.length}
            </span>
            <div style={{ display: 'flex', gap: 10 }}>
              {[
                [-1, '←'],
                [1, '→'],
              ].map(([dir, label], idx) => (
                <button
                  key={idx}
                  onClick={() =>
                    setTSlide(
                      (s) => (s + dir + tGroups.length) % tGroups.length
                    )
                  }
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: '50%',
                    background: '#0d0b18',
                    border: `1px solid ${ACCENT}44`,
                    color: ACCENT2,
                    fontSize: 16,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'background .2s,border-color .2s',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = ACCENT + '22';
                    e.currentTarget.style.borderColor = ACCENT;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = '#0d0b18';
                    e.currentTarget.style.borderColor = ACCENT + '44';
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
          <div style={{ overflow: 'hidden', marginBottom: 24 }}>
            <div
              style={{
                display: 'flex',
                transition: 'transform .55s cubic-bezier(.22,1,.36,1)',
                transform: `translateX(-${tSlide * 100}%)`,
              }}
            >
              {tGroups.map((group, gi) => (
                <div key={gi} style={{ minWidth: '100%' }}>
                  {/* ── Responsive grid: columns set by tPerSlide ── */}
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: `repeat(${group.length}, 1fr)`,
                      gap: 24,
                    }}
                  >
                    {group.map((t) => (
                      <BorderGlow
                        key={t.name}
                        glowColor="270 60 80"
                        colors={['#a78bfa', '#c084fc', '#818cf8']}
                        borderRadius={16}
                        glowRadius={28}
                        glowIntensity={1.0}
                        edgeSensitivity={22}
                      >
                        <div
                          style={{
                            padding:
                              'clamp(20px,4vw,36px) clamp(20px,4vw,32px)',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 20,
                            height: '100%',
                          }}
                        >
                          <span
                            style={{
                              fontSize: 40,
                              color: ACCENT,
                              lineHeight: 1,
                              opacity: 0.3,
                              fontFamily: 'Georgia,serif',
                              display: 'block',
                            }}
                          >
                            "
                          </span>
                          <p
                            style={{
                              fontSize: 14,
                              color: '#bbb',
                              lineHeight: 1.85,
                              fontStyle: 'italic',
                              flex: 1,
                              margin: 0,
                              textAlign: 'left',
                            }}
                          >
                            {t.quote}
                          </p>
                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 12,
                            }}
                          >
                            <div
                              style={{
                                width: 38,
                                height: 38,
                                borderRadius: '50%',
                                background: `linear-gradient(135deg,${ACCENT},#6366F1)`,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: 11,
                                fontWeight: 700,
                                color: '#fff',
                                flexShrink: 0,
                              }}
                            >
                              {t.avatar}
                            </div>
                            <div>
                              <p
                                style={{
                                  fontSize: 14,
                                  fontWeight: 600,
                                  color: '#e8e8e8',
                                  margin: '0 0 2px',
                                  textAlign: 'left',
                                }}
                              >
                                {t.name}
                              </p>
                              <p
                                style={{
                                  fontSize: 11,
                                  color: '#555',
                                  fontFamily: "'DM Mono',monospace",
                                  margin: 0,
                                  textAlign: 'left',
                                }}
                              >
                                {t.role}
                              </p>
                            </div>
                          </div>
                        </div>
                      </BorderGlow>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 8 }}>
            {tGroups.map((_, i) => (
              <button
                key={i}
                onClick={() => setTSlide(i)}
                style={{
                  width: i === tSlide ? 28 : 8,
                  height: 8,
                  borderRadius: 99,
                  border: 'none',
                  cursor: 'pointer',
                  background: i === tSlide ? ACCENT : '#2a1f50',
                  transition: 'width .35s,background .35s',
                  padding: 0,
                }}
              />
            ))}
          </div>
        </Inner>
      </Section>

      {/* ── FAQS ── */}
      <Section style={{ paddingTop: 0 }}>
        <Inner>
          <SL n="08" label="FAQS" />
          {/* ── faq-2col: 2-col on desktop, stacks on mobile ── */}
          <div className="faq-2col">
            <div>
              <h2
                style={{
                  fontSize: 'clamp(28px,5vw,38px)',
                  fontWeight: 700,
                  letterSpacing: -1.5,
                  margin: '0 0 12px',
                  lineHeight: 1.2,
                  textAlign: 'left',
                }}
              >
                Frequently Asked Questions
              </h2>
              <p
                style={{
                  fontSize: 15,
                  color: '#555',
                  margin: '0 0 0',
                  lineHeight: 1.7,
                  textAlign: 'left',
                }}
              >
                Everything you need to know before we start working together.
              </p>
            </div>
            <div>
              {FAQS.map((f, i) => (
                <FaqItem key={i} q={f.q} a={f.a} />
              ))}
            </div>
          </div>
        </Inner>
      </Section>

      {/* ── ARTICLES ── */}
      <Section style={{ paddingTop: 0 }}>
        <Inner>
          <SL n="09" label="ARTICLES" />
          <h2
            style={{
              fontSize: 'clamp(28px,5vw,42px)',
              fontWeight: 700,
              letterSpacing: -1.5,
              margin: '0 0 12px',
              textAlign: 'left',
            }}
          >
            Lessons learned along
            <br />
            my design journey.
          </h2>
          <p
            style={{
              color: '#555',
              fontSize: 15,
              margin: '0 0 48px',
              maxWidth: 460,
              lineHeight: 1.75,
              textAlign: 'left',
            }}
          >
            Thoughts on UX, product management, and building digital products.
          </p>
          <div className="articles-grid">
            {ARTICLES.map((a, i) => (
              <BorderGlow
                key={i}
                glowColor="270 70 75"
                colors={['#c084fc', '#818cf8', '#6366f1']}
                borderRadius={14}
                glowRadius={32}
                glowIntensity={1.0}
              >
                <div style={{ padding: '28px', cursor: 'pointer' }}>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      marginBottom: 16,
                    }}
                  >
                    <span
                      style={{
                        fontSize: 10,
                        fontFamily: "'DM Mono',monospace",
                        color: ACCENT,
                        letterSpacing: 1,
                        background: '#8B5CF611',
                        border: `1px solid ${ACCENT}33`,
                        padding: '3px 10px',
                        borderRadius: 99,
                      }}
                    >
                      {a.tag}
                    </span>
                    <span
                      style={{
                        fontSize: 10,
                        color: '#444',
                        fontFamily: "'DM Mono',monospace",
                      }}
                    >
                      {a.read}
                    </span>
                  </div>
                  <h3
                    style={{
                      fontSize: 16,
                      fontWeight: 600,
                      color: '#e8e8e8',
                      margin: '0 0 10px',
                      lineHeight: 1.4,
                      textAlign: 'left',
                    }}
                  >
                    {a.title}
                  </h3>
                  <p
                    style={{
                      fontSize: 13,
                      color: '#666',
                      lineHeight: 1.65,
                      margin: '0 0 20px',
                      textAlign: 'left',
                    }}
                  >
                    {a.subtitle}
                  </p>
                  <span
                    style={{
                      fontSize: 12,
                      color: ACCENT2,
                      fontFamily: "'DM Mono',monospace",
                    }}
                  >
                    Read article →
                  </span>
                </div>
              </BorderGlow>
            ))}
          </div>
        </Inner>
      </Section>

      {/* ── CONTACT ── */}
      <Section id="Contact" style={{ paddingTop: 0 }}>
        <Inner>
          <SL n="10" label="CONTACT" />
          {/* ── contact-2col: 2-col on desktop, stacks on mobile ── */}
          <div className="contact-2col">
            {/* Left col — info */}
            <div>
              <h2
                style={{
                  fontSize: 'clamp(28px,5vw,42px)',
                  fontWeight: 700,
                  letterSpacing: -1.5,
                  margin: '0 0 20px',
                  lineHeight: 1.15,
                  textAlign: 'left',
                }}
              >
                Let's build something great together.
              </h2>
              <p
                style={{
                  color: '#666',
                  margin: '0 0 40px',
                  fontSize: 15,
                  lineHeight: 1.75,
                  textAlign: 'left',
                }}
              >
                Have a project in mind? I'd love to hear about it. Send me a
                message and I'll get back to you within 24 hours.
              </p>
              {/* Contact details */}
              <div
                style={{ display: 'flex', flexDirection: 'column', gap: 16 }}
              >
                {[
                  { icon: '✉️', label: 'Email', value: 'ousauser@gmail.com' },
                  { icon: '📞', label: 'Phone', value: '+855 92 850 751' },
                  {
                    icon: '📍',
                    label: 'Location',
                    value: 'Phnom Penh, Cambodia',
                  },
                ].map(({ icon, label, value }) => (
                  <BorderGlow
                    key={label}
                    glowColor="270 70 75"
                    colors={['#c084fc', '#818cf8', '#6366f1']}
                    borderRadius={12}
                    glowRadius={28}
                    glowIntensity={1.0}
                  >
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 14,
                        padding: '16px',
                      }}
                    >
                      <span style={{ fontSize: 18, flexShrink: 0 }}>{icon}</span>
                      <div>
                        <p
                          style={{
                            fontSize: 11,
                            color: '#444',
                            fontFamily: "'DM Mono',monospace",
                            margin: '0 0 2px',
                            textAlign: 'left',
                          }}
                        >
                          {label}
                        </p>
                        <p
                          style={{
                            fontSize: 14,
                            color: '#ccc',
                            margin: 0,
                            textAlign: 'left',
                          }}
                        >
                          {value}
                        </p>
                      </div>
                    </div>
                  </BorderGlow>
                ))}
              </div>
              {/* Certifications */}
              <div style={{ marginTop: 40 }}>
                <p
                  style={{
                    fontSize: 11,
                    color: '#333',
                    fontFamily: "'DM Mono',monospace",
                    letterSpacing: 2,
                    margin: '0 0 12px',
                    textAlign: 'left',
                  }}
                >
                  CERTIFIED WITH
                </p>
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                  {[
                    'Google UX Design',
                    'Webflow Expert (95%)',
                    'Uxcel UX Design',
                  ].map((cert) => (
                    <span
                      key={cert}
                      style={{
                        fontSize: 11,
                        fontFamily: "'DM Mono',monospace",
                        color: '#555',
                        border: '1px solid #1a1030',
                        padding: '5px 12px',
                        borderRadius: 99,
                        background: '#06050e',
                      }}
                    >
                      {cert}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Right col — form */}
            <div>
              {sent ? (
                <div
                  style={{
                    padding: '32px',
                    borderRadius: 14,
                    border: `1px solid ${ACCENT}44`,
                    background: '#8B5CF611',
                    color: ACCENT2,
                    fontFamily: "'DM Mono',monospace",
                    fontSize: 14,
                  }}
                >
                  ✓ Message sent! I'll get back to you within 24 hours.
                </div>
              ) : (
                <div
                  style={{ display: 'flex', flexDirection: 'column', gap: 14 }}
                >
                  <div className="contact-grid">
                    <div>
                      <label
                        style={{
                          fontSize: 11,
                          color: '#555',
                          fontFamily: "'DM Mono',monospace",
                          display: 'block',
                          margin: '0 0 6px',
                          textAlign: 'left',
                        }}
                      >
                        First name *
                      </label>
                      <input
                        type="text"
                        placeholder="Ousa"
                        value={form.firstName}
                        onChange={(e) =>
                          setForm((p) => ({ ...p, firstName: e.target.value }))
                        }
                        style={inputStyle}
                        onFocus={onFocus}
                        onBlur={onBlur}
                      />
                    </div>
                    <div>
                      <label
                        style={{
                          fontSize: 11,
                          color: '#555',
                          fontFamily: "'DM Mono',monospace",
                          display: 'block',
                          margin: '0 0 6px',
                          textAlign: 'left',
                        }}
                      >
                        Last name *
                      </label>
                      <input
                        type="text"
                        placeholder="Chea"
                        value={form.lastName}
                        onChange={(e) =>
                          setForm((p) => ({ ...p, lastName: e.target.value }))
                        }
                        style={inputStyle}
                        onFocus={onFocus}
                        onBlur={onBlur}
                      />
                    </div>
                  </div>
                  <div>
                    <label
                      style={{
                        fontSize: 11,
                        color: '#555',
                        fontFamily: "'DM Mono',monospace",
                        display: 'block',
                        margin: '0 0 6px',
                        textAlign: 'left',
                      }}
                    >
                      Email *
                    </label>
                    <input
                      type="email"
                      placeholder="ousauser@gmail.com"
                      value={form.email}
                      onChange={(e) =>
                        setForm((p) => ({ ...p, email: e.target.value }))
                      }
                      style={inputStyle}
                      onFocus={onFocus}
                      onBlur={onBlur}
                    />
                  </div>
                  <div>
                    <label
                      style={{
                        fontSize: 11,
                        color: '#555',
                        fontFamily: "'DM Mono',monospace",
                        display: 'block',
                        margin: '0 0 6px',
                        textAlign: 'left',
                      }}
                    >
                      Current website (if applicable)
                    </label>
                    <input
                      type="text"
                      placeholder="www.yourwebsite.com"
                      value={form.website}
                      onChange={(e) =>
                        setForm((p) => ({ ...p, website: e.target.value }))
                      }
                      style={inputStyle}
                      onFocus={onFocus}
                      onBlur={onBlur}
                    />
                  </div>
                  <div className="contact-grid">
                    <div>
                      <label
                        style={{
                          fontSize: 11,
                          color: '#555',
                          fontFamily: "'DM Mono',monospace",
                          display: 'block',
                          margin: '0 0 6px',
                          textAlign: 'left',
                        }}
                      >
                        What do you need help with? *
                      </label>
                      <select
                        value={form.need}
                        onChange={(e) =>
                          setForm((p) => ({ ...p, need: e.target.value }))
                        }
                        style={{
                          ...inputStyle,
                          appearance: 'none',
                          cursor: 'pointer',
                          color: form.need ? '#e8e8e8' : '#444',
                        }}
                        onFocus={onFocus}
                        onBlur={onBlur}
                      >
                        <option value="" style={{ background: '#0d0b18' }}>
                          Select one…
                        </option>
                        {[
                          'Web Design',
                          'Web Development',
                          'UX/UI Design',
                          'Project Management',
                          'Other',
                        ].map((o) => (
                          <option
                            key={o}
                            value={o}
                            style={{ background: '#0d0b18' }}
                          >
                            {o}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label
                        style={{
                          fontSize: 11,
                          color: '#555',
                          fontFamily: "'DM Mono',monospace",
                          display: 'block',
                          margin: '0 0 6px',
                          textAlign: 'left',
                        }}
                      >
                        Budget *
                      </label>
                      <select
                        value={form.budget}
                        onChange={(e) =>
                          setForm((p) => ({ ...p, budget: e.target.value }))
                        }
                        style={{
                          ...inputStyle,
                          appearance: 'none',
                          cursor: 'pointer',
                          color: form.budget ? '#e8e8e8' : '#444',
                        }}
                        onFocus={onFocus}
                        onBlur={onBlur}
                      >
                        <option value="" style={{ background: '#0d0b18' }}>
                          Select one…
                        </option>
                        {[
                          'Under $1,500',
                          '$1,500 – $3,000',
                          '$3,000 – $6,000',
                          '$6,000+',
                          'Not sure yet',
                        ].map((o) => (
                          <option
                            key={o}
                            value={o}
                            style={{ background: '#0d0b18' }}
                          >
                            {o}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div>
                    <label
                      style={{
                        fontSize: 11,
                        color: '#555',
                        fontFamily: "'DM Mono',monospace",
                        display: 'block',
                        margin: '0 0 6px',
                        textAlign: 'left',
                      }}
                    >
                      Tell me about the project
                    </label>
                    <textarea
                      rows={4}
                      placeholder="Our current site looks dated and we want to update it…"
                      value={form.message}
                      onChange={(e) =>
                        setForm((p) => ({ ...p, message: e.target.value }))
                      }
                      style={{
                        ...inputStyle,
                        resize: 'vertical',
                        fontFamily: "'Sora',sans-serif",
                      }}
                      onFocus={onFocus}
                      onBlur={onBlur}
                    />
                  </div>
                  <button
                    onClick={handleSend}
                    style={{
                      padding: '15px 36px',
                      background: ACCENT,
                      border: 'none',
                      borderRadius: 10,
                      color: '#fff',
                      fontFamily: "'Sora',sans-serif",
                      fontSize: 14,
                      fontWeight: 600,
                      cursor: 'pointer',
                      transition: 'opacity .2s',
                      alignSelf: 'flex-start',
                      marginTop: 4,
                    }}
                    onMouseEnter={(e) => (e.target.style.opacity = 0.85)}
                    onMouseLeave={(e) => (e.target.style.opacity = 1)}
                  >
                    Send Message →
                  </button>
                </div>
              )}
            </div>
          </div>
        </Inner>
      </Section>

      {/* ── FOOTER ── */}
      <footer style={{ width: '100%', borderTop: '1px solid #0f0d1a' }}>
        <Inner
          style={{
            padding: '40px clamp(20px,5vw,40px)',
            display: 'flex',
            flexWrap: 'wrap',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 20,
          }}
        >
          <div>
            <span
              style={{
                fontFamily: "'DM Mono',monospace",
                fontSize: 14,
                color: ACCENT,
                letterSpacing: 1,
                display: 'block',
                marginBottom: 4,
              }}
            >
              &lt;Ousa /&gt;
            </span>
            <span
              style={{
                fontFamily: "'DM Mono',monospace",
                fontSize: 11,
                color: '#333',
                display: 'block',
              }}
            >
              UX/UI · Web Design · Development · Phnom Penh
            </span>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {[
              ['GitHub', '#'],
              ['LinkedIn', '#'],
              ['Dribbble', '#'],
              ['Email', 'mailto:ousauser@gmail.com'],
            ].map(([s, href]) => (
              <a
                key={s}
                href={href}
                style={{
                  fontSize: 12,
                  color: '#444',
                  fontFamily: "'DM Mono',monospace",
                  cursor: 'pointer',
                  transition: 'color .2s',
                  padding: '6px 12px',
                  border: '1px solid #1a1030',
                  borderRadius: 99,
                  textDecoration: 'none',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.color = ACCENT2)}
                onMouseLeave={(e) => (e.currentTarget.style.color = '#444')}
              >
                {s}
              </a>
            ))}
          </div>
          <span
            style={{
              fontFamily: "'DM Mono',monospace",
              fontSize: 11,
              color: '#2a1f50',
            }}
          >
            © 2026 Ousa Chea
          </span>
        </Inner>
      </footer>
    </div>
  );
}