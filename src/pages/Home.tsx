import { useState, useEffect, useRef, useCallback } from 'react';
import Lenis from 'lenis';

// ─── SoftAurora ───────────────────────────────────────────────────────────────
function hexToVec3(hex) {
  const h = hex.replace('#', '');
  return [
    parseInt(h.slice(0, 2), 16) / 255,
    parseInt(h.slice(2, 4), 16) / 255,
    parseInt(h.slice(4, 6), 16) / 255,
  ];
}
const AURORA_VERT = `attribute vec2 uv;attribute vec2 position;varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position,0,1);}`;
const AURORA_FRAG = `precision highp float;
uniform float uTime;uniform vec3 uResolution;uniform float uSpeed;uniform float uScale;uniform float uBrightness;
uniform vec3 uColor1;uniform vec3 uColor2;uniform float uNoiseFreq;uniform float uNoiseAmp;
uniform float uBandHeight;uniform float uBandSpread;uniform float uOctaveDecay;uniform float uLayerOffset;
uniform float uColorSpeed;uniform vec2 uMouse;uniform float uMouseInfluence;uniform bool uEnableMouse;
#define TAU 6.28318
vec3 gradientHash(vec3 p){p=vec3(dot(p,vec3(127.1,311.7,234.6)),dot(p,vec3(269.5,183.3,198.3)),dot(p,vec3(169.5,283.3,156.9)));vec3 h=fract(sin(p)*43758.5453123);float phi=acos(2.0*h.x-1.0);float theta=TAU*h.y;return vec3(cos(theta)*sin(phi),sin(theta)*cos(phi),cos(phi));}
float quinticSmooth(float t){float t2=t*t;float t3=t*t2;return 6.0*t3*t2-15.0*t2*t2+10.0*t3;}
vec3 cosineGradient(float t,vec3 a,vec3 b,vec3 c,vec3 d){return a+b*cos(TAU*(c*t+d));}
float perlin3D(float amplitude,float frequency,float px,float py,float pz){float x=px*frequency;float y=py*frequency;float fx=floor(x);float fy=floor(y);float fz=floor(pz);float cx=ceil(x);float cy=ceil(y);float cz=ceil(pz);vec3 g000=gradientHash(vec3(fx,fy,fz));vec3 g100=gradientHash(vec3(cx,fy,fz));vec3 g010=gradientHash(vec3(fx,cy,fz));vec3 g110=gradientHash(vec3(cx,cy,fz));vec3 g001=gradientHash(vec3(fx,fy,cz));vec3 g101=gradientHash(vec3(cx,fy,cz));vec3 g011=gradientHash(vec3(fx,cy,cz));vec3 g111=gradientHash(vec3(cx,cy,cz));float d000=dot(g000,vec3(x-fx,y-fy,pz-fz));float d100=dot(g100,vec3(x-cx,y-fy,pz-fz));float d010=dot(g010,vec3(x-fx,y-cy,pz-fz));float d110=dot(g110,vec3(x-cx,y-cy,pz-fz));float d001=dot(g001,vec3(x-fx,y-fy,pz-cz));float d101=dot(g101,vec3(x-cx,y-fy,pz-cz));float d011=dot(g011,vec3(x-fx,y-cy,pz-cz));float d111=dot(g111,vec3(x-cx,y-cy,pz-cz));float sx=quinticSmooth(x-fx);float sy=quinticSmooth(y-fy);float sz=quinticSmooth(pz-fz);float lx00=mix(d000,d100,sx);float lx10=mix(d010,d110,sx);float lx01=mix(d001,d101,sx);float lx11=mix(d011,d111,sx);float ly0=mix(lx00,lx10,sy);float ly1=mix(lx01,lx11,sy);return amplitude*mix(ly0,ly1,sz);}
float auroraGlow(float t,vec2 shift){vec2 uv=gl_FragCoord.xy/uResolution.y;uv+=shift;float noiseVal=0.0;float freq=uNoiseFreq;float amp=uNoiseAmp;vec2 samplePos=uv*uScale;for(float i=0.0;i<3.0;i+=1.0){noiseVal+=perlin3D(amp,freq,samplePos.x,samplePos.y,t);amp*=uOctaveDecay;freq*=2.0;}float yBand=uv.y*10.0-uBandHeight*10.0;return 0.3*max(exp(uBandSpread*(1.0-1.1*abs(noiseVal+yBand))),0.0);}
void main(){vec2 uv=gl_FragCoord.xy/uResolution.xy;float t=uSpeed*0.4*uTime;vec2 shift=vec2(0.0);if(uEnableMouse){shift=(uMouse-0.5)*uMouseInfluence;}vec3 col=vec3(0.0);col+=0.99*auroraGlow(t,shift)*cosineGradient(uv.x+uTime*uSpeed*0.2*uColorSpeed,vec3(0.5),vec3(0.5),vec3(1.0),vec3(0.3,0.20,0.20))*uColor1;col+=0.99*auroraGlow(t+uLayerOffset,shift)*cosineGradient(uv.x+uTime*uSpeed*0.1*uColorSpeed,vec3(0.5),vec3(0.5),vec3(2.0,1.0,0.0),vec3(0.5,0.20,0.25))*uColor2;col*=uBrightness;float alpha=clamp(length(col),0.0,1.0);gl_FragColor=vec4(col,alpha);}`;

