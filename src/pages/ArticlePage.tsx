import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

const ACCENT = '#8B5CF6';
const ACCENT2 = '#A78BFA';

const ARTICLES = [
  {
    slug: 'canadia-bank-mobile-banking-v3-vs-v5',
    title: 'Canadia Bank Mobile Banking v3 vs v5',
    subtitle: 'From Strong Roots to Smarter Experiences: A UX/UI and Product Execution Perspective',
    tag: 'Case Study',
    read: '8 min read',
    date: 'May 2025',
    description: 'A deep dive into the evolution of Canadia Bank\'s mobile banking app — comparing v3 and v5 from a UX/UI and product execution standpoint.',
    sections: [
      {
        heading: 'Background',
        body: `Canadia Bank is one of Cambodia's largest and most trusted financial institutions. When I joined the digital team, the mobile banking app was on v3 — a functional but dated experience that had accumulated years of feature additions without a coherent UX strategy. The jump to v5 wasn't just a visual refresh; it was a full rethink of how customers interact with their finances on mobile.`,
      },
      {
        heading: 'What was wrong with v3?',
        body: `V3 suffered from the classic "feature creep" problem. Every quarter, a new feature was bolted on without revisiting the overall information architecture. The result was a navigation structure that required users to dig through 3–4 levels to reach commonly used actions like fund transfers or bill payments. User drop-off data confirmed it — 38% of sessions ended without completing a transaction.`,
        bullets: [
          'Inconsistent UI patterns across screens (different button styles, icon sizes, spacing)',
          'No biometric login — users had to enter a full PIN every session',
          'Transfers buried under a nested menu structure',
          'No contextual help or onboarding for new features',
          'Load times averaging 4.2 seconds on mid-range Android devices',
        ],
      },
      {
        heading: 'The V5 approach',
        body: `The v5 project started with a three-week discovery phase. We ran usability tests with 24 existing customers across age groups and device types. We mapped every key user journey and identified the top 5 actions that accounted for 80% of all sessions (transfers, balance checks, bill pay, QR pay, and statements). Those five became the top-level navigation. Everything else was secondary.`,
      },
      {
        heading: 'UX decisions that made the difference',
        body: `The biggest UX win in v5 was collapsing the navigation hierarchy. Actions that took 5 taps in v3 now take 2. We introduced a persistent quick-action bar at the bottom of the dashboard — no scrolling required to reach your most-used features. Biometric authentication was implemented for both login and transaction confirmation, cutting average session start time from 14 seconds to 3.`,
        bullets: [
          'Bottom navigation bar with the 5 core actions always visible',
          'Biometric login and transaction signing',
          'Smart dashboard that surfaces recent payees and pending bills',
          'Progressive disclosure for advanced settings (power users still have access)',
          'Skeleton screens and optimistic UI for perceived performance',
        ],
      },
      {
        heading: 'Results after launch',
        body: `Within 90 days of the v5 launch, the data told a clear story. Transaction completion rate rose from 62% to 89%. Average session length dropped by 28% — not because engagement fell, but because users were completing tasks faster. App Store rating improved from 3.2 to 4.6. Customer support inquiries related to "how do I..." dropped by 41%.`,
      },
      {
        heading: 'What I learned',
        body: `The biggest lesson: good product execution isn't just about shipping features — it's about shipping the right sequence of decisions. In v3, features were driven by stakeholder requests without enough customer validation. In v5, every decision had a usability test or data point behind it. That discipline, maintained throughout the sprint cycles, is what made the difference between a cosmetic update and a genuine product evolution.`,
      },
    ],
  },
  {
    slug: 'waterfall-vs-agile',
    title: 'Waterfall vs Agile',
    subtitle: 'Which project management methodology is right for your team?',
    tag: 'Project Management',
    read: '5 min read',
    date: 'Apr 2025',
    description: 'A practical breakdown of Waterfall and Agile methodologies — when to use each, the trade-offs, and how to choose based on your team and project type.',
    sections: [
      {
        heading: 'The eternal debate',
        body: `Every project manager eventually gets asked: "Should we use Waterfall or Agile?" The honest answer is that the question itself is a bit of a trap. Both are tools, and like any tool, their value depends entirely on the context. I've managed projects under both methodologies — and hybrid variations of each — and the right choice is almost never obvious upfront.`,
      },
      {
        heading: 'What Waterfall actually means',
        body: `Waterfall is a linear, sequential approach. You complete each phase fully before moving to the next: requirements → design → development → testing → deployment. It originated in manufacturing and construction, where changing a bridge design mid-build is catastrophically expensive. The appeal is clarity — everyone knows exactly what needs to happen and in what order.`,
        bullets: [
          'Fixed scope, timeline, and budget defined at the start',
          'Detailed documentation at every phase',
          'Clear sign-off gates between phases',
          'Works well when requirements are stable and well-understood',
          'Risk: discovering problems late when they\'re expensive to fix',
        ],
      },
      {
        heading: 'What Agile actually means',
        body: `Agile is an iterative approach built around short delivery cycles (sprints), continuous feedback, and the acceptance that requirements will evolve. Rather than defining everything upfront, you define enough to start, then learn and adapt as you go. The Agile Manifesto prioritises working software over comprehensive documentation, and customer collaboration over contract negotiation.`,
        bullets: [
          'Work broken into 1–4 week sprints with shippable output',
          'Regular retrospectives to improve the process itself',
          'Product backlog that evolves based on feedback',
          'Works well when requirements are unclear or likely to change',
          'Risk: scope creep if the backlog isn\'t managed with discipline',
        ],
      },
      {
        heading: 'When to use Waterfall',
        body: `Waterfall earns its place when the problem is well-defined and the cost of change is high. Government compliance projects, infrastructure migrations, and hardware-dependent software all benefit from Waterfall's rigour. If your client needs a fixed-price contract and the requirements won't change, Waterfall gives you the documentation trail to manage that relationship.`,
      },
      {
        heading: 'When to use Agile',
        body: `Agile shines when you're building something new, where customer feedback will materially shape the product. Digital products, mobile apps, and internal tools that serve evolving business needs are natural fits. The key is having a stakeholder who can engage regularly — Agile without an accessible product owner quickly becomes chaotic.`,
      },
      {
        heading: 'The hybrid reality',
        body: `Most real-world projects live somewhere in between. I've run projects with Waterfall-style planning phases (clear scope, signed requirements document) followed by Agile execution sprints. The planning rigour satisfies clients who need certainty; the sprint structure gives the team flexibility to respond to what they discover during build. Call it "Wagile" if you want — it works.`,
      },
      {
        heading: 'My take',
        body: `Choose your methodology based on two questions: How well do you understand the end state? And how expensive is it to change direction mid-project? High clarity + high change cost = Waterfall. Low clarity + low change cost = Agile. Everything else is a hybrid. Don't let methodology become ideology — the goal is shipping something that works.`,
      },
    ],
  },
  {
    slug: 'gestalt-principles-ux-designers',
    title: 'Gestalt Principles for UX Designers',
    subtitle: 'How psychological laws shape effective, user-friendly digital interfaces.',
    tag: 'UX Design',
    read: '6 min read',
    date: 'Mar 2025',
    description: 'A practical guide to applying Gestalt psychology principles in UX design — covering proximity, similarity, continuity, closure, and figure-ground.',
    sections: [
      {
        heading: 'Why psychology matters in UX',
        body: `Good design isn't just about aesthetics — it's about how human brains process visual information. Gestalt psychology, developed in Germany in the early 20th century, explains that people naturally organise visual elements into groups and patterns. Understanding these principles lets designers create interfaces that feel intuitive because they work with the brain's natural tendencies, not against them.`,
      },
      {
        heading: 'Proximity',
        body: `Elements that are close together are perceived as related. This is one of the most powerful and underused principles in UI design. When you group related form fields, keep action buttons near the content they act on, and create clear visual separation between unrelated sections — you're leveraging proximity. A cluttered interface often fails not because it has too much content, but because the spacing doesn't communicate which things belong together.`,
        bullets: [
          'Group related form fields (name, email, phone) together',
          'Keep CTA buttons adjacent to the content they relate to',
          'Use whitespace deliberately to separate distinct sections',
          'Navigation items grouped by function, not alphabetically',
        ],
      },
      {
        heading: 'Similarity',
        body: `Elements that look alike are perceived as belonging to the same group. This is why consistent button styles matter — your primary action button should always look the same. If two buttons look identical but do different things, users will be confused. Conversely, if two different-looking elements do the same thing, users will hesitate. Similarity creates implicit categorisation without requiring labels.`,
      },
      {
        heading: 'Continuity',
        body: `The eye naturally follows lines and curves, preferring paths that continue smoothly. In UI design, this shows up in grid alignment, reading flows, and how you direct attention. A progress indicator works because it creates a line that the eye follows. Misaligned elements interrupt this flow and create cognitive friction — the user notices something is "off" even if they can't articulate why.`,
      },
      {
        heading: 'Closure',
        body: `The brain completes incomplete shapes. This is why outline icons work — we don't need a fully filled circle to recognise a smiley face. In interface design, closure lets you create elegant visual elements that don't need to be fully drawn. Card borders, subtle dividers, and implied containers all leverage closure. It also explains why a partially visible element at the edge of a scroll container signals "there's more here."`,
      },
      {
        heading: 'Figure and Ground',
        body: `We instinctively separate visual elements into a "figure" (what we're focusing on) and a "ground" (the background). Modal dialogs work because the overlay darkens the ground, making the modal the clear figure. Poor figure-ground relationships create interfaces where users can't tell what's interactive and what's static. This principle is especially critical in dark-mode design, where the contrast relationships invert.`,
      },
      {
        heading: 'Applying these in practice',
        body: `You don't need to consciously think "I'm applying proximity here" with every design decision. The value of knowing these principles is in the critique phase — when something feels wrong, Gestalt gives you a vocabulary to diagnose it. Is this button isolated when it should be grouped? Are these two elements similar enough to imply a relationship that doesn't exist? Are my alignment inconsistencies breaking continuity? Gestalt turns "something feels off" into an actionable design note.`,
      },
    ],
  },
];

