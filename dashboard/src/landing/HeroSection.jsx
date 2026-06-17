'use client';
import React from 'react';

// HeroSection.jsx
export const HeroSection = () => {
  const [visible, setVisible] = React.useState(false);
  React.useEffect(() => { setTimeout(() => setVisible(true), 100); }, []);

  const words1 = ["Interview", "Smarter,"];
  const words2 = ["Hire", "Faster."];

  return (
    <section style={{
      minHeight: '100vh', background: '#0A0A0A',
      display: 'flex', alignItems: 'center',
      position: 'relative', overflow: 'hidden',
      padding: '120px 48px 80px',
    }}>
      {/* Full-bleed Background Video */}
      <video 
        id="hero-pipeline-video" 
        src="/mp_.mp4" 
        autoPlay 
        muted 
        loop 
        playsInline 
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          zIndex: 1,
          opacity: 0.35
        }}
      />
      
      {/* Glassmorphic Dark Overlay */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        background: 'linear-gradient(90deg, rgba(10, 10, 10, 0.9) 30%, rgba(10, 10, 10, 0.5) 100%)',
        backdropFilter: 'blur(3px)',
        WebkitBackdropFilter: 'blur(3px)',
        zIndex: 2,
        pointerEvents: 'none'
      }} />

      <div style={{ position: 'relative', zIndex: 3, maxWidth: 680 }}>
        {/* Headline */}
        <h1 style={{ fontFamily: 'Space Grotesk, sans-serif', fontWeight: 700, letterSpacing: '-0.02em', lineHeight: 1.08, marginBottom: 28, color: '#F5F0E8' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0 14px', fontSize: 'clamp(3rem, 6vw, 5rem)', marginBottom: 6 }}>
            {words1.map((w, i) => (
              <span key={i} style={{
                display: 'inline-block',
                opacity: visible ? 1 : 0,
                transform: visible ? 'translateY(0)' : 'translateY(40px)',
                transition: `opacity 0.7s ease ${0.2 + i * 0.07}s, transform 0.7s ease ${0.2 + i * 0.07}s`,
              }}>{w}</span>
            ))}
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0 14px', fontSize: 'clamp(3rem, 6vw, 5rem)' }}>
            {words2.map((w, i) => (
              <span key={i} style={{
                display: 'inline-block',
                background: i === 1 ? 'linear-gradient(90deg,#FF6B35,#E91E8C)' : 'none',
                WebkitBackgroundClip: i === 1 ? 'text' : 'unset',
                WebkitTextFillColor: i === 1 ? 'transparent' : '#F5F0E8',
                backgroundClip: i === 1 ? 'text' : 'unset',
                opacity: visible ? 1 : 0,
                transform: visible ? 'translateY(0)' : 'translateY(40px)',
                transition: `opacity 0.7s ease ${0.41 + i * 0.07}s, transform 0.7s ease ${0.41 + i * 0.07}s`,
              }}>{w}</span>
            ))}
          </div>
        </h1>

        {/* Subheadline */}
        <p style={{
          fontFamily: 'Outfit, sans-serif', fontSize: 18, fontWeight: 400,
          color: '#888880', lineHeight: 1.65, maxWidth: 560, marginBottom: 40,
          opacity: visible ? 1 : 0, transform: visible ? 'translateY(0)' : 'translateY(24px)',
          transition: 'opacity 0.7s ease 0.65s, transform 0.7s ease 0.65s',
        }}>
          AI-powered interviews 24/7 with built-in cheating detection, helping teams screen candidates faster and more reliably. No scheduling needed.
        </p>

        {/* CTAs */}
        <div style={{
          display: 'flex', gap: 14, flexWrap: 'wrap',
          opacity: visible ? 1 : 0, transform: visible ? 'translateY(0)' : 'translateY(24px)',
          transition: 'opacity 0.7s ease 0.8s, transform 0.7s ease 0.8s',
        }}>
          <HeroBtn primary onClick={() => window.triggerPageTransition ? window.triggerPageTransition('contact') : document.getElementById('contact')?.scrollIntoView({ behavior: 'smooth' })}>Book a Demo</HeroBtn>
          <HeroBtn onClick={() => window.triggerPageTransition ? window.triggerPageTransition('explainer-video') : document.getElementById('explainer-video')?.scrollIntoView({ behavior: 'smooth' })}>See How It Works</HeroBtn>
        </div>

        {/* Stats row */}
        <div style={{
          display: 'flex', gap: 0, marginTop: 64, flexWrap: 'wrap',
          opacity: visible ? 1 : 0,
          transition: 'opacity 0.8s ease 1.1s',
        }}>
          {[
            { num: '$100B', text: 'lost yearly to inefficient hiring' },
            { num: '25–35%', text: 'of manager time drained by interviews' },
            { num: '40–60', text: 'days. Still no reliable hire.' },
          ].map((s, i) => (
            <div key={i} style={{
              flex: '1 1 180px',
              padding: '0 24px',
              borderRight: i < 2 ? '1px solid rgba(201,168,76,0.12)' : 'none',
              paddingLeft: i === 0 ? 0 : 24,
            }}>
              <div style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: 26, fontWeight: 700, color: '#C9A84C', letterSpacing: '-0.02em', marginBottom: 4 }}>{s.num}</div>
              <div style={{ fontFamily: 'Outfit, sans-serif', fontSize: 13, color: '#555550', lineHeight: 1.4 }}>{s.text}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export const HeroBtn = ({ children, primary, onClick }) => {
  const [hov, setHov] = React.useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        fontFamily: 'Outfit, sans-serif', fontSize: 14, fontWeight: 500,
        padding: '13px 30px', borderRadius: 8, cursor: 'pointer',
        transition: 'all 0.2s ease',
        background: primary ? '#C9A84C' : 'transparent',
        color: primary ? '#0A0A0A' : '#C9A84C',
        border: primary ? 'none' : '1px solid #C9A84C',
        filter: primary && hov ? 'brightness(1.12)' : 'none',
        boxShadow: !primary && hov ? '0 0 24px rgba(201,168,76,0.3)' : 'none',
        transform: hov ? 'translateY(-1px)' : 'translateY(0)',
      }}
    >{children}</button>
  );
};

