'use client';
import React from 'react';
import { Eyebrow } from './Primitives';

// TransitionSection.jsx, Scroll-driven human→AI morph
const TiltCard = ({ children, style = {}, className = "", progress, side }) => {
  const cardRef = React.useRef(null);
  const [tilt, setTilt] = React.useState({ x: 0, y: 0 });
  const [spotlight, setSpotlight] = React.useState({ x: '50%', y: '50%', opacity: 0 });

  const handleMouseMove = (e) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    // Tilt calculation (-10 to 10 degrees)
    const tiltX = ((y / rect.height) - 0.5) * -15;
    const tiltY = ((x / rect.width) - 0.5) * 15;
    
    setTilt({ x: tiltX, y: tiltY });
    setSpotlight({ x: `${x}px`, y: `${y}px`, opacity: 1 });
  };

  const handleMouseLeave = () => {
    setTilt({ x: 0, y: 0 });
    setSpotlight({ x: '50%', y: '50%', opacity: 0 });
  };

  // Determine slide position based on scroll progress and side
  let slideTransform = 'translateY(0px)';
  if (side === 'left') {
    let transformY = 0;
    if (progress < 0.35) {
      transformY = (1 - progress / 0.35) * 40;
    } else if (progress > 0.45) {
      transformY = -Math.min(40, ((progress - 0.45) / 0.2) * 40);
    }
    slideTransform = `translateY(${transformY}px)`;
  } else if (side === 'right') {
    let transformY = 40;
    if (progress >= 0.55) {
      transformY = Math.max(0, (1 - (progress - 0.55) / 0.2) * 40);
    }
    slideTransform = `translateY(${transformY}px)`;
  }

  return (
    <div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className={className}
      style={{
        transform: `perspective(1000px) rotateX(${tilt.x}deg) rotateY(${tilt.y}deg) ${slideTransform} scale3d(1, 1, 1)`,
        transition: 'transform 0.1s cubic-bezier(0.25, 1, 0.5, 1), opacity 0.1s ease-out',
        position: 'relative',
        overflow: 'hidden',
        ...style
      }}
    >
      {/* Glossy Spotlight Overlay */}
      <div style={{
        position: 'absolute',
        inset: 0,
        background: `radial-gradient(circle at ${spotlight.x} ${spotlight.y}, rgba(255, 255, 255, 0.08) 0%, transparent 60%)`,
        opacity: spotlight.opacity,
        transition: 'opacity 0.3s ease',
        pointerEvents: 'none',
        zIndex: 1
      }} />
      <div style={{ position: 'relative', zIndex: 2 }}>
        {children}
      </div>
    </div>
  );
};

