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
import { useNavigate } from 'react-router-dom';
import Lenis from 'lenis';
import ProfileCard from './ProfileCard';
import Masonry from './Masonry';
import GradientText from './GradientText';

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
          background: 'rgba(10,8,20,0.65)',
          backdropFilter: 'blur(28px) saturate(180%)',
          WebkitBackdropFilter: 'blur(28px) saturate(180%)',
          borderRadius: 14,
          overflow: 'hidden',
          position: 'relative',
          boxShadow: '0 8px 40px rgba(0,0,0,0.6), 0 0 0 1px rgba(139,92,246,0.18), inset 0 1px 0 rgba(255,255,255,0.06)',
          // animated glow via pseudo handled below via style tag
        }}
      >
        {/* border glow ring */}
        <div style={{
          position: 'absolute', inset: 0, borderRadius: 14, pointerEvents: 'none', zIndex: 0,
          background: 'linear-gradient(135deg, rgba(139,92,246,0.22) 0%, rgba(168,85,247,0.08) 40%, rgba(99,102,241,0.18) 100%)',
          WebkitMaskImage: 'linear-gradient(#fff 0 0)',
          maskImage: 'linear-gradient(#fff 0 0)',
          WebkitMaskComposite: 'destination-in',
          maskComposite: 'exclude',
        }} />
        {/* top highlight line */}
        <div style={{
          position: 'absolute', top: 0, left: '10%', right: '10%', height: 1,
          background: 'linear-gradient(90deg, transparent, rgba(168,85,247,0.6), rgba(139,92,246,0.4), transparent)',
          borderRadius: 1, pointerEvents: 'none', zIndex: 1,
        }} />
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
            <BorderGlow
              key={idx}
              glowColor={item.glowColor || '270 70 75'}
              colors={item.colors || ['#c084fc','#a855f7','#818cf8']}
              borderRadius={10}
              glowRadius={36}
              glowIntensity={1.1}
              style={{ flex: '1 1 180px' }}
            >
            <div
              ref={(el) => {
                if (el) cardRefs.current[idx] = el;
              }}
              style={{
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
            </BorderGlow>
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
  style = {},
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
        ...style,
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
    image: 'https://cdn.prod.website-files.com/67e0bf9e13613ecd0814bc70/67e0bf9e13613ecd0814bcf7_Canadia%20Bank%20App.png',
    desc: "Led the Webflow development and UX/UI design for Canadia Bank's V5 website — a modern, responsive platform aligned with the bank's brand identity.",
    caseStudy: {
      problem: "The previous website was outdated, difficult to navigate, and lacked mobile responsiveness. Customers struggled to find essential banking information, leading to increased support inquiries.",
      process: "Conducted a UX audit to identify pain points, redesigned the IA, created high-fidelity prototypes in Figma, then developed a clean, structured layout in Webflow optimised for desktop and mobile.",
      result: "Launched with a 30% increase in user engagement, 25% lower bounce rate, 40% drop in support inquiries, and 40% faster load times within the first three months.",
    },
    accent: '#f87171',
    glowColor: '0 75 62',
    colors: ['#f87171', '#c084fc', '#818cf8'],
  },
  {
    id: 2,
    title: 'UNDP Digital Strategy',
    tag: 'Web Design · Development',
    url: 'https://digitalstrategy.undp.org/',
    image: 'https://cdn.prod.website-files.com/67e0bf9e13613ecd0814bc70/67f38a948a714bcbc3c35934_UNDP%20-%20Digital%20Strategy%202022-2025.png',
    desc: "Led the full design and development of UNDP's Digital Strategy microsite — clean, responsive, and accessible across devices.",
    caseStudy: {
      problem: "UNDP needed a microsite to present their digital strategy clearly to a global audience across varying devices and connection speeds.",
      process: "Designed the full layout in Figma aligned with UNDP's global brand guidelines, then developed and optimised the site in Webflow for performance and accessibility.",
      result: "Delivered a high-performance, accessible microsite that met UNDP's brand and accessibility standards and reached a global audience.",
    },
    accent: '#38bdf8',
    glowColor: '207 65 52',
    colors: ['#38bdf8', '#818cf8', '#6366f1'],
  },
  {
    id: 3,
    title: 'UNDP DigitalX',
    tag: 'Web Design · Development',
    url: 'https://digitalx.undp.org/index.html',
    image: 'https://cdn.prod.website-files.com/67e0bf9e13613ecd0814bc70/67f394beabd9f040078e274f_Digital%20X.png',
    desc: 'Designed and developed DigitalX — a UNDP initiative showcasing innovative digital transformation solutions with interactive elements.',
    caseStudy: {
      problem: "The initiative needed a visually engaging platform that could communicate complex digital topics to a diverse global audience.",
      process: "Created the visual design system, built interactive components, and optimised for performance and accessibility across all devices.",
      result: "Successfully launched with smooth navigation and strong engagement metrics from the global user base.",
    },
    accent: '#38bdf8',
    glowColor: '205 55 50',
    colors: ['#38bdf8', '#6366f1', '#c084fc'],
  },
  {
    id: 4,
    title: 'Edge & Story',
    tag: 'Web Design · Development',
    url: 'https://www.edgeandstory.com/',
    image: 'https://cdn.prod.website-files.com/67e0bf9e13613ecd0814bc70/67e0cdb441031a9384a53166_edgeandstory%20_%20impact%20for%20culture%20and%20development.png',
    desc: "Redesigned and developed the website for edgeandstory — a consultancy in arts, culture, and sustainable development — creating a modern, user-friendly experience that effectively communicates their mission.",
    caseStudy: {
      problem: "The old site didn't communicate the consultancy's expertise or mission effectively, with poor information hierarchy and an outdated visual language.",
      process: "Redesigned the IA and visual design, focused on a portfolio-forward layout and clear communication of evaluation, research, and strategy services.",
      result: "Modern, accessible platform that effectively communicates their mission and received positive feedback from stakeholders.",
    },
    accent: '#a78bfa',
    glowColor: '270 70 75',
    colors: ['#c084fc', '#a78bfa', '#6366f1'],
  },
  {
    id: 5,
    title: 'Bright Consulting Limited',
    tag: 'Web Design · Development',
    url: 'https://www.bright.edu.vn/',
    image: 'https://cdn.prod.website-files.com/67e0bf9e13613ecd0814bc70/67f38c169dc229f94cd6f660_Bright%20Consulting%20Limited%20(1).png',
    desc: "Designed and developed the website for Bright Consulting Limited, an education consulting firm in Vietnam. Focused on a professional, trustworthy design language and clear content structure.",
    caseStudy: {
      problem: "The firm needed a credible online presence that could clearly showcase their services and student success stories to a Vietnamese and international audience.",
      process: "Designed in Figma with a clean, professional visual language, then developed in Webflow with structured content and intuitive navigation.",
      result: "Delivered a polished, mobile-optimised site that improved their brand credibility and streamlined lead generation.",
    },
    accent: '#34d399',
    glowColor: '160 70 45',
    colors: ['#34d399', '#10b981', '#38bdf8'],
  },
  {
    id: 6,
    title: 'CASIC Cambodia',
    tag: 'Web Design · Development',
    url: 'https://www.casiccambodia.net/',
    image: 'https://cdn.prod.website-files.com/67e0bf9e13613ecd0814bc70/67f392146a2ff432016a333e_CASIC%20-%20Home.png',
    desc: "Developed a clean, responsive website for CASIC Cambodia, a leading infrastructure and development company. Focused on performance, mobile optimisation, and a scalable CMS.",
    caseStudy: {
      problem: "CASIC needed a corporate site that reflected their scale and credibility while being easy to maintain internally as their project portfolio grew.",
      process: "Built a structured Webflow site with a scalable CMS, optimised for performance and mobile, with a clear information hierarchy for their services and projects.",
      result: "Launched a fast, maintainable site that supports ongoing content updates with ease and strengthened their digital presence.",
    },
    accent: '#34d399',
    glowColor: '150 70 42',
    colors: ['#34d399', '#818cf8', '#10b981'],
  },
  {
    id: 7,
    title: 'Data to Policy',
    tag: 'Web Design · Development',
    url: 'https://www.datatopolicy.org/',
    image: 'https://cdn.prod.website-files.com/67e0bf9e13613ecd0814bc70/67f3944c8f607e1fafd5ea89_Data%20to%20Policy%20Navigator.png',
    desc: "Worked on the design, development, and content creation for Data to Policy — a project transforming data into actionable policy insights with an intuitive layout and clear information architecture.",
    caseStudy: {
      problem: "The platform needed to present complex data and policy content in an accessible, digestible format for a diverse global audience of policymakers and researchers.",
      process: "Designed a streamlined layout in Figma with strong typographic hierarchy, then developed in Webflow with integrated CMS tools for ongoing content management.",
      result: "Delivered a clear, navigable platform that effectively bridges data and policy for its global user base.",
    },
    accent: '#fb923c',
    glowColor: '15 80 68',
    colors: ['#fb923c', '#f97316', '#c084fc'],
  },
  {
    id: 8,
    title: 'Eleven Degrees',
    tag: 'Web Design · Development',
    url: 'https://www.elevendegrees.com/',
    image: 'https://cdn.prod.website-files.com/67e0bf9e13613ecd0814bc70/67f3907006920d025d28bac2_Eleven%20Degrees_%20Where%20Beer%20Brings%20Us%20Together.png',
    desc: "Crafted a clean and professional digital presence for Eleven Degrees. Focused on visual hierarchy, minimal aesthetics, and a portfolio-forward layout to showcase their work.",
    caseStudy: {
      problem: "The brand needed a digital presence that matched their refined aesthetic and communicated their unique offering clearly to both local and international audiences.",
      process: "Designed a minimal, image-led layout in Figma, then built in Webflow with smooth transitions and optimised asset loading.",
      result: "Launched a polished site that elevated the brand's online presence and improved audience engagement.",
    },
    accent: '#a78bfa',
    glowColor: '270 70 75',
    colors: ['#c084fc', '#818cf8', '#6366f1'],
  },
  {
    id: 9,
    title: 'Fingertip',
    tag: 'Web Design · Development',
    url: 'https://www.getfingertip.io/',
    image: 'https://cdn.prod.website-files.com/67e0bf9e13613ecd0814bc70/67f38d6c6056abc25bd6dd64_FINGERTIP%20_%20Supply%20Chain%20Management%20Software.png',
    desc: "Developed Fingertip's marketing site — a platform for personalised digital business cards. Delivered a polished, responsive, performance-optimised site based on provided designs.",
    caseStudy: {
      problem: "Fingertip needed a high-converting marketing site that communicated their product value clearly and drove sign-ups in a competitive SaaS market.",
      process: "Developed pixel-perfectly from provided Figma designs in Webflow, focusing on performance, responsiveness, and smooth interactions.",
      result: "Delivered on schedule with excellent performance scores and a clean, conversion-focused experience.",
    },
    accent: '#fb923c',
    glowColor: '28 82 65',
    colors: ['#fb923c', '#fbbf24', '#c084fc'],
  },
  {
    id: 10,
    title: 'GIA Tower',
    tag: 'Web Design · Development',
    url: 'https://www.gia-tower.com/',
    image: 'https://cdn.prod.website-files.com/67e0bf9e13613ecd0814bc70/67f38a9d4d23ea6d10ec08bd_GIA%20Tower%20-%20Book%20Premium%20Office%20Space%20in%20Koh%20Pich.png',
    desc: "Developed the official website for GIA Tower, a luxury mixed-use development in Phnom Penh — a high-impact online presence showcasing the tower's premium offerings.",
    caseStudy: {
      problem: "The development needed a premium digital presence that conveyed the tower's luxury positioning and drove enquiries from high-value commercial tenants and investors.",
      process: "Built a high-impact Webflow site with strong visual storytelling, structured content for each offering, and optimised asset delivery.",
      result: "Delivered a striking, fast-loading site that effectively communicated the project's premium value to prospective tenants and investors.",
    },
    accent: '#fbbf24',
    glowColor: '45 68 65',
    colors: ['#fbbf24', '#f59e0b', '#c084fc'],
  },
  {
    id: 11,
    title: 'Hotel KVL',
    tag: 'Web Design · Development',
    url: 'https://www.hotelkvlgroup.com/',
    image: 'https://cdn.prod.website-files.com/67e0bf9e13613ecd0814bc70/67f38d2cbb1000f0b93f03f6_Hotel%20KVL%20Phnom%20Penh%20_%20Designed%20to%20connect.png',
    desc: "Designed and developed the corporate site for Hotel KVL Group. Delivered a brand-consistent site and conducted CMS training for the internal team.",
    caseStudy: {
      problem: "The hotel group needed a single corporate site that represented multiple properties consistently and could be managed internally without developer dependency.",
      process: "Designed a clean, brand-aligned layout in Figma, developed in Webflow with a structured CMS, and conducted a training session for the internal content team.",
      result: "The team can now manage all content independently, and the site provides a consistent, professional experience across all properties.",
    },
    accent: '#fbbf24',
    glowColor: '38 45 50',
    colors: ['#fbbf24', '#c084fc', '#818cf8'],
  },
  {
    id: 12,
    title: 'Multiple Natures',
    tag: 'Web Design · Development',
    url: 'https://www.multiplenatures.com/',
    image: 'https://cdn.prod.website-files.com/67e0bf9e13613ecd0814bc70/67f38ab58a714bcbc3c38645_Know%20more%20about%20Multiple%20Natures.png',
    desc: "Handled the development and ongoing maintenance of Multiple Natures' website — focused on stability, performance, and routine updates for their global network.",
    caseStudy: {
      problem: "The organisation needed a reliable, well-maintained web presence that could support their growing global network without technical disruptions.",
      process: "Took ownership of the Webflow site, implemented performance improvements, and managed ongoing content updates and maintenance cycles.",
      result: "Sustained a stable, performant site that supports Multiple Natures' global operations with minimal downtime.",
    },
    accent: '#38bdf8',
    glowColor: '214 80 42',
    colors: ['#38bdf8', '#6366f1', '#818cf8'],
  },
  {
    id: 13,
    title: 'OCIC Group',
    tag: 'Web Design · Development',
    url: 'https://www.ocic.com.kh/',
    image: 'https://cdn.prod.website-files.com/67e0bf9e13613ecd0814bc70/67f38a6205670d6f3ac30386_OCIC%20Group%20-%20Building%20Opportunities.png',
    desc: "Built and maintained OCIC's corporate website with multilingual support (Khmer, English, Chinese) — a structured, scalable solution for a leading Cambodian conglomerate.",
    caseStudy: {
      problem: "OCIC needed a multilingual corporate site that could serve Khmer, English, and Chinese audiences while remaining easy to maintain as their portfolio expanded.",
      process: "Built a scalable Webflow site with structured multilingual CMS, optimised information architecture, and consistent branding across all language versions.",
      result: "Delivered a robust trilingual platform that simplified content management and strengthened OCIC's corporate digital presence.",
    },
    accent: '#f87171',
    glowColor: '1 45 52',
    colors: ['#f87171', '#c084fc', '#818cf8'],
  },
  {
    id: 14,
    title: 'Photo Phnom Penh',
    tag: 'Web Design · Development',
    url: 'https://www.photophnompenh.com/',
    image: 'https://cdn.prod.website-files.com/67e0bf9e13613ecd0814bc70/67e0d0393bf3647ff18d9364_Photo%20Phnom%20Penh%20Association%20(PPPA).png',
    desc: "Designed the digital presence for Photo Phnom Penh Association — a nonprofit empowering young Cambodian photographers through skills, training, and global networking.",
    caseStudy: {
      problem: "The association needed a platform to showcase their photography events, connect with international partners, and provide free access to art resources for youth.",
      process: "Designed and developed a visually rich site that highlighted the photographers' work, event programming, and organisational mission.",
      result: "Launched a compelling platform that supported their annual festival and helped build their international network of artists and co-partners.",
    },
    accent: '#f472b6',
    glowColor: '340 75 58',
    colors: ['#f472b6', '#c084fc', '#818cf8'],
  },
  {
    id: 15,
    title: 'Residence 110',
    tag: 'Webflow Build',
    url: 'https://www.residence110.com/',
    image: 'https://cdn.prod.website-files.com/67e0bf9e13613ecd0814bc70/67e0d046d20dc31d2330a12d_Residence%20110%20Hotel%20and%20Apartment.png',
    desc: "Designed and built the website for Residence 110 — a boutique hotel in the heart of Phnom Penh's entertainment district — featuring online booking and rich property imagery.",
    caseStudy: {
      problem: "The hotel wanted an elegant online presence to showcase their property, establish brand credibility, and allow guests to book rooms directly online.",
      process: "Designed a layout featuring beautiful property imagery and a seamless booking form. Wrote compelling, SEO-optimised content and built the site in Webflow for easy self-management.",
      result: "Delivered a stunning, self-manageable site that drove direct bookings and positioned the hotel effectively in a competitive market.",
    },
    accent: '#fbbf24',
    glowColor: '42 72 52',
    colors: ['#fbbf24', '#f59e0b', '#c084fc'],
  },
  {
    id: 16,
    title: 'Richreay Group',
    tag: 'Design & Webflow Build',
    url: 'https://www.richreay.com/',
    image: 'https://cdn.prod.website-files.com/67e0bf9e13613ecd0814bc70/67e0d05741031a9384a75e3e_RichReay.png',
    desc: "Designed and developed the bilingual (English/Khmer) website for Richreay Group — a collection of Cambodian restaurants delivering unique food and beverage experiences.",
    caseStudy: {
      problem: "The group needed a bilingual website to showcase their restaurants, establish an online presence, and provide information to both local and international visitors.",
      process: "Designed a rich, food-forward layout with strong brand imagery, then built a bilingual Webflow site with seamless language switching between English and Khmer.",
      result: "Launched a vibrant, accessible site that effectively represents all Richreay restaurants and supports their growth in the Cambodian F&B sector.",
    },
    accent: '#fb923c',
    glowColor: '24 80 60',
    colors: ['#fb923c', '#fbbf24', '#c084fc'],
  },
  {
    id: 17,
    title: 'UN Innovation Network',
    tag: 'Web Design · Development',
    url: 'https://www.uninnovation.network/',
    image: 'https://cdn.prod.website-files.com/67e0bf9e13613ecd0814bc70/67f3947aa4f35e5305cee4aa_UN%20Innovation%20Network.png',
    desc: "Designed and developed the website for the UN Innovation Network — a user-centric platform fostering global collaboration in innovation across the UN system.",
    caseStudy: {
      problem: "The network needed a central platform to connect innovators across the UN system, making it easy to discover initiatives, share knowledge, and collaborate globally.",
      process: "Designed a clean, user-focused information architecture in Figma aligned with UN brand standards, then developed in Webflow with performance and accessibility in mind.",
      result: "Delivered a high-performance, accessible platform that strengthened collaboration across the global UN innovation community.",
    },
    accent: '#a78bfa',
    glowColor: '270 70 75',
    colors: ['#c084fc', '#818cf8', '#38bdf8'],
  },
  {
    id: 18,
    title: 'Vertical Fitness Center',
    tag: 'Web Design · Development',
    url: 'https://www.verticalfitnesscenter.com/',
    image: 'https://cdn.prod.website-files.com/67e0bf9e13613ecd0814bc70/67f390df947635c68329d1cc_Vertical%20Fitness%20-%20Vattanac%20Property.png',
    desc: "Designed and developed a dynamic website for Vertical Fitness Center. Prioritised UX, responsiveness, and bold visuals to reflect the brand's active lifestyle.",
    caseStudy: {
      problem: "The fitness center needed an energetic online presence that communicated their services and brand personality while driving membership enquiries.",
      process: "Designed a bold, visually driven layout in Figma with strong CTAs, then built in Webflow with optimised performance and mobile-first responsiveness.",
      result: "Launched a dynamic site that captured the brand's energy and drove an increase in membership enquiries.",
    },
    accent: '#2dd4bf',
    glowColor: '183 50 58',
    colors: ['#2dd4bf', '#38bdf8', '#818cf8'],
  },
  {
    id: 19,
    title: 're:edge Architecture',
    tag: 'Web Design · Development',
    url: 'https://www.reedgearchitecture.com/',
    image: 'https://cdn.prod.website-files.com/67e0bf9e13613ecd0814bc70/67f38a8a1b5f07467142a2d9_Principles.png',
    desc: "Developed a visually engaging, responsive website for re:edge Architecture — showcasing their architectural projects with an emphasis on sleek animations and performance.",
    caseStudy: {
      problem: "The architecture firm needed a portfolio site that let their work speak for itself — minimal, refined, and fast — without overshadowing the projects.",
      process: "Developed pixel-perfectly from provided designs in Webflow, implementing smooth scroll animations and optimising all assets for fast load times.",
      result: "Delivered an elegant, high-performance portfolio site that earned strong client and industry praise.",
    },
    accent: '#a78bfa',
    glowColor: '270 60 70',
    colors: ['#a78bfa', '#c084fc', '#818cf8'],
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
    slug: 'canadia-bank-mobile-banking-v3-vs-v5',
    title: 'Canadia Bank Mobile Banking v3 vs v5',
    subtitle:
      'From Strong Roots to Smarter Experiences: A UX/UI and Product Execution Perspective',
    tag: 'Case Study',
    read: '8 min read',
    date: 'May 2025',
  },
  {
    slug: 'waterfall-vs-agile',
    title: 'Waterfall vs Agile',
    subtitle: 'Which project management methodology is right for your team?',
    tag: 'Project Management',
    read: '5 min read',
    date: 'Apr 2025',
  },
  {
    slug: 'gestalt-principles-ux-designers',
    title: 'Gestalt Principles for UX Designers',
    subtitle:
      'How psychological laws shape effective, user-friendly digital interfaces.',
    tag: 'UX Design',
    read: '6 min read',
    date: 'Mar 2025',
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
        color: '#ffffff',
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
    <div ref={ref} style={{ marginBottom: 22 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 }}>
        <span style={{ fontSize: 13, color: '#ccc', textAlign: 'left' }}>{name}</span>
        <span style={{ fontSize: 12, fontFamily: "'DM Mono',monospace", color: ACCENT2, fontWeight: 500 }}>{level}%</span>
      </div>
      <div style={{ height: 5, background: 'rgba(255,255,255,0.06)', borderRadius: 99, overflow: 'visible', position: 'relative' }}>
        <div style={{
          height: '100%',
          width: vis ? `${level}%` : '0%',
          background: `linear-gradient(90deg,${ACCENT},${ACCENT2})`,
          borderRadius: 99,
          transition: `width 1s cubic-bezier(.22,1,.36,1) ${delay}ms`,
          boxShadow: `0 0 8px ${ACCENT}99`,
          position: 'relative',
        }}>
          {/* glowing tip */}
          <div style={{
            position: 'absolute',
            right: 0,
            top: '50%',
            transform: 'translateY(-50%)',
            width: 9,
            height: 9,
            borderRadius: '50%',
            background: ACCENT2,
            boxShadow: `0 0 8px 2px ${ACCENT}cc`,
            opacity: vis ? 1 : 0,
            transition: `opacity .3s ease ${delay + 800}ms`,
          }} />
        </div>
      </div>
    </div>
  );
}

