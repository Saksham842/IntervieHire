'use client';
import React from 'react';

// Shared UI primitives
export const GlassCard = ({ children, style = {} }) => {
  const [hov, setHov] = React.useState(false);
  return (
    <div
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        background: 'rgba(255,255,255,0.03)',
        border: `1px solid ${hov ? 'rgba(201,168,76,0.35)' : 'rgba(201,168,76,0.15)'}`,
        borderRadius: 12,
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        padding: 28,
        transform: hov ? 'translateY(-2px)' : 'translateY(0)',
        boxShadow: hov ? '0 8px 32px rgba(201,168,76,0.07)' : 'none',
        transition: 'border-color 0.25s ease, transform 0.25s ease, box-shadow 0.25s ease',
        ...style,
      }}
    >{children}</div>
  );
};

export const Eyebrow = ({ children, style = {} }) => {
  const finalColor = style.color || '#C9A84C';
  return (
    <div style={{
      fontFamily: 'Outfit, sans-serif', fontSize: 11, fontWeight: 500,
      letterSpacing: '0.18em', textTransform: 'uppercase', color: finalColor,
      marginBottom: 20,
      display: 'inline-flex', alignItems: 'center', gap: 10,
      ...style,
    }}>
      <span style={{ display: 'inline-block', width: 24, height: 1, background: finalColor, opacity: 0.6 }}/>
      {children}
    </div>
  );
};

export const RevealCard = ({ children, delay = 0 }) => {
  const ref = React.useRef(null);
  const [visible, setVisible] = React.useState(false);

  React.useEffect(() => {
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); obs.disconnect(); } },
      { threshold: 0.12 }
    );
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, []);

  return (
    <div ref={ref} style={{
      opacity: visible ? 1 : 0,
      transform: visible ? 'translateY(0)' : 'translateY(40px)',
      transition: `opacity 0.7s ease ${delay}s, transform 0.7s ease ${delay}s`,
    }}>{children}</div>
  );
};

