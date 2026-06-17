'use client';
import React from 'react';

export const PageTransition = () => {
  const [state, setState] = React.useState('idle'); // 'idle' | 'wiping-in' | 'covered' | 'wiping-out'
  const targetRef = React.useRef(null);
  const [y, setY] = React.useState('100%');
  const [skew, setSkew] = React.useState('6deg');

  React.useEffect(() => {
    window.triggerPageTransition = (targetId) => {
      if (state !== 'idle') return;
      targetRef.current = targetId;
      setState('wiping-in');
      setY('100%');
      setSkew('6deg');
    };
    return () => { delete window.triggerPageTransition; };
  }, [state]);

  React.useEffect(() => {
    if (state === 'wiping-in') {
      const reflow = setTimeout(() => {
        setY('0%');
        setSkew('0deg');
      }, 50);

      const coveredTimer = setTimeout(() => {
        setState('covered');
      }, 550);

      return () => { clearTimeout(reflow); clearTimeout(coveredTimer); };
    } else if (state === 'covered') {
      const el = document.getElementById(targetRef.current);
      if (el) {
        el.scrollIntoView({ behavior: 'auto' });
      }
      setState('wiping-out');
    } else if (state === 'wiping-out') {
      const reflow = setTimeout(() => {
        setY('-100%');
        setSkew('-6deg');
      }, 50);

      const idleTimer = setTimeout(() => {
        setState('idle');
      }, 550);

      return () => { clearTimeout(reflow); clearTimeout(idleTimer); };
    }
  }, [state]);

  if (state === 'idle') return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        background: 'linear-gradient(135deg, #0A0A0A 0%, #15130D 50%, #0A0A0A 100%)',
        borderTop: '2px solid #C9A84C',
        borderBottom: '2px solid #C9A84C',
        zIndex: 9999,
        transform: `translateY(${y}) skewY(${skew})`,
        transition: 'transform 0.5s cubic-bezier(0.16, 1, 0.3, 1)',
        pointerEvents: 'all',
        boxShadow: '0 0 100px rgba(0,0,0,0.8), 0 0 50px rgba(201,168,76,0.1) inset',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <div style={{
        opacity: state === 'wiping-in' || state === 'covered' ? 1 : 0,
        transition: 'opacity 0.2s ease',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 20
      }}>
        <div style={{ display: 'flex', alignItems: 'center', fontFamily: 'Space Grotesk, sans-serif', fontSize: 36, fontWeight: 700, letterSpacing: '-0.02em' }}>
          <span style={{ color: '#F5F0E8' }}>intervie</span>
          <span style={{ background: 'linear-gradient(90deg,#FF6B35,#E91E8C)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>Hire</span>
        </div>
        <div style={{ width: 140, height: 2, background: 'rgba(201, 168, 76, 0.15)', borderRadius: 1, overflow: 'hidden', position: 'relative' }}>
          <div style={{
            position: 'absolute',
            width: '40%',
            height: '100%',
            background: 'linear-gradient(90deg, #FF6B35, #C9A84C)',
            borderRadius: 1,
            animation: 'curtainProgress 1s infinite ease-in-out'
          }} />
        </div>
      </div>
      <style>{`
        @keyframes curtainProgress {
          0% { left: -40%; }
          50% { left: 100%; }
          100% { left: 100%; }
        }
      `}</style>
    </div>
  );
};