function SoftAurora({
  speed = 0.5,
  scale = 1.4,
  brightness = 0.9,
  color1 = '#c084fc',
  color2 = '#6366f1',
  noiseFrequency = 2.5,
  noiseAmplitude = 1.0,
  bandHeight = 0.45,
  bandSpread = 1.1,
  octaveDecay = 0.12,
  layerOffset = 0.8,
  colorSpeed = 0.8,
  enableMouseInteraction = true,
  mouseInfluence = 0.18,
}) {
  const containerRef = useRef(null);
  useEffect(() => {
    if (!containerRef.current) return;
    const container = containerRef.current;
    let animId;
    let currentMouse = [0.5, 0.5],
      targetMouse = [0.5, 0.5];
    let cleanup = () => {};

    import('https://esm.sh/ogl@1.0.11')
      .then(({ Renderer, Program, Mesh, Triangle }) => {
        const renderer = new Renderer({
          alpha: true,
          premultipliedAlpha: false,
        });
        const gl = renderer.gl;
        gl.clearColor(0, 0, 0, 0);

        let program;
        const resize = () => {
          renderer.setSize(container.offsetWidth, container.offsetHeight);
          if (program)
            program.uniforms.uResolution.value = [
              gl.canvas.width,
              gl.canvas.height,
              gl.canvas.width / gl.canvas.height,
            ];
        };
        window.addEventListener('resize', resize);
        resize();

        const geometry = new Triangle(gl);
        program = new Program(gl, {
          vertex: AURORA_VERT,
          fragment: AURORA_FRAG,
          uniforms: {
            uTime: { value: 0 },
            uResolution: {
              value: [
                gl.canvas.width,
                gl.canvas.height,
                gl.canvas.width / gl.canvas.height,
              ],
            },
            uSpeed: { value: speed },
            uScale: { value: scale },
            uBrightness: { value: brightness },
            uColor1: { value: hexToVec3(color1) },
            uColor2: { value: hexToVec3(color2) },
            uNoiseFreq: { value: noiseFrequency },
            uNoiseAmp: { value: noiseAmplitude },
            uBandHeight: { value: bandHeight },
            uBandSpread: { value: bandSpread },
            uOctaveDecay: { value: octaveDecay },
            uLayerOffset: { value: layerOffset },
            uColorSpeed: { value: colorSpeed },
            uMouse: { value: new Float32Array([0.5, 0.5]) },
            uMouseInfluence: { value: mouseInfluence },
            uEnableMouse: { value: enableMouseInteraction },
          },
        });

        const mesh = new Mesh(gl, { geometry, program });
        gl.canvas.style.cssText =
          'position:absolute;inset:0;width:100%;height:100%;display:block;';
        container.appendChild(gl.canvas);

        const onMove = (e) => {
          const r = container.getBoundingClientRect();
          targetMouse = [
            (e.clientX - r.left) / r.width,
            1 - (e.clientY - r.top) / r.height,
          ];
        };
        const onLeave = () => {
          targetMouse = [0.5, 0.5];
        };
        container.addEventListener('mousemove', onMove);
        container.addEventListener('mouseleave', onLeave);

        const update = (t) => {
          animId = requestAnimationFrame(update);
          program.uniforms.uTime.value = t * 0.001;
          currentMouse[0] += 0.05 * (targetMouse[0] - currentMouse[0]);
          currentMouse[1] += 0.05 * (targetMouse[1] - currentMouse[1]);
          program.uniforms.uMouse.value[0] = currentMouse[0];
          program.uniforms.uMouse.value[1] = currentMouse[1];
          renderer.render({ scene: mesh });
        };
        animId = requestAnimationFrame(update);

        cleanup = () => {
          cancelAnimationFrame(animId);
          window.removeEventListener('resize', resize);
          container.removeEventListener('mousemove', onMove);
          container.removeEventListener('mouseleave', onLeave);
          try {
            if (container.contains(gl.canvas)) container.removeChild(gl.canvas);
          } catch (e) {}
          gl.getExtension('WEBGL_lose_context')?.loseContext();
        };
      })
      .catch(() => {});

    return () => {
      cancelAnimationFrame(animId);
      cleanup();
    };
  }, []);

  return (
    <div
      ref={containerRef}
      style={{
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        zIndex: 0,
        pointerEvents: 'none',
      }}
    />
  );
}
// ─── End SoftAurora ──────────────────────────────────────────────────────────

const ACCENT = '#8B5CF6';
const ACCENT2 = '#A78BFA';
const NAV_LINKS = ['About', 'Experience', 'Projects', 'Skills', 'Contact'];

