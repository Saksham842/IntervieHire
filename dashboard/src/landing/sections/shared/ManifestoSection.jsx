'use client';
import React, { useEffect, useRef } from 'react';
import { MANIFESTO_LINES } from '../../constants';

const lines = MANIFESTO_LINES;

function easeInOut(t) {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}

export const ManifestoSection = () => {
  const wrapRef = useRef(null);
  const wordRefs = useRef([]);

  useEffect(() => {
    let ticking = false;
    const onScroll = () => {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(() => {
          ticking = false;
          if (!wrapRef.current) return;
          const rect = wrapRef.current.getBoundingClientRect();
          const total = wrapRef.current.offsetHeight - window.innerHeight;
          const scrolled = -rect.top;
          const p = Math.max(0, Math.min(1, scrolled / total));
          const allWords = lines.flat();

          for (let i = 0; i < allWords.length; i++) {
            const wordP = Math.max(0, Math.min(1, (p * allWords.length - i) / 1));
            const eased = easeInOut(wordP);
            const el = wordRefs.current[i];
            if (!el) continue;
            el.style.opacity = eased;
            el.style.transform = `translateY(${(1 - eased) * 40}px)`;
          }
        });
      }
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  let idx = 0;

  return (
    <div ref={wrapRef} style={{ height: '200vh', background: '#000', position: 'relative' }}>
      <div style={{
        position: 'sticky', top: 0, height: '100vh',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        gap: 'clamp(8px, 1.5vw, 16px)',
        padding: 'clamp(4px, 1vw, 8px) clamp(16px, 4vw, 48px) clamp(60px, 8vw, 120px)',
      }}>
        {lines.map((line, li) => (
          <div key={li} style={{
            display: 'flex', flexWrap: 'wrap',
            justifyContent: 'center',
            gap: 'clamp(6px, 1.5vw, 16px)',
          }}>
            {line.map((word) => {
              const i = idx++;
              return (
                <span
                  key={i}
                  ref={el => wordRefs.current[i] = el}
                  style={{
                    fontFamily: 'Outfit, sans-serif',
                    fontWeight: 700,
                    fontStyle: 'italic',
                    fontSize: 'clamp(1.5rem, 5vw, 4rem)',
                    color: '#2dd4bf',
                    letterSpacing: '-0.02em',
                    lineHeight: 1.2,
                    opacity: 0,
                    transform: 'translateY(40px)',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {word}
                </span>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
};
