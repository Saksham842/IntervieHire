'use client';
import React from 'react';
import { Eyebrow, RevealCard } from './Primitives';

// SolutionSection.jsx
export const SolutionSection = () => {
  const layers = [
    {
      num: "01",
      label: "AI Screening",
      title: "Filter the noise. Fast.",
      body: "Our AI shortlists resumes and runs structured, role-specific assessments: evaluating communication, reasoning, and aptitude. Filters the bottom 70–80% without a single manager involved.",
      icon: (
        <svg width="52" height="52" viewBox="0 0 52 52" fill="none" stroke="#C9A84C" strokeWidth="1.5" strokeLinecap="round">
          <rect x="8" y="8" width="36" height="36" rx="4" strokeOpacity="0.3"/>
          <circle cx="26" cy="22" r="8"/>
          <path d="M18 22 L22 18 M34 22 L30 18" strokeOpacity="0.5"/>
          <path d="M20 34 C20 30 22.7 28 26 28 C29.3 28 32 30 32 34" strokeOpacity="0.7"/>
          <path d="M8 38 L44 38" strokeOpacity="0.2"/>
          <circle cx="34" cy="34" r="1.5" fill="#C9A84C"/>
          <path d="M36 36 L40 40" strokeWidth="1.8"/>
        </svg>
      ),
      flip: false,
    },
    {
      num: "02",
      label: "Expert Human Interviews",
      title: "Real experts. Round the clock.",
      body: "Vetted industry professionals (sales leaders, operators, consultants) who conduct calibrated interviews 24/7. Your team keeps building. Uninterrupted.",
      icon: (
        <svg width="52" height="52" viewBox="0 0 52 52" fill="none" stroke="#C9A84C" strokeWidth="1.5" strokeLinecap="round">
          <circle cx="20" cy="20" r="7"/>
          <circle cx="34" cy="20" r="7"/>
          <path d="M10 40 C10 34 14.5 30 20 30"/>
          <path d="M42 40 C42 34 37.5 30 32 30"/>
          <path d="M20 30 C22 34 24 36 27 36 C30 36 30 34 32 30"/>
          <path d="M24 36 L24 40 M28 36 L28 40" strokeOpacity="0.5"/>
        </svg>
      ),
      flip: true,
    },
    {
      num: "03",
      label: "Hire with Confidence",
      title: "Every shortlist. Fully evaluated.",
      body: "Every shortlisted candidate arrives fully evaluated: detailed feedback, verified background, standardized scores. Hire decisively from a shortlist of top-fit talent.",
      icon: (
        <svg width="52" height="52" viewBox="0 0 52 52" fill="none" stroke="#C9A84C" strokeWidth="1.5" strokeLinecap="round">
          <circle cx="26" cy="26" r="18" strokeOpacity="0.2"/>
          <circle cx="26" cy="26" r="11"/>
          <path d="M20 26 L24 30 L33 21" strokeWidth="2"/>
          <path d="M26 8 L26 4 M26 48 L26 44 M8 26 L4 26 M48 26 L44 26" strokeOpacity="0.3" strokeWidth="1"/>
        </svg>
      ),
      flip: false,
    },
  ];

  return (
    <section style={{ background: '#0A0A0A', padding: '120px 48px' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        <Eyebrow>The Solution</Eyebrow>
        <h2 style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: 'clamp(2rem, 4vw, 3rem)', fontWeight: 700, color: '#F5F0E8', letterSpacing: '-0.02em', lineHeight: 1.15, marginBottom: 80, maxWidth: 560 }}>
          One platform. Every layer of hiring, handled.
        </h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 48 }}>
          {layers.map((layer, i) => (
            <RevealCard key={i} delay={0.1}>
              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: 48,
                alignItems: 'center',
                direction: layer.flip ? 'rtl' : 'ltr',
              }}>
                {/* Icon panel */}
                <div style={{
                  direction: 'ltr',
                  background: 'rgba(255,255,255,0.02)',
                  border: '1px solid rgba(201,168,76,0.12)',
                  borderRadius: 16,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  minHeight: 200,
                  position: 'relative', overflow: 'hidden',
                }}>
                  <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at center, rgba(201,168,76,0.06) 0%, transparent 70%)' }}/>
                  {layer.icon}
                </div>
                {/* Text */}
                <div style={{ direction: 'ltr' }}>
                  <div style={{ fontFamily: 'Outfit, sans-serif', fontSize: 11, fontWeight: 500, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#C9A84C', marginBottom: 12 }}>
                    Layer {layer.num}: {layer.label}
                  </div>
                  <h3 style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: 26, fontWeight: 700, color: '#F5F0E8', letterSpacing: '-0.02em', lineHeight: 1.2, marginBottom: 16 }}>{layer.title}</h3>
                  <p style={{ fontFamily: 'Outfit, sans-serif', fontSize: 16, color: '#888880', lineHeight: 1.7 }}>{layer.body}</p>
                </div>
              </div>
            </RevealCard>
          ))}
        </div>
      </div>
    </section>
  );
};