// ─── BorderGlow ───────────────────────────────────────────────────────────────
const BORDER_GLOW_CSS = `
.bgc {
  --edge-proximity: 0;
  --cursor-angle: 45deg;
  --edge-sensitivity: 30;
  --color-sensitivity: calc(var(--edge-sensitivity) + 20);
  --border-radius: 16px;
  --glow-padding: 40px;
  --cone-spread: 25;
  position: relative;
  border-radius: var(--border-radius);
  isolation: isolate;
  transform: translate3d(0,0,0.01px);
  display: grid;
  border: 1px solid rgb(255 255 255 / 8%);
  background: var(--card-bg, #0d0b18);
  overflow: visible;
}
.bgc::before,.bgc::after,.bgc>.egl { content:""; position:absolute; inset:0; border-radius:inherit; transition:opacity .25s ease-out; z-index:-1; }
.bgc:not(:hover)::before,.bgc:not(:hover)::after,.bgc:not(:hover)>.egl { opacity:0; transition:opacity .75s ease-in-out; }
.bgc::before {
  border:1px solid transparent;
  background:
    linear-gradient(var(--card-bg,#0d0b18) 0 100%) padding-box,
    linear-gradient(rgb(255 255 255/0%) 0 100%) border-box,
    var(--g1) border-box,var(--g2) border-box,var(--g3) border-box,
    var(--g4) border-box,var(--g5) border-box,var(--g6) border-box,
    var(--g7) border-box,var(--gb) border-box;
  opacity:calc((var(--edge-proximity) - var(--color-sensitivity)) / (100 - var(--color-sensitivity)));
  mask-image:conic-gradient(from var(--cursor-angle) at center,
    black calc(var(--cone-spread)*1%),
    transparent calc((var(--cone-spread)+15)*1%),
    transparent calc((100 - var(--cone-spread) - 15)*1%),
    black calc((100 - var(--cone-spread))*1%));
}
.bgc::after {
  border:1px solid transparent;
  background:
    var(--g1) padding-box,var(--g2) padding-box,var(--g3) padding-box,
    var(--g4) padding-box,var(--g5) padding-box,var(--g6) padding-box,
    var(--g7) padding-box,var(--gb) padding-box;
  mask-image:
    linear-gradient(to bottom,black,black),
    radial-gradient(ellipse at 50% 50%,black 40%,transparent 65%),
    radial-gradient(ellipse at 66% 66%,black 5%,transparent 40%),
    radial-gradient(ellipse at 33% 33%,black 5%,transparent 40%),
    radial-gradient(ellipse at 66% 33%,black 5%,transparent 40%),
    radial-gradient(ellipse at 33% 66%,black 5%,transparent 40%),
    conic-gradient(from var(--cursor-angle) at center,transparent 5%,black 15%,black 85%,transparent 95%);
  mask-composite:subtract,add,add,add,add,add;
  opacity:calc(.4*(var(--edge-proximity) - var(--color-sensitivity))/(100 - var(--color-sensitivity)));
  mix-blend-mode:soft-light;
}
.bgc>.egl {
  inset:calc(var(--glow-padding)*-1);
  pointer-events:none;
  z-index:1;
  mask-image:conic-gradient(from var(--cursor-angle) at center,black 2.5%,transparent 10%,transparent 90%,black 97.5%);
  opacity:calc((var(--edge-proximity) - var(--edge-sensitivity))/(100 - var(--edge-sensitivity)));
  mix-blend-mode:plus-lighter;
}
.bgc>.egl::before {
  content:"";position:absolute;inset:var(--glow-padding);border-radius:inherit;
  box-shadow:
    inset 0 0 0 1px var(--gc),
    inset 0 0 1px 0 var(--gc60),
    inset 0 0 6px 0 var(--gc40),
    inset 0 0 15px 0 var(--gc30),
    inset 0 0 25px 2px var(--gc20),
    0 0 6px 0 var(--gc40),
    0 0 15px 0 var(--gc30),
    0 0 25px 2px var(--gc20),
    0 0 50px 2px var(--gc10);
}
.bgc-inner { display:flex; flex-direction:column; position:relative; overflow:auto; z-index:1; }
`;

function parseHSL(s) {
  const m = s.match(/([\d.]+)\s*([\d.]+)%?\s*([\d.]+)%?/);
  return m ? { h: +m[1], s: +m[2], l: +m[3] } : { h: 270, s: 70, l: 70 };
}

function buildGlowVars(glowColor, intensity = 1) {
  const { h, s, l } = parseHSL(glowColor);
  const base = `${h}deg ${s}% ${l}%`;
  return {
    '--gc': `hsl(${base}/100%)`,
    '--gc60': `hsl(${base}/${Math.min(60 * intensity, 100)}%)`,
    '--gc40': `hsl(${base}/${Math.min(40 * intensity, 100)}%)`,
    '--gc30': `hsl(${base}/${Math.min(30 * intensity, 100)}%)`,
    '--gc20': `hsl(${base}/${Math.min(20 * intensity, 100)}%)`,
    '--gc10': `hsl(${base}/${Math.min(10 * intensity, 100)}%)`,
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
];
const GK = ['--g1', '--g2', '--g3', '--g4', '--g5', '--g6', '--g7'];
const CM = [0, 1, 2, 0, 1, 2, 1];

function buildGradVars(colors) {
  const v = {};
  for (let i = 0; i < 7; i++) {
    const c = colors[Math.min(CM[i], colors.length - 1)];
    v[GK[i]] = `radial-gradient(at ${GP[i]}, ${c} 0px, transparent 50%)`;
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

  const getCtr = useCallback((el) => {
    const { width, height } = el.getBoundingClientRect();
    return [width / 2, height / 2];
  }, []);

  const onMove = useCallback(
    (e) => {
      const card = ref.current;
      if (!card) return;
      const rect = card.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const [cx, cy] = getCtr(card);
      const dx = x - cx,
        dy = y - cy;
      const kx = dx !== 0 ? cx / Math.abs(dx) : Infinity;
      const ky = dy !== 0 ? cy / Math.abs(dy) : Infinity;
      const edge = Math.min(Math.max(1 / Math.min(kx, ky), 0), 1);
      let angle = (Math.atan2(dy, dx) * (180 / Math.PI) + 90 + 360) % 360;
      card.style.setProperty('--edge-proximity', (edge * 100).toFixed(3));
      card.style.setProperty('--cursor-angle', `${angle.toFixed(3)}deg`);
    },
    [getCtr]
  );

  const glowVars = buildGlowVars(glowColor, glowIntensity);
  const gradVars = buildGradVars(colors);

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
        ...glowVars,
        ...gradVars,
      }}
    >
      <span className="egl" />
      <div className="bgc-inner">{children}</div>
    </div>
  );
}
// ─── End BorderGlow ───────────────────────────────────────────────────────────

const EXPERIENCE = [
  {
    company: 'Creative Agency Co.',
    role: 'Senior Project Manager & Web Designer',
    period: '2022 – Present',
    bullets: [
      'Led cross-functional teams of 8–15 to deliver 20+ digital projects on time and under budget.',
      'Reduced average project delivery time by 30% by implementing Agile sprint workflows.',
      'Designed and launched client websites generating $500K+ in tracked revenue.',
    ],
  },
  {
    company: 'Digital Studio XYZ',
    role: 'Project Manager',
    period: '2020 – 2022',
    bullets: [
      'Managed a $200K product roadmap across design, dev, and marketing teams.',
      'Introduced Jira-based sprint tracking, cutting missed deadlines by 40%.',
      'Coordinated 3 simultaneous product launches with zero scope creep.',
    ],
  },
  {
    company: 'Freelance',
    role: 'Web Designer',
    period: '2018 – 2020',
    bullets: [
      'Delivered brand identities and responsive websites for 30+ SME clients.',
      'Built and handed off design systems in Figma reducing client revision rounds by 50%.',
    ],
  },
];

