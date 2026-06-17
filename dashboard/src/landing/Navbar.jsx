'use client';
import React from 'react';

// Navbar.jsx
export const Navbar = () => {
  const [scrolled, setScrolled] = React.useState(false);
  const [dropdownOpen, setDropdownOpen] = React.useState(false);

  React.useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const handleScroll = (id) => {
    if (window.triggerPageTransition) {
      window.triggerPageTransition(id);
    } else {
      const el = document.getElementById(id);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth' });
      }
    }
    setDropdownOpen(false);
  };

  return (
    <nav style={{
      position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '0 48px', height: '64px',
      background: scrolled ? 'rgba(10,10,10,0.95)' : 'rgba(10,10,10,0.7)',
      backdropFilter: 'blur(16px)',
      WebkitBackdropFilter: 'blur(16px)',
      borderBottom: '1px solid rgba(201,168,76,0.08)',
      transition: 'background 0.3s ease',
    }}>
      <Logo size={20} />
      
      {/* Navigation Links */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 32 }}>
        <a href="#" style={{ fontFamily: 'Outfit, sans-serif', fontSize: 14, color: '#F5F0E8', textDecoration: 'none', transition: 'color 0.2s' }}
           onMouseEnter={e => e.currentTarget.style.color = '#C9A84C'}
           onMouseLeave={e => e.currentTarget.style.color = '#F5F0E8'}>Home</a>
        <a href="#avatar" onClick={(e) => { e.preventDefault(); handleScroll('avatar-explainer'); }} style={{ fontFamily: 'Outfit, sans-serif', fontSize: 14, color: '#F5F0E8', textDecoration: 'none', transition: 'color 0.2s' }}
           onMouseEnter={e => e.currentTarget.style.color = '#C9A84C'}
           onMouseLeave={e => e.currentTarget.style.color = '#F5F0E8'}>AI Avatar</a>
        <a href="#features" onClick={(e) => { e.preventDefault(); handleScroll('explainer-video'); }} style={{ fontFamily: 'Outfit, sans-serif', fontSize: 14, color: '#F5F0E8', textDecoration: 'none', transition: 'color 0.2s' }}
           onMouseEnter={e => e.currentTarget.style.color = '#C9A84C'}
           onMouseLeave={e => e.currentTarget.style.color = '#F5F0E8'}>Features</a>
        
        {/* Resources Dropdown Container */}
        <div 
          style={{ 
            position: 'relative',
            paddingBottom: '16px', // Hover bridge
            marginBottom: '-16px' // offset padding
          }}
          onMouseEnter={() => setDropdownOpen(true)}
          onMouseLeave={() => setDropdownOpen(false)}
        >
          <span style={{ 
            fontFamily: 'Outfit, sans-serif', fontSize: 14, color: '#F5F0E8', 
            cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4,
            transition: 'color 0.2s' 
          }}
             onMouseEnter={e => e.currentTarget.style.color = '#C9A84C'}
             onMouseLeave={e => e.currentTarget.style.color = '#F5F0E8'}
             onClick={() => setDropdownOpen(!dropdownOpen)}
          >
            Resources
            <svg width="10" height="6" viewBox="0 0 10 6" fill="none" style={{ transition: 'transform 0.2s', transform: dropdownOpen ? 'rotate(180deg)' : 'none' }}>
              <path d="M1 1L5 5L9 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </span>

          {/* Dropdown Menu */}
          {dropdownOpen && (
            <div style={{
              position: 'absolute', top: '100%', left: 0,
              background: '#111111', border: '1px solid rgba(201,168,76,0.15)',
              borderRadius: 8, padding: '8px 0', minWidth: 160,
              boxShadow: '0 8px 24px rgba(0,0,0,0.5)', zIndex: 101,
              marginTop: 0 // Flush with container bottom
            }}>
              {[
                { label: "FAQ's", target: 'faq' },
                { label: "About Founder", target: 'about-founder' },
                { label: "Blogs", target: 'blogs' }
              ].map((item, idx) => (
                <div 
                  key={idx}
                  onClick={() => handleScroll(item.target)}
                  style={{
                    fontFamily: 'Outfit, sans-serif', fontSize: 13, color: '#888880',
                    padding: '8px 16px', cursor: 'pointer', transition: 'all 0.2s'
                  }}
                  onMouseEnter={e => { e.currentTarget.style.color = '#C9A84C'; e.currentTarget.style.background = 'rgba(201,168,76,0.05)'; }}
                  onMouseLeave={e => { e.currentTarget.style.color = '#888880'; e.currentTarget.style.background = 'transparent'; }}
                >
                  {item.label}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
        <a
          href="/login"
          style={{ fontFamily: 'Outfit, sans-serif', fontSize: 13, fontWeight: 500, color: '#F5F0E8', textDecoration: 'none', transition: 'color 0.2s' }}
          onMouseEnter={e => e.currentTarget.style.color = '#C9A84C'}
          onMouseLeave={e => e.currentTarget.style.color = '#F5F0E8'}
        >
          Sign In
        </a>
        <button
          onClick={() => handleScroll('contact')}
          style={{
            fontFamily: 'Outfit, sans-serif', fontSize: '13px', fontWeight: 500,
            background: 'transparent', color: '#C9A84C',
            border: '1px solid #C9A84C', borderRadius: '8px',
            padding: '8px 22px', cursor: 'pointer',
            boxShadow: '0 0 14px rgba(201,168,76,0.15)',
            transition: 'box-shadow 0.2s ease, transform 0.15s ease',
          }}
          onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 0 28px rgba(201,168,76,0.35)'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
          onMouseLeave={e => { e.currentTarget.style.boxShadow = '0 0 14px rgba(201,168,76,0.15)'; e.currentTarget.style.transform = 'translateY(0)'; }}
        >
          Book a Demo
        </button>
      </div>
    </nav>
  );
};

export const Logo = ({ size = 22 }) => (
  <div style={{ display: 'flex', alignItems: 'center', fontFamily: 'Space Grotesk, sans-serif', fontSize: size, fontWeight: 700, letterSpacing: '-0.02em' }}>
    <span style={{ color: '#F5F0E8' }}>intervie</span>
    <span style={{ background: 'linear-gradient(90deg,#FF6B35,#E91E8C)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>Hire</span>
    <svg style={{ marginLeft: 4 }} width={size * 0.7} height={size * 0.7} viewBox="0 0 22 22" fill="none">
      <path d="M6 16L16 6M16 6H9M16 6V13" stroke="#FF6B35" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  </div>
);

