'use client';
import React from 'react';
import { Eyebrow, GlassCard, RevealCard } from './Primitives';

// ProblemSection.jsx
export const ProblemSection = () => {
  const cards = [
    {
      icon: (
        <svg width="36" height="36" viewBox="0 0 36 36" fill="none" stroke="#C9A84C" strokeWidth="1.5" strokeLinecap="round">
          <circle cx="18" cy="12" r="5"/>
          <path d="M8 32c0-5.5 4.5-10 10-10s10 4.5 10 10"/>
          <path d="M28 9c2 1 3.5 3 3.5 5.5 0 3.3-2.7 6-6 6" opacity="0.5"/>
          <path d="M8 9c-2 1-3.5 3-3.5 5.5 0 3.3 2.7 6 6 6" opacity="0.5"/>
        </svg>
      ),
      title: "Inconsistent Evaluation",
      body: "Every interviewer has a different standard. Bias creeps in. Great candidates get rejected, wrong ones get hired.",
    },
    {
      icon: (
        <svg width="36" height="36" viewBox="0 0 36 36" fill="none" stroke="#C9A84C" strokeWidth="1.5" strokeLinecap="round">
          <rect x="4" y="10" width="28" height="18" rx="3"/>
          <path d="M4 16h28M12 10V7M24 10V7"/>
          <path d="M10 22h6M10 26h10" strokeOpacity="0.5"/>
        </svg>
      ),
      title: "Crushing Hidden Costs",
      body: "25–35% of manager time. $10K–$30K per hire. Six-figure salaries spent on interview duty instead of actual work.",
    },
    {
      icon: (
        <svg width="36" height="36" viewBox="0 0 36 36" fill="none" stroke="#C9A84C" strokeWidth="1.5" strokeLinecap="round">
          <circle cx="18" cy="18" r="13"/>
          <path d="M18 10v8l5 5"/>
          <path d="M6 6l4 4M30 6l-4 4" strokeOpacity="0.4"/>
        </svg>
      ),
      title: "Dangerously Slow",
      body: "20+ interviews over 40–60 days still fail to predict on-the-job performance. Moving slow AND getting it wrong.",
    },
  ];

  return (
    <section style={{ background: '#0A0A0A', padding: '120px 48px' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        <Eyebrow>The Problem</Eyebrow>
        <h2 style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: 'clamp(2rem, 4vw, 3rem)', fontWeight: 700, color: '#F5F0E8', letterSpacing: '-0.02em', lineHeight: 1.15, marginBottom: 56, maxWidth: 600 }}>
          Your hiring process is costing you more than you think.
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20 }}>
          {cards.map((c, i) => (
            <RevealCard key={i} delay={i * 0.12}>
              <GlassCard>
                <div style={{ marginBottom: 20 }}>{c.icon}</div>
                <h3 style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: 18, fontWeight: 700, color: '#F5F0E8', marginBottom: 12, letterSpacing: '-0.01em' }}>{c.title}</h3>
                <p style={{ fontFamily: 'Outfit, sans-serif', fontSize: 15, color: '#888880', lineHeight: 1.65 }}>{c.body}</p>
              </GlassCard>
            </RevealCard>
          ))}
        </div>
      </div>
    </section>
  );
};