const EDUCATION = [
  {
    degree: 'Bachelor of Business Administration',
    school: 'Royal University of Phnom Penh',
    year: '2018',
  },
  {
    degree: 'PMP — Project Management Professional',
    school: 'PMI Certified',
    year: '2021',
  },
  {
    degree: 'Google UX Design Certificate',
    school: 'Google / Coursera',
    year: '2020',
  },
  {
    degree: 'Certified Scrum Master (CSM)',
    school: 'Scrum Alliance',
    year: '2022',
  },
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
    icon: '📐',
    title: 'Web Design',
    desc: 'End-to-end design from wireframes to high-fidelity Figma prototypes and developer handoff.',
  },
  {
    icon: '🗓',
    title: 'Project Management',
    desc: 'Agile sprint planning, stakeholder communication, and delivery for digital products.',
  },
  {
    icon: '✦',
    title: 'Brand Identity',
    desc: 'Logo, typography, color systems, and full style guides for startups and SMEs.',
  },
  {
    icon: '🔍',
    title: 'UX Strategy',
    desc: 'User research, journey mapping, and usability audits to improve product experience.',
  },
];

const TESTIMONIALS = [
  {
    name: 'Sarah K.',
    role: 'CEO, RetailBrand',
    quote:
      'Ousa brought clarity and calm to a chaotic project. We launched on time and the design exceeded every expectation.',
    avatar: 'SK',
  },
  {
    name: 'James T.',
    role: 'CTO, SaaS Startup',
    quote:
      'Rare to find someone who can straddle PM rigour and design sensibility. Ousa is that person — an absolute asset.',
    avatar: 'JT',
  },
  {
    name: 'Mei L.',
    role: 'Marketing Director',
    quote:
      'The new website Ousa designed tripled our inbound leads within 3 months. Exceptional work.',
    avatar: 'ML',
  },
];

const PROJECTS = [
  {
    id: 1,
    title: 'E-Commerce Redesign',
    tag: 'Web Design · UX',
    desc: "End-to-end redesign of a retail brand's online store — research, wireframes, Figma prototypes, and developer handoff.",
    caseStudy: {
      problem:
        'Conversion rate was 0.8% — well below the 2.5% industry average. Navigation was confusing and mobile experience was broken.',
      process:
        'Ran 12 user interviews, built affinity maps, redesigned IA, created 3 prototype iterations tested with real users.',
      result:
        'Conversion rate lifted to 2.9%. Mobile sessions up 60%. Client revenue +$180K in Q1 post-launch.',
    },
    accent: '#8B5CF6',
    glowColor: '270 70 75',
    colors: ['#c084fc', '#818cf8', '#38bdf8'],
    icon: '🛍',
  },
  {
    id: 2,
    title: 'Product Launch Roadmap',
    tag: 'Project Management',
    desc: 'Led a cross-functional team of 12 to ship a SaaS product on time — from discovery sprints to go-live, zero scope creep.',
    caseStudy: {
      problem:
        'Previous launch attempt failed — 6 weeks over schedule, $80K over budget, stakeholder trust broken.',
      process:
        'Rebuilt the delivery process using Shape Up methodology. Weekly demos, clear appetite limits, dedicated cooldowns.',
      result:
        'Shipped in 14 weeks. Under budget by 12%. Stakeholder NPS went from 4/10 to 9/10.',
    },
    accent: '#6366F1',
    glowColor: '239 68 68',
    colors: ['#818cf8', '#6366f1', '#c084fc'],
    icon: '🚀',
  },
  {
    id: 3,
    title: 'Brand Identity System',
    tag: 'Web Design · Branding',
    desc: 'Created a full design system for a fintech startup: logo, typography, color palette, component library, and style guide.',
    caseStudy: {
      problem:
        'Brand was inconsistent across 7 touchpoints — website, app, pitch decks, socials all looked different.',
      process:
        'Audited all touchpoints, ran brand workshops with founders, designed 3 concept directions, iterated to final system.',
      result:
        'Design handoff cut dev implementation time by 35%. Brand recognition score up 4x in 6-month survey.',
    },
    accent: '#A855F7',
    glowColor: '285 70 70',
    colors: ['#e879f9', '#c084fc', '#818cf8'],
    icon: '✦',
  },
  {
    id: 4,
    title: 'Agency Dashboard',
    tag: 'Web Design · PM',
    desc: 'Designed and project-managed a client-facing reporting dashboard from brief to launch in 6 weeks.',
    caseStudy: {
      problem:
        'Account managers spent 5+ hours per week manually compiling client reports in spreadsheets.',
      process:
        'Mapped current workflow, designed dashboard IA, prototyped in Figma, managed dev sprint over 6 weeks.',
      result:
        'Report time reduced from 5hrs to 20 mins per week. Client satisfaction scores up 25%.',
    },
    accent: '#7C3AED',
    glowColor: '258 80 65',
    colors: ['#7c3aed', '#a78bfa', '#6366f1'],
    icon: '📊',
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

function useFadeIn(threshold = 0.12) {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setVisible(true);
          obs.disconnect();
        }
      },
      { threshold }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return [ref, visible];
}