function ExperienceItem({ e, i, isLast }) {
  const ref = useRef(null);
  const [cardVis, setCardVis] = useState(false);
  const [centered, setCentered] = useState(false);

  // one-time: fade card in when it first enters the viewport
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setCardVis(true); obs.disconnect(); } },
      { threshold: 0.1 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  // persistent: glow dot when card is in the centre 30% of the viewport
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => setCentered(entry.isIntersecting),
      { rootMargin: '-35% 0px -35% 0px', threshold: 0 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <div ref={ref} style={{ display: 'flex', gap: 20, alignItems: 'stretch' }}>

      {/* ── Timeline column ── */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0, width: 20 }}>
        {/* dot */}
        <div style={{
          width: 12,
          height: 12,
          borderRadius: '50%',
          border: `2px solid ${centered ? ACCENT : ACCENT + '44'}`,
          background: centered ? ACCENT : 'transparent',
          boxShadow: centered ? `0 0 12px ${ACCENT}cc, 0 0 28px ${ACCENT}55` : 'none',
          flexShrink: 0,
          marginTop: 26,
          zIndex: 1,
          transition: 'background .35s ease, box-shadow .35s ease, border-color .35s ease',
        }} />
        {/* line to next item */}
        {!isLast && (
          <div style={{
            width: 1,
            flex: 1,
            marginTop: 6,
            background: `linear-gradient(${ACCENT}55, ${ACCENT}11)`,
            transformOrigin: 'top',
            transform: cardVis ? 'scaleY(1)' : 'scaleY(0)',
            transition: `transform .6s ease ${i * 70 + 420}ms`,
          }} />
        )}
      </div>

      {/* ── Card ── */}
      <div style={{
        flex: 1,
        marginBottom: 16,
        opacity: cardVis ? 1 : 0,
        transform: cardVis ? 'translateX(0)' : 'translateX(20px)',
        transition: `opacity .5s ease ${i * 70}ms, transform .5s ease ${i * 70}ms`,
      }}>
        <BorderGlow
          glowColor="270 70 75"
          colors={['#c084fc', '#818cf8', '#6366f1']}
          borderRadius={14}
          glowRadius={36}
          glowIntensity={1.0}
        >
          <div className="exp-card-inner">
            <div className="exp-card-header">
              <div>
                <h3 style={{ fontSize: 16, fontWeight: 600, letterSpacing: -0.3, margin: '0 0 4px', textAlign: 'left' }}>
                  <GradientText colors={['#7c3aed','#a855f7','#c084fc','#a855f7','#7c3aed']} animationSpeed={8} pauseOnHover>{e.role}</GradientText>
                </h3>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 13, color: ACCENT2, fontFamily: "'DM Mono',monospace" }}>
                    {e.company}
                  </span>
                  {e.location && (
                    <>
                      <span style={{ color: '#2a1f50', fontSize: 10 }}>·</span>
                      <span style={{ fontSize: 11, color: '#444', fontFamily: "'DM Mono',monospace" }}>
                        {e.location}
                      </span>
                    </>
                  )}
                </div>
              </div>
              <span className="exp-period" style={{
                color: ACCENT,
                background: '#8B5CF611',
                border: `1px solid ${ACCENT}33`,
              }}>
                {e.period}
              </span>
            </div>
            <ul style={{ listStyle: 'none', margin: 0, paddingLeft: 0 }}>
              {e.bullets.map((b, j) => (
                <li key={j} style={{ fontSize: 13, color: '#666', lineHeight: 1.75, marginBottom: 4, paddingLeft: 16, position: 'relative' }}>
                  <span style={{ position: 'absolute', left: 0, color: ACCENT }}>›</span>
                  {b}
                </li>
              ))}
            </ul>
          </div>
        </BorderGlow>
      </div>

    </div>
  );
}

