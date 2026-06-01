import { useParams, useNavigate } from 'react-router-dom';
import { useEffect } from 'react';

const ACCENT = '#8B5CF6';
const ACCENT2 = '#A78BFA';

const PROJECTS = [
  { id: 1, title: 'Canadia Bank V5', tag: 'Web Design · Development', url: 'https://new-cnb.webflow.io/', image: 'https://cdn.prod.website-files.com/67e0bf9e13613ecd0814bc70/67e0bf9e13613ecd0814bcf7_Canadia%20Bank%20App.png', desc: "Led the Webflow development and UX/UI design for Canadia Bank's V5 website — a modern, responsive platform aligned with the bank's brand identity.", caseStudy: { problem: "The previous website was outdated, difficult to navigate, and lacked mobile responsiveness. Customers struggled to find essential banking information, leading to increased support inquiries.", process: "Conducted a UX audit to identify pain points, redesigned the IA, created high-fidelity prototypes in Figma, then developed a clean, structured layout in Webflow optimised for desktop and mobile.", result: "Launched with a 30% increase in user engagement, 25% lower bounce rate, 40% drop in support inquiries, and 40% faster load times within the first three months." }, accent: '#f87171', colors: ['#f87171', '#c084fc', '#818cf8'], outcomes: [['30%','User Engagement ↑'],['25%','Bounce Rate ↓'],['40%','Support Tickets ↓'],['40%','Faster Load Times']] },
  { id: 2, title: 'UNDP Digital Strategy', tag: 'Web Design · Development', url: 'https://digitalstrategy.undp.org/', image: 'https://cdn.prod.website-files.com/67e0bf9e13613ecd0814bc70/67f38a948a714bcbc3c35934_UNDP%20-%20Digital%20Strategy%202022-2025.png', desc: "Led the full design and development of UNDP's Digital Strategy microsite — clean, responsive, and accessible across devices.", caseStudy: { problem: "UNDP needed a microsite to present their digital strategy clearly to a global audience across varying devices and connection speeds.", process: "Designed the full layout in Figma aligned with UNDP's global brand guidelines, then developed and optimised the site in Webflow for performance and accessibility.", result: "Delivered a high-performance, accessible microsite that met UNDP's brand and accessibility standards and reached a global audience." }, accent: '#38bdf8', colors: ['#38bdf8', '#818cf8', '#6366f1'], outcomes: [['100%','Brand Compliant'],['A11Y','Accessible'],['Global','Audience Reach']] },
  { id: 3, title: 'UNDP DigitalX', tag: 'Web Design · Development', url: 'https://digitalx.undp.org/index.html', image: 'https://cdn.prod.website-files.com/67e0bf9e13613ecd0814bc70/67f394beabd9f040078e274f_Digital%20X.png', desc: 'Designed and developed DigitalX — a UNDP initiative showcasing innovative digital transformation solutions with interactive elements.', caseStudy: { problem: "The initiative needed a visually engaging platform that could communicate complex digital topics to a diverse global audience.", process: "Created the visual design system, built interactive components, and optimised for performance and accessibility across all devices.", result: "Successfully launched with smooth navigation and strong engagement metrics from the global user base." }, accent: '#38bdf8', colors: ['#38bdf8', '#6366f1', '#c084fc'], outcomes: [['Interactive','Components'],['Fast','Performance'],['Global','User Base']] },
  { id: 4, title: 'Edge & Story', tag: 'Web Design · Development', url: 'https://www.edgeandstory.com/', image: 'https://cdn.prod.website-files.com/67e0bf9e13613ecd0814bc70/67e0cdb441031a9384a53166_edgeandstory%20_%20impact%20for%20culture%20and%20development.png', desc: "Redesigned and developed the website for edgeandstory — a consultancy in arts, culture, and sustainable development.", caseStudy: { problem: "The old site didn't communicate the consultancy's expertise or mission effectively, with poor information hierarchy and an outdated visual language.", process: "Redesigned the IA and visual design, focused on a portfolio-forward layout and clear communication of evaluation, research, and strategy services.", result: "Modern, accessible platform that effectively communicates their mission and received positive feedback from stakeholders." }, accent: '#a78bfa', colors: ['#c084fc', '#a78bfa', '#6366f1'], outcomes: [['New','Visual Identity'],['Clear','IA & Navigation'],['Positive','Stakeholder Feedback']] },
  { id: 5, title: 'Bright Consulting Limited', tag: 'Web Design · Development', url: 'https://www.bright.edu.vn/', image: 'https://cdn.prod.website-files.com/67e0bf9e13613ecd0814bc70/67f38c169dc229f94cd6f660_Bright%20Consulting%20Limited%20(1).png', desc: "Designed and developed the website for Bright Consulting Limited, an education consulting firm in Vietnam.", caseStudy: { problem: "The firm needed a credible online presence that could clearly showcase their services and student success stories.", process: "Designed in Figma with a clean, professional visual language, then developed in Webflow with structured content and intuitive navigation.", result: "Delivered a polished, mobile-optimised site that improved their brand credibility and streamlined lead generation." }, accent: '#34d399', colors: ['#34d399', '#10b981', '#38bdf8'], outcomes: [['Mobile','Optimised'],['Lead Gen','Improved'],['Brand','Elevated']] },
  { id: 6, title: 'CASIC Cambodia', tag: 'Web Design · Development', url: 'https://www.casiccambodia.net/', image: 'https://cdn.prod.website-files.com/67e0bf9e13613ecd0814bc70/67f392146a2ff432016a333e_CASIC%20-%20Home.png', desc: "Developed a clean, responsive website for CASIC Cambodia with a scalable CMS.", caseStudy: { problem: "CASIC needed a corporate site that reflected their scale and credibility while being easy to maintain internally.", process: "Built a structured Webflow site with a scalable CMS, optimised for performance and mobile, with a clear information hierarchy.", result: "Launched a fast, maintainable site that supports ongoing content updates with ease." }, accent: '#34d399', colors: ['#34d399', '#818cf8', '#10b981'], outcomes: [['Scalable','CMS'],['Fast','Load Speed'],['Easy','Self-Managed']] },
  { id: 7, title: 'Data to Policy', tag: 'Web Design · Development', url: 'https://www.datatopolicy.org/', image: 'https://cdn.prod.website-files.com/67e0bf9e13613ecd0814bc70/67f3944c8f607e1fafd5ea89_Data%20to%20Policy%20Navigator.png', desc: "Worked on the design, development, and content creation for Data to Policy.", caseStudy: { problem: "The platform needed to present complex data and policy content in an accessible, digestible format.", process: "Designed a streamlined layout in Figma with strong typographic hierarchy, then developed in Webflow with integrated CMS.", result: "Delivered a clear, navigable platform that effectively bridges data and policy for its global user base." }, accent: '#fb923c', colors: ['#fb923c', '#f97316', '#c084fc'], outcomes: [['Complex','Data Made Simple'],['CMS','Integrated'],['Global','Audience']] },
  { id: 8, title: 'Eleven Degrees', tag: 'Web Design · Development', url: 'https://www.elevendegrees.com/', image: 'https://cdn.prod.website-files.com/67e0bf9e13613ecd0814bc70/67f3907006920d025d28bac2_Eleven%20Degrees_%20Where%20Beer%20Brings%20Us%20Together.png', desc: "Crafted a clean and professional digital presence for Eleven Degrees.", caseStudy: { problem: "The brand needed a digital presence that matched their refined aesthetic and communicated their unique offering clearly.", process: "Designed a minimal, image-led layout in Figma, then built in Webflow with smooth transitions and optimised asset loading.", result: "Launched a polished site that elevated the brand's online presence and improved audience engagement." }, accent: '#a78bfa', colors: ['#c084fc', '#818cf8', '#6366f1'], outcomes: [['Minimal','Design'],['Smooth','Interactions'],['Elevated','Brand']] },
  { id: 9, title: 'Fingertip', tag: 'Web Design · Development', url: 'https://www.getfingertip.io/', image: 'https://cdn.prod.website-files.com/67e0bf9e13613ecd0814bc70/67f38d6c6056abc25bd6dd64_FINGERTIP%20_%20Supply%20Chain%20Management%20Software.png', desc: "Developed Fingertip's high-converting marketing site.", caseStudy: { problem: "Fingertip needed a high-converting marketing site that communicated their product value clearly and drove sign-ups.", process: "Developed pixel-perfectly from provided Figma designs in Webflow, focusing on performance, responsiveness, and smooth interactions.", result: "Delivered on schedule with excellent performance scores and a clean, conversion-focused experience." }, accent: '#fb923c', colors: ['#fb923c', '#fbbf24', '#c084fc'], outcomes: [['On-Time','Delivery'],['High','Performance'],['Conversion','Focused']] },
  { id: 10, title: 'GIA Tower', tag: 'Web Design · Development', url: 'https://www.gia-tower.com/', image: 'https://cdn.prod.website-files.com/67e0bf9e13613ecd0814bc70/67f38a9d4d23ea6d10ec08bd_GIA%20Tower%20-%20Book%20Premium%20Office%20Space%20in%20Koh%20Pich.png', desc: "Developed the official website for GIA Tower, a luxury mixed-use development in Phnom Penh.", caseStudy: { problem: "The development needed a premium digital presence that conveyed the tower's luxury positioning.", process: "Built a high-impact Webflow site with strong visual storytelling, structured content, and optimised asset delivery.", result: "Delivered a striking, fast-loading site that effectively communicated the project's premium value." }, accent: '#fbbf24', colors: ['#fbbf24', '#f59e0b', '#c084fc'], outcomes: [['Premium','Visual Storytelling'],['Fast','Asset Delivery'],['High-Value','Enquiries']] },
  { id: 11, title: 'Hotel KVL', tag: 'Web Design · Development', url: 'https://www.hotelkvlgroup.com/', image: 'https://cdn.prod.website-files.com/67e0bf9e13613ecd0814bc70/67f38d2cbb1000f0b93f03f6_Hotel%20KVL%20Phnom%20Penh%20_%20Designed%20to%20connect.png', desc: "Designed and developed the corporate site for Hotel KVL Group with CMS training.", caseStudy: { problem: "The hotel group needed a single corporate site that represented multiple properties consistently and could be managed internally.", process: "Designed a clean, brand-aligned layout in Figma, developed in Webflow with a structured CMS, and conducted a training session.", result: "The team can now manage all content independently, providing a consistent, professional experience." }, accent: '#fbbf24', colors: ['#fbbf24', '#c084fc', '#818cf8'], outcomes: [['Self-Managed','CMS'],['Brand','Consistent'],['CMS Training','Delivered']] },
  { id: 12, title: 'Multiple Natures', tag: 'Web Design · Development', url: 'https://www.multiplenatures.com/', image: 'https://cdn.prod.website-files.com/67e0bf9e13613ecd0814bc70/67f38ab58a714bcbc3c38645_Know%20more%20about%20Multiple%20Natures.png', desc: "Handled the development and ongoing maintenance of Multiple Natures' website.", caseStudy: { problem: "The organisation needed a reliable, well-maintained web presence that could support their growing global network.", process: "Took ownership of the Webflow site, implemented performance improvements, and managed ongoing content updates.", result: "Sustained a stable, performant site that supports Multiple Natures' global operations with minimal downtime." }, accent: '#38bdf8', colors: ['#38bdf8', '#6366f1', '#818cf8'], outcomes: [['Stable','Uptime'],['Performance','Improved'],['Global','Operations Supported']] },
  { id: 13, title: 'OCIC Group', tag: 'Web Design · Development', url: 'https://www.ocic.com.kh/', image: 'https://cdn.prod.website-files.com/67e0bf9e13613ecd0814bc70/67f38a6205670d6f3ac30386_OCIC%20Group%20-%20Building%20Opportunities.png', desc: "Built and maintained OCIC's corporate website with multilingual support (Khmer, English, Chinese).", caseStudy: { problem: "OCIC needed a multilingual corporate site that could serve Khmer, English, and Chinese audiences while remaining easy to maintain.", process: "Built a scalable Webflow site with structured multilingual CMS, optimised information architecture, and consistent branding.", result: "Delivered a robust trilingual platform that simplified content management and strengthened OCIC's corporate digital presence." }, accent: '#f87171', colors: ['#f87171', '#c084fc', '#818cf8'], outcomes: [['3 Languages','Supported'],['Scalable','CMS'],['Brand','Strengthened']] },
];