function Section({ id, children, style }) {
  const [ref, vis] = useFadeIn();
  return (
    <section
      id={id}
      ref={ref}
      className="resp-section"
      style={{
        opacity: vis ? 1 : 0,
        transform: vis ? 'translateY(0)' : 'translateY(28px)',
        transition: 'opacity .65s ease, transform .65s ease',
        scrollSnapAlign: 'start',
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
        marginBottom: 20,
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
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          marginBottom: 6,
        }}
      >
        <span
          style={{
            fontSize: 13,
            fontFamily: "'DM Mono',monospace",
            color: '#ccc',
          }}
        >
          {name}
        </span>
        <span style={{ fontSize: 12, color: '#777' }}>{level}%</span>
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

export default function Portfolio() {
  const [active, setActive] = useState('About');
  const [openCase, setOpenCase] = useState(null);
  const [formState, setFormState] = useState({ name: '', email: '', msg: '' });
  const [sent, setSent] = useState(false);
  const lenisRef = useRef<Lenis | null>(null);

  useEffect(() => {
    const lenis = new Lenis({
      duration: 1.2,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
    });
    lenisRef.current = lenis;

    let rafId: number;
    function raf(time: number) {
      lenis.raf(time);
      rafId = requestAnimationFrame(raf);
    }
    rafId = requestAnimationFrame(raf);

    return () => {
      cancelAnimationFrame(rafId);
      lenis.destroy();
    };
  }, []);

  useEffect(() => {
    const onScroll = () => {
      NAV_LINKS.forEach((id) => {
        const el = document.getElementById(id);
        if (el) {
          const r = el.getBoundingClientRect();
          if (r.top <= 100 && r.bottom > 100) setActive(id);
        }
      });
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const scrollTo = (id: string) => {
    const el = document.getElementById(id);
    if (!el) return;
    if (lenisRef.current) {
      lenisRef.current.scrollTo(el, { offset: -64 });
    } else {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };
  const handleSend = () => {
    setSent(true);
    setFormState({ name: '', email: '', msg: '' });
    setTimeout(() => setSent(false), 4000);
  };
  const activeProject = PROJECTS.find((p) => p.id === openCase);

  return (
    <div
      style={{
        fontFamily: "'Sora',sans-serif",
        background: '#080810',
        color: '#e8e8e8',
        minHeight: '100vh',
      }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@300;400;600;700&family=DM+Mono:wght@400;500&display=swap');
        *{box-sizing:border-box;margin:0;padding:0;}
        ::-webkit-scrollbar{width:4px;} ::-webkit-scrollbar-track{background:#080810;}
        ::-webkit-scrollbar-thumb{background:#2d1f4e;border-radius:99px;}
        ::selection{background:#8B5CF644;}
        a{color:inherit;text-decoration:none;} input,textarea{font-family:inherit;}
        @keyframes fadeUp{from{opacity:0;transform:translateY(24px)}to{opacity:1;transform:translateY(0)}}
        @keyframes fadeIn{from{opacity:0}to{opacity:1}}
        @keyframes pulse{0%,100%{opacity:.4}50%{opacity:1}}
        @keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-12px)}}
        @keyframes slideIn{from{opacity:0;transform:translateY(40px)}to{opacity:1;transform:translateY(0)}}
        ${BORDER_GLOW_CSS}
        /* ── Responsive ── */
        @media(max-width:1024px){
          .resp-grid-3{grid-template-columns:1fr 1fr !important;}
        }
        @media(max-width:768px){
          .nav-links{gap:14px !important;}
          .nav-links button{font-size:11px !important;}
          .resp-section{padding:80px 0 !important;}
          .resp-grid{grid-template-columns:1fr !important;gap:20px !important;}
          .resp-grid-3{grid-template-columns:1fr !important;gap:16px !important;}
          .skill-grid{gap:24px 0 !important;}
          .about-avatar{display:none !important;}
          .resp-footer{flex-direction:column !important;gap:16px !important;align-items:flex-start !important;}
          .hero-inner{max-width:100% !important;}
          .resp-stats{gap:28px !important;}
          .resp-hero{padding:0 6vw !important;}
          .resp-main{padding:0 5vw !important;}
        }
        @media(max-width:580px){
          .nav-links{display:none !important;}
          .resp-section{padding:64px 0 !important;}
          .resp-hero{padding-top:80px !important;}
        }
      `}</style>

      {/* CASE STUDY MODAL */}
      {openCase && activeProject && (
        <div
          onClick={() => setOpenCase(null)}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 200,
            background: 'rgba(4,2,12,.92)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 20,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: '#0f0c1e',
              border: '1px solid #2a1f50',
              borderRadius: 20,
              padding: 48,
              maxWidth: 620,
              width: '100%',
              animation: 'slideIn .35s ease both',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                marginBottom: 32,
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
                    fontSize: 24,
                    fontWeight: 700,
                    letterSpacing: -0.5,
                    marginTop: 6,
                  }}
                >
                  {activeProject.title}
                </h3>
              </div>
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
                ✕ Close
              </button>
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
                    marginBottom: 8,
                  }}
                >
                  {title}
                </p>
                <p style={{ fontSize: 15, color: '#ccc', lineHeight: 1.75 }}>
                  {text}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* NAV */}
      <nav
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 100,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 6vw',
          height: 64,
          background: 'rgba(8,8,16,.88)',
          backdropFilter: 'blur(16px)',
          borderBottom: '0.5px solid #1a1030',
        }}
      >
        <span
          style={{
            fontFamily: "'DM Mono',monospace",
            fontSize: 14,
            color: ACCENT,
            letterSpacing: 1,
          }}
        >
          {'<Ousa />'}
        </span>
        <div className="nav-links" style={{ display: 'flex', gap: 28, alignItems: 'center' }}>
          {NAV_LINKS.map((l) => (
            <button
              key={l}
              onClick={() => scrollTo(l)}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                fontSize: 12,
                color: active === l ? ACCENT : '#777',
                fontFamily: "'Sora',sans-serif",
                letterSpacing: 0.5,
                transition: 'color .2s',
                paddingBottom: 2,
                borderBottom:
                  active === l
                    ? `1px solid ${ACCENT}`
                    : '1px solid transparent',
              }}
            >
              {l}
            </button>
          ))}
          <a
            href="#"
            style={{
              fontSize: 12,
              padding: '7px 16px',
              border: `1px solid ${ACCENT}66`,
              borderRadius: 8,
              color: ACCENT2,
              fontFamily: "'DM Mono',monospace",
              transition: 'background .2s',
            }}
            onMouseEnter={(e) => (e.target.style.background = '#8B5CF611')}
            onMouseLeave={(e) => (e.target.style.background = 'transparent')}
          >
            ↓ CV
          </a>
        </div>
      </nav>

      {/* HERO */}
      <header
        className="resp-hero"
        style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          padding: '0 8vw',
          position: 'relative',
          scrollSnapAlign: 'start',
          overflow: 'hidden',
        }}
      >
        {/* SoftAurora WebGL background */}
        <SoftAurora
          speed={0.45}
          scale={1.3}
          brightness={0.85}
          color1="#c084fc"
          color2="#6366f1"
          noiseFrequency={2.2}
          noiseAmplitude={1.0}
          bandHeight={0.48}
          bandSpread={1.15}
          octaveDecay={0.12}
          layerOffset={0.9}
          colorSpeed={0.7}
          enableMouseInteraction={true}
          mouseInfluence={0.2}
        />
        <div
          style={{
            position: 'absolute',
            inset: 0,
            zIndex: 1,
            backgroundImage: `linear-gradient(rgba(139,92,246,.04) 1px,transparent 1px),linear-gradient(90deg,rgba(139,92,246,.04) 1px,transparent 1px)`,
            backgroundSize: '60px 60px',
            pointerEvents: 'none',
          }}
        />
        <div
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: 180,
            background: 'linear-gradient(transparent,#080810)',
            zIndex: 1,
            pointerEvents: 'none',
          }}
        />
        <div className="hero-inner" style={{ position: 'relative', zIndex: 2, maxWidth: 720 }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              marginBottom: 28,
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
          <h1
            style={{
              fontSize: 'clamp(48px,8vw,96px)',
              fontWeight: 700,
              lineHeight: 1.05,
              letterSpacing: -3,
              marginBottom: 28,
              animation: 'fadeUp .6s .1s ease both',
            }}
          >
            Ousa
            <br />
            <span style={{ color: ACCENT }}>Chea.</span>
          </h1>
          <p
            style={{
              fontSize: 'clamp(15px,2vw,19px)',
              color: '#888',
              fontWeight: 300,
              maxWidth: 500,
              lineHeight: 1.8,
              marginBottom: 24,
              animation: 'fadeUp .6s .15s ease both',
            }}
          >
            Project Manager & Web Designer bridging strategy and aesthetics —
            turning complex ideas into beautifully delivered products.
          </p>
          <div
            style={{
              display: 'flex',
              gap: 12,
              marginBottom: 48,
              flexWrap: 'wrap',
              animation: 'fadeUp .6s .2s ease both',
            }}
          >
            {[
              'Project Management',
              'Web Design',
              'UX Strategy',
              'Agile / Scrum',
            ].map((tag) => (
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
            ))}
          </div>
          <div
            style={{
              display: 'flex',
              gap: 20,
              animation: 'fadeUp .6s .3s ease both',
            }}
          >
            <button
              onClick={() => scrollTo('Projects')}
              style={{
                padding: '12px 28px',
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
              View Projects
            </button>
            <button
              onClick={() => scrollTo('Contact')}
              style={{
                padding: '12px 28px',
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
              fontSize: 11,
              color: '#333',
              letterSpacing: 2,
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

      <div className="resp-main" style={{ maxWidth: 900, margin: '0 auto', padding: '0 6vw' }}>
        {/* ABOUT */}
        <Section id="About" style={{ padding: '120px 0' }}>
          <div
            className="resp-grid"
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: 80,
              alignItems: 'center',
            }}
          >
            <div>
              <SL n="01" label="ABOUT" />
              <h2
                style={{
                  fontSize: 36,
                  fontWeight: 700,
                  letterSpacing: -1,
                  marginBottom: 20,
                  lineHeight: 1.2,
                }}
              >
                Where strategy meets design
              </h2>
              <p
                style={{
                  color: '#888',
                  lineHeight: 1.8,
                  marginBottom: 16,
                  fontSize: 15,
                }}
              >
                I'm a Project Manager and Web Designer with 5+ years delivering
                digital products on time and on brand. I thrive at the overlap
                of structured planning and visual storytelling.
              </p>
              <p
                style={{
                  color: '#888',
                  lineHeight: 1.8,
                  marginBottom: 24,
                  fontSize: 15,
                }}
              >
                From managing multi-team sprints to crafting pixel-perfect
                interfaces in Figma, I bring both the big picture and the fine
                detail — every time.
              </p>
              <div className="resp-stats" style={{ display: 'flex', gap: 40 }}>
                {[
                  ['20+', 'Projects Delivered'],
                  ['5+', 'Years Experience'],
                  ['30+', 'Happy Clients'],
                ].map(([n, l]) => (
                  <div key={l}>
                    <p
                      style={{
                        fontSize: 28,
                        fontWeight: 700,
                        color: ACCENT2,
                        letterSpacing: -1,
                      }}
                    >
                      {n}
                    </p>
                    <p
                      style={{
                        fontSize: 12,
                        color: '#555',
                        fontFamily: "'DM Mono',monospace",
                      }}
                    >
                      {l}
                    </p>
                  </div>
                ))}
              </div>
            </div>
            <div className="about-avatar" style={{ display: 'flex', justifyContent: 'center' }}>
              <div
                style={{
                  width: 220,
                  height: 220,
                  borderRadius: '30% 70% 70% 30% / 30% 30% 70% 70%',
                  background: `linear-gradient(135deg,${ACCENT}22,#6366F122)`,
                  border: `1px solid ${ACCENT}33`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 72,
                  animation: 'float 4s ease-in-out infinite',
                }}
              >
                🎨
              </div>
            </div>
          </div>
        </Section>

        {/* EXPERIENCE */}
        <Section id="Experience" style={{ padding: '120px 0' }}>
          <SL n="02" label="EXPERIENCE" />
          <h2
            style={{
              fontSize: 36,
              fontWeight: 700,
              letterSpacing: -1,
              marginBottom: 48,
            }}
          >
            Work History
          </h2>
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
            {EXPERIENCE.map((e, i) => (
              <div
                key={i}
                style={{
                  paddingLeft: 32,
                  marginBottom: 56,
                  position: 'relative',
                }}
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
                        fontSize: 18,
                        fontWeight: 600,
                        letterSpacing: -0.3,
                      }}
                    >
                      {e.role}
                    </h3>
                    <p
                      style={{
                        fontSize: 13,
                        color: ACCENT2,
                        fontFamily: "'DM Mono',monospace",
                        marginTop: 2,
                      }}
                    >
                      {e.company}
                    </p>
                  </div>
                  <span
                    style={{
                      fontSize: 11,
                      fontFamily: "'DM Mono',monospace",
                      color: '#555',
                      border: '1px solid #1e1e1e',
                      padding: '4px 10px',
                      borderRadius: 99,
                    }}
                  >
                    {e.period}
                  </span>
                </div>
                <ul style={{ listStyle: 'none', marginTop: 12 }}>
                  {e.bullets.map((b, j) => (
                    <li
                      key={j}
                      style={{
                        fontSize: 14,
                        color: '#777',
                        lineHeight: 1.7,
                        marginBottom: 6,
                        paddingLeft: 16,
                        position: 'relative',
                      }}
                    >
                      <span
                        style={{ position: 'absolute', left: 0, color: ACCENT }}
                      >
                        ›
                      </span>
                      {b}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <h2
            style={{
              fontSize: 28,
              fontWeight: 700,
              letterSpacing: -1,
              marginBottom: 28,
              marginTop: 16,
            }}
          >
            Education & Certifications
          </h2>
          <div
            className="resp-grid"
            style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}
          >
            {EDUCATION.map((ed, i) => (
              <BorderGlow
                key={i}
                glowColor="270 70 75"
                colors={['#c084fc', '#818cf8', '#6366f1']}
                borderRadius={12}
                glowRadius={32}
              >
                <div style={{ padding: '24px 28px' }}>
                  <p
                    style={{
                      fontSize: 15,
                      fontWeight: 600,
                      marginBottom: 4,
                      color: '#e8e8e8',
                    }}
                  >
                    {ed.degree}
                  </p>
                  <p
                    style={{
                      fontSize: 13,
                      color: ACCENT2,
                      fontFamily: "'DM Mono',monospace",
                      marginBottom: 4,
                    }}
                  >
                    {ed.school}
                  </p>
                  <p
                    style={{
                      fontSize: 11,
                      color: '#444',
                      fontFamily: "'DM Mono',monospace",
                    }}
                  >
                    {ed.year}
                  </p>
                </div>
              </BorderGlow>
            ))}
          </div>
        </Section>

        {/* PROJECTS */}
        <Section id="Projects" style={{ padding: '120px 0' }}>
          <SL n="03" label="PROJECTS" />
          <h2
            style={{
              fontSize: 36,
              fontWeight: 700,
              letterSpacing: -1,
              marginBottom: 12,
            }}
          >
            Selected Work
          </h2>
          <p
            style={{
              color: '#555',
              fontSize: 14,
              marginBottom: 48,
              fontFamily: "'DM Mono',monospace",
            }}
          >
            Hover to illuminate · Click to read the case study →
          </p>
          <div
            className="resp-grid"
            style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 28 }}
          >
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
                  style={{ padding: 32, cursor: 'pointer' }}
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
                      marginBottom: 10,
                    }}
                  >
                    {p.tag}
                  </span>
                  <h3
                    style={{
                      fontSize: 18,
                      fontWeight: 600,
                      marginBottom: 10,
                      letterSpacing: -0.5,
                      color: '#e8e8e8',
                    }}
                  >
                    {p.title}
                  </h3>
                  <p
                    style={{
                      fontSize: 14,
                      color: '#666',
                      lineHeight: 1.7,
                      marginBottom: 16,
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
        </Section>

        {/* SKILLS */}
        <Section id="Skills" style={{ padding: '120px 0' }}>
          <SL n="04" label="SKILLS" />
          <h2
            style={{
              fontSize: 36,
              fontWeight: 700,
              letterSpacing: -1,
              marginBottom: 48,
            }}
          >
            Areas of Expertise
          </h2>
          <div
            className="resp-grid skill-grid"
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '0 56px',
            }}
          >
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
              fontSize: 20,
              fontWeight: 600,
              marginTop: 60,
              marginBottom: 28,
              letterSpacing: -0.5,
            }}
          >
            Tools & Platforms
          </h3>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
            {TOOLS.map((t) => (
              <div
                key={t.name}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '8px 16px',
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
              fontSize: 20,
              fontWeight: 600,
              marginTop: 60,
              marginBottom: 28,
              letterSpacing: -0.5,
            }}
          >
            Languages
          </h3>
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 14,
              maxWidth: 400,
            }}
          >
            {LANGUAGES.map((l) => (
              <div key={l.lang}>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    marginBottom: 6,
                  }}
                >
                  <span
                    style={{
                      fontSize: 13,
                      fontFamily: "'DM Mono',monospace",
                      color: '#ccc',
                    }}
                  >
                    {l.lang}
                  </span>
                  <span
                    style={{
                      fontSize: 11,
                      color: '#555',
                      fontFamily: "'DM Mono',monospace",
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
        </Section>

        {/* SERVICES */}
        <Section style={{ padding: '0 0 120px' }}>
          <SL n="05" label="SERVICES" />
          <h2
            style={{
              fontSize: 36,
              fontWeight: 700,
              letterSpacing: -1,
              marginBottom: 48,
            }}
          >
            What I Offer
          </h2>
          <div
            className="resp-grid"
            style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}
          >
            {SERVICES.map((s) => (
              <BorderGlow
                key={s.title}
                glowColor="270 70 75"
                colors={['#c084fc', '#818cf8', '#6366f1']}
                borderRadius={16}
                glowRadius={36}
                glowIntensity={1.1}
              >
                <div style={{ padding: 32 }}>
                  <span
                    style={{ fontSize: 28, display: 'block', marginBottom: 14 }}
                  >
                    {s.icon}
                  </span>
                  <h3
                    style={{
                      fontSize: 17,
                      fontWeight: 600,
                      marginBottom: 10,
                      color: '#e8e8e8',
                    }}
                  >
                    {s.title}
                  </h3>
                  <p style={{ fontSize: 14, color: '#666', lineHeight: 1.7 }}>
                    {s.desc}
                  </p>
                </div>
              </BorderGlow>
            ))}
          </div>
        </Section>

        {/* TESTIMONIALS */}
        <Section style={{ padding: '0 0 120px' }}>
          <SL n="06" label="TESTIMONIALS" />
          <h2
            style={{
              fontSize: 36,
              fontWeight: 700,
              letterSpacing: -1,
              marginBottom: 48,
            }}
          >
            What Clients Say
          </h2>
          <div
            className="resp-grid-3"
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr 1fr',
              gap: 20,
            }}
          >
            {TESTIMONIALS.map((t) => (
              <BorderGlow
                key={t.name}
                glowColor="270 60 80"
                colors={['#a78bfa', '#c084fc', '#818cf8']}
                borderRadius={16}
                glowRadius={32}
                glowIntensity={1.0}
                edgeSensitivity={22}
              >
                <div style={{ padding: 28 }}>
                  <p
                    style={{
                      fontSize: 14,
                      color: '#888',
                      lineHeight: 1.75,
                      marginBottom: 20,
                      fontStyle: 'italic',
                    }}
                  >
                    "{t.quote}"
                  </p>
                  <div
                    style={{ display: 'flex', alignItems: 'center', gap: 10 }}
                  >
                    <div
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: '50%',
                        background: `linear-gradient(135deg,${ACCENT},#6366F1)`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 12,
                        fontWeight: 600,
                        color: '#fff',
                        flexShrink: 0,
                      }}
                    >
                      {t.avatar}
                    </div>
                    <div>
                      <p
                        style={{
                          fontSize: 13,
                          fontWeight: 600,
                          color: '#e8e8e8',
                        }}
                      >
                        {t.name}
                      </p>
                      <p
                        style={{
                          fontSize: 11,
                          color: '#555',
                          fontFamily: "'DM Mono',monospace",
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
        </Section>

        {/* CONTACT */}
        <Section id="Contact" style={{ padding: '0 0 120px' }}>
          <SL n="07" label="CONTACT" />
          <h2
            style={{
              fontSize: 36,
              fontWeight: 700,
              letterSpacing: -1,
              marginBottom: 12,
            }}
          >
            Let's Build Together
          </h2>
          <p style={{ color: '#666', marginBottom: 48, fontSize: 15 }}>
            Have a project in mind? I'd love to hear about it.
          </p>
          {sent ? (
            <div
              style={{
                padding: '24px 32px',
                borderRadius: 12,
                border: `1px solid ${ACCENT}44`,
                background: '#8B5CF611',
                color: ACCENT2,
                fontFamily: "'DM Mono',monospace",
                fontSize: 14,
              }}
            >
              ✓ Message sent! I'll get back to you soon.
            </div>
          ) : (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 20,
                maxWidth: 520,
              }}
            >
              {[
                { key: 'name', placeholder: 'Your name', type: 'text' },
                { key: 'email', placeholder: 'your@email.com', type: 'email' },
              ].map(({ key, placeholder, type }) => (
                <input
                  key={key}
                  type={type}
                  placeholder={placeholder}
                  value={formState[key]}
                  onChange={(e) =>
                    setFormState((p) => ({ ...p, [key]: e.target.value }))
                  }
                  style={{
                    padding: '14px 16px',
                    background: '#0d0b18',
                    border: '1px solid #1a1030',
                    borderRadius: 10,
                    color: '#e8e8e8',
                    fontSize: 14,
                    outline: 'none',
                    transition: 'border-color .2s',
                  }}
                  onFocus={(e) => (e.target.style.borderColor = ACCENT + '66')}
                  onBlur={(e) => (e.target.style.borderColor = '#1a1030')}
                />
              ))}
              <textarea
                rows={4}
                placeholder="Tell me about your project..."
                value={formState.msg}
                onChange={(e) =>
                  setFormState((p) => ({ ...p, msg: e.target.value }))
                }
                style={{
                  padding: '14px 16px',
                  background: '#0d0b18',
                  border: '1px solid #1a1030',
                  borderRadius: 10,
                  color: '#e8e8e8',
                  fontSize: 14,
                  outline: 'none',
                  resize: 'vertical',
                  transition: 'border-color .2s',
                  fontFamily: "'Sora',sans-serif",
                }}
                onFocus={(e) => (e.target.style.borderColor = ACCENT + '66')}
                onBlur={(e) => (e.target.style.borderColor = '#1a1030')}
              />
              <button
                onClick={handleSend}
                style={{
                  padding: '14px 32px',
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
                }}
                onMouseEnter={(e) => (e.target.style.opacity = 0.85)}
                onMouseLeave={(e) => (e.target.style.opacity = 1)}
              >
                Send Message →
              </button>
            </div>
          )}
        </Section>
      </div>

      {/* FOOTER */}
      <footer
        className="resp-footer"
        style={{
          borderTop: '0.5px solid #15102a',
          padding: '36px 8vw',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <span
          style={{
            fontFamily: "'DM Mono',monospace",
            fontSize: 12,
            color: '#333',
          }}
        >
          © 2026 Ousa Chea
        </span>
        <div style={{ display: 'flex', gap: 20 }}>
          {['GitHub', 'LinkedIn', 'Dribbble'].map((s) => (
            <span
              key={s}
              style={{
                fontSize: 12,
                color: '#444',
                fontFamily: "'DM Mono',monospace",
                cursor: 'pointer',
                transition: 'color .2s',
              }}
              onMouseEnter={(e) => (e.target.style.color = ACCENT)}
              onMouseLeave={(e) => (e.target.style.color = '#444')}
            >
              {s}
            </span>
          ))}
        </div>
      </footer>
    </div>
  );
}