function ExperienceList({ items }) {
  return (
    <div>
      {items.map((e, i) => (
        <ExperienceItem key={i} e={e} i={i} isLast={i === items.length - 1} />
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
    <BorderGlow
      glowColor="270 70 75"
      colors={['#c084fc', '#818cf8', '#6366f1']}
      borderRadius={14}
      glowRadius={36}
      glowIntensity={1.0}
    >
      <div style={{ overflow: 'hidden' }}>
        <button
          onClick={() => setOpen((o) => !o)}
          style={{
            width: '100%',
            background: 'none',
            border: 'none',
            padding: '18px 22px',
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
            maxHeight: open ? 300 : 0,
            overflow: 'hidden',
            transition: 'max-height .35s ease',
          }}
        >
          <p
            style={{
              fontSize: 14,
              color: '#777',
              lineHeight: 1.75,
              margin: '0',
              padding: '0 22px 18px',
              textAlign: 'left',
            }}
          >
            {a}
          </p>
        </div>
      </div>
    </BorderGlow>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   Global CSS
───────────────────────────────────────────────────────────────────────────── */
const GLOBAL_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600;700&family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;1,9..40,300;1,9..40,400&family=DM+Mono:wght@400;500&display=swap');
  *,*::before,*::after{box-sizing:border-box;}
  html{scroll-snap-type:y proximity;scroll-padding-top:64px;}
  html,body{width:100%!important;max-width:100%!important;margin:0!important;padding:0!important;overflow-x:hidden!important;background:#080810!important;}
  body{font-family:'DM Sans',system-ui,sans-serif;}
  h1,h2,h3,h4,h5,h6{font-family:'Space Grotesk',system-ui,sans-serif;}
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
  .projects-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:clamp(16px,2vw,28px);}
  @media(max-width:900px){.projects-grid{grid-template-columns:repeat(2,1fr);}}
  @media(max-width:560px){.projects-grid{grid-template-columns:1fr;}}
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
  section{scroll-snap-align:start;}
  @media(max-width:640px){section{padding:60px 0!important;}.modal-inner{padding:24px!important;}}
  .hero-grid{display:grid;grid-template-columns:1fr auto;gap:clamp(40px,5vw,80px);align-items:center;}
  @media(max-width:900px){.hero-grid{grid-template-columns:1fr;}.hero-grid .pc-card-wrapper{display:none;}}

  /* ── Experience cards ── */
  .exp-card-inner{padding:24px 28px;}
  .exp-card-header{display:flex;justify-content:space-between;align-items:flex-start;gap:12px;margin-bottom:12px;flex-wrap:wrap;}
  .exp-period{font-size:11px;font-family:'DM Mono',monospace;white-space:nowrap;flex-shrink:0;padding:4px 12px;border-radius:99px;}
  @media(max-width:640px){
    .exp-card-inner{padding:16px 18px;}
    .exp-card-header{flex-direction:column;gap:8px;}
    .exp-period{align-self:flex-start;}
  }

  /* ── Stats bar ── */
  .stats-bar-grid{display:grid;grid-template-columns:repeat(5,1fr);}
  .stats-bar-item{padding:clamp(24px,4vw,36px) clamp(16px,2vw,28px);text-align:center;border-right:1px solid #1a1030;}
  .stats-bar-item:last-child{border-right:none;}
  @media(max-width:640px){
    .stats-bar-grid{grid-template-columns:repeat(2,1fr);}
    .stats-bar-item{border-right:none;border-bottom:1px solid #1a1030;padding:20px 12px;}
    .stats-bar-item:nth-child(odd){border-right:1px solid #1a1030;}
    .stats-bar-item:nth-last-child(1):nth-child(odd){grid-column:1/-1;border-right:none;}
  }

  /* ── Featured project card ── */
  .featured-card{display:grid;grid-template-columns:1fr 1fr;cursor:pointer;}
  .featured-card-img{border-radius:0 16px 16px 0;overflow:hidden;min-height:260px;}
  .featured-card-img img{width:100%;height:100%;object-fit:cover;display:block;}
  @media(max-width:700px){
    .featured-card{grid-template-columns:1fr!important;}
    .featured-card-img{border-radius:0 0 16px 16px!important;min-height:unset;aspect-ratio:16/9;}
    .featured-stats{gap:16px!important;}
    .featured-stats p:first-child{font-size:18px!important;}
  }

  /* ── Large screen (1440px+) ── */
  @media(min-width:1440px){
    .services-grid{grid-template-columns:repeat(4,1fr);}
    .process-grid{grid-template-columns:repeat(5,1fr);}
    .articles-grid{grid-template-columns:repeat(3,1fr);}
  }
`;

/* ─────────────────────────────────────────────────────────────────────────────
   ProcessFlow
───────────────────────────────────────────────────────────────────────────── */
function ProcessFlow() {
  const [active, setActive] = useState(0);
  const [animKey, setAnimKey] = useState(0);
  const DURATION = 6000;

  useEffect(() => {
    const id = setInterval(() => {
      setActive(a => (a + 1) % PROCESS.length);
      setAnimKey(k => k + 1);
    }, DURATION);
    return () => clearInterval(id);
  }, []);

  const step = PROCESS[active];

  return (
    <div>
      {/* ── progress dots ── */}
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 40 }}>
        {PROCESS.map((s, i) => {
          const isDone = i < active;
          const isCurrent = i === active;
          return (
            <React.Fragment key={s.num}>
              <button
                onClick={() => { setActive(i); setAnimKey(k => k + 1); }}
                style={{
                  width: 36, height: 36, borderRadius: '50%',
                  border: isCurrent ? '2px solid #a855f7' : isDone ? '2px solid rgba(139,92,246,0.45)' : '2px solid rgba(139,92,246,0.15)',
                  background: isCurrent ? 'linear-gradient(135deg,#7c3aed,#a855f7)' : isDone ? 'rgba(139,92,246,0.18)' : 'transparent',
                  color: isCurrent ? '#fff' : isDone ? '#a855f7' : '#444',
                  fontSize: 11, fontFamily: "'DM Mono',monospace", fontWeight: 600,
                  cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: isCurrent ? '0 0 16px #a855f755' : 'none',
                  transition: 'all 0.4s ease', flexShrink: 0,
                  padding: 0,
                }}
              >
                {isDone
                  ? <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M2.5 7l3 3L11.5 4" stroke="#a855f7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  : s.num}
              </button>
              {i < PROCESS.length - 1 && (
                <div style={{ flex: 1, height: 2, background: 'rgba(139,92,246,0.1)', position: 'relative', overflow: 'hidden' }}>
                  <div style={{
                    position: 'absolute', inset: 0,
                    background: 'linear-gradient(90deg,#7c3aed,#a855f7)',
                    transform: isDone ? 'scaleX(1)' : 'scaleX(0)',
                    transformOrigin: 'left',
                    transition: 'transform 0.6s ease',
                  }} />
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>

      {/* ── spotlight card ── */}
      <BorderGlow key={animKey} glowColor="270 70 75" colors={['#7c3aed','#a855f7','#c084fc','#818cf8']} borderRadius={20} glowRadius={48} glowIntensity={1.3}>
      <div style={{
        position: 'relative', overflow: 'hidden',
        borderRadius: 20,
        background: 'linear-gradient(135deg, rgba(139,92,246,0.07) 0%, rgba(99,102,241,0.04) 100%)',
        padding: 'clamp(32px,5vw,56px) clamp(28px,5vw,56px)',
        animation: 'spotlightIn 0.45s cubic-bezier(0.22,1,0.36,1)',
      }}>
        {/* ghost number */}
        <div style={{
          position: 'absolute', right: -10, top: -20,
          fontSize: 'clamp(120px,18vw,200px)',
          fontWeight: 900, fontFamily: "'Sora',sans-serif",
          color: 'rgba(139,92,246,0.05)',
          lineHeight: 1, userSelect: 'none', pointerEvents: 'none',
          letterSpacing: -8,
        }}>{step.num}</div>

        {/* step tag */}
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 8,
          padding: '5px 12px', borderRadius: 99,
          border: '1px solid rgba(139,92,246,0.25)',
          background: 'rgba(139,92,246,0.1)',
          marginBottom: 24,
        }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#a855f7', display: 'inline-block', animation: 'processRing 1.4s ease-out infinite' }} />
          <span style={{ fontSize: 10, fontFamily: "'DM Mono',monospace", color: '#a855f7', letterSpacing: 2 }}>STEP {step.num}</span>
        </div>

        {/* title */}
        <h3 style={{
          fontSize: 'clamp(26px,4vw,42px)', fontWeight: 700,
          color: '#f0f0f0', margin: '0 0 16px',
          fontFamily: "'Sora',sans-serif", letterSpacing: -1,
          maxWidth: '70%',
        }}>{step.title}</h3>

        {/* desc */}
        <p style={{
          fontSize: 15, color: '#777', lineHeight: 1.8,
          margin: '0 0 32px', maxWidth: 540,
        }}>{step.desc}</p>

        {/* auto-advance progress bar */}
        <div style={{ height: 2, background: 'rgba(139,92,246,0.12)', borderRadius: 2, overflow: 'hidden', maxWidth: 200 }}>
          <div key={animKey} style={{
            height: '100%',
            background: 'linear-gradient(90deg,#7c3aed,#a855f7)',
            borderRadius: 2,
            animation: `processBar ${DURATION}ms linear forwards`,
          }} />
        </div>
      </div>
      </BorderGlow>

      <style>{`
        @keyframes spotlightIn {
          from { opacity: 0; transform: translateY(14px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes processBar {
          from { width: 0%; }
          to   { width: 100%; }
        }
        @keyframes processRing {
          0%   { transform: scale(1);   opacity: 1; }
          100% { transform: scale(2.2); opacity: 0; }
        }
      `}</style>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   Portfolio
───────────────────────────────────────────────────────────────────────────── */
export default function Portfolio() {
  const navigate = useNavigate();
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

  const lenisRef = useRef<Lenis | null>(null);
  useEffect(() => {
    const lenis = new Lenis({ duration: 1.2, easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)), smoothWheel: true });
    lenisRef.current = lenis;
    let rafId: number;
    const raf = (time: number) => { lenis.raf(time); rafId = requestAnimationFrame(raf); };
    rafId = requestAnimationFrame(raf);
    return () => { cancelAnimationFrame(rafId); lenis.destroy(); };
  }, []);

  const scrollTo = (id: string) => {
    const el = document.getElementById(id);
    if (!el) return;
    lenisRef.current ? lenisRef.current.scrollTo(el, { offset: -64 }) : el.scrollIntoView({ behavior: 'smooth' });
  };

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
                  <GradientText colors={['#7c3aed','#a855f7','#c084fc','#a855f7','#7c3aed']} animationSpeed={8} pauseOnHover>{activeProject.title}</GradientText>
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
            <button
              onClick={() => { setOpenCase(null); navigate(`/projects/${activeProject.id}`); }}
              style={{ width: '100%', marginTop: 8, padding: '12px', background: ACCENT, border: 'none', borderRadius: 10, color: '#fff', fontFamily: "'DM Sans',sans-serif", fontSize: 14, fontWeight: 600, cursor: 'pointer', transition: 'opacity .2s' }}
              onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.opacity = '0.85'}
              onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.opacity = '1'}
            >
              View Full Case Study →
            </button>
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
            glowColor: '270 70 75',
            colors: ['#c084fc','#a855f7','#818cf8'],
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
            glowColor: '239 80 70',
            colors: ['#818cf8','#6366f1','#a855f7'],
            links: [
              { label: 'Projects', onClick: () => scrollTo('Projects') },
              { label: 'The Process', onClick: () => scrollTo('Process') },
            ],
          },
          {
            label: 'Contact',
            bgColor: '#130f20',
            textColor: '#e8e8e8',
            glowColor: '285 70 70',
            colors: ['#e879f9','#c084fc','#a855f7'],
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
          <div className="hero-grid">
            {/* Left — text content */}
            <div>
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
                <GradientText colors={['#7c3aed','#a855f7','#c084fc','#a855f7','#7c3aed']} animationSpeed={6} pauseOnHover>Chea</GradientText>
                <br />
                <GradientText colors={['#7c3aed','#a855f7','#c084fc','#a855f7','#7c3aed']} animationSpeed={6} pauseOnHover>Ousa.</GradientText>
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
                UX/UI, Web Design & Project Management.
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
                Designing, building, and delivering digital products — end to end.
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
                {['Phnom Penh, Cambodia', 'Project Management', 'UX/UI', 'Web Design'].map(
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
                <a
                  href="https://docs.google.com/document/d/1kK5ZYjNTGsi6jTMbDPiRSSvDL8-HFjlQ8ARp3xZtlXE/edit?usp=sharing"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    padding: '14px 24px',
                    background: 'transparent',
                    border: `1px solid ${ACCENT}44`,
                    borderRadius: 8,
                    color: ACCENT2,
                    fontSize: 14,
                    fontFamily: "'DM Mono',monospace",
                    cursor: 'pointer',
                    textDecoration: 'none',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 8,
                    transition: 'border-color .2s, background .2s',
                  }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLAnchorElement).style.borderColor = ACCENT; (e.currentTarget as HTMLAnchorElement).style.background = `${ACCENT}11`; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLAnchorElement).style.borderColor = `${ACCENT}44`; (e.currentTarget as HTMLAnchorElement).style.background = 'transparent'; }}
                >
                  ↓ Download CV
                </a>
              </div>
            </div>

            {/* Right — profile card */}
            <ProfileCard
              avatarUrl="https://media.licdn.com/dms/image/v2/D5603AQFlf_kv3pQYKw/profile-displayphoto-shrink_800_800/B56ZWi8ZOmGQAc-/0/1742195498963?e=1781136000&v=beta&t=s-JA6nbi8dWH7D8JbrVmRrnltrcOz9vpXBC8PTNkXAY"
              iconUrl="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24'%3E%3Ccircle cx='12' cy='12' r='2' fill='white'/%3E%3C/svg%3E"
              name=""
              title="PM · UX/UI · Web Design"
              handle="ousachea"
              status="Available for projects"
              contactText="Hire Me"
              showUserInfo={true}
              enableTilt={true}
              enableMobileTilt={false}
              behindGlowEnabled={true}
              behindGlowColor="rgba(139, 92, 246, 0.55)"
              behindGlowSize="55%"
              innerGradient="linear-gradient(145deg,#2a1050cc 0%,#8B5CF644 100%)"
              onContactClick={() => document.getElementById('Contact')?.scrollIntoView({ behavior: 'smooth' })}
            />
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
              TRUSTED BY
            </span>
          </div>
          <Marquee items={MARQUEE_SITES} />
        </div>
      </div>

      {/* ── STATS BAR ── */}
      <div style={{ borderBottom: '1px solid #1a1030', borderTop: '1px solid #1a1030', background: 'rgba(139,92,246,0.04)' }}>
        <Inner>
          <div className="stats-bar-grid">
            {[
              { to: 8,  suffix: '+', label: 'Years Experience' },
              { to: 50, suffix: '+', label: 'Projects Delivered' },
              { to: 30, suffix: '+', label: 'Happy Clients' },
              { to: 12, suffix: '+', label: 'Countries Reached' },
              { to: 95, suffix: '%', label: 'On-Time Delivery' },
            ].map(({ to, suffix, label }) => (
              <div key={label} className="stats-bar-item">
                <p style={{ fontSize: 'clamp(26px,4vw,44px)', fontWeight: 700, color: ACCENT2, letterSpacing: -1, margin: '0 0 4px', fontFamily: "'Space Grotesk',sans-serif" }}>
                  <CountUp from={0} to={to} duration={2} delay={0.2} />{suffix}
                </p>
                <p style={{ fontSize: 11, color: '#444', fontFamily: "'DM Mono',monospace", letterSpacing: 1, margin: 0 }}>{label}</p>
              </div>
            ))}
          </div>
        </Inner>
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
                <GradientText colors={['#7c3aed','#a855f7','#c084fc','#a855f7','#7c3aed']} animationSpeed={7} pauseOnHover>Hello Again 👋</GradientText>
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
                I'm a digital product manager and UX/UI designer who leads projects from discovery to delivery. I keep teams aligned, scopes tight, and the end experience user-centred — across design, development, and launch.
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
                I've spent 8+ years managing and shipping digital products across banking, NGOs, and hospitality — owning the full lifecycle from stakeholder alignment and sprint planning through to design, dev, and go-live.
              </p>
            </div>

            {/* Highlight cards */}
            {/* Currently building */}
            <BorderGlow glowColor="160 70 50" colors={['#34d399','#10b981','#38bdf8']} borderRadius={16} glowRadius={32} glowIntensity={1.2}>
              <div style={{ padding: '28px 26px', background: 'linear-gradient(135deg, rgba(52,211,153,0.06) 0%, rgba(16,185,129,0.03) 100%)', borderRadius: 16, display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginBottom: 16, padding: '4px 10px', borderRadius: 20, background: 'rgba(52,211,153,0.1)', border: '1px solid rgba(52,211,153,0.2)' }}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#34d399', display: 'inline-block', animation: 'pulse 2s infinite' }} />
                  <span style={{ fontSize: 10, fontFamily: "'DM Mono',monospace", color: '#34d399', letterSpacing: 2, textTransform: 'uppercase' }}>Currently Building</span>
                </div>
                <span style={{ fontSize: 22, marginBottom: 10 }}>⚡</span>
                <p style={{ fontSize: 18, fontWeight: 700, color: '#f0f0f0', margin: '0 0 4px', letterSpacing: -0.4, fontFamily: "'Sora',sans-serif" }}>Nuxt Tool</p>
                <p style={{ fontSize: 12, color: '#444', margin: '0 0 20px', fontFamily: "'DM Mono',monospace" }}>Nuxt 3 · Netlify · Personal Project</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, width: '100%' }}>
                  {[
                    { href: 'https://ousanuxt3.netlify.app/', label: 'ousanuxt3.netlify.app' },
                    { href: 'https://ousanuxt2.netlify.app/', label: 'ousanuxt2.netlify.app' },
                  ].map(({ href, label }) => (
                    <a key={href} href={href} target="_blank" rel="noopener noreferrer"
                      style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '11px 14px', borderRadius: 10, background: 'rgba(52,211,153,0.08)', border: '1px solid rgba(52,211,153,0.2)', textDecoration: 'none', cursor: 'pointer', transition: 'background 0.2s' }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'rgba(52,211,153,0.16)')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'rgba(52,211,153,0.08)')}
                    >
                      <span style={{ fontSize: 13, color: '#34d399', fontFamily: "'DM Mono',monospace" }}>{label}</span>
                      <span style={{ fontSize: 13, color: '#34d399' }}>↗</span>
                    </a>
                  ))}
                </div>
              </div>
            </BorderGlow>
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
            <GradientText colors={['#7c3aed','#a855f7','#c084fc','#a855f7','#7c3aed']} animationSpeed={7} pauseOnHover>Results-driven design,<br />with a personal touch.</GradientText>
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
                    <GradientText colors={['#7c3aed','#a855f7','#c084fc','#a855f7','#7c3aed']} animationSpeed={8} pauseOnHover>{s.title}</GradientText>
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
            <GradientText colors={['#7c3aed','#a855f7','#c084fc','#a855f7','#7c3aed']} animationSpeed={7} pauseOnHover>A taste of what I can do.</GradientText>
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

          {/* Featured project */}
          {(() => { const fp = PROJECTS.find(p => p.id === 2)!; return (
            <BorderGlow glowColor={fp.glowColor} colors={fp.colors} borderRadius={16} glowRadius={44} glowIntensity={1.2}>
              <div onClick={() => setOpenCase(fp.id)} className="featured-card">
                <div style={{ padding: 'clamp(20px,4vw,40px)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: 20 }}>
                  <div>
                    <span style={{ display: 'inline-block', fontSize: 11, fontFamily: "'DM Mono',monospace", color: fp.accent, letterSpacing: 1, border: `1px solid ${fp.accent}44`, padding: '3px 10px', borderRadius: 99, marginBottom: 16 }}>⭐ FEATURED · {fp.tag}</span>
                    <h3 style={{ fontSize: 'clamp(20px,3vw,32px)', fontWeight: 700, letterSpacing: -1, margin: '0 0 10px', color: '#e8e8e8' }}>
                      <GradientText colors={['#7c3aed','#a855f7','#c084fc','#a855f7','#7c3aed']} animationSpeed={8} pauseOnHover>{fp.title}</GradientText>
                    </h3>
                    <p style={{ fontSize: 14, color: '#666', lineHeight: 1.7, margin: 0 }}>{fp.desc}</p>
                  </div>
                  <div className="featured-stats" style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
                    {[['Global','Audience Reach'],['A11Y','Accessible'],['100%','Brand Compliant']].map(([n,l]) => (
                      <div key={l}>
                        <p style={{ fontSize: 22, fontWeight: 700, color: fp.accent, margin: '0 0 2px', fontFamily: "'Space Grotesk',sans-serif" }}>{n}</p>
                        <p style={{ fontSize: 11, color: '#444', fontFamily: "'DM Mono',monospace", margin: 0 }}>{l}</p>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="featured-card-img">
                  <img src={fp.image} alt={fp.title} style={{ filter: 'grayscale(40%)', transition: 'filter .4s ease' }}
                    onMouseEnter={e => (e.currentTarget as HTMLImageElement).style.filter = 'grayscale(0%)'}
                    onMouseLeave={e => (e.currentTarget as HTMLImageElement).style.filter = 'grayscale(40%)'}
                  />
                </div>
              </div>
            </BorderGlow>
          ); })()}

          <div style={{ margin: '40px 0 12px', display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 11, fontFamily: "'DM Mono',monospace", color: '#333', letterSpacing: 2 }}>MORE PROJECTS</span>
            <div style={{ flex: 1, height: 1, background: '#1a1030' }} />
          </div>

          <Masonry
            items={PROJECTS.filter(p => p.id !== 2).map((p, i) => ({
              id: String(p.id),
              img: p.image,
              url: p.url,
              height: [800, 600, 700, 550, 750, 620, 680, 580, 720, 640][i % 10],
            }))}
            ease="power3.out"
            duration={0.5}
            stagger={0.04}
            animateFrom="bottom"
            scaleOnHover={true}
            hoverScale={0.97}
            blurToFocus={true}
            colorShiftOnHover={false}
            onItemClick={(item) => setOpenCase(Number(item.id))}
          />
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
            <GradientText colors={['#7c3aed','#a855f7','#c084fc','#a855f7','#7c3aed']} animationSpeed={7} pauseOnHover>You're 5 steps away<br />from a new website.</GradientText>
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
          <ProcessFlow />
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
            <GradientText colors={['#7c3aed','#a855f7','#c084fc','#a855f7','#7c3aed']} animationSpeed={7} pauseOnHover>Work History</GradientText>
          </h2>
          <div style={{ maxWidth: 680, margin: '0 auto' }}>
            <ExperienceList items={EXPERIENCE} />
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
            <GradientText colors={['#7c3aed','#a855f7','#c084fc','#a855f7','#7c3aed']} animationSpeed={7} pauseOnHover>Education &amp; Certifications</GradientText>
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

          {/* Certifications strip */}
          <div style={{ marginTop: 48 }}>
            <p style={{ fontSize: 11, color: '#333', fontFamily: "'DM Mono',monospace", letterSpacing: 2, margin: '0 0 16px', textAlign: 'left' }}>CERTIFIED &amp; ACCREDITED</p>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              {[
                { name: 'Google UX Design', body: 'Google / Coursera', color: '#38bdf8', glowColor: '199 89 80', colors: ['#38bdf8','#7dd3fc','#0ea5e9'] },
                { name: 'Webflow Expert 95%', body: 'Webflow University', color: '#c084fc', glowColor: '270 70 75', colors: ['#c084fc','#a855f7','#818cf8'] },
                { name: 'Uxcel UX Design', body: 'Uxcel', color: '#a78bfa', glowColor: '255 65 70', colors: ['#a78bfa','#c084fc','#7c3aed'] },
              ].map(({ name, body, color, glowColor, colors }) => (
                <BorderGlow key={name} glowColor={glowColor} colors={colors} borderRadius={12} glowRadius={28} glowIntensity={1.1}>
                  <div style={{
                    padding: '12px 18px',
                    background: `${color}0a`,
                    borderRadius: 12,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 4,
                  }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color, fontFamily: "'Space Grotesk',sans-serif" }}>{name}</span>
                    <span style={{ fontSize: 10, color: '#555', fontFamily: "'DM Mono',monospace" }}>{body}</span>
                  </div>
                </BorderGlow>
              ))}
            </div>
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
              margin: '0 0 48px',
              textAlign: 'left',
            }}
          >
            <GradientText colors={['#7c3aed','#a855f7','#c084fc','#a855f7','#7c3aed']} animationSpeed={7} pauseOnHover>Areas of Expertise</GradientText>
          </h2>

          {/* ── Skill group cards ── */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%,280px),1fr))', gap: 20 }}>
            {[
              {
                icon: '📋',
                label: 'Management',
                skills: [
                  { name: 'Project Management', level: 95 },
                  { name: 'Agile / Scrum', level: 90 },
                  { name: 'Stakeholder Comms', level: 85 },
                  { name: 'Product Roadmapping', level: 88 },
                  { name: 'Sprint Planning', level: 87 },
                  { name: 'Risk Management', level: 80 },
                  { name: 'Budget Management', level: 76 },
                ],
                glowColor: '270 70 75',
                colors: ['#c084fc','#818cf8','#6366f1'],
              },
              {
                icon: '🎨',
                label: 'Design',
                skills: [
                  { name: 'Figma', level: 92 },
                  { name: 'UI / UX Design', level: 88 },
                  { name: 'Design Systems', level: 80 },
                  { name: 'Wireframing', level: 91 },
                  { name: 'Prototyping', level: 89 },
                  { name: 'User Research', level: 84 },
                  { name: 'Adobe XD', level: 75 },
                ],
                glowColor: '285 70 70',
                colors: ['#e879f9','#c084fc','#818cf8'],
              },
              {
                icon: '💻',
                label: 'Technical',
                skills: [
                  { name: 'HTML & CSS', level: 78 },
                  { name: 'Webflow', level: 74 },
                  { name: 'Responsive Design', level: 82 },
                  { name: 'JavaScript', level: 62 },
                  { name: 'Git / Version Control', level: 68 },
                  { name: 'CMS (Contentful / Strapi)', level: 70 },
                ],
                glowColor: '239 68 68',
                colors: ['#818cf8','#6366f1','#c084fc'],
              },
            ].map(({ icon, label, skills, glowColor, colors }) => (
              <BorderGlow
                key={label}
                glowColor={glowColor}
                colors={colors}
                borderRadius={16}
                glowRadius={36}
                glowIntensity={1.1}
              >
                <div style={{ padding: '28px 28px 24px' }}>
                  {/* Card header */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 28 }}>
                    <span style={{ fontSize: 22 }}>{icon}</span>
                    <span style={{
                      fontSize: 11,
                      fontFamily: "'DM Mono',monospace",
                      letterSpacing: 2,
                      color: '#555',
                      textTransform: 'uppercase',
                    }}>{label}</span>
                  </div>
                  {/* Skill bars */}
                  {skills.map((s, i) => (
                    <SkillBar key={s.name} name={s.name} level={s.level} delay={i * 100} />
                  ))}
                </div>
              </BorderGlow>
            ))}
          </div>

          {/* ── Tools & Platforms ── */}
          <h3 style={{ fontSize: 'clamp(18px,3vw,22px)', fontWeight: 600, margin: '56px 0 20px', letterSpacing: -0.5, textAlign: 'left' }}>
            <GradientText colors={['#7c3aed','#a855f7','#c084fc','#a855f7','#7c3aed']} animationSpeed={8} pauseOnHover>Tools &amp; Platforms</GradientText>
          </h3>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
            {TOOLS.map((t) => (
              <div
                key={t.name}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '10px 18px',
                  borderRadius: 99,
                  border: '1px solid rgba(139,92,246,0.2)',
                  background: 'rgba(139,92,246,0.06)',
                  fontSize: 13,
                  color: '#ccc',
                  cursor: 'default',
                  transition: 'border-color .2s, background .2s, color .2s',
                }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(168,139,250,0.6)';
                  (e.currentTarget as HTMLDivElement).style.background = 'rgba(139,92,246,0.15)';
                  (e.currentTarget as HTMLDivElement).style.color = '#e8e8e8';
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(139,92,246,0.2)';
                  (e.currentTarget as HTMLDivElement).style.background = 'rgba(139,92,246,0.06)';
                  (e.currentTarget as HTMLDivElement).style.color = '#ccc';
                }}
              >
                <span>{t.icon}</span>
                {t.name}
              </div>
            ))}
          </div>

          {/* ── Languages ── */}
          <h3 style={{ fontSize: 'clamp(18px,3vw,22px)', fontWeight: 600, margin: '48px 0 20px', letterSpacing: -0.5, textAlign: 'left' }}>
            <GradientText colors={['#7c3aed','#a855f7','#c084fc','#a855f7','#7c3aed']} animationSpeed={8} pauseOnHover>Languages</GradientText>
          </h3>
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
            {LANGUAGES.map((l) => (
              <div
                key={l.lang}
                style={{
                  flex: '1 1 200px',
                  padding: '20px 24px',
                  borderRadius: 14,
                  border: '1px solid rgba(139,92,246,0.2)',
                  background: 'rgba(139,92,246,0.05)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 14 }}>
                  <span style={{ fontSize: 16, fontWeight: 600, color: '#e8e8e8', fontFamily: "'Space Grotesk',sans-serif" }}>{l.lang}</span>
                  <span style={{ fontSize: 11, fontFamily: "'DM Mono',monospace", color: ACCENT2, letterSpacing: 1 }}>{l.level}</span>
                </div>
                <div style={{ height: 5, background: '#1a1030', borderRadius: 99, overflow: 'hidden' }}>
                  <div style={{
                    height: '100%',
                    width: `${l.pct}%`,
                    background: `linear-gradient(90deg,${ACCENT},${ACCENT2})`,
                    borderRadius: 99,
                    boxShadow: `0 0 10px ${ACCENT}66`,
                  }} />
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
            <GradientText colors={['#7c3aed','#a855f7','#c084fc','#a855f7','#7c3aed']} animationSpeed={7} pauseOnHover>What Clients Say</GradientText>
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
          <div style={{ position: 'relative', marginBottom: 24 }}>
              {tGroups.map((group, gi) => (
                <div key={gi} style={{
                  position: gi === 0 ? 'relative' : 'absolute',
                  inset: gi === 0 ? undefined : 0,
                  opacity: gi === tSlide ? 1 : 0,
                  transition: 'opacity .55s ease',
                  pointerEvents: gi === tSlide ? 'auto' : 'none',
                }}>
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
                <GradientText colors={['#7c3aed','#a855f7','#c084fc','#a855f7','#7c3aed']} animationSpeed={7} pauseOnHover>Frequently Asked Questions</GradientText>
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
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
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
            <GradientText colors={['#7c3aed','#a855f7','#c084fc','#a855f7','#7c3aed']} animationSpeed={7} pauseOnHover>Lessons learned along<br />my design journey.</GradientText>
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
                <div style={{ padding: '28px', cursor: 'pointer' }} onClick={() => navigate(`/articles/${a.slug}`)}>
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
                    <GradientText colors={['#7c3aed','#a855f7','#c084fc','#a855f7','#7c3aed']} animationSpeed={8} pauseOnHover>{a.title}</GradientText>
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
                <GradientText colors={['#7c3aed','#a855f7','#c084fc','#a855f7','#7c3aed']} animationSpeed={7} pauseOnHover>Let's build something great together.</GradientText>
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
                    label: 'Location · Timezone',
                    value: 'Phnom Penh, Cambodia · GMT+7',
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
                  {['PMP®', 'CSM®', 'Google UX Design', 'Webflow Expert (95%)', 'Uxcel UX Design'].map((cert) => (
                    <span key={cert} style={{ fontSize: 11, fontFamily: "'DM Mono',monospace", color: ACCENT2, border: `1px solid ${ACCENT}33`, padding: '5px 12px', borderRadius: 99, background: `${ACCENT}0d` }}>
                      {cert}
                    </span>
                  ))}
                </div>
              </div>

              {/* Availability CTA */}
              <div style={{ marginTop: 32, padding: '20px 24px', borderRadius: 14, border: '1px solid #34d39933', background: '#34d3990d', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#3DAB72', display: 'inline-block', boxShadow: '0 0 8px #3DAB72', flexShrink: 0 }} />
                    <span style={{ fontSize: 11, fontFamily: "'DM Mono',monospace", color: '#3DAB72', letterSpacing: 1 }}>AVAILABLE FOR PROJECTS</span>
                  </div>
                  <p style={{ fontSize: 13, color: '#888', margin: 0, textAlign: 'left' }}>Next availability: <strong style={{ color: '#ccc' }}>July 2026</strong></p>
                </div>
                <a
                  href="mailto:ousauser@gmail.com?subject=Project Enquiry"
                  style={{ padding: '10px 20px', background: '#3DAB72', border: 'none', borderRadius: 8, color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer', textDecoration: 'none', whiteSpace: 'nowrap', fontFamily: "'DM Sans',sans-serif" }}
                >
                  Book a Call →
                </a>
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