export { ARTICLES };

const tagColor: Record<string, string> = {
  'Case Study': '#f87171',
  'Project Management': '#38bdf8',
  'UX Design': '#a78bfa',
};

export default function ArticlePage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const article = ARTICLES.find(a => a.slug === slug);

  useEffect(() => {
    window.scrollTo(0, 0);
    if (!article) return;
    document.title = `${article.title} | Ousa Chea`;
    const desc = document.querySelector('meta[name="description"]');
    if (desc) desc.setAttribute('content', article.description);
    const ogTitle = document.querySelector('meta[property="og:title"]');
    if (ogTitle) ogTitle.setAttribute('content', `${article.title} | Ousa Chea`);
    const ogDesc = document.querySelector('meta[property="og:description"]');
    if (ogDesc) ogDesc.setAttribute('content', article.description);
    const ogUrl = document.querySelector('meta[property="og:url"]');
    if (ogUrl) ogUrl.setAttribute('content', `https://ousachea.com/articles/${slug}`);

    // JSON-LD for this article
    const existing = document.getElementById('article-jsonld');
    if (existing) existing.remove();
    const script = document.createElement('script');
    script.id = 'article-jsonld';
    script.type = 'application/ld+json';
    script.text = JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'Article',
      headline: article.title,
      description: article.description,
      author: { '@type': 'Person', name: 'Ousa Chea', url: 'https://ousachea.com' },
      publisher: { '@type': 'Person', name: 'Ousa Chea', url: 'https://ousachea.com' },
      url: `https://ousachea.com/articles/${slug}`,
      datePublished: article.date,
      keywords: [article.tag, 'Ousa Chea', 'UX Design', 'Project Management'].join(', '),
    });
    document.head.appendChild(script);

    return () => {
      document.title = 'Ousa Chea — Project Manager & UX/UI Designer | Phnom Penh';
      document.getElementById('article-jsonld')?.remove();
    };
  }, [article, slug]);

  if (!article) {
    return (
      <div style={{ minHeight: '100vh', background: '#080810', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <p style={{ color: '#555', marginBottom: 24 }}>Article not found.</p>
          <button onClick={() => navigate('/')} style={{ color: ACCENT, background: 'none', border: 'none', cursor: 'pointer', fontSize: 14 }}>
            ← Back to home
          </button>
        </div>
      </div>
    );
  }

  const accent = tagColor[article.tag] ?? ACCENT;
  const otherArticles = ARTICLES.filter(a => a.slug !== slug).slice(0, 2);

  return (
    <div style={{ minHeight: '100vh', background: '#080810', color: '#e8e8e8', fontFamily: "'Inter','DM Sans',system-ui,sans-serif" }}>
      {/* Back nav */}
      <div style={{ position: 'sticky', top: 0, zIndex: 100, background: 'rgba(8,8,16,0.85)', backdropFilter: 'blur(12px)', borderBottom: '1px solid #1a1030' }}>
        <div style={{ maxWidth: 760, margin: '0 auto', padding: '14px clamp(20px,5vw,40px)', display: 'flex', alignItems: 'center', gap: 16 }}>
          <button
            onClick={() => navigate('/')}
            style={{ background: 'none', border: 'none', color: '#555', cursor: 'pointer', fontSize: 13, fontFamily: "'DM Mono',monospace", display: 'flex', alignItems: 'center', gap: 6, padding: 0, transition: 'color .2s' }}
            onMouseEnter={e => (e.currentTarget.style.color = ACCENT2)}
            onMouseLeave={e => (e.currentTarget.style.color = '#555')}
          >
            ← ousachea.com
          </button>
          <span style={{ color: '#1a1030' }}>·</span>
          <span style={{ fontSize: 11, fontFamily: "'DM Mono',monospace", color: accent, background: `${accent}18`, border: `1px solid ${accent}33`, padding: '3px 10px', borderRadius: 99 }}>
            {article.tag}
          </span>
        </div>
      </div>

      {/* Article */}
      <article style={{ maxWidth: 760, margin: '0 auto', padding: 'clamp(40px,8vw,80px) clamp(20px,5vw,40px)' }}>
        {/* Header */}
        <header style={{ marginBottom: 56 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
            <span style={{ fontSize: 11, fontFamily: "'DM Mono',monospace", color: '#444' }}>{article.date}</span>
            <span style={{ color: '#1a1030' }}>·</span>
            <span style={{ fontSize: 11, fontFamily: "'DM Mono',monospace", color: '#444' }}>{article.read}</span>
          </div>
          <h1 style={{ fontSize: 'clamp(26px,5vw,42px)', fontWeight: 700, letterSpacing: -1.2, lineHeight: 1.15, margin: '0 0 16px', color: '#f0f0f0' }}>
            {article.title}
          </h1>
          <p style={{ fontSize: 18, color: '#666', lineHeight: 1.6, margin: 0, fontStyle: 'italic' }}>
            {article.subtitle}
          </p>
          <div style={{ marginTop: 32, height: 1, background: 'linear-gradient(to right, #1a1030, transparent)' }} />
        </header>

        {/* Body */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 40 }}>
          {article.sections.map((s, i) => (
            <section key={i}>
              <h2 style={{ fontSize: 20, fontWeight: 600, letterSpacing: -0.4, color: '#e0e0e0', margin: '0 0 14px' }}>
                {s.heading}
              </h2>
              <p style={{ fontSize: 16, color: '#888', lineHeight: 1.8, margin: 0 }}>
                {s.body}
              </p>
              {s.bullets && (
                <ul style={{ listStyle: 'none', margin: '16px 0 0', padding: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {s.bullets.map((b, j) => (
                    <li key={j} style={{ fontSize: 15, color: '#666', lineHeight: 1.7, paddingLeft: 20, position: 'relative' }}>
                      <span style={{ position: 'absolute', left: 0, color: accent }}>›</span>
                      {b}
                    </li>
                  ))}
                </ul>
              )}
            </section>
          ))}
        </div>

        {/* Footer divider */}
        <div style={{ marginTop: 72, paddingTop: 40, borderTop: '1px solid #1a1030' }}>
          <p style={{ fontSize: 13, fontFamily: "'DM Mono',monospace", color: '#333', marginBottom: 32 }}>
            Written by Ousa Chea — Project Manager & UX/UI Designer, Phnom Penh
          </p>

          {/* More articles */}
          {otherArticles.length > 0 && (
            <>
              <h3 style={{ fontSize: 14, fontWeight: 600, color: '#555', margin: '0 0 20px', textTransform: 'uppercase', letterSpacing: 1, fontFamily: "'DM Mono',monospace" }}>
                More articles
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {otherArticles.map(a => (
                  <button
                    key={a.slug}
                    onClick={() => navigate(`/articles/${a.slug}`)}
                    style={{ background: 'none', border: '1px solid #1a1030', borderRadius: 10, padding: '16px 20px', cursor: 'pointer', textAlign: 'left', transition: 'border-color .2s' }}
                    onMouseEnter={e => (e.currentTarget.style.borderColor = ACCENT + '44')}
                    onMouseLeave={e => (e.currentTarget.style.borderColor = '#1a1030')}
                  >
                    <div style={{ fontSize: 10, fontFamily: "'DM Mono',monospace", color: tagColor[a.tag] ?? ACCENT, marginBottom: 6 }}>{a.tag} · {a.read}</div>
                    <div style={{ fontSize: 15, fontWeight: 600, color: '#c0c0c0' }}>{a.title}</div>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </article>
    </div>
  );
}