export default function ProjectPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const project = PROJECTS.find(p => String(p.id) === id);

  useEffect(() => {
    window.scrollTo(0, 0);
    if (project) document.title = `${project.title} — Ousa Chea`;
  }, [project]);

  if (!project) return (
    <div style={{ minHeight: '100vh', background: '#080810', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ textAlign: 'center' }}>
        <p style={{ color: '#555', fontFamily: "'DM Mono',monospace", marginBottom: 16 }}>Project not found</p>
        <button onClick={() => navigate('/')} style={{ background: ACCENT, border: 'none', borderRadius: 8, color: '#fff', padding: '12px 24px', cursor: 'pointer', fontSize: 14 }}>← Back home</button>
      </div>
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', background: '#080810', color: '#e8e8e8', fontFamily: "'DM Sans',system-ui,sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500&family=DM+Mono:wght@400;500&display=swap');
        *{box-sizing:border-box;margin:0;padding:0;}
        body{overflow-x:hidden;}
      `}</style>

      {/* Back nav */}
      <nav style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100, height: 60, display: 'flex', alignItems: 'center', padding: '0 clamp(20px,5vw,60px)', background: 'rgba(8,8,16,.88)', backdropFilter: 'blur(16px)', borderBottom: '0.5px solid #1a1030' }}>
        <button
          onClick={() => navigate(-1)}
          style={{ background: 'none', border: '1px solid #2a2040', borderRadius: 8, color: '#aaa', cursor: 'pointer', padding: '8px 16px', fontSize: 13, fontFamily: "'DM Mono',monospace", display: 'flex', alignItems: 'center', gap: 8, transition: 'color .2s, border-color .2s' }}
          onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = ACCENT2; (e.currentTarget as HTMLButtonElement).style.borderColor = ACCENT; }}
          onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = '#aaa'; (e.currentTarget as HTMLButtonElement).style.borderColor = '#2a2040'; }}
        >
          ← Back
        </button>
        <span style={{ marginLeft: 20, fontSize: 13, color: '#333', fontFamily: "'DM Mono',monospace" }}>/ {project.tag}</span>
      </nav>

      {/* Hero image */}
      <div style={{ paddingTop: 60, height: 'clamp(260px,45vw,520px)', overflow: 'hidden', position: 'relative' }}>
        <img src={project.image} alt={project.title} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(transparent 40%, #080810)' }} />
      </div>

      {/* Content */}
      <div style={{ maxWidth: 860, margin: '0 auto', padding: '0 clamp(20px,5vw,40px) 120px' }}>

        {/* Title block */}
        <div style={{ margin: '-48px 0 48px', position: 'relative', zIndex: 2 }}>
          <span style={{ display: 'inline-block', fontSize: 11, fontFamily: "'DM Mono',monospace", color: project.accent, letterSpacing: 1, border: `1px solid ${project.accent}44`, padding: '4px 12px', borderRadius: 99, marginBottom: 16 }}>{project.tag}</span>
          <h1 style={{ fontSize: 'clamp(32px,6vw,64px)', fontWeight: 700, letterSpacing: -2, lineHeight: 1.08, color: '#f3f4f6', fontFamily: "'Space Grotesk',sans-serif", marginBottom: 16 }}>{project.title}</h1>
          <p style={{ fontSize: 'clamp(15px,2vw,18px)', color: '#888', lineHeight: 1.75, maxWidth: 640, marginBottom: 32 }}>{project.desc}</p>
          <a href={project.url} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '12px 24px', background: project.accent, border: 'none', borderRadius: 8, color: '#fff', fontSize: 14, fontWeight: 600, textDecoration: 'none', fontFamily: "'DM Sans',sans-serif" }}>
            View Live Site ↗
          </a>
        </div>

        {/* Outcomes */}
        <div style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.min((project as any).outcomes?.length ?? 3, 4)},1fr)`, gap: 16, marginBottom: 64, padding: '28px 32px', borderRadius: 16, border: `1px solid ${project.accent}22`, background: `${project.accent}0a` }}>
          {((project as any).outcomes ?? []).map(([num, label]: [string, string]) => (
            <div key={label} style={{ textAlign: 'center' }}>
              <p style={{ fontSize: 'clamp(22px,3vw,32px)', fontWeight: 700, color: project.accent, margin: '0 0 4px', fontFamily: "'Space Grotesk',sans-serif" }}>{num}</p>
              <p style={{ fontSize: 11, color: '#444', fontFamily: "'DM Mono',monospace", margin: 0 }}>{label}</p>
            </div>
          ))}
        </div>

        {/* Case study sections */}
        {([
          { emoji: '🔴', label: 'The Problem', text: project.caseStudy.problem },
          { emoji: '🔵', label: 'The Process', text: project.caseStudy.process },
          { emoji: '🟢', label: 'The Result',  text: project.caseStudy.result  },
        ] as const).map(({ emoji, label, text }) => (
          <div key={label} style={{ marginBottom: 48, paddingBottom: 48, borderBottom: '1px solid #1a1030' }}>
            <p style={{ fontSize: 11, fontFamily: "'DM Mono',monospace", color: '#333', letterSpacing: 2, margin: '0 0 12px' }}>{emoji} {label.toUpperCase()}</p>
            <p style={{ fontSize: 'clamp(15px,2vw,17px)', color: '#bbb', lineHeight: 1.85 }}>{text}</p>
          </div>
        ))}

        {/* Footer CTA */}
        <div style={{ textAlign: 'center', paddingTop: 16 }}>
          <p style={{ fontSize: 15, color: '#555', marginBottom: 24 }}>Interested in working together?</p>
          <button onClick={() => { navigate('/'); setTimeout(() => document.getElementById('Contact')?.scrollIntoView({ behavior: 'smooth' }), 200); }} style={{ padding: '14px 32px', background: ACCENT, border: 'none', borderRadius: 8, color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: "'DM Sans',sans-serif" }}>
            Get in Touch →
          </button>
        </div>
      </div>
    </div>
  );
}
