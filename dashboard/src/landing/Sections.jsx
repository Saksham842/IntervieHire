'use client';
import React from 'react';
import { Eyebrow, GlassCard, RevealCard } from './Primitives';
import { GoldWaveSVG } from './GoldWaveSVG';
import { Logo } from './Navbar';

// ImpactSection.jsx + ManifestoSection.jsx + FooterCTA.jsx

export const ImpactSection = () => {
  const stats = [
    { num: "50%+", label: "Reduction in cost-per-hire" },
    { num: "100s of hrs", label: "Saved per hire cycle" },
    { num: "Zero Bias", label: "In AI screening layer" },
    { num: "24/7", label: "Candidate interviews automated" },
    { num: "98%", label: "Cheating detection accuracy" },
    { num: "10x Faster", label: "Hiring pipeline velocity" },
    { num: "4.9/5", label: "Candidate experience rating" },
  ];

  const doubleStats = [...stats, ...stats];

  return (
    <section style={{ background: '#0F0D07', padding: '120px 48px', position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: 700, height: 400, background: 'radial-gradient(ellipse, rgba(201,168,76,0.06) 0%, transparent 70%)', pointerEvents: 'none' }}/>
      <div style={{ maxWidth: 1200, margin: '0 auto', position: 'relative' }}>
        <Eyebrow>What We Solve</Eyebrow>
        <h2 style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: 'clamp(2rem, 4vw, 2.8rem)', fontWeight: 700, color: '#F5F0E8', letterSpacing: '-0.02em', lineHeight: 1.15, marginBottom: 64, maxWidth: 560 }}>
          What changes when you use intervieHire.
        </h2>
        
        <div className="evy-stat-marquee" style={{ marginBottom: 56 }}>
          <div className="evy-stat-track">
            {doubleStats.map((s, i) => (
              <div key={i} style={{
                flexShrink: 0,
                width: 320,
                background: 'rgba(255, 255, 255, 0.02)',
                border: '1px solid rgba(201, 168, 76, 0.12)',
                borderRadius: 16,
                padding: '36px 28px',
                marginRight: 24,
                backdropFilter: 'blur(8px)',
                WebkitBackdropFilter: 'blur(8px)',
                boxShadow: '0 10px 30px rgba(0, 0, 0, 0.3)',
                transition: 'all 0.3s ease',
              }}>
                <div style={{
                  fontFamily: 'Space Grotesk, sans-serif',
                  fontSize: 'clamp(2.2rem, 4.5vw, 2.8rem)',
                  fontWeight: 700,
                  letterSpacing: '-0.02em',
                  lineHeight: 1,
                  marginBottom: 16,
                  background: 'linear-gradient(135deg, #C9A84C, #E8C97A, #C9A84C)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text'
                }}>
                  {s.num}
                </div>
                <div style={{ fontFamily: 'Outfit, sans-serif', fontSize: 15, color: '#888880', lineHeight: 1.5 }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>

        <RevealCard delay={0.3}>
          <p style={{ fontFamily: 'Outfit, sans-serif', fontSize: 16, color: '#555550', lineHeight: 1.7, maxWidth: 680, borderTop: '1px solid rgba(201,168,76,0.1)', paddingTop: 40 }}>
            Our interviewers are trained, calibrated, and use a standardized framework, removing bias and ensuring every candidate gets a fair, high-quality assessment.
          </p>
        </RevealCard>
      </div>
    </section>
  );
};

export const ManifestoSection = () => {
  const words = ["We", "didn't", "build", "another", "tool.", "We", "built", "the", "hiring", "layer", "your", "team", "never", "had."];
  return (
    <section style={{ minHeight: '100vh', background: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '120px 48px', position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', inset: 0, opacity: 0.08 }}>
        <GoldWaveSVG style={{ width: '100%', height: '100%' }} />
      </div>
      <RevealCard delay={0}>
        <blockquote style={{ maxWidth: 860, textAlign: 'center', position: 'relative', zIndex: 1 }}>
          <p style={{ fontFamily: 'Space Grotesk, sans-serif', fontStyle: 'italic', fontSize: 'clamp(1.6rem, 4vw, 2.8rem)', fontWeight: 700, color: '#C9A84C', letterSpacing: '-0.02em', lineHeight: 1.3 }}>
            "{words.join(' ')}"
          </p>
        </blockquote>
      </RevealCard>
    </section>
  );
};

export const CalculatorSection = () => {
  const [hires, setHires] = React.useState(10);
  const [salary, setSalary] = React.useState(60000);
  const [vibe, setVibe] = React.useState(false);

  const triggerVibe = () => {
    setVibe(true);
    setTimeout(() => setVibe(false), 60);
  };

  const handleHiresChange = (e) => {
    setHires(parseInt(e.target.value, 10));
    triggerVibe();
  };

  const handleSalaryChange = (e) => {
    setSalary(parseInt(e.target.value, 10));
    triggerVibe();
  };

  const formatCurrency = (num) => {
    return '$' + num.toLocaleString('en-US');
  };

  const savedMoney = Math.round(hires * salary * 0.08);
  const savedHours = hires * 35;

  return (
    <section id="calculator" style={{ 
      background: '#0A0A0A', 
      padding: '120px 48px', 
      position: 'relative', 
      overflow: 'hidden',
      borderTop: '1px solid rgba(201, 168, 76, 0.08)',
      borderBottom: '1px solid rgba(201, 168, 76, 0.08)'
    }}>
      <div style={{ maxWidth: 1200, margin: '0 auto', position: 'relative', zIndex: 2 }}>
        {/* Section Header */}
        <div style={{ textAlign: 'center', marginBottom: 64 }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            padding: '6px 16px',
            borderRadius: 100,
            fontSize: '0.8rem',
            fontWeight: 700,
            textTransform: 'uppercase',
            background: 'rgba(201, 168, 76, 0.1)',
            border: '1px solid rgba(201, 168, 76, 0.2)',
            color: '#C9A84C',
            marginBottom: 20
          }}>
            Cost Savings
          </div>
          <h2 style={{
            fontFamily: 'Space Grotesk, sans-serif',
            fontSize: 'clamp(2.2rem, 5vw, 3.5rem)',
            fontWeight: 700,
            color: '#F5F0E8',
            letterSpacing: '-0.02em',
            lineHeight: 1.15,
            marginBottom: 16
          }}>
            Measure Your <span style={{
              background: 'linear-gradient(90deg, #FF6B35, #E91E8C)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text'
            }}>Savings.</span>
          </h2>
          <p style={{
            fontFamily: 'Outfit, sans-serif',
            fontSize: 18,
            color: '#888880',
            maxWidth: 580,
            margin: '0 auto',
            lineHeight: 1.6
          }}>
            Use our interactive estimator to see how much recruiting costs and team hours you save with intervieHire.
          </p>
        </div>

        {/* Calculator Layout */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: 40,
          alignItems: 'center'
        }}>
          {/* Sliders Container (Glass Card) */}
          <div style={{
            background: 'rgba(15, 15, 18, 0.6)',
            border: '1px solid rgba(201, 168, 76, 0.1)',
            borderRadius: 24,
            padding: '40px 32px',
            boxShadow: '0 20px 40px rgba(0, 0, 0, 0.5)'
          }}>
            {/* Slider 1 */}
            <div style={{ marginBottom: 40 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
                <span style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 600, color: '#F5F0E8' }}>Hires Planned Per Year</span>
                <span style={{ fontFamily: 'Space Grotesk, sans-serif', fontWeight: 700, color: '#C9A84C', fontSize: 18 }}>{hires}</span>
              </div>
              <input
                type="range"
                min="2"
                max="100"
                value={hires}
                onChange={handleHiresChange}
                style={{
                  width: '100%',
                  accentColor: '#C9A84C',
                  cursor: 'pointer'
                }}
              />
            </div>

            {/* Slider 2 */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
                <span style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 600, color: '#F5F0E8' }}>Average Annual Role Salary</span>
                <span style={{ fontFamily: 'Space Grotesk, sans-serif', fontWeight: 700, color: '#C9A84C', fontSize: 18 }}>{formatCurrency(salary)}</span>
              </div>
              <input
                type="range"
                min="20000"
                max="250000"
                step="5000"
                value={salary}
                onChange={handleSalaryChange}
                style={{
                  width: '100%',
                  accentColor: '#C9A84C',
                  cursor: 'pointer'
                }}
              />
            </div>
          </div>

          {/* Results Container */}
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 24,
            transform: vibe ? 'translate(1px, 1px) rotate(0.4deg)' : 'none',
            transition: 'transform 0.05s ease-out'
          }}>
            {/* Money Saved */}
            <div style={{
              background: 'linear-gradient(135deg, rgba(255, 107, 53, 0.08) 0%, rgba(233, 30, 140, 0.08) 100%)',
              border: '1px solid rgba(255, 107, 53, 0.2)',
              borderRadius: 20,
              padding: 32,
              boxShadow: '0 15px 30px rgba(0, 0, 0, 0.4)'
            }}>
              <p style={{ fontFamily: 'Outfit, sans-serif', color: '#888880', fontSize: 14, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>
                Annual Recruiting Cost Saved
              </p>
              <div style={{
                fontFamily: 'Space Grotesk, sans-serif',
                fontSize: 'clamp(2.5rem, 5vw, 3.8rem)',
                fontWeight: 700,
                color: '#FF6B35',
                lineHeight: 1.1
              }}>
                {formatCurrency(savedMoney)}
              </div>
            </div>

            {/* Hours Saved */}
            <div style={{
              background: 'rgba(15, 15, 18, 0.6)',
              border: '1px solid rgba(201, 168, 76, 0.1)',
              borderRadius: 20,
              padding: 32,
              boxShadow: '0 15px 30px rgba(0, 0, 0, 0.4)'
            }}>
              <p style={{ fontFamily: 'Outfit, sans-serif', color: '#888880', fontSize: 14, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>
                Manager Interview Hours Saved
              </p>
              <div style={{
                fontFamily: 'Space Grotesk, sans-serif',
                fontSize: 'clamp(2.5rem, 5vw, 3.8rem)',
                fontWeight: 700,
                color: '#F5F0E8',
                lineHeight: 1.1
              }}>
                {savedHours} hrs
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export const ContactSection = () => {
  const [name, setName] = React.useState('');
  const [email, setEmail] = React.useState('');
  const [company, setCompany] = React.useState('');
  const [notes, setNotes] = React.useState('');
  const [success, setSuccess] = React.useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    setSuccess(true);
    setTimeout(() => {
      setName('');
      setEmail('');
      setCompany('');
      setNotes('');
      setSuccess(false);
    }, 3000);
  };

  return (
    <section id="contact" style={{ 
      background: '#0F0D07', 
      padding: '120px 48px', 
      position: 'relative', 
      overflow: 'hidden',
      borderTop: '1px solid rgba(201, 168, 76, 0.08)'
    }}>
      {/* Background Radial Glow */}
      <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: 800, height: 500, background: 'radial-gradient(ellipse, rgba(201,168,76,0.04) 0%, transparent 70%)', pointerEvents: 'none' }}/>

      <div style={{ maxWidth: 1200, margin: '0 auto', position: 'relative', zIndex: 2 }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: 60,
          alignItems: 'start'
        }}>
          {/* Left Side: Info */}
          <div>
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              padding: '6px 16px',
              borderRadius: 100,
              fontSize: '0.8rem',
              fontWeight: 700,
              textTransform: 'uppercase',
              background: 'rgba(201, 168, 76, 0.1)',
              border: '1px solid rgba(201, 168, 76, 0.2)',
              color: '#C9A84C',
              marginBottom: 20
            }}>
              Join the Pilot
            </div>
            <h2 style={{
              fontFamily: 'Space Grotesk, sans-serif',
              fontSize: 'clamp(2.2rem, 5vw, 3.5rem)',
              fontWeight: 700,
              color: '#F5F0E8',
              letterSpacing: '-0.02em',
              lineHeight: 1.1,
              marginBottom: 24
            }}>
              Ready to Hire <span style={{
                background: 'linear-gradient(90deg, #FF6B35, #E91E8C)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text'
              }}>Decisively?</span>
            </h2>
            <p style={{
              fontFamily: 'Outfit, sans-serif',
              fontSize: 16,
              color: '#888880',
              lineHeight: 1.65,
              marginBottom: 48,
              maxWidth: 480
            }}>
              Get started with a free pilot. Have our industry experts interview your next round of applicants for free and see the feedback depth yourself.
            </p>

            {/* Details Row */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              {/* Detail 1 */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <div style={{ color: '#C9A84C', display: 'flex', alignItems: 'center' }}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg>
                </div>
                <span style={{ fontFamily: 'Outfit, sans-serif', fontSize: 15, color: '#F5F0E8', fontWeight: 500 }}>interviehire@gmail.com</span>
              </div>
              {/* Detail 2 */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <div style={{ color: '#C9A84C', display: 'flex', alignItems: 'center' }}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="2" y1="12" x2="22" y2="12"></line><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path></svg>
                </div>
                <span style={{ fontFamily: 'Outfit, sans-serif', fontSize: 15, color: '#F5F0E8', fontWeight: 500 }}>interviehire.com</span>
              </div>
              {/* Detail 3 */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <div style={{ color: '#C9A84C', display: 'flex', alignItems: 'center' }}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
                </div>
                <span style={{ fontFamily: 'Outfit, sans-serif', fontSize: 15, color: '#F5F0E8', fontWeight: 500 }}>Co-Founders: Devasri Bali & Aditya Rana</span>
              </div>
            </div>
          </div>

          {/* Right Side: Form (Glass Card) */}
          <div style={{
            background: 'rgba(15, 15, 18, 0.6)',
            border: '1px solid rgba(201, 168, 76, 0.1)',
            borderRadius: 24,
            padding: 40,
            boxShadow: '0 20px 40px rgba(0, 0, 0, 0.5)'
          }}>
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
              {/* Form Input 1 */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <label style={{ fontFamily: 'Outfit, sans-serif', fontSize: 14, fontWeight: 600, color: '#888880' }}>Full Name</label>
                <input
                  type="text"
                  placeholder="Devasri Bali"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  style={{
                    fontFamily: 'Outfit, sans-serif', fontSize: 15,
                    background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(201,168,76,0.15)',
                    borderRadius: 12, padding: '14px 18px', color: '#F5F0E8', outline: 'none',
                    transition: 'border-color 0.2s'
                  }}
                  onFocus={(e) => e.target.style.borderColor = '#C9A84C'}
                  onBlur={(e) => e.target.style.borderColor = 'rgba(201,168,76,0.15)'}
                />
              </div>

              {/* Form Input 2 */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <label style={{ fontFamily: 'Outfit, sans-serif', fontSize: 14, fontWeight: 600, color: '#888880' }}>Work Email</label>
                <input
                  type="email"
                  placeholder="devasri@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  style={{
                    fontFamily: 'Outfit, sans-serif', fontSize: 15,
                    background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(201,168,76,0.15)',
                    borderRadius: 12, padding: '14px 18px', color: '#F5F0E8', outline: 'none',
                    transition: 'border-color 0.2s'
                  }}
                  onFocus={(e) => e.target.style.borderColor = '#C9A84C'}
                  onBlur={(e) => e.target.style.borderColor = 'rgba(201,168,76,0.15)'}
                />
              </div>

              {/* Form Input 3 */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <label style={{ fontFamily: 'Outfit, sans-serif', fontSize: 14, fontWeight: 600, color: '#888880' }}>Company / Startup</label>
                <input
                  type="text"
                  placeholder="intervieHire"
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  required
                  style={{
                    fontFamily: 'Outfit, sans-serif', fontSize: 15,
                    background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(201,168,76,0.15)',
                    borderRadius: 12, padding: '14px 18px', color: '#F5F0E8', outline: 'none',
                    transition: 'border-color 0.2s'
                  }}
                  onFocus={(e) => e.target.style.borderColor = '#C9A84C'}
                  onBlur={(e) => e.target.style.borderColor = 'rgba(201,168,76,0.15)'}
                />
              </div>

              {/* Form Input 4 */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <label style={{ fontFamily: 'Outfit, sans-serif', fontSize: 14, fontWeight: 600, color: '#888880' }}>Role Details (Optional)</label>
                <textarea
                  placeholder="Tell us about the roles you are looking to hire for..."
                  rows="4"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  style={{
                    fontFamily: 'Outfit, sans-serif', fontSize: 15,
                    background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(201,168,76,0.15)',
                    borderRadius: 12, padding: '14px 18px', color: '#F5F0E8', outline: 'none',
                    resize: 'none', transition: 'border-color 0.2s'
                  }}
                  onFocus={(e) => e.target.style.borderColor = '#C9A84C'}
                  onBlur={(e) => e.target.style.borderColor = 'rgba(201,168,76,0.15)'}
                />
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                style={{
                  fontFamily: 'Outfit, sans-serif', fontSize: 16, fontWeight: 700,
                  background: 'linear-gradient(90deg, #FF6B35, #E91E8C)', color: '#fff',
                  border: 'none', borderRadius: 12, padding: '16px 24px', cursor: 'pointer',
                  transition: 'opacity 0.2s'
                }}
                onMouseEnter={(e) => e.target.style.opacity = '0.9'}
                onMouseLeave={(e) => e.target.style.opacity = '1'}
              >
                Request Pilot & Demo
              </button>

              {success && (
                <div style={{ color: '#22c55e', textAlign: 'center', fontWeight: 600, fontFamily: 'Outfit, sans-serif' }}>
                  ✓ Request submitted! Our team will reach out shortly.
                </div>
              )}
            </form>
          </div>
        </div>
      </div>
    </section>
  );
};

export const FooterCTA = () => {
  return (
    <footer style={{ background: '#0A0A0A', padding: '60px 48px', position: 'relative', overflow: 'hidden', borderTop: '1px solid rgba(201, 168, 76, 0.08)' }}>
      <div style={{ position: 'absolute', right: 0, top: 0, width: '45%', height: '100%', opacity: 0.5, pointerEvents: 'none' }}>
        <GoldWaveSVG style={{ width: '100%', height: '100%' }}/>
      </div>
      <div style={{ maxWidth: 1200, margin: '0 auto', position: 'relative' }}>
        <div style={{ paddingTop: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 32 }}>
            <div>
              <Logo size={20}/>
              <div style={{ fontFamily: 'Outfit, sans-serif', fontSize: 13, color: '#555550', marginTop: 10, letterSpacing: '0.04em' }}>Autonomous Interviews. Human Results.</div>
              <div style={{ marginTop: 16, display: 'flex', gap: 16 }}>
                {['LinkedIn', 'Twitter'].map(s => (
                  <a key={s} href="#" style={{ fontFamily: 'Outfit, sans-serif', fontSize: 13, color: '#888880', textDecoration: 'none', transition: 'color 0.2s' }}
                    onMouseEnter={e => e.currentTarget.style.color = '#C9A84C'}
                    onMouseLeave={e => e.currentTarget.style.color = '#888880'}
                  >{s}</a>
                ))}
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontFamily: 'Outfit, sans-serif', fontSize: 13, color: '#555550', marginBottom: 6 }}>interviehire.com</div>
              <div style={{ fontFamily: 'Outfit, sans-serif', fontSize: 13, color: '#555550', marginBottom: 6 }}>interviehire@gmail.com</div>
              <div style={{ fontFamily: 'Outfit, sans-serif', fontSize: 12, color: '#444440', marginTop: 16 }}>© 2025 intervieHire. All rights reserved.</div>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export const ComparisonSection = () => {
  const cons = [
    "Endless scheduling and coordination delays",
    "Repetitive screening calls waste recruiter hours",
    "Inconsistent evaluations across interviewers",
    "Candidate cheating and proxy interviews go unnoticed"
  ];

  const pros = [
    "AI interviews candidates 24/7 automatically",
    "Built-in cheating detection ensures interview integrity",
    "Standardised scoring for fair candidate evaluation",
    "Hire faster with automated screening and instant insights"
  ];

  return (
    <section id="comparison" style={{ background: '#0A0A0A', padding: '100px 48px', position: 'relative', overflow: 'hidden' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto', position: 'relative', zIndex: 2 }}>
        <div style={{ textAlign: 'center', marginBottom: 64 }}>
          <Eyebrow>Workflow Shift</Eyebrow>
          <h2 style={{
            fontFamily: 'Space Grotesk, sans-serif',
            fontSize: 'clamp(2.2rem, 5vw, 3.5rem)',
            fontWeight: 700,
            color: '#F5F0E8',
            letterSpacing: '-0.02em',
            lineHeight: 1.15
          }}>
            From <span style={{ color: '#FF6B35' }}>Chaos</span> to <span style={{
              background: 'linear-gradient(90deg, #FF6B35, #E91E8C)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text'
            }}>Clarity.</span>
          </h2>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: 40,
          position: 'relative'
        }}>
          {/* Chaos Card */}
          <div style={{
            background: 'rgba(255, 107, 53, 0.02)',
            border: '1px solid rgba(255, 107, 53, 0.12)',
            borderRadius: 20,
            padding: '40px 32px',
            boxShadow: '0 15px 30px rgba(0, 0, 0, 0.4)'
          }}>
            <h3 style={{
              fontFamily: 'Space Grotesk, sans-serif',
              fontSize: 22,
              fontWeight: 700,
              color: '#FF6B35',
              marginBottom: 12,
              letterSpacing: '-0.01em'
            }}>Traditional Hiring</h3>
            <p style={{ fontFamily: 'Outfit, sans-serif', fontSize: 14, color: '#888880', marginBottom: 32 }}>The Old Way</p>
            <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 20 }}>
              {cons.map((item, idx) => (
                <li key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>
                  <span style={{ color: '#FF6B35', fontWeight: 'bold', fontSize: 16 }}>✕</span>
                  <span style={{ fontFamily: 'Outfit, sans-serif', fontSize: 15, color: '#888880', lineHeight: 1.5 }}>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Divider Connector (Hidden on small screens) */}
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            opacity: 0.3,
            pointerEvents: 'none'
          }} className="comparison-connector">
            <svg width="40" height="120" viewBox="0 0 40 120" fill="none">
              <path d="M20 0V120" stroke="#C9A84C" strokeWidth="1.5" strokeDasharray="4 4"/>
              <circle cx="20" cy="60" r="6" fill="#C9A84C"/>
            </svg>
          </div>

          {/* Clarity Card */}
          <div style={{
            background: 'rgba(201, 168, 76, 0.03)',
            border: '1px solid rgba(201, 168, 76, 0.2)',
            borderRadius: 20,
            padding: '40px 32px',
            boxShadow: '0 15px 30px rgba(0, 0, 0, 0.4)'
          }}>
            <h3 style={{
              fontFamily: 'Space Grotesk, sans-serif',
              fontSize: 22,
              fontWeight: 700,
              color: '#C9A84C',
              marginBottom: 12,
              letterSpacing: '-0.01em'
            }}>With IntervieHire</h3>
            <p style={{ fontFamily: 'Outfit, sans-serif', fontSize: 14, color: '#888880', marginBottom: 32 }}>AI-Powered Hiring That Scales</p>
            <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 20 }}>
              {pros.map((item, idx) => (
                <li key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>
                  <span style={{ color: '#C9A84C', fontWeight: 'bold', fontSize: 16 }}>✓</span>
                  <span style={{ fontFamily: 'Outfit, sans-serif', fontSize: 15, color: '#F5F0E8', lineHeight: 1.5 }}>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
};

export const ExplainerVideoSection = () => {
  const steps = [
    { title: "Create an Interview", desc: "Create hiring intelligence" },
    { title: "Invite Candidates", desc: "Send automated invitations" },
    { title: "Screen Resumes Beyond Keywords", desc: "Analyze actual capabilities" },
    { title: "Candidates Take Interviews", desc: "Human-less interviews like a pro" },
    { title: "See the Results & Hire Faster", desc: "Review transcripts & scores" }
  ];

  const [hoveredPlayer, setHoveredPlayer] = React.useState(false);

  return (
    <section id="explainer-video" style={{ background: '#050505', padding: '100px 48px', borderTop: '1px solid rgba(201,168,76,0.08)' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 64 }}>
          <Eyebrow>Product Demo</Eyebrow>
          <h2 style={{
            fontFamily: 'Space Grotesk, sans-serif',
            fontSize: 'clamp(2.2rem, 5vw, 3.5rem)',
            fontWeight: 700,
            color: '#F5F0E8',
            letterSpacing: '-0.02em',
            lineHeight: 1.15
          }}>
            See IntervieHire in <span style={{
              background: 'linear-gradient(90deg, #FF6B35, #E91E8C)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text'
            }}>Action.</span>
          </h2>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: 60,
          alignItems: 'center'
        }}>
          {/* Left: Mock Video Player */}
          <div 
            onMouseEnter={() => setHoveredPlayer(true)}
            onMouseLeave={() => setHoveredPlayer(false)}
            style={{
              position: 'relative',
              background: 'rgba(15, 15, 18, 0.6)',
              border: '1px solid rgba(201, 168, 76, 0.15)',
              borderRadius: 24,
              aspectRatio: '16/9',
              overflow: 'hidden',
              cursor: 'pointer',
              boxShadow: '0 20px 40px rgba(0,0,0,0.6)'
            }}
          >
            {/* Mock Thumbnail Image (Gradient mesh representation) */}
            <div style={{
              position: 'absolute', inset: 0,
              background: 'radial-gradient(circle at 80% 20%, rgba(255, 107, 53, 0.12) 0%, transparent 50%), radial-gradient(circle at 20% 80%, rgba(233, 30, 140, 0.12) 0%, transparent 50%)',
              display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center'
            }}>
              {/* Overlay Logo watermark */}
              <div style={{ opacity: 0.15, transform: 'scale(1.5)', marginBottom: 20 }}>
                <Logo size={22} />
              </div>
            </div>

            {/* Play Button Overlay */}
            <div style={{
              position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
              width: 80, height: 80, borderRadius: '50%',
              background: hoveredPlayer ? 'rgba(201, 168, 76, 0.15)' : 'rgba(255, 255, 255, 0.03)',
              border: '2px solid #C9A84C',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: hoveredPlayer ? '0 0 32px rgba(201,168,76,0.4)' : '0 0 16px rgba(0,0,0,0.4)',
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
            }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" style={{ marginLeft: 4 }}>
                <path d="M8 5V19L19 12L8 5Z" fill="#C9A84C" stroke="#C9A84C" strokeWidth="2" strokeLinejoin="round"/>
              </svg>
            </div>

            {/* Mock Player UI Overlay */}
            <div style={{
              position: 'absolute', bottom: 0, left: 0, right: 0,
              background: 'linear-gradient(to top, rgba(0,0,0,0.8), transparent)',
              padding: '20px 24px',
              display: 'flex', alignItems: 'center', gap: 16,
              opacity: hoveredPlayer ? 1 : 0.6,
              transition: 'opacity 0.2s'
            }}>
              {/* Play icon */}
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" style={{ color: '#F5F0E8' }}>
                <path d="M8 5V19L19 12L8 5Z"/>
              </svg>
              {/* Progress bar */}
              <div style={{ flex: 1, height: 4, background: 'rgba(255,255,255,0.2)', borderRadius: 2, position: 'relative' }}>
                <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: '35%', background: '#C9A84C', borderRadius: 2 }}/>
                <div style={{ position: 'absolute', left: '35%', top: '50%', transform: 'translate(-50%, -50%)', width: 10, height: 10, borderRadius: '50%', background: '#F5F0E8' }}/>
              </div>
              {/* Time display */}
              <span style={{ fontFamily: 'Outfit, sans-serif', fontSize: 12, color: '#888880' }}>01:24 / 04:00</span>
            </div>
          </div>

          {/* Right: Step-by-Step Checklist */}
          <div style={{ display: 'flex', flexDirection: 'column', position: 'relative', paddingLeft: 20 }}>
            {/* Timeline Vertical Line */}
            <div style={{
              position: 'absolute', left: 31, top: 20, bottom: 20,
              width: 2, background: 'linear-gradient(to bottom, #C9A84C, rgba(201,168,76,0.1))',
              zIndex: 1
            }}/>

            {steps.map((step, idx) => (
              <div key={idx} style={{
                display: 'flex', alignItems: 'flex-start', gap: 24,
                marginBottom: idx < steps.length - 1 ? 32 : 0,
                position: 'relative', zIndex: 2
              }}>
                {/* Number Indicator */}
                <div style={{
                  width: 24, height: 24, borderRadius: '50%',
                  background: '#050505', border: '2px solid #C9A84C',
                  color: '#C9A84C', fontFamily: 'Space Grotesk, sans-serif',
                  fontSize: 12, fontWeight: 700,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: '0 0 10px rgba(201,168,76,0.2)'
                }}>
                  {idx + 1}
                </div>
                {/* Content */}
                <div>
                  <h3 style={{
                    fontFamily: 'Space Grotesk, sans-serif', fontSize: 18,
                    fontWeight: 700, color: '#F5F0E8', marginBottom: 4
                  }}>{step.title}</h3>
                  <p style={{
                    fontFamily: 'Outfit, sans-serif', fontSize: 14,
                    color: '#888880', lineHeight: 1.4
                  }}>{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export const SolvingForSection = () => {
  const solves = [
    { title: "Eliminating Scheduling Hell", desc: "No more endless calendar tennis. Candidates take interviews asynchronously on their own time, 24/7." },
    { title: "Removing Recruitment Bias", desc: "Standardized AI evaluation frameworks ensure every candidate is graded fairly based on capability, not gut feeling." },
    { title: "Cheating & Proxy Prevention", desc: "Built-in plagiarism, copy-paste, and screen-sharing detection keep evaluations honest and transparent." }
  ];

  const targetAudiences = [
    { title: "Smaller Teams & Startups", desc: "Build high-performing teams without dedicated HR managers. Save engineering lead hours." },
    { title: "Fast-Growing Companies", desc: "Screen hundreds of applicants in hours rather than days. Scale hiring pipelines effortlessly." },
    { title: "Technical Hiring Managers", desc: "Stop conducting redundant phone screenings. Review structured feedback and hire directly." }
  ];

  return (
    <section id="solving-for" style={{ background: '#0A0A0A', padding: '100px 48px', borderTop: '1px solid rgba(201,168,76,0.08)' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 60 }}>
          {/* Left Column: What We Solve */}
          <div>
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              padding: '6px 16px',
              borderRadius: 100,
              fontSize: '0.8rem',
              fontWeight: 700,
              textTransform: 'uppercase',
              background: 'rgba(201, 168, 76, 0.1)',
              border: '1px solid rgba(201, 168, 76, 0.2)',
              color: '#C9A84C',
              marginBottom: 20
            }}>
              Solutions
            </div>
            <h2 style={{
              fontFamily: 'Space Grotesk, sans-serif',
              fontSize: '2rem',
              fontWeight: 700,
              color: '#F5F0E8',
              letterSpacing: '-0.02em',
              lineHeight: 1.2,
              marginBottom: 40
            }}>What We Solve.</h2>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
              {solves.map((item, idx) => (
                <div key={idx} style={{
                  background: 'rgba(255,255,255,0.02)',
                  border: '1px solid rgba(201,168,76,0.1)',
                  borderRadius: 16,
                  padding: 24,
                  boxShadow: '0 8px 16px rgba(0,0,0,0.3)'
                }}>
                  <h3 style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: 17, fontWeight: 700, color: '#C9A84C', marginBottom: 8 }}>{item.title}</h3>
                  <p style={{ fontFamily: 'Outfit, sans-serif', fontSize: 14, color: '#888880', lineHeight: 1.5 }}>{item.desc}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Right Column: Who We Solve For */}
          <div>
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              padding: '6px 16px',
              borderRadius: 100,
              fontSize: '0.8rem',
              fontWeight: 700,
              textTransform: 'uppercase',
              background: 'rgba(201, 168, 76, 0.1)',
              border: '1px solid rgba(201, 168, 76, 0.2)',
              color: '#C9A84C',
              marginBottom: 20
            }}>
              Audience
            </div>
            <h2 style={{
              fontFamily: 'Space Grotesk, sans-serif',
              fontSize: '2rem',
              fontWeight: 700,
              color: '#F5F0E8',
              letterSpacing: '-0.02em',
              lineHeight: 1.2,
              marginBottom: 40
            }}>Who We Solve For.</h2>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
              {targetAudiences.map((item, idx) => (
                <div key={idx} style={{
                  background: 'rgba(255,255,255,0.02)',
                  border: '1px solid rgba(201,168,76,0.1)',
                  borderRadius: 16,
                  padding: 24,
                  boxShadow: '0 8px 16px rgba(0,0,0,0.3)'
                }}>
                  <h3 style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: 17, fontWeight: 700, color: '#C9A84C', marginBottom: 8 }}>{item.title}</h3>
                  <p style={{ fontFamily: 'Outfit, sans-serif', fontSize: 14, color: '#888880', lineHeight: 1.5 }}>{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export const FAQSection = () => {
  const faqs = [
    {
      q: "How does the AI prevent candidate cheating?",
      a: "Our AI platform features advanced integrity checks: face verification via webcam, screen sharing detection, copy-paste blocks, and automated parsing of coding responses to detect plagiarism and third-party prompts."
    },
    {
      q: "What types of roles can intervieHire evaluate?",
      a: "We support a wide array of technical and non-technical roles, including software engineers (frontend, backend, fullstack), product managers, sales executives, customer success, and operations."
    },
    {
      q: "Can we integrate this with our existing ATS?",
      a: "Yes! We support integrations with major ATS platforms such as Greenhouse, Lever, and Ashby, allowing you to trigger evaluations and sync transcripts directly."
    },
    {
      q: "How are the industry experts calibrated?",
      a: "All of our human interviewers are active professionals in their respective fields who undergo standardized training and calibration cycles to evaluate candidates objectively."
    }
  ];

  const [activeIndex, setActiveIndex] = React.useState(null);

  const toggleFAQ = (idx) => {
    setActiveIndex(activeIndex === idx ? null : idx);
  };

  return (
    <section id="faq" style={{ background: '#050505', padding: '100px 48px', borderTop: '1px solid rgba(201,168,76,0.08)' }}>
      <div style={{ maxWidth: 800, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 64 }}>
          <Eyebrow>Questions</Eyebrow>
          <h2 style={{
            fontFamily: 'Space Grotesk, sans-serif',
            fontSize: 'clamp(2.2rem, 5vw, 3.5rem)',
            fontWeight: 700,
            color: '#F5F0E8',
            letterSpacing: '-0.02em',
            lineHeight: 1.15
          }}>
            Frequently Asked <span style={{
              background: 'linear-gradient(90deg, #FF6B35, #E91E8C)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text'
            }}>Questions.</span>
          </h2>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {faqs.map((faq, idx) => {
            const isOpen = activeIndex === idx;
            return (
              <div 
                key={idx}
                style={{
                  background: 'rgba(255,255,255,0.02)',
                  border: '1px solid rgba(201,168,76,0.1)',
                  borderRadius: 12,
                  overflow: 'hidden',
                  transition: 'all 0.3s ease'
                }}
              >
                <div 
                  onClick={() => toggleFAQ(idx)}
                  style={{
                    padding: '24px', cursor: 'pointer',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    fontFamily: 'Space Grotesk, sans-serif', fontSize: 16, fontWeight: 600,
                    color: isOpen ? '#C9A84C' : '#F5F0E8'
                  }}
                >
                  <span>{faq.q}</span>
                  <svg 
                    width="14" height="8" viewBox="0 0 14 8" fill="none"
                    style={{ transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.3s ease', color: '#C9A84C' }}
                  >
                    <path d="M1 1L7 7L13 1" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                {isOpen && (
                  <div style={{
                    padding: '0 24px 24px 24px',
                    fontFamily: 'Outfit, sans-serif', fontSize: 15,
                    color: '#888880', lineHeight: 1.6
                  }}>
                    {faq.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export const AboutFounderSection = () => {
  return (
    <section id="about-founder" style={{ background: '#0A0A0A', padding: '100px 48px', borderTop: '1px solid rgba(201,168,76,0.08)' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 60, alignItems: 'center' }}>
          {/* Visual Brand Image Frame */}
          <div style={{
            background: 'rgba(15, 15, 18, 0.6)',
            border: '1px solid rgba(201, 168, 76, 0.15)',
            borderRadius: 24,
            padding: 40,
            display: 'flex', flexDirection: 'column', justifyContent: 'center',
            minHeight: 320, position: 'relative', overflow: 'hidden',
            boxShadow: '0 20px 40px rgba(0,0,0,0.5)'
          }}>
            <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(circle at center, rgba(201,168,76,0.05) 0%, transparent 80%)' }}/>
            <div style={{ zIndex: 2, textAlign: 'center' }}>
              {/* Co-Founders Title overlay */}
              <h3 style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: 24, fontWeight: 700, color: '#C9A84C', marginBottom: 8 }}>Our Vision</h3>
              <p style={{ fontFamily: 'Outfit, sans-serif', fontSize: 15, color: '#888880', maxWidth: 300, margin: '0 auto', lineHeight: 1.6 }}>
                "We started IntervieHire to build the autonomous hiring layer of the web—eliminating bias and saving thousands of engineering hours."
              </p>
              <div style={{ fontFamily: 'Outfit, sans-serif', fontSize: 13, color: '#F5F0E8', fontWeight: 600, marginTop: 24 }}>
                Devasri Bali & Aditya Rana
              </div>
              <div style={{ fontFamily: 'Outfit, sans-serif', fontSize: 11, color: '#555550', textTransform: 'uppercase', letterSpacing: '0.1em', marginTop: 4 }}>
                Co-Founders, intervieHire
              </div>
            </div>
          </div>

          {/* Text Description */}
          <div>
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              padding: '6px 16px',
              borderRadius: 100,
              fontSize: '0.8rem',
              fontWeight: 700,
              textTransform: 'uppercase',
              background: 'rgba(201, 168, 76, 0.1)',
              border: '1px solid rgba(201, 168, 76, 0.2)',
              color: '#C9A84C',
              marginBottom: 20
            }}>
              About Us
            </div>
            <h2 style={{
              fontFamily: 'Space Grotesk, sans-serif',
              fontSize: 'clamp(2.2rem, 5vw, 3.5rem)',
              fontWeight: 700,
              color: '#F5F0E8',
              letterSpacing: '-0.02em',
              lineHeight: 1.1,
              marginBottom: 24
            }}>
              The Story Behind <span style={{
                background: 'linear-gradient(90deg, #FF6B35, #E91E8C)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text'
              }}>intervieHire.</span>
            </h2>
            <p style={{
              fontFamily: 'Outfit, sans-serif',
              fontSize: 16,
              color: '#888880',
              lineHeight: 1.7,
              marginBottom: 20
            }}>
              Hiring technical candidates requires immense time from your engineering leads, often pulling them away from building core product. We observed this friction firsthand and set out to automate evaluations without sacrificing quality or candidate experience.
            </p>
            <p style={{
              fontFamily: 'Outfit, sans-serif',
              fontSize: 16,
              color: '#888880',
              lineHeight: 1.7
            }}>
              By pairing state-of-the-art AI screening layer with a network of vetted, highly-calibrated industry experts, IntervieHire delivers a complete, secure, and standardized evaluation pipeline that scales with your growth.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};

export const BlogsSection = () => {
  const blogPosts = [
    { title: "Preventing AI Interview Cheating", excerpt: "How we screen for screen sharing, web searches, and copy-paste behavior.", date: "June 2, 2026" },
    { title: "Standardizing Tech Screening", excerpt: "The impact of standardized rubric evaluation on engineering diversity and performance.", date: "May 24, 2026" },
    { title: "Scaling Startups Asynchronously", excerpt: "How async technical screening saves up to 35 hours per engineer hiring cycle.", date: "May 10, 2026" }
  ];

  return (
    <section id="blogs" style={{ background: '#050505', padding: '100px 48px', borderTop: '1px solid rgba(201,168,76,0.08)' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 64 }}>
          <Eyebrow>Resources</Eyebrow>
          <h2 style={{
            fontFamily: 'Space Grotesk, sans-serif',
            fontSize: 'clamp(2.2rem, 5vw, 3.5rem)',
            fontWeight: 700,
            color: '#F5F0E8',
            letterSpacing: '-0.02em',
            lineHeight: 1.15
          }}>
            Our Latest <span style={{
              background: 'linear-gradient(90deg, #FF6B35, #E91E8C)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text'
            }}>Articles.</span>
          </h2>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 24 }}>
          {blogPosts.map((post, idx) => (
            <GlassCard key={idx}>
              <div style={{ fontFamily: 'Outfit, sans-serif', fontSize: 12, color: '#C9A84C', marginBottom: 12, fontWeight: 600 }}>{post.date}</div>
              <h3 style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: 18, fontWeight: 700, color: '#F5F0E8', marginBottom: 12, lineHeight: 1.3 }}>{post.title}</h3>
              <p style={{ fontFamily: 'Outfit, sans-serif', fontSize: 14, color: '#888880', lineHeight: 1.6, marginBottom: 20 }}>{post.excerpt}</p>
              <a href="#" style={{ fontFamily: 'Outfit, sans-serif', fontSize: 13, color: '#F5F0E8', textDecoration: 'none', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 6, transition: 'color 0.2s' }}
                 onMouseEnter={e => e.target.style.color = '#C9A84C'}
                 onMouseLeave={e => e.target.style.color = '#F5F0E8'}
              >
                Read Article
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                  <path d="M1 6H11M11 6L6 1M11 6L6 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </a>
            </GlassCard>
          ))}
        </div>
      </div>
    </section>
  );
};