export const TransitionSection = () => {
  const sectionRef = React.useRef(null);
  const [progress, setProgress] = React.useState(0);
  const [shakeTrigger, setShakeTrigger] = React.useState(false);
  const prevProgress = React.useRef(0);

  React.useEffect(() => {
    const onScroll = () => {
      if (!sectionRef.current) return;
      const rect = sectionRef.current.getBoundingClientRect();
      const total = sectionRef.current.offsetHeight - window.innerHeight;
      const scrolled = -rect.top;
      const p = Math.max(0, Math.min(1, scrolled / total));
      setProgress(p);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  React.useEffect(() => {
    const crossed = (prevProgress.current < 0.5 && progress >= 0.5) || (prevProgress.current > 0.5 && progress <= 0.5);
    if (crossed) {
      setShakeTrigger(true);
      const timer = setTimeout(() => setShakeTrigger(false), 400);
      return () => clearTimeout(timer);
    }
    prevProgress.current = progress;
  }, [progress]);

  const chaosOpacity = progress < 0.25 ? 1 : progress < 0.45 ? 1 - (progress - 0.25) / 0.2 : 0;
  const clarityOpacity = progress < 0.55 ? 0 : progress < 0.75 ? (progress - 0.55) / 0.2 : 1;

  const humanOpacity = progress < 0.4 ? 1 : progress < 0.65 ? 1 - (progress - 0.4) / 0.25 : 0;
  const aiOpacity    = progress < 0.4 ? 0 : progress < 0.65 ? (progress - 0.4) / 0.25 : 1;

  // Squash/stretch genie effect for the morphing figure
  const morphScaleY = progress < 0.35 || progress > 0.65 ? 1 : 1 - (1 - Math.abs(progress - 0.5) / 0.15) * 0.25;
  const morphScaleX = progress < 0.35 || progress > 0.65 ? 1 : 1 + (1 - Math.abs(progress - 0.5) / 0.15) * 0.2;

  // Scan line
  const scanTop = progress < 0.3 ? -10 : progress < 0.6 ? ((progress - 0.3) / 0.3) * 110 : 110;

  // AI pulse
  const aiScale = aiOpacity > 0.8 ? 1 + Math.sin(Date.now() / 800) * 0.012 : 1;

  const cons = [
    "Endless scheduling and coordination delays",
    "Repetitive screening calls waste recruiter hours",
    "Inconsistent evaluations across interviewer panels",
    "Candidate cheating and proxy interviews go unnoticed"
  ];

  const pros = [
    "AI interviews candidates 24/7 automatically",
    "Built-in cheating detection ensures interview integrity",
    "Standardised scoring for fair candidate evaluation",
    "Hire faster with automated screening and instant insights"
  ];

  return (
    <div id="avatar-explainer" ref={sectionRef} style={{ height: '400vh', position: 'relative' }}>
      <div style={{ position: 'sticky', top: 0, height: '100vh', background: '#000', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', padding: '0 48px' }}>
        
        <div style={{ textAlign: 'center', marginBottom: 48, zIndex: 10 }}>
          <Eyebrow style={{ color: progress < 0.5 ? '#FF6B35' : '#C9A84C', transition: 'color 0.3s ease' }}>Workflow Shift</Eyebrow>
          <h2 style={{
            fontFamily: 'Space Grotesk, sans-serif',
            fontSize: 'clamp(2rem, 4.5vw, 3.2rem)',
            fontWeight: 700,
            color: '#F5F0E8',
            letterSpacing: '-0.02em',
            lineHeight: 1.15,
            marginTop: -8
          }}>
            From <span style={{ color: '#FF6B35', opacity: progress < 0.55 ? 1 : 0.4, transition: 'opacity 0.3s' }}>Chaos</span> to <span style={{
              background: 'linear-gradient(90deg, #C9A84C, #E8C97A)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              opacity: progress >= 0.45 ? 1 : 0.4,
              transition: 'opacity 0.3s'
            }}>Clarity.</span>
          </h2>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 320px 1fr',
          gap: 60,
          width: '100%',
          maxWidth: 1200,
          alignItems: 'center',
          position: 'relative'
        }}>
          
          <TiltCard
            progress={progress}
            side="left"
            style={{
              opacity: chaosOpacity,
              background: 'rgba(255, 107, 53, 0.01)',
              border: '1px solid rgba(255, 107, 53, 0.08)',
              borderRadius: 20,
              padding: '40px 32px',
              boxShadow: '0 15px 30px rgba(0, 0, 0, 0.4)',
              pointerEvents: chaosOpacity < 0.1 ? 'none' : 'auto'
            }}
          >
            <Eyebrow style={{ color: '#FF6B35' }}>From Chaos</Eyebrow>
            <h3 style={{
              fontFamily: 'Space Grotesk, sans-serif',
              fontSize: 26,
              fontWeight: 700,
              color: '#FF6B35',
              marginBottom: 8,
              letterSpacing: '-0.01em'
            }}>Traditional Hiring</h3>
            <p style={{ fontFamily: 'Outfit, sans-serif', fontSize: 14, color: '#666660', marginBottom: 28 }}>The Old Way</p>
            <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 16 }}>
              {cons.map((item, idx) => (
                <li key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                  <span style={{ color: '#FF6B35', fontWeight: 'bold', fontSize: 15 }}>✕</span>
                  <span style={{ fontFamily: 'Outfit, sans-serif', fontSize: 14, color: '#888880', lineHeight: 1.5 }}>{item}</span>
                </li>
              ))}
            </ul>
          </TiltCard>

          <div className={shakeTrigger ? 'morph-shake' : ''} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{
              position: 'relative',
              width: 300,
              height: 300,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transform: `scaleY(${morphScaleY}) scaleX(${morphScaleX})`,
              transition: 'transform 0.1s ease-out, box-shadow 0.5s ease',
              filter: 'brightness(1.15) saturate(1.25)',
              boxShadow: progress < 0.5 ? 'rgba(233, 30, 140, 0.35) 0px 0px 80px 20px' : 'rgba(201, 168, 76, 0.35) 0px 0px 80px 20px',
              borderRadius: '50%',
            }}>
              
              {/* WARM BUBBLE (Chaos State) - Made Subtle */}
              <div style={{
                position: 'absolute',
                inset: 0,
                opacity: (1 - progress) * 0.65,
                transition: 'opacity 0.2s ease-out',
                pointerEvents: 'none',
              }}>
                <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(circle, rgba(255, 107, 53, 0.75) 0%, rgba(233, 30, 140, 0.6) 35%, rgba(139, 92, 246, 0.4) 70%, transparent 100%)', borderRadius: '70% 30% 30% 70% / 60% 40% 60% 40%', filter: 'blur(3px)', animation: '6s ease-in-out infinite evyMorph' }} />
                <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(circle, rgba(233, 30, 140, 0.5) 0%, rgba(139, 92, 246, 0.3) 45%, transparent 100%)', borderRadius: '30% 70% 70% 30% / 30% 30% 70% 70%', filter: 'blur(4px)', animation: '12s ease-in-out infinite reverse evyMorph' }} />
                <div style={{ position: 'absolute', inset: 3, background: 'radial-gradient(circle, rgba(255, 107, 53, 0.4) 0%, rgba(233, 30, 140, 0.2) 50%, transparent 100%)', borderRadius: '50% 50% 20% 80% / 25% 80% 20% 75%', filter: 'blur(5px)', animation: '15s ease-in-out infinite evyMorph' }} />
                <div style={{ position: 'absolute', inset: 9, background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.4) 0%, rgba(233, 30, 140, 0.2) 60%, transparent 100%)', borderRadius: '80% 20% 20% 80% / 20% 80% 20% 80%', filter: 'blur(3.5px)', animation: '8s ease-in-out infinite reverse evyMorph', boxShadow: 'rgba(255, 255, 255, 0.3) 0px 0px 30px inset' }} />
              </div>

              {/* COOL/GOLD BUBBLE (Clarity State) - Made Subtle */}
              <div style={{
                position: 'absolute',
                inset: 0,
                opacity: progress * 0.65,
                transition: 'opacity 0.2s ease-out',
                pointerEvents: 'none',
              }}>
                <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(circle, rgba(201, 168, 76, 0.75) 0%, rgba(34, 211, 238, 0.6) 35%, rgba(16, 185, 129, 0.4) 70%, transparent 100%)', borderRadius: '70% 30% 30% 70% / 60% 40% 60% 40%', filter: 'blur(3px)', animation: '6s ease-in-out infinite evyMorph' }} />
                <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(circle, rgba(34, 211, 238, 0.5) 0%, rgba(16, 185, 129, 0.3) 45%, transparent 100%)', borderRadius: '30% 70% 70% 30% / 30% 30% 70% 70%', filter: 'blur(4px)', animation: '12s ease-in-out infinite reverse evyMorph' }} />
                <div style={{ position: 'absolute', inset: 3, background: 'radial-gradient(circle, rgba(201, 168, 76, 0.4) 0%, rgba(16, 185, 129, 0.2) 50%, transparent 100%)', borderRadius: '50% 50% 20% 80% / 25% 80% 20% 75%', filter: 'blur(5px)', animation: '15s ease-in-out infinite evyMorph' }} />
                <div style={{ position: 'absolute', inset: 9, background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.4) 0%, rgba(201, 168, 76, 0.2) 60%, transparent 100%)', borderRadius: '80% 20% 20% 80% / 20% 80% 20% 80%', filter: 'blur(3.5px)', animation: '8s ease-in-out infinite reverse evyMorph', boxShadow: 'rgba(255, 255, 255, 0.3) 0px 0px 30px inset' }} />
              </div>

              {/* Human Figure Outline (Chaos State) - Restored original stroke weights */}
              <div style={{ position: 'absolute', inset: 24, opacity: humanOpacity, transition: 'opacity 0.1s ease-out', zIndex: 10 }}>
                <svg viewBox="0 0 200 260" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ width: '100%', height: '100%' }}>
                  <circle cx="100" cy="60" r="32" stroke="#F5F0E8" strokeWidth="1.5"/>
                  <path d="M88 90 L88 108 M112 90 L112 108" stroke="#F5F0E8" strokeWidth="1.5" strokeLinecap="round"/>
                  <path d="M40 140 C40 120 70 110 100 110 C130 110 160 120 160 140 L160 220 L40 220 Z" stroke="#F5F0E8" strokeWidth="1.5" fill="none" strokeLinejoin="round"/>
                  <path d="M100 110 L88 145 L76 135" stroke="#F5F0E8" strokeWidth="1" strokeOpacity="0.5"/>
                  <path d="M100 110 L112 145 L124 135" stroke="#F5F0E8" strokeWidth="1" strokeOpacity="0.5"/>
                  <path d="M100 115 L95 155 L100 162 L105 155 Z" stroke="#F5F0E8" strokeWidth="1" strokeOpacity="0.4"/>
                  <path d="M40 140 L20 185" stroke="#F5F0E8" strokeWidth="1.5" strokeLinecap="round" strokeOpacity="0.6"/>
                  <path d="M160 140 L180 185" stroke="#F5F0E8" strokeWidth="1.5" strokeLinecap="round" strokeOpacity="0.6"/>
                </svg>
                <div style={{
                  position: 'absolute', left: -10, right: -10,
                  top: `${scanTop}%`,
                  height: 2,
                  background: 'linear-gradient(90deg, transparent, #C9A84C, transparent)',
                  boxShadow: '0 0 12px rgba(201,168,76,0.8)',
                  opacity: progress > 0.3 && progress < 0.6 ? 1 : 0,
                  transition: 'opacity 0.2s',
                }}/>
              </div>

              {/* AI Agent Outline (Clarity State) - Restored original stroke colors and weights */}
              <div style={{ position: 'absolute', inset: 24, opacity: aiOpacity, transition: 'opacity 0.1s ease-out', transform: `scale(${aiScale})`, zIndex: 10 }}>
                <svg viewBox="0 0 200 260" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ width: '100%', height: '100%' }}>
                  <path d="M100 28 L130 45 L130 79 L100 96 L70 79 L70 45 Z" stroke="#C9A84C" strokeWidth="1.5"/>
                  <path d="M100 28 L100 96 M70 45 L130 79 M130 45 L70 79" stroke="#C9A84C" strokeWidth="0.5" strokeOpacity="0.4"/>
                  <rect x="83" y="54" width="8" height="6" rx="1" fill="#C9A84C" fillOpacity="0.7"/>
                  <rect x="109" y="54" width="8" height="6" rx="1" fill="#C9A84C" fillOpacity="0.7"/>
                  <circle cx="100" cy="62" r="18" stroke="#C9A84C" strokeWidth="0.5" strokeOpacity="0.25"/>
                  <path d="M88 96 L88 116 M112 96 L112 116" stroke="#C9A84C" strokeWidth="1.5"/>
                  <path d="M50 150 L50 116 C50 116 70 110 100 110 C130 110 150 116 150 116 L150 150" stroke="#C9A84C" strokeWidth="1.5"/>
                  <rect x="50" y="150" width="100" height="70" rx="4" stroke="#C9A84C" strokeWidth="1.5"/>
                  <path d="M66 168 L86 168 L86 178 L110 178" stroke="#C9A84C" strokeWidth="0.6" strokeOpacity="0.5"/>
                  <path d="M134 165 L120 165 L120 185 L100 185" stroke="#C9A84C" strokeWidth="0.6" strokeOpacity="0.5"/>
                  <circle cx="66" cy="168" r="2" fill="#C9A84C" fillOpacity="0.7"/>
                  <circle cx="134" cy="165" r="2" fill="#C9A84C" fillOpacity="0.7"/>
                  <path d="M50 125 L22 160 L22 195" stroke="#C9A84C" strokeWidth="1.5" strokeLinecap="round" strokeOpacity="0.7"/>
                  <path d="M150 125 L178 160 L178 195" stroke="#C9A84C" strokeWidth="1.5" strokeLinecap="round" strokeOpacity="0.7"/>
                  <ellipse cx="100" cy="62" rx="45" ry="45" stroke="#C9A84C" strokeWidth="0.3" strokeOpacity="0.15" strokeDasharray="4 6"/>
                </svg>
              </div>
            </div>

            <div style={{ marginTop: 24, height: 20, position: 'relative', width: '100%', textAlign: 'center' }}>
              <div style={{ fontFamily: 'Outfit, sans-serif', fontSize: 12, letterSpacing: '0.1em', textTransform: 'uppercase', transition: 'opacity 0.3s', opacity: humanOpacity > 0.5 ? 1 : 0, color: '#888880', position: 'absolute', width: '100%', left: 0 }}>
                The Traditional Interviewer
              </div>
              <div style={{ fontFamily: 'Outfit, sans-serif', fontSize: 12, letterSpacing: '0.1em', textTransform: 'uppercase', transition: 'opacity 0.3s', opacity: aiOpacity > 0.5 ? 1 : 0, color: '#C9A84C', position: 'absolute', width: '100%', left: 0 }}>
                Your IntervieHire Agent
              </div>
            </div>
          </div>

          <TiltCard
            progress={progress}
            side="right"
            className={progress > 0.75 ? 'pulse-glow' : ''}
            style={{
              opacity: clarityOpacity,
              background: 'rgba(201, 168, 76, 0.02)',
              border: '1px solid rgba(201, 168, 76, 0.12)',
              borderRadius: 20,
              padding: '40px 32px',
              boxShadow: '0 15px 30px rgba(0, 0, 0, 0.4)',
              pointerEvents: clarityOpacity < 0.1 ? 'none' : 'auto'
            }}
          >
            <Eyebrow style={{ color: '#C9A84C' }}>To Clarity</Eyebrow>
            <h3 style={{
              fontFamily: 'Space Grotesk, sans-serif',
              fontSize: 26,
              fontWeight: 700,
              color: '#C9A84C',
              marginBottom: 8,
              letterSpacing: '-0.01em'
            }}>With IntervieHire</h3>
            <p style={{ fontFamily: 'Outfit, sans-serif', fontSize: 14, color: '#666660', marginBottom: 28 }}>AI-Powered Hiring That Scales</p>
            <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 16 }}>
              {pros.map((item, idx) => (
                <li key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                  <span style={{ color: '#C9A84C', fontWeight: 'bold', fontSize: 15 }}>✓</span>
                  <span style={{ fontFamily: 'Outfit, sans-serif', fontSize: 14, color: '#F5F0E8', lineHeight: 1.5 }}>{item}</span>
                </li>
              ))}
            </ul>
          </TiltCard>

        </div>

        <div style={{ position: 'absolute', bottom: 32, left: '50%', transform: 'translateX(-50%)', opacity: progress < 0.05 ? 0.5 : 0, transition: 'opacity 0.4s', color: '#555550', fontFamily: 'Outfit, sans-serif', fontSize: 12, letterSpacing: '0.1em' }}>
          SCROLL
        </div>



      </div>
    </div>
  );
};

